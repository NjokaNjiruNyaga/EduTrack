const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ================== GET all schools ==================
// @route   GET /schools
router.get('/', (req, res) => {
  const sql = 'SELECT * FROM schools ORDER BY school_name ASC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ================== GET one school by ID ==================
// @route   GET /schools/:id
router.get('/:id', (req, res) => {
  const sql = 'SELECT * FROM schools WHERE school_id = ?';
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'School not found' });
    res.json(results[0]); // return single school
  });
});

module.exports = router;
