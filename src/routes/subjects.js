const express = require('express');
const router = express.Router();
const db = require('../config/db');

// -------------------- GET ALL SUBJECTS WITH SEARCH & PAGINATION --------------------
router.get('/', (req, res) => {
  let { search, page, limit } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const offset = (page - 1) * limit;

  let baseSql = 'SELECT * FROM subjects';
  let countSql = 'SELECT COUNT(*) as total FROM subjects';
  const params = [];

  if (search) {
    search = `%${search}%`;
    baseSql += ' WHERE subject_name LIKE ? OR category LIKE ? OR grade_from LIKE ? OR grade_to LIKE ?';
    countSql += ' WHERE subject_name LIKE ? OR category LIKE ? OR grade_from LIKE ? OR grade_to LIKE ?';
    params.push(search, search, search, search, search, search, search, search);
  }

  baseSql += ' ORDER BY subject_id LIMIT ? OFFSET ?';
  params.push(limit, offset);

  db.query(baseSql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query(countSql, search ? [search, search, search, search, search, search, search, search] : [], (err2, countResult) => {
      if (err2) return res.status(500).json({ error: err2.message });
      const total = countResult[0].total;
      res.json({ data: results, total, page, limit });
    });
  });
});

// -------------------- GET SUBJECT BY ID --------------------
router.get('/:id', (req, res) => {
  const sql = 'SELECT * FROM subjects WHERE subject_id = ?';
  db.query(sql, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: 'Subject not found' });
    res.json(results[0]);
  });
});

// -------------------- ADD NEW SUBJECT --------------------
router.post('/', (req, res) => {
  const { subject_name, grade_from, grade_to, category, status } = req.body;
  const sql = 'INSERT INTO subjects (subject_name, grade_from, grade_to, category, status) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [subject_name, grade_from, grade_to, category, status], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Subject added', subject_id: results.insertId });
  });
});

// -------------------- UPDATE SUBJECT --------------------
router.put('/:id', (req, res) => {
  const { subject_name, grade_from, grade_to, category, status } = req.body;
  const sql = 'UPDATE subjects SET subject_name = ?, grade_from = ?, grade_to = ?, category = ?, status = ? WHERE subject_id = ?';
  db.query(sql, [subject_name, grade_from, grade_to, category, status, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Subject updated' });
  });
});

// -------------------- DELETE SUBJECT --------------------
router.delete('/:id', (req, res) => {
  const sql = 'DELETE FROM subjects WHERE subject_id = ?';
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Subject deleted' });
  });
});

module.exports = router;
