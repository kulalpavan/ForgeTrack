const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Student = require('./models/Student');
const Session = require('./models/Session');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/forgetrack';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to seed...');

  // Clear existing
  await User.deleteMany({});
  await Student.deleteMany({});
  await Session.deleteMany({});

  // 1. Create Mentor
  const mentorPwd = await bcrypt.hash('mentee123', 10);
  const mentor = await User.create({
    email: 'mentee@gmail.com',
    password: mentorPwd,
    role: 'mentor',
    displayName: 'Chief Mentor'
  });
  console.log('Mentor created: mentee@gmail.com / mentee123');

  // 2. Create Students
  const students = await Student.insertMany([
    { name: 'Nischay K', usn: '4SF24CI115', email: '4SF24CI115@forge.local', branchCode: 'CSE', batch: '2021-25' },
    { name: 'Aditi Sharma', usn: '4SF24CI001', email: '4SF24CI001@forge.local', branchCode: 'ISE', batch: '2021-25' }
  ]);
  console.log('Students created');

  // 3. Create Student Users
  const studentPwd = await bcrypt.hash('PASSWORD123', 10);
  await User.create({
    email: '4SF24CI115@forge.local',
    password: studentPwd,
    role: 'student',
    studentId: students[0]._id,
    displayName: 'Nischay K'
  });
  console.log('Student user created: 4SF24CI115 / PASSWORD123');

  // 4. Create dummy sessions
  await Session.insertMany([
    { topic: 'Orientation & Introduction', date: new Date('2026-03-01'), monthNumber: 3 },
    { topic: 'Web Development Basics', date: new Date('2026-03-15'), monthNumber: 3 },
    { topic: 'React.js Deep Dive', date: new Date('2026-04-05'), monthNumber: 4 }
  ]);
  console.log('Sessions created');

  process.exit();
}

seed();
