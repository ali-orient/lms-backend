const ldap = require('ldapjs');

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

  // Try bind with UPN first, then DOMAIN\\username if configured
  try {
    if (isSamInput) {
      // Try the provided DOMAIN\username first
      await bindClient(client, username, password);
    } else {
      // Try UPN first
      await bindClient(client, upn, password);
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
        e.details = fallbackErr.message || primaryErr.message;
        throw e;
      }
    } else {
      const e = new Error('LDAP bind failed');
      e.code = primaryErr.code;
      e.details = primaryErr.message;
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
    entries = await search(client, baseDN, options);
  } catch (searchErr) {
    entries = [];
  }
  client.unbind();

  if (!entries || entries.length === 0) {
    // Fallback: return minimal attributes if search fails
    return {
      sAMAccountName: simpleUser,
      userPrincipalName: upn,
      mail: `${simpleUser}@${domain}`,
      displayName: simpleUser,
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