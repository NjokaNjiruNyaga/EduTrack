const express = require('express');
const router = express.Router();
const db = require('../config/db');   // database connection

// ================== GET all remarks ==================
// @route   GET /remarks
// @desc    Fetch all remarks
router.get('/', (req, res) => {
  const sql = `
    SELECT r.remark_id, r.term, r.year, r.teacher_remark,
           s.name AS student_name, s.admission_no, s.grade, s.stream
    FROM remarks r
    JOIN students s ON r.student_id = s.id
    ORDER BY r.year DESC, r.term ASC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ================== GET remarks for one student ==================
// @route   GET /remarks/student/:id
// @desc    Fetch all remarks for a specific student
router.get('/student/:id', (req, res) => {
  const sql = `
    SELECT remark_id, term, year, teacher_remark
    FROM remarks
    WHERE student_id = ?
    ORDER BY year DESC, term ASC
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ================== POST add remark ==================
// @route   POST /remarks
// @desc    Add a new teacher remark
router.post('/', (req, res) => {
  const { student_id, term, year, teacher_remark } = req.body;
  const sql = `
    INSERT INTO remarks (student_id, term, year, teacher_remark)
    VALUES (?, ?, ?, ?)
  `;
  db.query(sql, [student_id, term, year, teacher_remark], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '✅ Remark added successfully', remarkId: result.insertId });
  });
});

// ================== PUT update remark ==================
// @route   PUT /remarks/:id
// @desc    Update a remark
router.put('/:id', (req, res) => {
  const { teacher_remark } = req.body;
  const sql = `
    UPDATE remarks
    SET teacher_remark = ?
    WHERE remark_id = ?
  `;
  db.query(sql, [teacher_remark, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Remark not found' });
    res.json({ message: '✅ Remark updated successfully' });
  });
});

// ================== DELETE remark ==================
// @route   DELETE /remarks/:id
// @desc    Delete a remark
router.delete('/:id', (req, res) => {
  const sql = 'DELETE FROM remarks WHERE remark_id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Remark not found' });
    res.json({ message: '✅ Remark deleted successfully' });
  });
});

module.exports = router;
