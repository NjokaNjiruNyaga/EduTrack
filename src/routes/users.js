const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');

// ================== LOGIN ==================
// @route   POST /users/login
// @desc    Authenticate user and return role
router.post('/login', (req, res) => {
  const { username, password, school_id } = req.body;

  // 1️⃣ Check if user exists
  const sql = 'SELECT * FROM users WHERE username = ? AND school_id = ?';
  db.query(sql, [username, school_id], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid username or school' });
    }

    const user = results[0];

    try {
      // 2️⃣ Compare password with hash
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid password' });
      }

      // 3️⃣ Success → return role & school
      res.json({
        message: '✅ Login successful',
        role: user.role,
        school_id: user.school_id,
        username: user.username
      });

    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

module.exports = router;
