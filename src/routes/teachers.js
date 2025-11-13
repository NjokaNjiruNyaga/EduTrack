const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ===== Middleware to check session =====
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}
router.use(requireLogin);

// ================== TEACHERS ==================

// Add teacher
router.post("/", (req, res) => {
  const { user_id, phone } = req.body;
  const school_id = req.session.user.school_id;

  const sql = "INSERT INTO teachers (user_id, phone, school_id) VALUES (?, ?, ?)";
  db.query(sql, [user_id, phone, school_id], err => {
    if (err) return res.status(500).json({ message: "Error adding teacher: " + err.message });
    res.json({ message: "✅ Teacher added successfully!" });
  });
});

// Get available teacher users
router.get("/available-users", (req, res) => {
  const school_id = req.session.user.school_id;
  const sql = `
    SELECT u.user_id, u.username, u.email 
    FROM users u
    WHERE u.role = 'teacher'
      AND u.school_id = ?
      AND NOT EXISTS (
        SELECT 1 FROM teachers t WHERE t.user_id = u.user_id
      )
  `;
  db.query(sql, [school_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error loading available users: " + err.message });
    res.json(results);
  });
});

// Get teachers
router.get("/", (req, res) => {
  const school_id = req.session.user.school_id;
  const sql = `
    SELECT t.teacher_id, u.username, u.email, t.phone
    FROM teachers t
    JOIN users u ON t.user_id = u.user_id
    WHERE u.school_id = ?
    ORDER BY t.teacher_id ASC
  `;
  db.query(sql, [school_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching teachers: " + err.message });
    res.json(results);
  });
});

// Update teacher
router.put("/:id", (req, res) => {
  const teacherId = req.params.id;
  const { username, email, phone } = req.body;
  const sql = `
    UPDATE users u
    JOIN teachers t ON u.user_id = t.user_id
    SET u.username = ?, u.email = ?, t.phone = ?
    WHERE t.teacher_id = ?
  `;
  db.query(sql, [username, email, phone, teacherId], (err, results) => {
    if (err) return res.status(500).json({ message: "Error updating teacher: " + err.message });
    if (results.affectedRows === 0) {
      return res.json({ message: "⚠️ No changes made. Teacher information is the same." });
    }
    res.json({ message: "✅ Teacher updated successfully!" });
  });
});

// Delete teacher
router.delete("/:id", (req, res) => {
  const teacherId = req.params.id;
  const sql = "DELETE FROM teachers WHERE teacher_id = ?";
  db.query(sql, [teacherId], err => {
    if (err) return res.status(500).json({ message: "Error deleting teacher: " + err.message });
    res.json({ message: "🗑️ Teacher deleted successfully!" });
  });
});

// ================== TEACHER–SUBJECTS ==================

// Assign subject
router.post("/subjects", (req, res) => {
  const { teacher_id, grade_id, subject_id } = req.body;
  const school_id = req.session.user.school_id;

  if (!teacher_id || !grade_id || !subject_id) {
    return res.status(400).json({ message: "Please fill in all required fields." });
  }

  const checkExistingSQL = `
    SELECT ts.id, u.username AS teacher_name 
    FROM teacher_subjects ts
    JOIN teachers t ON ts.teacher_id = t.teacher_id
    JOIN users u ON t.user_id = u.user_id
    WHERE ts.subject_id = ? AND ts.grade_id = ? AND ts.school_id = ?
  `;
  db.query(checkExistingSQL, [subject_id, grade_id, school_id], (err, existing) => {
    if (err) return res.status(500).json({ message: "Error checking existing subject: " + err.message });

    if (existing.length > 0) {
      return res.status(400).json({
        message: `❌ This subject has already been assigned to ${existing[0].teacher_name} for this class.`,
      });
    }

    const checkDuplicateSQL = `
      SELECT * FROM teacher_subjects
      WHERE teacher_id = ? AND grade_id = ? AND subject_id = ? AND school_id = ?
    `;
    db.query(checkDuplicateSQL, [teacher_id, grade_id, subject_id, school_id], (err2, duplicate) => {
      if (err2) return res.status(500).json({ message: "Error checking duplicates: " + err2.message });

      if (duplicate.length > 0) {
        return res.status(400).json({
          message: "❌ This teacher already handles this subject in this class.",
        });
      }

      const insertSQL = `
        INSERT INTO teacher_subjects (teacher_id, grade_id, subject_id, school_id)
        VALUES (?, ?, ?, ?)
      `;
      db.query(insertSQL, [teacher_id, grade_id, subject_id, school_id], err3 => {
        if (err3) return res.status(500).json({ message: "Error assigning subject: " + err3.message });
        res.json({ message: "✅ Subject assigned successfully!" });
      });
    });
  });
});

