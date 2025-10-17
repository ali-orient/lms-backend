require('dotenv').config();
const onedrive = require('../services/onedrive');

(async () => {
  try {
    const token = await onedrive.getAccessToken();
    if (!token || typeof token !== 'string') throw new Error('No access token');
    const { ONEDRIVE_TARGET_UPN, ONEDRIVE_BASE_FOLDER } = process.env;
    const driveId = await onedrive.getDriveIdForUser(token, ONEDRIVE_TARGET_UPN);
    await onedrive.ensureFolderPath(token, driveId, ONEDRIVE_TARGET_UPN, ONEDRIVE_BASE_FOLDER || 'LMS/Uploads');
    console.log(JSON.stringify({ success: true, message: 'OneDrive access verified', upn: ONEDRIVE_TARGET_UPN, driveId }, null, 2));
  } catch (e) {
    console.error(JSON.stringify({ success: false, error: e.message }, null, 2));
    process.exit(1);
  }
})();