const express = require('express');
const router = express.Router();
const db = require('../config/db');

// -------------------- GET ALL SUBJECTS --------------------
router.get('/', (req, res) => {
  const { grade } = req.query;

  let sql = 'SELECT * FROM subjects';
  let params = [];

  // If grade filter is provided
  if (grade) {
    sql += ' WHERE grade_from <= ? AND grade_to >= ? AND status="active"';
    params = [grade, grade];
  }

  sql += ' ORDER BY subject_id';

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
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
