const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const Student = require('../models/Student');
const User = require('../models/User');

const testUsn = '4SF24CI115';
const testPass = '4SF24CI115';

async function debug() {
  console.log('--- LOGIN DIAGNOSTIC START ---');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('1. Database Connected');

    const cleanId = testUsn.toUpperCase().trim();
    const cleanPw = testPass.toUpperCase().trim();
    console.log(`2. Inputs: ID="${cleanId}", PW="${cleanPw}"`);

    // Check User Collection
    const user = await User.findOne({ $or: [{ email: testUsn }, { usn: cleanId }] });
    console.log('3. User Collection Check:', user ? 'FOUND' : 'NOT FOUND');

    // Check Student Collection
    const student = await Student.findOne({ usn: new RegExp(`^${cleanId}$`, 'i') });
    if (!student) {
      console.log('4. Student Collection Check: NOT FOUND (This is the reason for 400!)');
    } else {
      console.log('4. Student Collection Check: FOUND student "' + student.name + '"');
      const dbUsn = student.usn.toUpperCase().trim();
      const match = cleanPw === dbUsn;
      console.log(`5. Password Match: ${match} (Typed: "${cleanPw}" vs DB: "${dbUsn}")`);
    }

    process.exit();
  } catch (err) {
    console.error('DIAGNOSTIC CRITICAL ERROR:', err);
    process.exit(1);
  }
}

debug();
