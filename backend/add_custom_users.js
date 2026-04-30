const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Student = require('./models/Student');

async function addUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to Atlas for adding users...');

    const pwd = await bcrypt.hash('password123', 10);

    // 1. Add another Mentor
    const mentorEmail = 'mentor_test@forgetrack.com';
    const existingMentor = await User.findOne({ email: mentorEmail });
    if (!existingMentor) {
      await User.create({
        email: mentorEmail,
        password: pwd,
        role: 'mentor',
        displayName: 'Test Mentor'
      });
      console.log(`Mentor added: ${mentorEmail} / password123`);
    } else {
      console.log(`Mentor ${mentorEmail} already exists.`);
    }

    // 2. Add a Mentee (Student)
    const studentUsn = '4SF21CS001';
    const studentEmail = 'student_test@forgetrack.com';
    
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

    const existingStudentUser = await User.findOne({ 
      $or: [{ email: studentEmail }, { usn: studentUsn }]
    });
    if (!existingStudentUser) {
      await User.create({
        email: studentEmail,
        usn: studentUsn, // Added USN field
        password: pwd,
        role: 'student',
        studentId: studentProfile._id,
        displayName: 'Test Student'
      });
      console.log(`Student user added: ${studentUsn} / password123`);
    } else {
      console.log(`Student user ${studentUsn} already exists.`);
    }

    console.log('User addition complete.');
    process.exit();
  } catch (err) {
    console.error('Failed to add users:', err);
    process.exit(1);
  }
}

addUsers();
