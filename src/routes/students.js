const express = require("express");
const router = express.Router();
const db = require("../config/db"); // DB connection

// ========== ADD STUDENT ==========
router.post("/", (req, res) => {
  const { name, admission_no, date_of_birth, gender, grade, stream, parent_contact, user_id } = req.body;

  if (!name || !admission_no || !date_of_birth || !gender || !grade || !stream || !parent_contact) {
    return res.status(400).json({ message: "⚠️ All fields are required" });
  }

  // 🔍 Check if admission_no already exists
  const checkSql = "SELECT * FROM students WHERE admission_no = ?";
  db.query(checkSql, [admission_no], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.length > 0) {
      return res.status(400).json({ message: "⚠️ A student with this admission number already exists" });
    }

    // ✅ Insert new student (user_id can be NULL if not provided)
    const sql = `
      INSERT INTO students 
      (name, admission_no, date_of_birth, gender, grade, stream, parent_contact, status, user_id, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW())
    `;

    db.query(
      sql,
      [name, admission_no, date_of_birth, gender, grade, stream, parent_contact, user_id || null],
      (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "✅ Student added successfully", studentId: result.insertId });
      }
    );
  });
});

// ========== GET ALL STUDENTS ==========
router.get("/", (req, res) => {
  const sql = "SELECT * FROM students ORDER BY created_at DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// ========== GET SINGLE STUDENT ==========
router.get("/:id", (req, res) => {
  const sql = "SELECT * FROM students WHERE id = ?";
  db.query(sql, [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.length === 0) return res.status(404).json({ message: "❌ Student not found" });
    res.json(result[0]);
  });
});

// ========== UPDATE STUDENT ==========
router.put("/:id", (req, res) => {
  const { name, admission_no, date_of_birth, gender, grade, stream, parent_contact, status, user_id } = req.body;

  const sql = `
    UPDATE students 
    SET name = ?, admission_no = ?, date_of_birth = ?, gender = ?, grade = ?, stream = ?, 
        parent_contact = ?, status = ?, user_id = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [name, admission_no, date_of_birth, gender, grade, stream, parent_contact, status, user_id || null, req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "✅ Student updated successfully" });
    }
  );
});

// ========== DELETE STUDENT ==========
router.delete("/:id", (req, res) => {
  const sql = "DELETE FROM students WHERE id = ?";
  db.query(sql, [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "🗑️ Student deleted successfully" });
  });
});

module.exports = router;
