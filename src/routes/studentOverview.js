const express = require("express");
const router = express.Router();
const db = require("../config/db");

/* ==========================================================
   📊 1️⃣ CLASS STUDENT OVERVIEW (Teacher Dashboard)
   ========================================================== */
router.get("/class/student-overview", async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(403).json({ message: "Unauthorized" });

  try {
    // 1️⃣ Find teacher record
    const [teacherRows] = await db.promise().query(
      "SELECT teacher_id, school_id FROM teachers WHERE user_id=? LIMIT 1",
      [user.user_id]
    );
    if (!teacherRows.length)
      return res.status(404).json({ message: "Teacher not found" });

    const { teacher_id, school_id } = teacherRows[0];

    // 2️⃣ Find grade/class assigned to this teacher
    const [classRow] = await db.promise().query(
      "SELECT grade_id FROM teacher_grades WHERE teacher_id=? AND school_id=? LIMIT 1",
      [teacher_id, school_id]
    );
    if (!classRow.length)
      return res.json({ message: "Not assigned as class teacher", data: [] });

    const gradeId = classRow[0].grade_id;

    // 3️⃣ Get grade details
    const [gradeDetails] = await db.promise().query(
      "SELECT grade_level, stream FROM grades WHERE grade_id=?",
      [gradeId]
    );
    if (!gradeDetails.length)
      return res.json({ message: "Grade details not found", data: [] });

    const { grade_level, stream } = gradeDetails[0];

    // 4️⃣ Latest exam
    const [exam] = await db.promise().query(
      `SELECT exam_id, term 
       FROM exams 
       WHERE school_id=? 
       ORDER BY term DESC, created_at DESC 
       LIMIT 1`,
      [school_id]
    );
    if (!exam.length)
      return res.json({ message: "No exams found", data: [] });

    const examId = exam[0].exam_id;

    // 5️⃣ All students in the class
    const [students] = await db.promise().query(
      `SELECT s.id AS student_id, s.name, s.admission_no AS adm_no, s.gender
       FROM students s 
       WHERE s.grade_id=? 
       ORDER BY s.name`,
      [gradeId]
    );
    if (!students.length)
      return res.json({ message: "No students found in this class", data: [] });

    // 6️⃣ Marks for those students
    const [marksData] = await db.promise().query(
      `SELECT m.student_id, sub.subject_name, m.marks
       FROM marks m
       JOIN subjects sub ON m.subject_id = sub.subject_id
       WHERE m.exam_id=? AND m.student_id IN (?)`,
      [examId, students.map(s => s.student_id)]
    );

    // 7️⃣ Performance summary
    const results = students.map(st => {
      const studentMarks = marksData.filter(m => m.student_id === st.student_id);
      const subjects = studentMarks.map(m => m.subject_name);
      const totalMarks = studentMarks.reduce((sum, m) => sum + Number(m.marks), 0);
      const totalOutOf = studentMarks.length * 100;
      const percentage = totalOutOf ? Number(((totalMarks / totalOutOf) * 100).toFixed(1)) : 0;

      let performance = "Below Expectation";
      if (percentage >= 75) performance = "Exceeding Expectation";
      else if (percentage >= 41) performance = "Meeting Expectation";
      else if (percentage >= 21) performance = "Approaching Expectation";

      return {
        ...st,
        subjects,
        total_marks: totalMarks,
        total_outof: totalOutOf,
        percentage,
        performance,
        grade_level,
        stream
      };
    });

    res.json({ data: results });
  } catch (err) {
    console.error("Error loading student overview:", err);
    res.status(500).json({ message: "Error loading student overview" });
  }
});

/* ==========================================================
   📋 2️⃣ INDIVIDUAL STUDENT REPORT (CBC + Ranking + Teacher)
   ========================================================== */
