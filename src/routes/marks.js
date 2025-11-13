const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ===== Get teacher assignments =====
router.get('/teacher-assignments', async (req,res)=>{
  const user = req.session.user;
  if(!user) return res.status(403).json({message:"Unauthorized"});

  try {
    const [teacherRows] = await db.promise().query(
      "SELECT teacher_id, school_id FROM teachers WHERE user_id=? LIMIT 1",
      [user.user_id]
    );
    if(!teacherRows.length) return res.status(404).json({message:"Teacher not found"});

    const teacherId = teacherRows[0].teacher_id;
    const schoolId = teacherRows[0].school_id;

    const [assignments] = await db.promise().query(`
      SELECT ts.id AS assignment_id, ts.subject_id, ts.grade_id,
             subj.subject_name, g.grade_level, g.stream
      FROM teacher_subjects ts
      JOIN subjects subj ON ts.subject_id=subj.subject_id
      JOIN grades g ON ts.grade_id=g.grade_id
      WHERE ts.teacher_id=? AND ts.school_id=?
      ORDER BY subj.subject_name, g.grade_level
    `, [teacherId, schoolId]);

    res.json({teacherId, schoolId, assignments});
  } catch(err){
    console.error(err);
    res.status(500).json({message:"Server error fetching assignments"});
  }
});

// ===== Get students by grade & subject, including existing marks/status =====
router.get('/students', async (req, res) => {
  const { gradeId, subjectId, exam_type, term } = req.query;
  const schoolId = req.session.user?.school_id;
  if (!gradeId || !schoolId || !subjectId || !exam_type || !term)
    return res.status(400).json({ message: "Missing parameters" });

  try {
    // Get or create exam
    let [examRows] = await db.promise().query(
      `SELECT exam_id FROM exams WHERE school_id=? AND exam_type=? AND term=? LIMIT 1`,
      [schoolId, exam_type, term]
    );
    let examId;
    if (examRows.length) examId = examRows[0].exam_id;
    else {
      const [newExam] = await db.promise().query(
        `INSERT INTO exams (school_id, exam_type, term) VALUES (?, ?, ?)`,
        [schoolId, exam_type, term]
      );
      examId = newExam.insertId;
    }

    // Load students with existing marks/status
    const [students] = await db.promise().query(
      `SELECT s.id, s.name, s.admission_no,
              m.marks, m.level, m.points, m.position, m.status
       FROM students s
       LEFT JOIN marks m
         ON s.id = m.student_id
         AND m.subject_id = ?
         AND m.exam_id = ?
       WHERE s.grade_id=? AND s.school_id=?
       ORDER BY s.name ASC`,
      [subjectId, examId, gradeId, schoolId]
    );

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error fetching students" });
  }
});

// ===== Save marks (with status) and update positions =====
router.post('/', async (req, res) => {
  const { studentId, subjectId, gradeId, exam_type, term, marks, status } = req.body;
  const user = req.session.user;
  if (!user) return res.status(403).json({ message: "Unauthorized" });

  try {
    const [teacherRows] = await db.promise().query(
      `SELECT teacher_id, school_id FROM teachers WHERE user_id = ? LIMIT 1`,
      [user.user_id]
    );
    if (!teacherRows.length) return res.status(404).json({ message: "Teacher not found" });

    const teacherId = teacherRows[0].teacher_id;
    const schoolId = teacherRows[0].school_id;

    // Determine level & points
    let level = null, points = null;
    if (marks !== null) {
      if (marks >= 90) { level='EE1'; points=4.0; }
      else if (marks >= 75) { level='EE2'; points=3.5; }
      else if (marks >= 58) { level='ME1'; points=3.0; }
      else if (marks >= 41) { level='ME2'; points=2.5; }
      else if (marks >= 31) { level='AE1'; points=2.0; }
      else if (marks >= 21) { level='AE2'; points=1.5; }
      else if (marks >= 11) { level='BE1'; points=1.0; }
      else { level='BE2'; points=0.5; }
    }

    // Check or create exam
    const [existingExam] = await db.promise().query(
      `SELECT exam_id FROM exams WHERE school_id = ? AND exam_type = ? AND term = ? LIMIT 1`,
      [schoolId, exam_type, term]
    );
    let examId;
    if (existingExam.length) examId = existingExam[0].exam_id;
    else {
      const [newExam] = await db.promise().query(
        `INSERT INTO exams (school_id, exam_type, term) VALUES (?, ?, ?)`,
        [schoolId, exam_type, term]
      );
      examId = newExam.insertId;
    }

    // Insert or update marks with status
    await db.promise().query(
      `INSERT INTO marks (student_id, subject_id, exam_id, teacher_id, school_id, marks, level, points, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE marks=VALUES(marks), level=VALUES(level), points=VALUES(points), status=VALUES(status)`,
      [studentId, subjectId, examId, teacherId, schoolId, marks, level, points, status]
    );

    // ===== Update positions for numeric marks only =====
    const [allMarks] = await db.promise().query(
      `SELECT student_id, marks
       FROM marks
       WHERE school_id=? AND subject_id=? AND exam_id=? AND marks IS NOT NULL
       ORDER BY marks DESC, student_id ASC`,
      [schoolId, subjectId, examId]
    );

    let currentPos = 0;
    let sameMarkCount = 0;
    let lastMark = null;

    for (let i = 0; i < allMarks.length; i++) {
      const mark = allMarks[i].marks;
      if (mark === lastMark) sameMarkCount++;
      else { currentPos += 1 + sameMarkCount; sameMarkCount = 0; }
      lastMark = mark;

      await db.promise().query(
        `UPDATE marks SET position=? WHERE student_id=? AND subject_id=? AND exam_id=?`,
        [currentPos, allMarks[i].student_id, subjectId, examId]
      );
    }

    res.json({ message: "✅ Marks saved successfully", examId });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error saving marks" });
  }
});

module.exports = router;
 