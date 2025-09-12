const express = require('express');
const router = express.Router();
const db = require('../config/db'); // Keep your DB connection
// bcrypt removed

// ========== REGISTER USER ==========
router.post('/users/register', (req, res) => {
  const { username, password, role, school_id } = req.body;

  if (!username || !password || !role || !school_id) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Store password as plain text (for testing/demo purposes only)
  const sql = "INSERT INTO users (username, password, role, school_id) VALUES (?, ?, ?, ?)";
  db.query(sql, [username, password, role, school_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "✅ User registered successfully" });
  });
});

// ========== GET ALL USERS ==========
router.get('/users', (req, res) => {
  const sql = "SELECT user_id, username, role, school_id FROM users";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ========== UPDATE USER ==========
router.put('/users/:id', (req, res) => {
  const { username, role, school_id } = req.body;
  const sql = "UPDATE users SET username = ?, role = ?, school_id = ? WHERE user_id = ?";
  db.query(sql, [username, role, school_id, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "✅ User updated successfully" });
  });
});

// ========== DELETE USER ==========
router.delete('/users/:id', (req, res) => {
  const sql = "DELETE FROM users WHERE user_id = ?";
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "🗑️ User deleted successfully" });
  });
});

// GET DASHBOARD STATS
// ====== GET DASHBOARD STATS ======
// GET STATS API
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
