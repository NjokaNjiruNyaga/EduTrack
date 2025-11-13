const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ==================== TEACHER DASHBOARD HOME ====================
router.get("/home", (req, res) => {
  const userId = req.session?.user?.user_id;
  const schoolId = req.session?.user?.school_id;

  if (!userId || !schoolId)
    return res.status(401).json({ message: "Unauthorized" });

  const getTeacherIdSQL = `
    SELECT teacher_id 
    FROM teachers 
    WHERE user_id = ? AND school_id = ?
  `;

  db.query(getTeacherIdSQL, [userId, schoolId], (err, teacherRes) => {
    if (err) return res.status(500).json({ message: "Error fetching teacher ID" });
    if (teacherRes.length === 0)
      return res.status(404).json({ message: "Teacher record not found" });

    const teacherId = teacherRes[0].teacher_id;

    const dashboardSQL = `
      SELECT 
        u.username AS teacherName,

        (SELECT term FROM exams WHERE school_id = ? ORDER BY created_at DESC LIMIT 1) AS currentTerm,
        (SELECT COUNT(*) FROM teacher_subjects WHERE teacher_id = ?) AS subjectsCount,

        (
          SELECT COUNT(DISTINCT grade_id)
          FROM (
            SELECT grade_id FROM teacher_subjects WHERE teacher_id = ?
            UNION
            SELECT grade_id FROM teacher_grades WHERE teacher_id = ?
          ) AS all_classes
        ) AS classesCount,

        (
          SELECT COUNT(*) 
          FROM students 
          WHERE grade_id IN (
            SELECT DISTINCT grade_id 
            FROM (
              SELECT grade_id FROM teacher_subjects WHERE teacher_id = ?
              UNION
              SELECT grade_id FROM teacher_grades WHERE teacher_id = ?
            ) AS teacher_grades
          ) 
          AND school_id = ?
        ) AS studentsCount,

        (SELECT COUNT(*) FROM exams WHERE school_id = ?) AS examsCount
      FROM users u
      WHERE u.user_id = ?
    `;

    db.query(
      dashboardSQL,
      [
        schoolId,
        teacherId,
        teacherId,
        teacherId,
        teacherId,
        teacherId,
        schoolId,
        schoolId,
        userId,
      ],
      (err2, results) => {
        if (err2) return res.status(500).json({ message: "Error fetching dashboard" });

        const data = results[0] || {};
        data.currentTerm = data.currentTerm ? `Term ${data.currentTerm}` : "Not Set";
        res.json(data);
      }
    );
  });
});

// ==================== TEACHER SUBJECTS ====================
router.get("/subjects", (req, res) => {
  const userId = req.session?.user?.user_id;
  const schoolId = req.session?.user?.school_id;

  if (!userId || !schoolId)
    return res.status(401).json({ message: "Unauthorized" });

  const sql = `
    SELECT 
      ts.subject_id, 
      ts.grade_id, 
      s.subject_name, 
      g.grade_level, 
      g.stream
    FROM teacher_subjects ts
    JOIN subjects s ON ts.subject_id = s.subject_id
    JOIN grades g ON ts.grade_id = g.grade_id
    JOIN teachers t ON ts.teacher_id = t.teacher_id
    WHERE t.user_id = ? AND t.school_id = ?;
  `;

  db.query(sql, [userId, schoolId], (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching subjects" });
    res.json(results);
  });
});

// ==================== VIEW STUDENTS IN A SUBJECT ====================
router.get("/subject/:gradeId/:subjectId/students", (req, res) => {
  const { gradeId, subjectId } = req.params;
  const userId = req.session?.user?.user_id;
  const schoolId = req.session?.user?.school_id;

  console.log("📘 Request received for:", { gradeId, subjectId, userId, schoolId });

  if (!userId || !schoolId)
    return res.status(401).json({ message: "Unauthorized" });

  const teacherSql = `
    SELECT teacher_id 
    FROM teachers 
    WHERE user_id = ? AND school_id = ?
  `;

  db.query(teacherSql, [userId, schoolId], (err, teacherRes) => {
    if (err) return res.status(500).json({ message: "Error fetching teacher_id" });
    if (teacherRes.length === 0)
      return res.status(404).json({ message: "Teacher not found" });

    const teacherId = teacherRes[0].teacher_id;

    const sql = `
      SELECT 
        s.id AS student_id,
        s.name,
        s.admission_no,
        s.gender,
        g.grade_level,
        g.stream
      FROM teacher_subjects ts
      JOIN grades g ON ts.grade_id = g.grade_id
      LEFT JOIN students s ON s.grade_id = g.grade_id
      WHERE ts.teacher_id = ?
        AND ts.subject_id = ?
        AND ts.grade_id = ?;
    `;

    db.query(sql, [teacherId, subjectId, gradeId], (err2, results) => {
      if (err2) return res.status(500).json({ message: "Error fetching subject students" });
      res.json(results);
    });
  });
});

// ==================== TEACHER CLASSES ====================
router.get("/class", (req, res) => {
  const userId = req.session?.user?.user_id;
  const schoolId = req.session?.user?.school_id;

  if (!userId || !schoolId)
    return res.status(401).json({ message: "Unauthorized" });

  const sql = `
    SELECT 
      g.grade_id,
      g.grade_level, 
      g.stream, 
      COUNT(s.id) AS student_count
    FROM teacher_grades tg
    JOIN grades g ON tg.grade_id = g.grade_id
    LEFT JOIN students s ON s.grade_id = g.grade_id
    JOIN teachers t ON tg.teacher_id = t.teacher_id
    WHERE t.user_id = ? AND t.school_id = ?
    GROUP BY g.grade_id;
  `;

  db.query(sql, [userId, schoolId], (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching class data" });
    res.json(results);
  });
});

// ==================== VIEW STUDENTS IN CLASS ====================
router.get("/class/:gradeId/students", (req, res) => {
  const { gradeId } = req.params;
  const userId = req.session?.user?.user_id;
  const schoolId = req.session?.user?.school_id;

  if (!userId || !schoolId)
    return res.status(401).json({ message: "Unauthorized" });

  const sql = `
    SELECT s.id, s.name, s.admission_no, s.gender
    FROM students s
    WHERE s.grade_id = ? AND s.school_id = ?
    ORDER BY s.name ASC;
  `;

  db.query(sql, [gradeId, schoolId], (err, results) => {
    if (err) return res.status(500).json({ message: "Error fetching students" });
    res.json(results);
  });
});

module.exports = router;
