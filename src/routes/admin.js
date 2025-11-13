const express = require('express');
const router = express.Router();
const db = require('../config/db'); // DB connection
const bcrypt = require('bcrypt');

// ===================== MIDDLEWARE: CHECK ADMIN =====================
function isAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Unauthorized. Please log in." });
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ message: "Access denied. Admins only." });
  }
  next();
}

// ===================== REGISTER USER =====================
router.post('/users/register', isAdmin, async (req, res) => {
  const { username, email, password, role, school_id } = req.body;

  if (!username || !email || !password || !role || !school_id) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ message: "Invalid email address" });
  }

  try {
    // Check if email already exists in this school
    const [existing] = await db.promise().query(
      "SELECT * FROM users WHERE email = ? AND school_id = ?",
      [email, school_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists in this school" });
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

// ===================== GET ALL USERS (with optional search, per school) =====================
router.get('/users', isAdmin, async (req, res) => {
  try {
    const school_id = req.query.school_id; // ✅ from frontend
    const searchQuery = req.query.q || '';

    let sql = "SELECT user_id, username, email, role, school_id FROM users WHERE school_id = ?";
    let params = [school_id];

    if (searchQuery) {
      sql += " AND (username LIKE ? OR email LIKE ? OR role LIKE ?)";
      const likeQuery = `%${searchQuery}%`;
      params.push(likeQuery, likeQuery, likeQuery);
    }

    const [results] = await db.promise().query(sql, params);
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching users" });
  }
});

// ===================== UPDATE USER =====================
router.put('/users/:id', isAdmin, async (req, res) => {
  const { username, email, role, school_id } = req.body;
  const userId = req.params.id;

  if (!username || !email || !role || !school_id) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ message: "Invalid email address" });
  }

  try {
    // Check if another user in this school has this email
    const [existing] = await db.promise().query(
      "SELECT * FROM users WHERE email = ? AND user_id != ? AND school_id = ?",
      [email, userId, school_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already exists in this school" });
    }

    const sql = "UPDATE users SET username = ?, email = ?, role = ? WHERE user_id = ? AND school_id = ?";
    db.query(sql, [username, email, role, userId, school_id], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ message: "User not found in this school" });
      res.json({ message: "✅ User updated successfully" });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating user" });
  }
});

// ===================== DELETE USER =====================
router.delete('/users/:id', isAdmin, (req, res) => {
  const school_id = req.query.school_id; // ✅ make sure only from the same school

  const sql = "DELETE FROM users WHERE user_id = ? AND school_id = ?";
  db.query(sql, [req.params.id, school_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: "User not found in this school" });
    res.json({ message: "🗑️ User deleted successfully" });
  });
});

// ===================== DASHBOARD STATS (per school) =====================
router.get('/stats', isAdmin, async (req, res) => {
  try {
    const school_id = req.query.school_id;

    const [users] = await db.promise().query("SELECT COUNT(*) AS totalUsers FROM users WHERE role != 'admin' AND school_id = ?", [school_id]);
    const [students] = await db.promise().query("SELECT COUNT(*) AS totalStudents FROM users WHERE role = 'student' AND school_id = ?", [school_id]);
    const [teachers] = await db.promise().query("SELECT COUNT(*) AS totalTeachers FROM users WHERE role = 'teacher' AND school_id = ?", [school_id]);
    const [parents] = await db.promise().query("SELECT COUNT(*) AS totalParents FROM users WHERE role = 'parent' AND school_id = ?", [school_id]);

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
