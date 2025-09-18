const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ---------------- Get all exams with search & pagination ----------------
router.get('/', (req, res) => {
  let { search, page, limit } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const offset = (page - 1) * limit;

  let baseSql = 'SELECT exam_id, school_id, exam_type, term, created_at FROM exams';
  let countSql = 'SELECT COUNT(*) as total FROM exams';
  const params = [];

  if (search) {
    search = `%${search}%`;
    baseSql += ' WHERE exam_id LIKE ? OR school_id LIKE ? OR exam_type LIKE ? OR term LIKE ?';
    countSql += ' WHERE exam_id LIKE ? OR school_id LIKE ? OR exam_type LIKE ? OR term LIKE ?';
    params.push(search, search, search, search);
  }

  baseSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  db.query(baseSql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const countParams = search ? [search, search, search, search] : [];
    db.query(countSql, countParams, (err2, countResult) => {
      if (err2) return res.status(500).json({ error: err2.message });
      const total = countResult[0].total;
      res.json({ data: results, total, page, limit });
    });
  });
});

// ---------------- Get single exam ----------------
router.get('/:id', (req, res) => {
  const examId = req.params.id;
  db.query(
    "SELECT exam_id, school_id, exam_type, term, created_at FROM exams WHERE exam_id = ?",
    [examId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
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
      if (err) return res.status(500).json({ error: 'Database error' });
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
      if (err) return res.status(500).json({ error: 'Database error' });
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
      if (err) return res.status(500).json({ error: 'Database error' });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Exam not found' });
      res.json({ success: true });
    }
  );
});

module.exports = router;
