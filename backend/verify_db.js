const mongoose = require('mongoose');
const path = require('path');
const dns = require('dns');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Fix for querySrv ECONNREFUSED
dns.setServers(['8.8.8.8', '8.8.4.4']);

const User = require('./models/User');
const Student = require('./models/Student');
const Session = require('./models/Session');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to Atlas.');
  
  const userCount = await User.countDocuments();
  const studentCount = await Student.countDocuments();
  const sessionCount = await Session.countDocuments();
  
  console.log('--- Database Stats ---');
  console.log('Users:', userCount);
  console.log('Students:', studentCount);
  console.log('Sessions:', sessionCount);
  
  const mentor = await User.findOne({ role: 'mentor' });
  console.log('Mentor User Found:', mentor ? mentor.email : 'No');
  
  process.exit();
}

check();
