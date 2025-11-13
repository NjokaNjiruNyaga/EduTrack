const express = require("express");
const router = express.Router();
const db = require("../config/db");
const path = require("path");

// ✅ Logged-in student info
router.get("/me", (req, res) => {
  if (!req.session.user || req.session.user.role !== "student") {
    return res.status(403).json({});
  }
  return res.json({
    id: req.session.user.student_id,
    name: req.session.user.username
  });
});

// ✅ Serve Student Dashboard Page
router.get("/dashboard", (req, res) => {
  if (!req.session.user || req.session.user.role !== "student") {
    return res.redirect("/login");
  }

  res.sendFile(path.join(__dirname, "../views/student/student_dashboard.html"));
});

// ✅ MULTI-TERM REPORT
router.get("/:id/allTerms", async (req, res) => {
  const { id } = req.params;

  // 🔐 Security check
  if (!req.session.user || req.session.user.role !== "student" || req.session.user.student_id != id) {
    return res.status(403).json({ message: "Unauthorized" });
  }

  try {
    // ✅ Fetch student info
    const [studentRows] = await db.promise().query(
      `SELECT s.id AS student_id, s.name, s.grade_id,
              g.grade_level, g.stream, g.school_id
       FROM students s
       JOIN grades g ON s.grade_id = g.grade_id
       WHERE s.id=? LIMIT 1`,
      [id]
    );

    if (!studentRows.length) return res.status(404).json({ message: "Student not found" });

    const student = studentRows[0];

    // ✅ Fetch all exams (REMOVED year)
    const [examRows] = await db.promise().query(
      `SELECT exam_id, term, exam_type
       FROM exams
       WHERE school_id = ?
       ORDER BY term ASC, FIELD(exam_type, 'Opener', 'Midterm', 'Endterm')`,
      [student.school_id]
    );

    if (!examRows.length) return res.json({ terms: {} });

    // ✅ Group exams by term
    const termMap = {};
    examRows.forEach(ex => {
      if (!termMap[ex.term]) termMap[ex.term] = [];
      termMap[ex.term].push(ex);
    });

    // ✅ CBC grading
    function gradePoints(marks) {
      marks = Number(marks) || 0;
      if (marks >= 90) return { level: "EE1", points: 4 };
      if (marks >= 75) return { level: "EE2", points: 3.5 };
      if (marks >= 58) return { level: "ME1", points: 3 };
      if (marks >= 41) return { level: "ME2", points: 2.5 };
      if (marks >= 31) return { level: "AE1", points: 2 };
      if (marks >= 21) return { level: "AE2", points: 1.5 };
      if (marks >= 11) return { level: "BE1", points: 1 };
      if (marks >= 1) return { level: "BE2", points: 0.5 };
      return { level: "-", points: 0 };
    }

    // ✅ Map subjects to teachers
    const [teacherMapRows] = await db.promise().query(
      `SELECT ts.subject_id, u.username AS teacher_name
       FROM teacher_subjects ts
       JOIN teachers t ON ts.teacher_id = t.teacher_id
       JOIN users u ON t.user_id = u.user_id
       WHERE ts.grade_id=? AND ts.school_id=?`,
      [student.grade_id, student.school_id]
    );

    const teacherMap = {};
    teacherMapRows.forEach(t => teacherMap[t.subject_id] = t.teacher_name);

    // ✅ Final structure
    const finalTermData = {};

    for (const term of Object.keys(termMap)) {
      const examsInTerm = termMap[term].map(e => e.exam_id);

      // ✅ Fetch student marks
      const [marksRows] = await db.promise().query(
        `SELECT sub.subject_name, m.subject_id, e.exam_type, m.marks
         FROM marks m
         JOIN subjects sub ON m.subject_id = sub.subject_id
         JOIN exams e ON m.exam_id = e.exam_id
         WHERE m.exam_id IN (?) AND m.student_id=?`,
        [examsInTerm, id]
      );

      if (!marksRows.length) continue;

      // ✅ Group subjects
      const subjectsMap = {};
      marksRows.forEach(m => {
        if (!subjectsMap[m.subject_id]) {
          subjectsMap[m.subject_id] = {
            subject_name: m.subject_name,
            subject_id: m.subject_id,
            Opener: null,
            Midterm: null,
            Endterm: null
          };
        }
        subjectsMap[m.subject_id][m.exam_type] = Number(m.marks) || 0;
      });

      // ✅ Determine last exam type
      const order = ["Opener", "Midterm", "Endterm"];
      const available = [...new Set(marksRows.map(r => r.exam_type))];
      const lastExamType = order.filter(o => available.includes(o)).pop();

      // ✅ Class marks (for ranking)
      const [classMarks] = await db.promise().query(
        `SELECT m.student_id, m.subject_id, m.marks
         FROM marks m
         JOIN students s ON m.student_id = s.id
         JOIN exams e ON m.exam_id = e.exam_id
         WHERE e.exam_type=? AND e.term=? AND e.school_id=? AND s.grade_id=?`,
        [lastExamType, term, student.school_id, student.grade_id]
      );

      // ✅ Process subjects
      Object.values(subjectsMap).forEach(sub => {
        const marks = Number(sub[lastExamType]) || 0;
        const gp = gradePoints(marks);

        sub.Gr = gp.level;
        sub.Points = gp.points;
        sub.teacher_name = teacherMap[sub.subject_id] || "-";

        const subjectClassMarks = classMarks
          .filter(m => m.subject_id === sub.subject_id)
          .map(m => Number(m.marks) || 0)
          .sort((a, b) => b - a);

        sub.Rank = `${subjectClassMarks.indexOf(marks) + 1}/${subjectClassMarks.length}`;
      });

      // ✅ Total marks (LAST exam only)
      const totalMarks = Object.values(subjectsMap)
        .reduce((sum, s) => sum + (Number(s[lastExamType]) || 0), 0);

      const totalPoints = Object.values(subjectsMap)
        .reduce((sum, s) => sum + (Number(s.Points) || 0), 0);

      const meanPoints = (totalPoints / Object.values(subjectsMap).length).toFixed(2);

      // ✅ Performance
      let performance = "Below Expectation";
      if (meanPoints >= 3.5) performance = "Exceeding Expectation";
      else if (meanPoints >= 2.5) performance = "Meeting Expectation";
      else if (meanPoints >= 1.5) performance = "Approaching Expectation";

      // ✅ Class ranking (total marks)
      const [classTotals] = await db.promise().query(
        `SELECT s.id AS student_id, SUM(m.marks) AS total
         FROM students s
         JOIN marks m ON s.id = m.student_id
         JOIN exams e ON e.exam_id = m.exam_id
         WHERE s.grade_id=? AND e.term=? AND e.exam_type=?
         GROUP BY s.id`,
        [student.grade_id, term, lastExamType]
      );

      classTotals.sort((a, b) => b.total - a.total);
      const posIndex = classTotals.findIndex(r => r.student_id == id);
      const position = `${posIndex + 1}/${classTotals.length}`;

      finalTermData[term] = {
        summary: {
          term,
          total_marks: totalMarks,
          mean_points: meanPoints,
          performance,
          position
        },
        subjects: Object.values(subjectsMap)
      };
    }

    res.json({ terms: finalTermData });

  } catch (err) {
    console.error("Error fetching multi-term student report:", err);
    res.status(500).json({ message: "Error generating student report" });
  }
});

module.exports = router;
