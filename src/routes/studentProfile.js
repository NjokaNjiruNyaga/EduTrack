const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");

// Serve profile page
router.get("/", (req, res) => {
  if (!req.session.user || req.session.user.role !== "student") {
    return res.redirect("/login");
  }
  res.sendFile("student_profile.html", { root: "public" });
});

// Fetch student info
router.get("/data", (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: "Not logged in" });
  }

  const userId = req.session.user.user_id; 

  const sql = `
    SELECT 
      s.name,
      s.admission_no,
      s.gender,
      s.parent_contact,
      CONCAT('Grade ', g.grade_level, ' ', g.stream) AS grade,
      u.email
    FROM students s
    LEFT JOIN grades g ON s.grade_id = g.grade_id
    LEFT JOIN users u ON s.user_id = u.user_id
    WHERE s.user_id = ?
  `;

  db.query(sql, [userId], (err, rows) => {
    if (err) {
      console.error("DB Error:", err);
      return res.json({ success: false, message: "Server error while fetching student data" });
    }

    if (rows.length === 0) {
      return res.json({ success: false, message: "Student not found or not linked to this user account" });
    }

    res.json({ success: true, student: rows[0] });
  });
});

// Change password
router.post("/change-password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.session.user.user_id; // ✅ Corrected

  db.query("SELECT password FROM users WHERE user_id = ?", [userId], async (err, rows) => {
    if (err || rows.length === 0)
      return res.json({ success: false, message: "Server error" });

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid)
      return res.json({ success: false, message: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    db.query("UPDATE users SET password = ? WHERE user_id = ?", [hashed, userId], (err2) => {
      if (err2)
        return res.json({ success: false, message: "Failed to update password" });
      res.json({ success: true, message: "✅ Password changed successfully!" });
    });
  });
});

module.exports = router;
