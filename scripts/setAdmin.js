require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/orient-lms';

const args = process.argv.slice(2);
const params = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--email') params.email = args[++i];
  else if (a === '--username') params.username = args[++i];
  else if (a === '--role') params.role = args[++i];
}

const desiredRole = params.role || 'admin';

(async () => {
  try {
    if (!params.email && !params.username) {
      console.error('Usage: node scripts/setAdmin.js --email <email> | --username <username> [--role <role>]');
      process.exit(1);
    }

    console.log('Connecting to MongoDB:', uri);
    await mongoose.connect(uri);
    console.log('Connected.');

    let user = null;
    if (params.email) {
      user = await User.findOne({ email: params.email.toLowerCase() });
    }
    if (!user && params.username) {
      user = await User.findOne({ username: params.username });
    }

    if (!user) {
      console.error('User not found for provided identifier:', params);
      process.exit(2);
    }

    console.log('Found user:', {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    });

    if (user.role === desiredRole) {
      console.log(`User already has role '${desiredRole}'. No changes needed.`);
    } else {
      user.role = desiredRole;
      await user.save();
      console.log('Updated user role:', {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      });
    }
  } catch (err) {
    console.error('Error updating user role:', err && err.message ? err.message : err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
})();