// Get teacher-subjects
router.get("/subjects", (req, res) => {
  const school_id = req.session.user.school_id;
  const sql = `
    SELECT ts.id, u.username AS teacher_name, ts.teacher_id, ts.grade_id, ts.subject_id,
      CONCAT('Grade ', g.grade_level, IF(g.stream IS NULL OR g.stream = '', '', CONCAT(' - ', g.stream))) AS grade_name,
      s.subject_name AS subject_name
    FROM teacher_subjects ts
    JOIN teachers t ON ts.teacher_id = t.teacher_id
    JOIN users u ON t.user_id = u.user_id
    JOIN grades g ON ts.grade_id = g.grade_id
    JOIN subjects s ON ts.subject_id = s.subject_id
    WHERE ts.school_id = ?
    ORDER BY ts.id ASC
  `;
  db.query(sql, [school_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching teacher-subjects: " + err.message });
    res.json(results);
  });
});

// Update teacher-subject
router.put("/subjects/:id", (req, res) => {
  const id = req.params.id;
  const { teacher_id, grade_id, subject_id } = req.body;
  const sql = `
    UPDATE teacher_subjects
    SET teacher_id = ?, grade_id = ?, subject_id = ?
    WHERE id = ?
  `;
  db.query(sql, [teacher_id, grade_id, subject_id, id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error updating teacher-subject: " + err.message });
    if (results.affectedRows === 0) {
      return res.json({ message: "⚠️ No changes made. Teacher-Subject info is the same." });
    }
    res.json({ message: "✅ Teacher–Subject updated successfully!" });
  });
});

// Delete teacher-subject
router.delete("/subjects/:id", (req, res) => {
  const id = req.params.id;
  const sql = "DELETE FROM teacher_subjects WHERE id = ?";
  db.query(sql, [id], err => {
    if (err) return res.status(500).json({ message: "Error deleting teacher-subject: " + err.message });
    res.json({ message: "🗑️ Teacher–Subject deleted successfully!" });
  });
});

// ================== CLASS TEACHERS ==================

// Assign class teacher
router.post("/class", (req, res) => {
  const { teacher_id, grade_id } = req.body;
  const school_id = req.session.user.school_id;

  const checkGradeSQL = "SELECT * FROM teacher_grades WHERE grade_id = ? AND school_id = ?";
  db.query(checkGradeSQL, [grade_id, school_id], (err, gradeResults) => {
    if (err) return res.status(500).json({ message: "Error checking class: " + err.message });

    if (gradeResults.length > 0) {
      return res.status(400).json({
        message: "❌ This class already has a class teacher assigned. Please choose a different class.",
      });
    }

    const checkTeacherSQL = "SELECT * FROM teacher_grades WHERE teacher_id = ? AND school_id = ?";
    db.query(checkTeacherSQL, [teacher_id, school_id], (err2, teacherResults) => {
      if (err2) return res.status(500).json({ message: "Error checking teacher: " + err2.message });

      if (teacherResults.length > 0) {
        return res.status(400).json({
          message: "❌ This teacher is already assigned as a class teacher for another grade.",
        });
      }

      const insertSQL = "INSERT INTO teacher_grades (teacher_id, grade_id, school_id) VALUES (?, ?, ?)";
      db.query(insertSQL, [teacher_id, grade_id, school_id], (err3) => {
        if (err3) return res.status(500).json({ message: "Failed to assign class teacher: " + err3.message });
        res.json({ message: "✅ Class teacher assigned successfully!" });
      });
    });
  });
});

