const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
require('dotenv').config();

// Fix for querySrv ECONNREFUSED
dns.setServers(['8.8.8.8', '8.8.4.4']);

const User = require('./models/User');
const Student = require('./models/Student');
const Session = require('./models/Session');
const Attendance = require('./models/Attendance');
const Material = require('./models/Material');
const ActivityLog = require('./models/ActivityLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/forgetrack';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to seed...');

  const mentorEmail = 'mentor_test@forgetrack.com';
  const studentEmail = 'student_test@forgetrack.com';
  const studentUsn = '4SF21CS001';
  const password = 'password123';

  // Remove all demo data while preserving login credentials
  await Session.deleteMany({});
  await Attendance.deleteMany({});
  await Material.deleteMany({});
  await ActivityLog.deleteMany({});

  await User.deleteMany({
    $nor: [
      { email: mentorEmail },
      { email: studentEmail },
      { usn: studentUsn }
    ]
  });

  await Student.deleteMany({ usn: { $ne: studentUsn } });

  const hashedPassword = await bcrypt.hash(password, 10);

  const mentor = await User.findOne({ email: mentorEmail });
  if (!mentor) {
    await User.create({
      email: mentorEmail,
      password: hashedPassword,
      role: 'mentor',
      displayName: 'Test Mentor'
    });
    console.log(`Mentor created: ${mentorEmail} / ${password}`);
  }

  let studentProfile = await Student.findOne({ usn: studentUsn });
  if (!studentProfile) {
    studentProfile = await Student.create({
      name: 'Test Student',
      usn: studentUsn,
      email: studentEmail,
      branchCode: 'CSE',
      batch: '2021-2025'
    });
    console.log(`Student profile created: ${studentUsn}`);
  }

  const studentUser = await User.findOne({
    $or: [{ email: studentEmail }, { usn: studentUsn }]
  });

  if (!studentUser) {
    await User.create({
      email: studentEmail,
      usn: studentUsn,
      password: hashedPassword,
      role: 'student',
      studentId: studentProfile._id,
      displayName: 'Test Student'
    });
    console.log(`Student user created: ${studentUsn} / ${password}`);
  }

  console.log('Cleaned seeded demo data, preserved only login credentials.');
  process.exit(0);
}

seed();
