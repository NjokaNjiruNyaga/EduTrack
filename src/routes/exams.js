const express = require('express');
const router = express.Router();
const db = require('../config/db'); // your current mysql2 connection

// ---------------- Get all exams ----------------
router.get('/', (req, res) => {
  db.query(
    "SELECT exam_id, school_id, exam_type, term, created_at FROM exams ORDER BY created_at DESC",
    (err, rows) => {
      if (err) {
        console.error('Error fetching exams:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(rows);
    }
  );
});

// ---------------- Get single exam ----------------
router.get('/:id', (req, res) => {
  const examId = req.params.id;
  db.query(
    "SELECT exam_id, school_id, exam_type, term, created_at FROM exams WHERE exam_id = ?",
    [examId],
    (err, rows) => {
      if (err) {
        console.error(`Error fetching exam ${examId}:`, err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
      res.json(rows[0]);
    }
  );
});

// ---------------- Create a new exam ----------------
router.post('/', (req, res) => {
  const { school_id, exam_type, term } = req.body;

  if (!school_id || !exam_type || !term) {
    return res.status(400).json({ error: 'Please provide school_id, exam_type, and term' });
  }

  db.query(
    "INSERT INTO exams (school_id, exam_type, term) VALUES (?, ?, ?)",
    [school_id, exam_type, term],
    (err, result) => {
      if (err) {
        console.error('Error creating exam:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, exam_id: result.insertId });
    }
  );
});

// ---------------- Update an exam ----------------
router.put('/:id', (req, res) => {
  const examId = req.params.id;
  const { school_id, exam_type, term } = req.body;

  if (!school_id || !exam_type || !term) {
    return res.status(400).json({ error: 'Please provide school_id, exam_type, and term' });
  }

  db.query(
    "UPDATE exams SET school_id = ?, exam_type = ?, term = ? WHERE exam_id = ?",
    [school_id, exam_type, term, examId],
    (err, result) => {
      if (err) {
        console.error(`Error updating exam ${examId}:`, err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Exam not found' });
      res.json({ success: true });
    }
  );
});

// ---------------- Delete an exam ----------------
router.delete('/:id', (req, res) => {
  const examId = req.params.id;
  db.query(
    "DELETE FROM exams WHERE exam_id = ?",
    [examId],
    (err, result) => {
      if (err) {
        console.error(`Error deleting exam ${examId}:`, err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Exam not found' });
      res.json({ success: true });
    }
  );
});

module.exports = router;
