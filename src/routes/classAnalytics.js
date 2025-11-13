const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ===== CLASS TEACHER ANALYTICS =====
router.get("/class-performance", async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(403).json({ message: "Unauthorized" });

  try {
    // Find teacher
    const [teacherRows] = await db.promise().query(
      "SELECT teacher_id, school_id FROM teachers WHERE user_id=? LIMIT 1",
      [user.user_id]
    );
    if (!teacherRows.length)
      return res.status(404).json({ message: "Teacher not found" });

    const { teacher_id, school_id } = teacherRows[0];

    // Get teacher's class
    const [classRow] = await db.promise().query(
      "SELECT grade_id FROM teacher_grades WHERE teacher_id=? AND school_id=? LIMIT 1",
      [teacher_id, school_id]
    );
    if (!classRow.length)
      return res.json({ message: "Not assigned as class teacher", data: null });

    const grade_id = classRow[0].grade_id;

    // Get grade details
    const [gradeDetails] = await db.promise().query(
      "SELECT grade_level, stream FROM grades WHERE grade_id=?",
      [grade_id]
    );
    if (!gradeDetails.length)
      return res.status(404).json({ message: "Class not found", data: null });

    const { grade_level, stream } = gradeDetails[0];

    // Latest exam
    const [latestExam] = await db.promise().query(
      `SELECT exam_id, term, exam_type FROM exams
       WHERE school_id=? ORDER BY term DESC, created_at DESC LIMIT 1`,
      [school_id]
    );
    if (!latestExam.length)
      return res.json({ message: "No exams found", data: null });

    const { exam_id, term, exam_type } = latestExam[0];

    // Class average
    const [classAvg] = await db.promise().query(
      `SELECT ROUND(AVG(m.marks),2) AS avg
       FROM marks m
       JOIN students s ON m.student_id = s.id
       WHERE s.grade_id=? AND m.exam_id=?`,
      [grade_id, exam_id]
    );

    const class_average = classAvg[0]?.avg || null;

    // Subject performance (this stream)
    const [subjectPerf] = await db.promise().query(
      `SELECT sub.subject_name, ROUND(AVG(m.marks),2) AS average
       FROM marks m
       JOIN subjects sub ON m.subject_id = sub.subject_id
       JOIN students s ON m.student_id = s.id
       WHERE s.grade_id=? AND m.exam_id=?
       GROUP BY sub.subject_id ORDER BY sub.subject_name`,
      [grade_id, exam_id]
    );

    // Top 5 students
    const [topStudents] = await db.promise().query(
      `SELECT s.name, ROUND(AVG(m.marks),2) AS avg_marks
       FROM marks m
       JOIN students s ON m.student_id = s.id
       WHERE s.grade_id=? AND m.exam_id=?
       GROUP BY s.id ORDER BY avg_marks DESC LIMIT 5`,
      [grade_id, exam_id]
    );

    // Stream comparison
    const [streamComparison] = await db.promise().query(
      `SELECT g.stream, ROUND(AVG(m.marks),2) AS avg
       FROM marks m
       JOIN students s ON m.student_id = s.id
       JOIN grades g ON s.grade_id = g.grade_id
       WHERE g.grade_level=? AND g.school_id=? AND m.exam_id=?
       GROUP BY g.stream ORDER BY g.stream`,
      [grade_level, school_id, exam_id]
    );

    // Subject comparison across all streams
    const [subjectComparisonRaw] = await db.promise().query(
      `SELECT g.stream, sub.subject_name, ROUND(AVG(m.marks),2) AS average
       FROM marks m
       JOIN subjects sub ON m.subject_id = sub.subject_id
       JOIN students s ON m.student_id = s.id
       JOIN grades g ON s.grade_id = g.grade_id
       WHERE g.grade_level=? AND g.school_id=? AND m.exam_id=?
       GROUP BY g.stream, sub.subject_id
       ORDER BY g.stream, sub.subject_name`,
      [grade_level, school_id, exam_id]
    );

    // Group by stream
    const subject_comparison = [];
    subjectComparisonRaw.forEach(row => {
      let streamGroup = subject_comparison.find(s => s.stream === row.stream);
      if (!streamGroup) {
        streamGroup = { stream: row.stream, subjects: [] };
        subject_comparison.push(streamGroup);
      }
      streamGroup.subjects.push({
        subject_name: row.subject_name,
        average: row.average
      });
    });

    res.json({
      data: {
        grade_level,
        stream,
        term,
        exam_type,
        class_average,
        subject_performance: subjectPerf,
        top_students: topStudents,
        stream_comparison: streamComparison,
        subject_comparison
      },
    });
  } catch (err) {
    console.error("❌ Error fetching class analytics:", err);
    res.status(500).json({ message: "Server error fetching class analytics", error: err });
  }
});

module.exports = router;
