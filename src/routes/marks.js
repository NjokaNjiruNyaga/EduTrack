const express = require('express');
const router = express.Router();
const db = require('../config/db');   // MySQL connection

// ================== GET all marks ==================
// @route   GET /marks
// @desc    Fetch all student marks with student + subject + exam details
router.get('/', (req, res) => {
  const sql = `
    SELECT m.mark_id, m.marks, m.rank, m.performance_level,
           s.name AS student_name, s.admission_no, s.grade, s.stream,
           subj.subject_name,
           e.exam_type, e.term, e.year
    FROM marks m
    JOIN students s ON m.student_id = s.id
    JOIN subjects subj ON m.subject_id = subj.subject_id
    JOIN exams e ON m.exam_id = e.exam_id
    ORDER BY e.year DESC, e.term ASC, e.exam_type ASC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ================== GET marks for one student ==================
// @route   GET /marks/student/:id
// @desc    Fetch all marks for a specific student
router.get('/student/:id', (req, res) => {
  const sql = `
    SELECT m.mark_id, m.marks, m.rank, m.performance_level,
           subj.subject_name,
           e.exam_type, e.term, e.year
    FROM marks m
    JOIN subjects subj ON m.subject_id = subj.subject_id
    JOIN exams e ON m.exam_id = e.exam_id
    WHERE m.student_id = ?
    ORDER BY e.year DESC, e.term ASC, e.exam_type ASC
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ================== POST add new mark ==================
// @route   POST /marks
// @desc    Add a student's mark for a subject + exam
router.post('/', (req, res) => {
  const { student_id, subject_id, exam_id, marks, rank, performance_level } = req.body;
  const sql = `
    INSERT INTO marks (student_id, subject_id, exam_id, marks, rank, performance_level)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [student_id, subject_id, exam_id, marks, rank, performance_level], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '✅ Mark added successfully', markId: result.insertId });
  });
});

// ================== PUT update mark ==================
// @route   PUT /marks/:id
// @desc    Update a student's mark
router.put('/:id', (req, res) => {
  const { marks, rank, performance_level } = req.body;
  const sql = `
    UPDATE marks
    SET marks = ?, rank = ?, performance_level = ?
    WHERE mark_id = ?
  `;
  db.query(sql, [marks, rank, performance_level, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Mark not found' });
    res.json({ message: '✅ Mark updated successfully' });
  });
});

// ================== DELETE mark ==================
// @route   DELETE /marks/:id
// @desc    Delete a student's mark
router.delete('/:id', (req, res) => {
  const sql = 'DELETE FROM marks WHERE mark_id = ?';
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Mark not found' });
    res.json({ message: '✅ Mark deleted successfully' });
  });
});

module.exports = router;
