const express = require('express');
const router = express.Router();
const db = require('../config/db');   // database connection

// ================== GET all summaries ==================
// @route   GET /performance
// @desc    Fetch all performance summaries
router.get('/', (req, res) => {
  const sql = `
    SELECT ps.summary_id, ps.term, ps.year,
           ps.total_marks, ps.total_points, ps.mean_points,
           ps.stream_position, ps.overall_position, ps.performance_level,
           s.name AS student_name, s.admission_no, s.grade, s.stream
    FROM performance_summary ps
    JOIN students s ON ps.student_id = s.id
    ORDER BY ps.year DESC, ps.term ASC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ================== GET summary for one student ==================
// @route   GET /performance/student/:id
// @desc    Fetch performance summary for a specific student
router.get('/student/:id', (req, res) => {
  const sql = `
    SELECT ps.summary_id, ps.term, ps.year,
           ps.total_marks, ps.total_points, ps.mean_points,
           ps.stream_position, ps.overall_position, ps.performance_level
    FROM performance_summary ps
    WHERE ps.student_id = ?
    ORDER BY ps.year DESC, ps.term ASC
  `;
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ================== POST add summary (MANUAL) ==================
// @route   POST /performance
// @desc    Teacher/admin enters data manually
router.post('/', (req, res) => {
  const { student_id, term, year, total_marks, total_points, mean_points, stream_position, overall_position, performance_level } = req.body;
  const sql = `
    INSERT INTO performance_summary 
    (student_id, term, year, total_marks, total_points, mean_points, stream_position, overall_position, performance_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [student_id, term, year, total_marks, total_points, mean_points, stream_position, overall_position, performance_level], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '✅ Performance summary (manual) added', summaryId: result.insertId });
  });
});

// ================== POST calculate summary (AUTOMATIC) ==================
// @route   POST /performance/calculate
// @desc    System calculates summary from marks + descriptors
router.post('/calculate', (req, res) => {
  const { student_id, term, year } = req.body;

  // Step 1: Fetch all marks for this student, term, and year
  const sqlMarks = `
    SELECT m.marks, g.points
    FROM marks m
    JOIN exams e ON m.exam_id = e.exam_id
    JOIN grade_descriptors g 
      ON m.performance_level = g.level_name
    WHERE m.student_id = ? AND e.term = ? AND e.year = ?
  `;

  db.query(sqlMarks, [student_id, term, year], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'No marks found for this student/term/year' });

    // Step 2: Calculate totals
    const total_marks = results.reduce((sum, row) => sum + row.marks, 0);
    const total_points = results.reduce((sum, row) => sum + row.points, 0);
    const mean_points = (total_points / results.length).toFixed(2);

    // Step 3: Determine performance level (simple logic, can refine later)
    let performance_level = 'Below';
    if (mean_points >= 10) performance_level = 'Exceeding';
    else if (mean_points >= 7) performance_level = 'Meeting';
    else if (mean_points >= 5) performance_level = 'Approaching';

    // Step 4: Insert into performance_summary
    const sqlInsert = `
      INSERT INTO performance_summary
      (student_id, term, year, total_marks, total_points, mean_points, stream_position, overall_position, performance_level)
      VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?)
    `;
    db.query(sqlInsert, [student_id, term, year, total_marks, total_points, mean_points, performance_level], (err2, result) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ 
        message: '✅ Performance summary calculated & saved',
        summaryId: result.insertId,
        data: { student_id, term, year, total_marks, total_points, mean_points, performance_level }
      });
    });
  });
});

module.exports = router;
