const fetch = require('node-fetch');
const path = require('path');

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

const env = () => ({
  tenantId: process.env.ONEDRIVE_TENANT_ID,
  clientId: process.env.ONEDRIVE_CLIENT_ID,
  clientSecret: process.env.ONEDRIVE_CLIENT_SECRET,
  targetUpn: process.env.ONEDRIVE_TARGET_UPN,
  baseFolder: process.env.ONEDRIVE_BASE_FOLDER || 'LMS/Uploads',
  timeoutMs: parseInt(process.env.ONEDRIVE_TIMEOUT_MS || '30000', 10),
  chunkMb: parseInt(process.env.ONEDRIVE_UPLOAD_CHUNK_MB || '5', 10)
});

async function getAccessToken() {
  const { tenantId, clientId, clientSecret } = env();
  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const form = new URLSearchParams();
  form.append('client_id', clientId);
  form.append('client_secret', clientSecret);
  form.append('grant_type', 'client_credentials');
  form.append('scope', 'https://graph.microsoft.com/.default');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token error ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.access_token;
}

async function getDriveIdForUser(accessToken, upn) {
  const res = await fetch(`${GRAPH_BASE}/users/${encodeURIComponent(upn)}/drive`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Drive lookup error ${res.status}: ${text}`);
  }
  const json = await res.json();
  return json.id;
}

async function getItemByPath(accessToken, upn, folderPath) {
  // Returns folder item if exists; 404 if not
  const url = `${GRAPH_BASE}/users/${encodeURIComponent(upn)}/drive/root:/${encodeURIComponent(folderPath)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    return null;
  }
  return res.json();
}

async function ensureFolderPath(accessToken, driveId, upn, folderPath) {
  const segs = folderPath.replace(/^[\/]+|[\/]+$/g, '').split('/').filter(Boolean);
  let currentPath = '';
  for (const seg of segs) {
    currentPath = currentPath ? `${currentPath}/${seg}` : seg;
    const existing = await getItemByPath(accessToken, upn, currentPath);
    if (!existing) {
      const url = `${GRAPH_BASE}/users/${encodeURIComponent(upn)}/drive/root/children`;
      const body = {
        name: seg,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'rename'
      };
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Create folder '${currentPath}' error ${res.status}: ${text}`);
      }
    }
  }
  return currentPath;
}

async function uploadSmallFile({ accessToken, upn, filePath, buffer, contentType }) {
  const url = `${GRAPH_BASE}/users/${encodeURIComponent(upn)}/drive/root:/${encodeURIComponent(filePath)}:/content`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': contentType || 'application/octet-stream'
    },
    body: buffer
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload small file error ${res.status}: ${text}`);
  }
  return res.json();
}

async function createUploadSession({ accessToken, driveId, filePath }) {
  const url = `${GRAPH_BASE}/drives/${driveId}/root:/${encodeURIComponent(filePath)}:/createUploadSession`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create upload session error ${res.status}: ${text}`);
  }
  return res.json();
}

async function uploadLargeFile({ accessToken, uploadUrl, buffer, chunkSize }) {
  const total = buffer.length;
  let start = 0;
  let uploadedItem = null;
  while (start < total) {
    const end = Math.min(start + chunkSize, total);
    const chunk = buffer.slice(start, end);
    const contentRange = `bytes ${start}-${end - 1}/${total}`;
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': String(chunk.length),
        'Content-Range': contentRange
      },
      body: chunk,
      redirect: 'follow'
    });
    // Upload session returns 202 for intermediate chunks, 201/200 with item for completion
    if (res.status === 200 || res.status === 201) {
      uploadedItem = await res.json();
    } else if (res.status !== 202) {
      const text = await res.text();
      throw new Error(`Chunk upload error ${res.status}: ${contentRange} ${text}`);
    }
    start = end;
  }
  if (!uploadedItem) {
    // Finalization fetch
    uploadedItem = await fetch(uploadUrl, { method: 'GET' }).then(r => r.json()).catch(() => null);
  }
  return uploadedItem;
}

async function uploadFile({ buffer, contentType, originalName, id, category }) {
  const { targetUpn, baseFolder, chunkMb } = env();
  const accessToken = await getAccessToken();
  const driveId = await getDriveIdForUser(accessToken, targetUpn);
  const categoryFolder = category === 'policy' ? 'Policy' : 'System';
  const safeName = originalName.replace(/[\\/]/g, '');
  const fileName = `${id}-${safeName}`;
  const folderPath = `${baseFolder}/${categoryFolder}`;
  await ensureFolderPath(accessToken, driveId, targetUpn, folderPath);
  const filePath = `${folderPath}/${fileName}`;

  let item;
  // Small file threshold is 4 MiB
  if (buffer.length < 4 * 1024 * 1024) {
    item = await uploadSmallFile({ accessToken, upn: targetUpn, filePath, buffer, contentType });
  } else {
    const session = await createUploadSession({ accessToken, driveId, filePath });
    item = await uploadLargeFile({ accessToken, uploadUrl: session.uploadUrl, buffer, chunkSize: chunkMb * 1024 * 1024 });
  }

  return {
    driveId: item.parentReference && item.parentReference.driveId,
    itemId: item.id,
    webUrl: item.webUrl,
    path: filePath
  };
}

async function getDownloadStream({ driveId, itemId }) {
  const accessToken = await getAccessToken();
  // Direct download content, graph may redirect to @microsoft.graph.downloadUrl
  const url = `${GRAPH_BASE}/drives/${driveId}/items/${itemId}/content`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    redirect: 'follow'
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Download error ${res.status}: ${text}`);
  }
  // Return stream and content type
  return { stream: res.body, contentType: res.headers.get('content-type') || 'application/octet-stream' };
}

module.exports = {
  getAccessToken,
  getDriveIdForUser,
  ensureFolderPath,
  uploadFile,
  getDownloadStream
};