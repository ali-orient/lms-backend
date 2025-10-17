require('dotenv').config();
const fs = require('fs');
const path = require('path');
const onedrive = require('../services/onedrive');

const uploadsDir = path.join(__dirname, '..', 'uploads');
const filesIndexPath = path.join(uploadsDir, 'files-index.json');

// Helper to safely resolve stored upload paths (which may start with a leading slash)
const resolveUploadAbsolute = (storedPath) => {
  const normalized = String(storedPath || '')
    .replace(/^[\\/]+/, '')
    .replace(/\\/g, '/');
  return path.join(__dirname, '..', normalized);
};

(async () => {
  try {
    if (!fs.existsSync(filesIndexPath)) {
      throw new Error('files-index.json not found');
    }
    const index = JSON.parse(fs.readFileSync(filesIndexPath, 'utf-8'));
    if (!Array.isArray(index)) throw new Error('files-index.json malformed');

    const migrated = [];
    const skipped = [];

    for (const file of index) {
      // Skip if already has OneDrive metadata
      if (file.storageProvider === 'onedrive' || (file.onedrive && file.onedrive.itemId)) {
        skipped.push({ id: file.id, reason: 'already_onedrive' });
        continue;
      }

      const abs = resolveUploadAbsolute(file.path);
      if (!fs.existsSync(abs)) {
        skipped.push({ id: file.id, reason: 'missing_local_file' });
        continue;
      }

      const buffer = fs.readFileSync(abs);
      const uploaded = await onedrive.uploadFile({
        buffer,
        contentType: file.mimetype || 'application/octet-stream',
        originalName: file.originalName || file.filename,
        id: file.id,
        category: file.category || 'system'
      });

      file.storageProvider = 'onedrive';
      file.onedrive = {
        driveId: uploaded.driveId,
        itemId: uploaded.itemId,
        webUrl: uploaded.webUrl,
        path: uploaded.path
      };
      // Optional: keep logical path for readability
      file.path = uploaded.path;

      migrated.push({ id: file.id, itemId: uploaded.itemId });

      // Optional: delete local file after upload
      try { fs.unlinkSync(abs); } catch (e) {}
    }

    fs.writeFileSync(filesIndexPath, JSON.stringify(index, null, 2));
    console.log(JSON.stringify({ success: true, migratedCount: migrated.length, skipped }, null, 2));
  } catch (e) {
    console.error(JSON.stringify({ success: false, error: e.message }, null, 2));
    process.exit(1);
  }
})();