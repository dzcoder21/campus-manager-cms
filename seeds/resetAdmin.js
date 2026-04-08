require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/university-cms';

async function run() {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    const name = process.env.ADMIN_NAME || 'Administrator';
    const email = process.env.ADMIN_EMAIL || 'admin@example.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@12345';

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name, email, password, role: 'admin', isActive: true });
      await user.save();
      console.log('Admin did not exist. Created new admin.');
    } else {
      user.name = name;
      user.role = 'admin';
      user.isActive = true;
      user.password = password; // will be hashed by pre('save') hook
      await user.save();
      console.log('Admin password reset and details updated.');
    }

    console.log('Admin credentials:');
    console.log(' Email:', email);
    console.log(' Password:', password);
    console.log('IMPORTANT: Change the default password in production.');
    process.exit(0);
  } catch (err) {
    console.error('Error resetting/creating admin:', err);
    process.exit(1);
  }
}

run();
