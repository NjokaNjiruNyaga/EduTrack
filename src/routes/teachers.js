const express = require('express');
const router = express.Router();
const db = require('../config/db');   // database connection

// ================== GET all teachers ==================
// @route   GET /teachers
// @desc    Fetch all teachers
router.get('/', (req, res) => {
  const sql = `
    SELECT t.teacher_id, t.name, s.subject_name
    FROM teachers t
    LEFT JOIN subjects s ON t.subject_id = s.subject_id
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ================== GET single teacher ==================
// @route   GET /teachers/:id
// @desc    Fetch one teacher by ID
router.get('/:id', (req, res) => {
  const sql = `
    SELECT t.teacher_id, t.name, s.subject_name
    FROM teachers t
    LEFT JOIN subjects s ON t.subject_id = s.subject_id
    WHERE t.teacher_id = ?
  `;
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ message: 'Teacher not found' });
    res.json(result[0]);
  });
});

// ================== POST add teacher ==================
// @route   POST /teachers
// @desc    Add new teacher
router.post('/', (req, res) => {
  const { name, subject_id } = req.body;
  const sql = 'INSERT INTO teachers (name, subject_id) VALUES (?, ?)';
  db.query(sql, [name, subject_id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '✅ Teacher added successfully', teacherId: result.insertId });
  });
});

// ================== PUT update teacher ==================
// @route   PUT /teachers/:id
// @desc    Update teacher’s info
router.put('/:id', (req, res) => {
  const { name, subject_id } = req.body;
  const sql = 'UPDATE teachers SET name = ?, subject_id = ? WHERE teacher_id = ?';
  db.query(sql, [name, subject_id, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Teacher not found' });
    res.json({ message: '✅ Teacher updated successfully' });
  });
});

// ================== DELETE teacher ==================
// @route   DELETE /teachers/:id
// @desc    Remove teacher by ID
router.delete('/:id', (req, res) => {
  const sql = 'DELETE FROM teachers WHERE teacher_id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Teacher not found' });
    res.json({ message: '✅ Teacher deleted successfully' });
  });
});

module.exports = router;
