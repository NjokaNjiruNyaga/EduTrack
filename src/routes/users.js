const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcrypt');

// ================== LOGIN ==================
// @route   POST /users/login
// @desc    Authenticate user and return role
router.post('/login', (req, res) => {
  const { username, password, school_id } = req.body;

  const sql = 'SELECT * FROM users WHERE username = ? AND school_id = ?';
  db.query(sql, [username, school_id], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid username or school' });
    }

    const user = results[0];

    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid password' });
      }

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


// ================== GET USERS (optionally by role) ==================
// @route   GET /users
// @desc    Fetch all users, or filter by role (?role=teacher)
router.get('/', (req, res) => {
  const { role } = req.query;

  let sql = 'SELECT user_id, username, email, role FROM users';
  const params = [];

  if (role) {
    sql += ' WHERE role = ?';
    params.push(role);
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});


module.exports = router;