router.get("/student/:id/details", async (req, res) => {
  const { id } = req.params;
  const user = req.session.user;
  if (!user) return res.status(403).json({ message: "Unauthorized" });

  try {
    /* ✅ 1. Student details */
    const [studentRows] = await db.promise().query(
      `SELECT s.id AS student_id, s.name, s.grade_id, 
              g.grade_level, g.stream, g.school_id
       FROM students s
       JOIN grades g ON s.grade_id = g.grade_id
       WHERE s.id=? LIMIT 1`,
      [id]
    );
    if (!studentRows.length)
      return res.status(404).json({ message: "Student not found" });

    const student = studentRows[0];

    /* ✅ 2. All exams for school */
    const [exams] = await db.promise().query(
      `SELECT exam_id, exam_type, term
       FROM exams 
       WHERE school_id=? 
       ORDER BY term DESC, FIELD(exam_type,'Endterm','Midterm','Opener')`,
      [student.school_id]
    );
    if (!exams.length)
      return res.json({ summary: {}, subjects: [], available_exams: [] });

    const latestTerm = exams[0].term;
    const termExams = exams.filter(e => e.term === latestTerm);
    const examIds = termExams.map(e => e.exam_id);

    /* ✅ 3. Fetch student marks */
    const [marksRows] = await db.promise().query(
      `SELECT sub.subject_name, m.subject_id, e.exam_type, m.marks
       FROM marks m
       JOIN subjects sub ON m.subject_id = sub.subject_id
       JOIN exams e ON m.exam_id = e.exam_id
       WHERE m.exam_id IN (?) AND m.student_id=?`,
      [examIds, id]
    );
    if (!marksRows.length)
      return res.json({ summary: {}, subjects: [], available_exams: [] });

    const availableExams = [...new Set(marksRows.map(r => r.exam_type))];
    const lastExamType = availableExams[availableExams.length - 1];

    /* ✅ 4. Build subject map */
    const subjectsMap = {};
    marksRows.forEach(r => {
      if (!subjectsMap[r.subject_id]) {
        subjectsMap[r.subject_id] = {
          subject_id: r.subject_id,
          subject_name: r.subject_name
        };
      }
      subjectsMap[r.subject_id][r.exam_type] = r.marks;
    });

    /* ✅ 5. Grade info */
    function getGradeInfo(marks) {
      if (marks >= 90) return { level: "EE1", perf: "Exceeding Expectation", points: 4 };
      if (marks >= 75) return { level: "EE2", perf: "Exceeding Expectation", points: 3.5 };
      if (marks >= 58) return { level: "ME1", perf: "Meeting Expectation", points: 3 };
      if (marks >= 41) return { level: "ME2", perf: "Meeting Expectation", points: 2.5 };
      if (marks >= 31) return { level: "AE1", perf: "Approaching Expectation", points: 2 };
      if (marks >= 21) return { level: "AE2", perf: "Approaching Expectation", points: 1.5 };
      if (marks >= 11) return { level: "BE1", perf: "Below Expectation", points: 1 };
      if (marks >= 1) return { level: "BE2", perf: "Below Expectation", points: 0.5 };
      return { level: "-", perf: "No Marks", points: 0 };
    }

    /* ✅ 6. TEACHER lookup */
    const [teacherMapRows] = await db.promise().query(
      `SELECT ts.subject_id, u.username AS teacher_name
       FROM teacher_subjects ts
       JOIN teachers t ON ts.teacher_id = t.teacher_id
       JOIN users u ON t.user_id = u.user_id
       WHERE ts.grade_id=? AND ts.school_id=?`,
      [student.grade_id, student.school_id]
    );

    const teacherMap = {};
    teacherMapRows.forEach(t => {
      teacherMap[t.subject_id] = t.teacher_name;
    });

    /* ✅ 7. Subject Ranking */
    const [classMarks] = await db.promise().query(
      `SELECT m.student_id, m.subject_id, m.marks
       FROM marks m
       JOIN students s ON m.student_id = s.id
       JOIN exams e ON m.exam_id = e.exam_id
       WHERE e.exam_type=? AND e.term=?
         AND e.school_id=?
         AND s.grade_id=?`,
      [lastExamType, latestTerm, student.school_id, student.grade_id]
    );

    Object.values(subjectsMap).forEach(sub => {
      const marks = sub[lastExamType];
      if (marks != null) {
        const info = getGradeInfo(marks);
        sub.Gr = info.level;
        sub.Performance_Level = info.perf;
        sub.Points = info.points;

        const subjectClassMarks = classMarks
          .filter(m => m.subject_id === sub.subject_id)
          .map(m => Number(m.marks))
          .sort((a, b) => b - a);

        const rank = subjectClassMarks.indexOf(Number(marks)) + 1;
        sub.Rank = `${rank}/${subjectClassMarks.length}`;

        sub.teacher_name = teacherMap[sub.subject_id] || "-";
      }
    });

    /* ✅ 8. CLASS POSITION */
    const [classTotals] = await db.promise().query(
      `SELECT s.id AS student_id,
              SUM(m.marks) AS total_marks
       FROM students s
       JOIN marks m ON m.student_id = s.id
       JOIN exams e ON e.exam_id = m.exam_id
       WHERE s.grade_id=?
         AND e.term=?
         AND e.exam_type=?
       GROUP BY s.id`,
      [student.grade_id, latestTerm, lastExamType]
    );

    classTotals.sort((a, b) => b.total_marks - a.total_marks);

    const posIndex = classTotals.findIndex(r => r.student_id == id);
    const position = posIndex !== -1 ? `${posIndex + 1}/${classTotals.length}` : "-";

    /* ✅ 9. Summary */
    const totalMarks = Object.values(subjectsMap)
      .reduce((sum, s) => sum + Number(s[lastExamType] || 0), 0);

    const totalOutOf = Object.keys(subjectsMap).length * 100;

    const totalPoints = Object.values(subjectsMap)
      .reduce((sum, s) => sum + (s.Points || 0), 0);

    const meanPoints =
      Object.keys(subjectsMap).length
        ? Number((totalPoints / Object.keys(subjectsMap).length).toFixed(2))
        : 0;

    let performance = "Below Expectation";
    if (meanPoints >= 3.5) performance = "Exceeding Expectation";
    else if (meanPoints >= 2.5) performance = "Meeting Expectation";
    else if (meanPoints >= 1.5) performance = "Approaching Expectation";

    const summary = {
      student_id: id,
      name: student.name,
      grade_level: student.grade_level,
      stream: student.stream,
      total_marks: totalMarks,
      mean_points: meanPoints,
      performance,
      term: latestTerm,
      position   
    };

    res.json({
      summary,
      subjects: Object.values(subjectsMap),
      available_exams: availableExams
    });

  } catch (err) {
    console.error("Error fetching student details:", err);
    res.status(500).json({ message: "Error fetching student details" });
  }
});

module.exports = router;
