const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Middleware: ensure user is logged in and has school_id
function requireSchool(req, res, next) {
  if (!req.session || !req.session.user || !req.session.user.school_id) {
    return res.status(401).json({ error: "Unauthorized: No school assigned" });
  }
  req.school_id = req.session.user.school_id; // 👈 store it in request
  next();
}

// ---------------- Get all exams with search & pagination ----------------
router.get('/', requireSchool, (req, res) => {
  let { search, page, limit } = req.query;

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const offset = (page - 1) * limit;

  let baseSql = `
    SELECT exam_id, school_id, exam_type, term, created_at 
    FROM exams 
    WHERE school_id = ?
  `;
  let countSql = `
    SELECT COUNT(*) as total 
    FROM exams 
    WHERE school_id = ?
  `;
  const params = [req.school_id];

  if (search) {
    search = `%${search}%`;
    baseSql += ` AND (exam_id LIKE ? OR exam_type LIKE ? OR term LIKE ?)`;
    countSql += ` AND (exam_id LIKE ? OR exam_type LIKE ? OR term LIKE ?)`;
    params.push(search, search, search);
  }

  baseSql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  db.query(baseSql, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    const countParams = [req.school_id];
    if (search) countParams.push(search, search, search);

    db.query(countSql, countParams, (err2, countResult) => {
      if (err2) return res.status(500).json({ error: err2.message });
      const total = countResult[0].total;
      res.json({ data: results, total, page, limit });
    });
  });
});

// ---------------- Get single exam ----------------
router.get('/:id', requireSchool, (req, res) => {
  const examId = req.params.id;
  db.query(
    "SELECT exam_id, school_id, exam_type, term, created_at FROM exams WHERE exam_id = ? AND school_id = ?",
    [examId, req.school_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (rows.length === 0) return res.status(404).json({ error: 'Exam not found' });
      res.json(rows[0]);
    }
  );
});
// ---------------- Create a new exam ----------------
router.post('/', requireSchool, (req, res) => {
  const { exam_type, term } = req.body;
  const school_id = req.school_id;

  if (!exam_type || !term) {
    return res.status(400).json({ error: 'Please provide exam_type and term' });
  }

  // ✅ Step 1: Check if same exam already exists
  const checkSql = `
    SELECT * FROM exams 
    WHERE school_id = ? AND term = ? AND exam_type = ?
  `;

  db.query(checkSql, [school_id, term, exam_type], (err, existing) => {
    if (err) return res.status(500).json({ error: 'Database error checking duplicate' });

    if (existing.length > 0) {
      return res.status(400).json({
        error: `⚠️ ${exam_type} for Term ${term} already exists for this school.`,
      });
    }

    // ✅ Step 2: Try inserting (in case of race condition)
    const insertSql = `
      INSERT INTO exams (school_id, exam_type, term) 
      VALUES (?, ?, ?)
    `;
    db.query(insertSql, [school_id, exam_type, term], (err2, result) => {
      if (err2) {
        // Handle duplicate key error from MySQL
        if (err2.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({
            error: `⚠️ ${exam_type} for Term ${term} already exists for this school.`,
          });
        }
        // Any other error
        return res.status(500).json({ error: 'Database error inserting exam' });
      }

      res.json({ success: true, exam_id: result.insertId });
    });
  });
});

// ---------------- Update an exam ----------------
router.put('/:id', requireSchool, (req, res) => {
  const examId = req.params.id;
  const { exam_type, term } = req.body;
  const school_id = req.school_id;

  if (!exam_type || !term) {
    return res.status(400).json({ error: 'Please provide exam_type and term' });
  }

  db.query(
    "UPDATE exams SET exam_type = ?, term = ? WHERE exam_id = ? AND school_id = ?",
    [exam_type, term, examId, school_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Exam not found or not in your school' });
      res.json({ success: true });
    }
  );
});

// ---------------- Delete an exam ----------------
router.delete('/:id', requireSchool, (req, res) => {
  const examId = req.params.id;
  db.query(
    "DELETE FROM exams WHERE exam_id = ? AND school_id = ?",
    [examId, req.school_id],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (result.affectedRows === 0) return res.status(404).json({ error: 'Exam not found or not in your school' });
      res.json({ success: true });
    }
  );
});

module.exports = router;
