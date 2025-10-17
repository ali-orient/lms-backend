const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const ldap = require('ldapjs');

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.error('Usage: node scripts/debugBind.js <username> <password>');
  process.exit(1);
}

const url = process.env.AD_URL || 'ldap://DC-AD-01.orient-power.com:389';
const useTLS = url.startsWith('ldaps://');
const rejectUnauthorizedEnv = process.env.AD_REJECT_UNAUTHORIZED;
const rejectUnauthorized = rejectUnauthorizedEnv === undefined ? true : rejectUnauthorizedEnv !== 'false';

const client = ldap.createClient({
  url,
  tlsOptions: useTLS ? { rejectUnauthorized } : undefined,
});

client.bind(username, password, (err) => {
  if (err) {
    console.error('Bind failed');
    console.error('name:', err && err.name);
    console.error('code:', err && err.code);
    console.error('message:', err && err.message);
    console.error('lde_message:', err && err.lde_message);
    try {
      const props = Object.getOwnPropertyNames(err || {});
      console.error('props:', props);
      console.error('full:', JSON.stringify(err, props));
    } catch (_) {}
    client.unbind();
    process.exit(1);
    return;
  }
  console.log('Bind successful');
  client.unbind();
  process.exit(0);
});