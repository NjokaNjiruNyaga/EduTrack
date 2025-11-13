const express = require("express");
const router = express.Router();
const db = require("../config/db");

// ===== SUBJECT PERFORMANCE ANALYTICS =====
router.get("/subject-performance", async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(403).json({ message: "Unauthorized" });

  try {
    // 1️⃣ Get teacher info
    const [teacherRows] = await db
      .promise()
      .query("SELECT teacher_id, school_id FROM teachers WHERE user_id=? LIMIT 1", [user.user_id]);

    if (!teacherRows.length)
      return res.status(404).json({ message: "Teacher not found" });

    const teacherId = teacherRows[0].teacher_id;
    const schoolId = teacherRows[0].school_id;

    // 2️⃣ Get teacher’s subjects
    const [subjects] = await db
      .promise()
      .query(
        `SELECT 
            ts.subject_id, 
            s.subject_name,
            g.grade_level AS grade,
            g.stream,
            g.grade_id
         FROM teacher_subjects ts
         JOIN subjects s ON ts.subject_id = s.subject_id
         JOIN grades g ON ts.grade_id = g.grade_id
         WHERE ts.teacher_id=? AND ts.school_id=?`,
        [teacherId, schoolId]
      );

    if (!subjects.length)
      return res.json({ message: "No subjects assigned", data: [] });

    const result = [];

    // 3️⃣ Process each subject
    for (const subj of subjects) {
      // --- Average marks per exam type per term (for trend chart) ---
      const [examAverages] = await db.promise().query(
        `SELECT e.term, e.exam_type, ROUND(AVG(m.marks), 2) AS average
         FROM marks m
         JOIN exams e ON m.exam_id = e.exam_id
         JOIN students st ON m.student_id = st.id
         WHERE m.school_id=? AND m.subject_id=? 
           AND st.grade_id=? 
         GROUP BY e.term, e.exam_type
         ORDER BY e.term ASC, FIELD(e.exam_type, 'Opener','Midterm','Endterm')`,
        [schoolId, subj.subject_id, subj.grade_id]
      );

      // --- Find the latest exam for that school ---
      const [latestExam] = await db.promise().query(
        `SELECT exam_id, term, exam_type
         FROM exams
         WHERE school_id=?
         ORDER BY term DESC, created_at DESC
         LIMIT 1`,
        [schoolId]
      );

      let topStudents = [];
      let improvement = null;
      let currentAvg = null;
      let streamComparison = [];

      if (latestExam.length) {
        const currentTerm = latestExam[0].term;
        const currentExamId = latestExam[0].exam_id;

        // ✅ --- Current class average for the latest exam only ---
        const [currAvgRow] = await db.promise().query(
          `SELECT ROUND(AVG(m.marks), 2) AS avg
           FROM marks m
           JOIN students st ON m.student_id = st.id
           WHERE m.exam_id=? AND m.subject_id=? AND st.grade_id=?`,
          [currentExamId, subj.subject_id, subj.grade_id]
        );

        currentAvg =
          currAvgRow[0]?.avg !== null && currAvgRow[0]?.avg !== undefined
            ? Number(currAvgRow[0].avg)
            : null;

        // --- Previous exam for improvement ---
        const [prevExam] = await db.promise().query(
          `SELECT exam_id
           FROM exams
           WHERE school_id=? AND term<=?
           ORDER BY term DESC, created_at DESC
           LIMIT 1 OFFSET 1`,
          [schoolId, currentTerm]
        );

        if (prevExam.length && currentAvg !== null) {
          const prevExamId = prevExam[0].exam_id;
          const [prevAvgRow] = await db.promise().query(
            `SELECT ROUND(AVG(m.marks), 2) AS avg
             FROM marks m
             JOIN students st ON m.student_id = st.id
             WHERE m.exam_id=? AND m.subject_id=? AND st.grade_id=?`,
            [prevExamId, subj.subject_id, subj.grade_id]
          );

          const prevAvg =
            prevAvgRow[0]?.avg !== null && prevAvgRow[0]?.avg !== undefined
              ? Number(prevAvgRow[0].avg)
              : null;

          if (prevAvg !== null) {
            improvement = currentAvg - prevAvg;
          }
        }

        // --- Top 5 students (latest exam only) ---
        const [topRows] = await db.promise().query(
          `SELECT s.name, m.marks
           FROM marks m
           JOIN students s ON m.student_id = s.id
           WHERE m.exam_id=? AND m.subject_id=? AND s.grade_id=?
           ORDER BY m.marks DESC
           LIMIT 5`,
          [currentExamId, subj.subject_id, subj.grade_id]
        );

        topStudents = topRows;

        // ✅ --- Stream comparison: all streams of same grade level ---
        const [streamRows] = await db.promise().query(
          `SELECT g.stream, ROUND(AVG(m.marks), 2) AS avg_marks
           FROM marks m
           JOIN students st ON m.student_id = st.id
           JOIN grades g ON st.grade_id = g.grade_id
           WHERE g.school_id=? 
             AND g.grade_level=? 
             AND m.subject_id=? 
             AND m.exam_id=?
           GROUP BY g.stream
           ORDER BY g.stream`,
          [schoolId, subj.grade, subj.subject_id, currentExamId]
        );

        streamComparison = streamRows;
      }

      // --- Push results ---
      result.push({
        subject_id: subj.subject_id,
        grade_id: subj.grade_id,
        subject_name: subj.subject_name,
        grade: subj.grade,
        stream: subj.stream,
        term_averages: examAverages.map((e) => ({
          term: e.term,
          exam_type: e.exam_type,
          average: e.average,
        })),
        top_students: topStudents,
        current_term: latestExam[0]?.term || null,
        class_average:
          typeof currentAvg === "number" ? currentAvg.toFixed(2) : null,
        improvement:
          improvement !== null
            ? improvement >= 0
              ? `+${improvement.toFixed(1)}`
              : improvement.toFixed(1)
            : "—",
        stream_comparison: streamComparison, // ✅ Added for chart
      });
    }

    res.json({ data: result });
  } catch (err) {
    console.error("Error fetching analytics:", err);
    res.status(500).json({ message: "Server error fetching subject analytics" });
  }
});

module.exports = router;
