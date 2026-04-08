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

    let existing = await User.findOne({ email });
    if (existing) {
      console.log('Admin already exists:', email);
      process.exit(0);
    }

    const user = new User({ name, email, password, role: 'admin', isActive: true });
    await user.save();
    console.log('Admin user created:');
    console.log(' Name:', name);
    console.log(' Email:', email);
    console.log(' Password:', password);
    console.log('IMPORTANT: Change the default password in production.');
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

run();
