const express = require('express');
const router = express.Router();
const db = require('../config/db'); // DB connection
const bcrypt = require('bcrypt');

// ===================== REGISTER USER =====================
router.post('/users/register', async (req, res) => {
  const { username, email, password, role, school_id } = req.body;

  if (!username || !email || !password || !role || !school_id) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ message: "Invalid email address" });
  }

  try {
    // Check if email already exists
    const [existing] = await db.promise().query("SELECT * FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = "INSERT INTO users (username, email, password, role, school_id) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [username, email, hashedPassword, role, school_id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ User registered successfully" });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error registering user" });
  }
});

// ===================== GET ALL USERS (with optional search) =====================
router.get('/users', async (req, res) => {
  try {
    const searchQuery = req.query.q || '';
    let sql = "SELECT user_id, username, email, role, school_id FROM users";
    let params = [];

    if (searchQuery) {
      sql += " WHERE username LIKE ? OR email LIKE ? OR role LIKE?";
      const likeQuery = `%${searchQuery}%`;
      params = [likeQuery, likeQuery, likeQuery];
    }

    const [results] = await db.promise().query(sql, params);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching users" });
  }
});

// ===================== UPDATE USER =====================
router.put('/users/:id', async (req, res) => {
  const { username, email, role, school_id } = req.body;
  const userId = req.params.id;

  if (!username || !email || !role || !school_id) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ message: "Invalid email address" });
  }

  try {
    // Check if another user has this email
    const [existing] = await db.promise().query(
      "SELECT * FROM users WHERE email = ? AND user_id != ?",
      [email, userId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const sql = "UPDATE users SET username = ?, email = ?, role = ?, school_id = ? WHERE user_id = ?";
    db.query(sql, [username, email, role, school_id, userId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ User updated successfully" });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating user" });
  }
});

// ===================== DELETE USER =====================
router.delete('/users/:id', (req, res) => {
  const sql = "DELETE FROM users WHERE user_id = ?";
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "🗑️ User deleted successfully" });
  });
});

// ===================== DASHBOARD STATS =====================
router.get('/stats', async (req, res) => {
  try {
    const [users] = await db.promise().query("SELECT COUNT(*) AS totalUsers FROM users WHERE role != 'admin'");
    const [students] = await db.promise().query("SELECT COUNT(*) AS totalStudents FROM users WHERE role = 'student'");
    const [teachers] = await db.promise().query("SELECT COUNT(*) AS totalTeachers FROM users WHERE role = 'teacher'");
    const [parents] = await db.promise().query("SELECT COUNT(*) AS totalParents FROM users WHERE role = 'parent'");

    res.json({
      totalUsers: users[0].totalUsers,
      totalStudents: students[0].totalStudents,
      totalTeachers: teachers[0].totalTeachers,
      totalParents: parents[0].totalParents
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching stats" });
  }
});

module.exports = router;
