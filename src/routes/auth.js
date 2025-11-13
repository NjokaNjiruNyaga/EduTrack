const express = require('express');
const router = express.Router();
const db = require('../config/db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const session = require('express-session');
const bcrypt = require('bcrypt'); // ✅ Added bcrypt

// ✅ Mailtrap SMTP Transport
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "be355ed03963cb",
    pass: "16c373c3867872"
  }
});

// ======================================================
// ✅ LOGIN (Supports both plaintext and hashed passwords)
// ======================================================
router.post('/login', (req, res) => {
  const { username, password, school_id } = req.body;

  if (!username || !password || !school_id) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const sql = "SELECT * FROM users WHERE username = ? AND school_id = ?";
  db.query(sql, [username, school_id], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error", error: err.message });
    if (results.length === 0) return res.status(401).json({ message: "Invalid username or school" });

    const user = results[0];
    let valid = false;

    // ✅ Determine if password is hashed
    if (user.password.startsWith('$2b$')) {
      valid = await bcrypt.compare(password, user.password);
    } else {
      // Plaintext password (old users)
      valid = password === user.password;

      // ✅ Hash and update password in DB after first successful login
      if (valid) {
        const hashed = await bcrypt.hash(password, 10);
        await db.promise().query(
          "UPDATE users SET password = ? WHERE user_id = ?",
          [hashed, user.user_id]
        );
        console.log(`Hashed password for user_id ${user.user_id} on first login`);
      }
    }

    if (!valid) return res.status(401).json({ message: "Invalid password" });

    // ✅ Continue with session setup
    if (user.role === "student") {
      db.query("SELECT id AS student_id FROM students WHERE user_id = ?", [user.user_id], (err, studentResults) => {
        if (err || studentResults.length === 0) return res.status(500).json({ message: "Student record not found" });

        req.session.user = {
          user_id: user.user_id,
          username: user.username,
          role: user.role,
          school_id: user.school_id,
          student_id: studentResults[0].student_id
        };

        res.json({
          message: "Login successful",
          role: user.role,
          user_id: user.user_id,
          school_id: user.school_id,
          student_id: studentResults[0].student_id
        });
      });
    } else {
      req.session.user = { user_id: user.user_id, username: user.username, role: user.role, school_id: user.school_id };
      res.json({ message: "Login successful", role: user.role, user_id: user.user_id, school_id: user.school_id });
    }
  });
});

// ======================================================
// ✅ CHECK SESSION
// ======================================================
router.get('/session', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// ======================================================
// ✅ LOGOUT
// ======================================================
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Logout failed" });
    res.clearCookie('connect.sid');
    res.json({ message: "Logout successful" });
  });
});

// ======================================================
// ✅ FORGOT PASSWORD (Send Mailtrap Email)
// ======================================================
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0) return res.status(404).json({ message: "Email not found" });

    const user = results[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const insert = "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)";
    db.query(insert, [user.user_id, token, expires_at], async (err) => {
      if (err) return res.status(500).json({ message: "Database error" });

      const resetLink = `http://localhost:5000/resetpassword.html?token=${token}&school_id=${user.school_id}`;

      try {
        await transporter.sendMail({
          from: "EduTrack <no-reply@edutrack.com>",
          to: email,
          subject: "Password Reset Request",
          html: `
            <p>Hello,</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetLink}">Reset Password</a>
            <p>This link will expire in 15 minutes.</p>
          `
        });

        res.json({ message: "Password reset email sent" });
      } catch (mailErr) {
        console.error("Mail Error:", mailErr);
        return res.status(500).json({ message: "Failed to send email" });
      }
    });
  });
});

// ======================================================
// ✅ RESET PASSWORD
// ======================================================
router.post('/reset-password', async (req, res) => {
  const { token, new_password } = req.body;

  if (!token || !new_password) return res.status(400).json({ message: "Missing fields" });

  const sql = "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()";
  db.query(sql, [token], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error" });
    if (results.length === 0) return res.status(400).json({ message: "Invalid or expired token" });

    const resetRecord = results[0];

    // ✅ Hash new password before saving
    const hashedPassword = await bcrypt.hash(new_password, 10);

    const update = "UPDATE users SET password = ? WHERE user_id = ?";
    db.query(update, [hashedPassword, resetRecord.user_id], (err) => {
      if (err) return res.status(500).json({ message: "Database error" });

      const del = "DELETE FROM password_resets WHERE user_id = ?";
      db.query(del, [resetRecord.user_id]);

      res.json({ message: "Password updated successfully" });
    });
  });
});

module.exports = router;
