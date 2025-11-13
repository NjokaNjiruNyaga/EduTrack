const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");

// Middleware to enforce logged-in school
function requireSchool(req, res, next) {
  if (!req.session.user || !req.session.user.school_id) {
    return res.status(401).json({ success: false, message: "⚠️ Unauthorized: school_id missing" });
  }
  req.school_id = req.session.user.school_id;
  next();
}

// ===== ADD STUDENT =====
router.post("/", requireSchool, async (req, res) => {
  const { name, admission_no, date_of_birth, gender, grade_id, parent_contact } = req.body;

  if (!name || !admission_no || !date_of_birth || !gender || !grade_id || !parent_contact) {
    return res.status(400).json({ success: false, message: "⚠️ All fields are required" });
  }

  const checkSql = "SELECT 1 FROM students WHERE admission_no = ? AND school_id = ?";
  db.query(checkSql, [admission_no, req.school_id], async (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (result.length > 0) {
      return res.status(400).json({
        success: false,
        message: "⚠️ A student with this admission number already exists in this school",
      });
    }

    // Create user account
    const passwordHash = await bcrypt.hash(admission_no, 10);
    const userSql = `
      INSERT INTO users (username, role, password, email, school_id, created_at)
      VALUES (?, 'student', ?, NULL, ?, NOW())
    `;
    db.query(userSql, [admission_no, passwordHash, req.school_id], (err2, userResult) => {
      if (err2) return res.status(500).json({ success: false, error: err2.message });

      const user_id = userResult.insertId;

      // Insert student record
      const studentSql = `
        INSERT INTO students
        (name, admission_no, date_of_birth, gender, parent_contact, grade_id, status, user_id, school_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, NOW())
      `;
      db.query(
        studentSql,
        [name, admission_no, date_of_birth, gender, parent_contact, grade_id, user_id, req.school_id],
        (err3, studentResult) => {
          if (err3) return res.status(500).json({ success: false, error: err3.message });

          const getStudentSql = "SELECT * FROM students WHERE id = ?";
          db.query(getStudentSql, [studentResult.insertId], (err4, rows) => {
            if (err4) return res.status(500).json({ success: false, error: err4.message });
            res.json({ success: true, message: "✅ Student and user created successfully", data: rows[0] });
          });
        }
      );
    });
  });
});

// ===== GET ALL STUDENTS =====
router.get("/", requireSchool, (req, res) => {
  let { search, page, limit } = req.query;
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;
  const offset = (page - 1) * limit;

  let where = "WHERE s.school_id = ?";
  let params = [req.school_id];

  if (search) {
    search = `%${search}%`;
    where += " AND (s.name LIKE ? OR s.admission_no LIKE ? OR g.stream LIKE ? OR g.grade_level LIKE ?)";
    params.push(search, search, search, search);
  }

  const baseSql = `
    SELECT s.*, g.grade_level, g.stream 
    FROM students s
    LEFT JOIN grades g ON s.grade_id = g.grade_id
    ${where}
    ORDER BY s.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) as total 
    FROM students s
    LEFT JOIN grades g ON s.grade_id = g.grade_id
    ${where}
  `;

  db.query(baseSql, [...params, limit, offset], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    db.query(countSql, params, (err2, countResult) => {
      if (err2) return res.status(500).json({ success: false, error: err2.message });

      res.json({
        success: true,
        data: results,
        pagination: {
          total: countResult[0].total,
          page,
          limit,
          totalPages: Math.ceil(countResult[0].total / limit),
        },
      });
    });
  });
});

// ===== GET SINGLE STUDENT =====
router.get("/:student_id", requireSchool, (req, res) => {
  const sql = `
    SELECT s.*, g.grade_level, g.stream 
    FROM students s
    LEFT JOIN grades g ON s.grade_id = g.grade_id
    WHERE s.id = ? AND s.school_id = ?
  `;
  db.query(sql, [req.params.student_id, req.school_id], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (result.length === 0) return res.status(404).json({ success: false, message: "❌ Student not found" });
    res.json({ success: true, data: result[0] });
  });
});

// ===== UPDATE STUDENT =====
router.put("/:student_id", requireSchool, (req, res) => {
  const { name, admission_no, date_of_birth, gender, grade_id, parent_contact, status } = req.body;

  // Fetch existing student
  const getSql = "SELECT * FROM students WHERE id = ? AND school_id = ?";
  db.query(getSql, [req.params.student_id, req.school_id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: "❌ Student not found" });

    const student = rows[0];
    const oldAdmissionNo = student.admission_no;
    const user_id = student.user_id;

    // Update student
    const updateSql = `
      UPDATE students
      SET name=?, admission_no=?, date_of_birth=?, gender=?, parent_contact=?, grade_id=?, status=?
      WHERE id=? AND school_id=?
    `;
    db.query(
      updateSql,
      [name, admission_no, date_of_birth, gender, parent_contact, grade_id, status, req.params.student_id, req.school_id],
      (err2) => {
        if (err2) return res.status(500).json({ success: false, error: err2.message });

        // Update linked user's username if admission_no changed
        if (user_id && admission_no !== oldAdmissionNo) {
          const updateUserSql = "UPDATE users SET username=? WHERE user_id=?";
          db.query(updateUserSql, [admission_no, user_id], (err3) => {
            if (err3) console.error("⚠️ Failed to update linked user username:", err3.message);
          });
        }

        // Return updated student
        const getUpdatedSql = "SELECT * FROM students WHERE id = ?";
        db.query(getUpdatedSql, [req.params.student_id], (err4, updatedRows) => {
          if (err4) return res.status(500).json({ success: false, error: err4.message });
          res.json({ success: true, message: "✅ Student updated successfully", data: updatedRows[0] });
        });
      }
    );
  });
});

// ===== DELETE STUDENT (and linked user) =====
router.delete("/:student_id", requireSchool, (req, res) => {
  // Get the student first to retrieve user_id
  const getStudentSql = "SELECT * FROM students WHERE id=? AND school_id=?";
  db.query(getStudentSql, [req.params.student_id, req.school_id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (rows.length === 0) return res.status(404).json({ success: false, message: "❌ Student not found" });

    const student = rows[0];
    const user_id = student.user_id;

    // Delete the student
    const deleteStudentSql = "DELETE FROM students WHERE id=? AND school_id=?";
    db.query(deleteStudentSql, [req.params.student_id, req.school_id], (err2) => {
      if (err2) return res.status(500).json({ success: false, error: err2.message });

      // Delete linked user if exists
      if (user_id) {
        const deleteUserSql = "DELETE FROM users WHERE user_id=?"; // ✅ Corrected
        db.query(deleteUserSql, [user_id], (err3) => {
          if (err3) console.error("⚠️ Failed to delete linked user:", err3.message);
        });
      }

      res.json({ success: true, message: "🗑️ Student and linked user deleted successfully" });
    });
  });
});


module.exports = router;
