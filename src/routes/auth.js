const express = require('express');
const router = express.Router();
const db = require('../config/db'); // your MySQL connection
// bcrypt removed

// ======== LOGIN ========
router.post('/login', (req, res) => {
  const { username, password, school_id } = req.body;

  if (!username || !password || !school_id) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Compare directly with plain text password
  const sql = "SELECT * FROM users WHERE username = ? AND school_id = ? AND password = ?";
  db.query(sql, [username, school_id, password], (err, results) => {
    if (err) return res.status(500).json({ message: "Database error", error: err.message });

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid username, password, or school" });
    }

    // Login successful
    const user = results[0];
    res.json({
      message: "Login successful",
      role: user.role,        // admin, teacher, student, parent
      user_id: user.user_id,  // optional, useful for session
      school_id: user.school_id
    });
  });
});

module.exports = router;
