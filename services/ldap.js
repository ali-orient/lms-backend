const ldap = require('ldapjs');

function extractAdSubcode(err) {
  try {
    const raw = (err && (err.lde_message || err.message)) || '';
    const m = raw.match(/data\s([0-9a-fA-F]+)/i);
    if (m && m[1]) return m[1].toLowerCase();
  } catch (_) {}
  return undefined;
}

function createClient() {
  const url = process.env.AD_URL || 'ldap://DC-AD-01.orient-power.com:389';
  const options = { url };
  const useTLS = url.startsWith('ldaps://');
  if (useTLS) {
    const rejectUnauthorizedEnv = process.env.AD_REJECT_UNAUTHORIZED;
    const rejectUnauthorized = rejectUnauthorizedEnv === undefined ? true : rejectUnauthorizedEnv !== 'false';
    options.tlsOptions = { rejectUnauthorized };
  }
  return ldap.createClient(options);
}

function bindClient(client, dn, password) {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function search(client, baseDN, options) {
  return new Promise((resolve, reject) => {
    const entries = [];
    client.search(baseDN, options, (err, res) => {
      if (err) return reject(err);
      res.on('searchEntry', (entry) => {
        entries.push(entry.object);
      });
      res.on('error', (error) => reject(error));
      res.on('end', () => resolve(entries));
    });
  });
}

async function authenticate({ username, password }) {
  const domain = process.env.AD_DOMAIN || 'orient-power.com';
  const baseDN = process.env.AD_BASE_DN || 'DC=orient-power,DC=com';
  const netbios = process.env.AD_NETBIOS; // optional, e.g., 'ORIENT'
  const isSamInput = username.includes('\\');
  const simpleUser = isSamInput ? username.split('\\')[1] : username;
  const upn = simpleUser.includes('@') ? simpleUser : `${simpleUser}@${domain}`;

  const client = createClient();
  // Avoid unhandled error events from ldapjs client
  client.on('error', (err) => {
    try {
      console.error('LDAP client error:', err && (err.code || err.name), err && (err.lde_message || err.message));
    } catch (_) {}
  });

  // Try bind with UPN first, then DOMAIN\\username if configured
  try {
    if (isSamInput) {
      // Try the provided DOMAIN\username first
      console.log(`Attempting LDAP bind as: ${username}`);
      await bindClient(client, username, password);
      console.log(`LDAP bind successful as: ${username}`);
    } else {
      // Try UPN first
      console.log(`Attempting LDAP bind as: ${upn}`);
      await bindClient(client, upn, password);
      console.log(`LDAP bind successful as: ${upn}`);
    }
  } catch (primaryErr) {
    // Fallback: try DOMAIN\username using env NETBIOS if available
    if (!isSamInput && netbios) {
      const samBind = `${netbios}\\${simpleUser}`;
      try {
        await bindClient(client, samBind, password);
      } catch (fallbackErr) {
        const e = new Error('LDAP bind failed');
        e.code = fallbackErr.code || primaryErr.code;
        const detailsMsg = fallbackErr.lde_message || fallbackErr.message || primaryErr.lde_message || primaryErr.message || 'Bind failed';
        const sub = extractAdSubcode(fallbackErr) || extractAdSubcode(primaryErr);
        e.details = sub ? `${detailsMsg} (subcode ${sub})` : detailsMsg;
        throw e;
      }
    } else {
      const e = new Error('LDAP bind failed');
      e.code = primaryErr.code;
      const detailsMsg = primaryErr.lde_message || primaryErr.message || 'Bind failed';
      const sub = extractAdSubcode(primaryErr);
      e.details = sub ? `${detailsMsg} (subcode ${sub})` : detailsMsg;
      throw e;
    }
  }

  const filter = `(|(sAMAccountName=${simpleUser})(userPrincipalName=${upn}))`;
  const options = {
    scope: 'sub',
    filter,
    attributes: [
      'cn',
      'mail',
      'userPrincipalName',
      'sAMAccountName',
      'memberOf',
      'givenName',
      'sn',
      'displayName',
      'department',
      'title',
    ],
  };

  let entries = [];
  try {
    console.log('LDAP search options:', { baseDN, filter });
    entries = await search(client, baseDN, options);
  } catch (searchErr) {
    entries = [];
  }
  try {
    client.unbind();
  } catch (unbindErr) {
    // Swallow unbind errors; connection may already be closed
    console.error('LDAP unbind error:', unbindErr && (unbindErr.code || unbindErr.name), unbindErr && (unbindErr.lde_message || unbindErr.message));
  }

  if (!entries || entries.length === 0 || !entries[0]) {
    // Fallback: return minimal attributes if search fails
    const fallbackSam = simpleUser.includes('@') ? simpleUser.split('@')[0] : simpleUser;
    return {
      sAMAccountName: fallbackSam,
      userPrincipalName: upn,
      mail: `${fallbackSam}@${domain}`,
      displayName: fallbackSam,
      memberOf: [],
    };
  }

  return entries[0];
}

function mapRole(memberOf) {
  const groups = Array.isArray(memberOf) ? memberOf : memberOf ? [memberOf] : [];
  const adminDn = process.env.AD_ADMIN_GROUP_DN;
  const complianceDn = process.env.AD_COMPLIANCE_GROUP_DN;

  if (adminDn && groups.some((g) => (g || '').toLowerCase() === adminDn.toLowerCase())) {
    return 'admin';
  }
  if (complianceDn && groups.some((g) => (g || '').toLowerCase() === complianceDn.toLowerCase())) {
    return 'compliance';
  }
  return 'employee';
}

module.exports = {
  authenticate,
  mapRole,
};