// Get class teachers
router.get("/class", (req, res) => {
  const school_id = req.session.user.school_id;
  const sql = `
    SELECT tg.id, u.username AS teacher_name, tg.teacher_id, tg.grade_id,
      CONCAT('Grade ', g.grade_level, IF(g.stream IS NULL OR g.stream = '', '', CONCAT(' - ', g.stream))) AS grade_name
    FROM teacher_grades tg
    JOIN teachers t ON tg.teacher_id = t.teacher_id
    JOIN users u ON t.user_id = u.user_id
    JOIN grades g ON tg.grade_id = g.grade_id
    WHERE tg.school_id = ?
    ORDER BY tg.id ASC
  `;
  db.query(sql, [school_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching class teachers: " + err.message });
    res.json(results);
  });
});

// Update class teacher
router.put("/class/:id", (req, res) => {
  const id = req.params.id;
  const { teacher_id, grade_id } = req.body;
  const school_id = req.session.user.school_id;

  if (!teacher_id || !grade_id) {
    return res.status(400).json({ message: "Please select both Teacher and Grade." });
  }

  // Check if grade already has a different class teacher
  const checkGradeSQL = "SELECT * FROM teacher_grades WHERE grade_id = ? AND school_id = ? AND id != ?";
  db.query(checkGradeSQL, [grade_id, school_id, id], (err, gradeResults) => {
    if (err) return res.status(500).json({ message: "Error checking class: " + err.message });
    if (gradeResults.length > 0) {
      return res.status(400).json({ message: "❌ This class already has a class teacher assigned." });
    }

    // Check if teacher is assigned to another class
    const checkTeacherSQL = "SELECT * FROM teacher_grades WHERE teacher_id = ? AND school_id = ? AND id != ?";
    db.query(checkTeacherSQL, [teacher_id, school_id, id], (err2, teacherResults) => {
      if (err2) return res.status(500).json({ message: "Error checking teacher: " + err2.message });
      if (teacherResults.length > 0) {
        return res.status(400).json({ message: "❌ This teacher is already assigned as a class teacher for another grade." });
      }

      // Update the class teacher
      const updateSQL = "UPDATE teacher_grades SET teacher_id = ?, grade_id = ? WHERE id = ?";
      db.query(updateSQL, [teacher_id, grade_id, id], (err3, results) => {
        if (err3) return res.status(500).json({ message: "Failed to update class teacher: " + err3.message });
        if (results.affectedRows === 0) {
          return res.json({ message: "⚠️ No changes made. Class teacher information is the same." });
        }
        res.json({ message: "✅ Class teacher updated successfully!" });
      });
    });
  });
});

// Delete class teacher
router.delete("/class/:id", (req, res) => {
  const id = req.params.id;
  const school_id = req.session.user.school_id;

  const checkSQL = "SELECT * FROM teacher_grades WHERE id = ? AND school_id = ?";
  db.query(checkSQL, [id, school_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error checking class teacher: " + err.message });
    if (results.length === 0) return res.status(404).json({ message: "Class teacher not found." });

    const deleteSQL = "DELETE FROM teacher_grades WHERE id = ?";
    db.query(deleteSQL, [id], (err2) => {
      if (err2) return res.status(500).json({ message: "Failed to delete class teacher: " + err2.message });
      res.json({ message: "🗑️ Class teacher deleted successfully!" });
    });
  });
});

// ================== DROPDOWNS ==================
router.get("/grades", (req, res) => {
  const school_id = req.session.user.school_id;
  const sql = "SELECT grade_id, grade_level, stream FROM grades WHERE school_id = ?";
  db.query(sql, [school_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching grades: " + err.message });
    const formatted = results.map(g => ({
      grade_id: g.grade_id,
      name: `Grade ${g.grade_level}${g.stream ? ' - ' + g.stream : ''}`
    }));
    res.json(formatted);
  });
});

router.get("/subjects-list", (req, res) => {
  const school_id = req.session.user.school_id;
  const sql = "SELECT subject_id, subject_name FROM subjects WHERE school_id = ? AND status = 'active'";
  db.query(sql, [school_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching subjects: " + err.message });
    const formatted = results.map(s => ({ subject_id: s.subject_id, name: s.subject_name }));
    res.json(formatted);
  });
});

module.exports = router;
