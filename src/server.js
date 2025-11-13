
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/db');
const session = require('express-session');

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
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const gradesRouter = require('./routes/grades');
const teacherDashboardRoutes = require('./routes/teacherDashboard');
const analyticsRoutes = require('./routes/analytics');
const classAnalyticsRoutes = require('./routes/classAnalytics'); // exact filename
const studentOverviewRoutes = require("./routes/studentOverview");
const studentDashRoutes = require("./routes/studentdash");
const studentProfileRoute = require("./routes/studentProfile");




// -------------------- APP SETUP --------------------
const app = express();

// -------------------- MIDDLEWARE --------------------

// ✅ Allow cross-origin requests (adjust origin if needed)
app.use(cors({
  origin: "http://localhost:5500", // your frontend (Live Server or similar)
  credentials: true
}));

// ✅ Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60, // 1 hour
      secure: false,
      httpOnly: true
    }
  })
);

// ✅ Serve static files
app.use(express.static('public'));

// -------------------- ROUTES --------------------
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
app.use('/grades', gradesRouter);
app.use('/teacherDashboard', teacherDashboardRoutes);
app.use("/analytics", analyticsRoutes);             
app.use("/analytics/class", classAnalyticsRoutes);   
app.use("/analytics", studentOverviewRoutes);       
app.use("/studentDashboard", studentDashRoutes);
app.use("/student/profile", studentProfileRoute);



// -------------------- DEFAULT ROUTE --------------------
app.get('/', (req, res) => {
  res.send('✅ EduTrack Server is running...');
});

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running at: http://localhost:${PORT}`);
});





