// -------------------- IMPORTS --------------------
const express = require('express');   // framework
const cors = require('cors');         // cross-origin
require('dotenv').config();           // env variables
const db = require('./config/db');    // database

// ✅ Import routes
const studentRoutes = require('./routes/students');
const subjectRoutes = require('./routes/subjects');
const teacherRoutes = require('./routes/teachers');
const examRoutes = require('./routes/exams');
const markRoutes = require('./routes/marks');
const performanceRoutes = require('./routes/performance_summary');
const remarksRoutes = require('./routes/remarks');
const schoolRoutes = require('./routes/schools');
const userRoutes = require('./routes/users');
const adminRoutes= require('./routes/admin');
const authRoutes= require('./routes/auth');



// -------------------- APP SETUP --------------------
const app = express();

// -------------------- MIDDLEWARE --------------------
app.use(cors());              // allow frontend <-> backend
app.use(express.json());      // parse JSON request bodies

// ✅ Serve static files (HTML, CSS, JS) from /public
app.use(express.static('public'));



// -------------------- API ROUTES --------------------
app.use('/students', studentRoutes);
app.use('/subjects', subjectRoutes);
app.use('/teachers', teacherRoutes);
app.use('/exams', examRoutes);
app.use('/marks', markRoutes);
app.use('/performance', performanceRoutes);
app.use('/remarks', remarksRoutes);
app.use('/schools', schoolRoutes);
app.use('/users', userRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);



// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});
