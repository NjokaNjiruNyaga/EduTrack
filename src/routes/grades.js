const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Middleware to enforce logged-in school
function requireSchool(req, res, next) {
  if (!req.session.user || !req.session.user.school_id) {
    return res.status(401).json({ success: false, message: "⚠️ Unauthorized: school_id missing" });
  }
  req.school_id = req.session.user.school_id;
  next();
}

// ===== GET GRADES =====
router.get("/", requireSchool, (req, res) => {
  const school_id = req.query.school_id || req.school_id; // fallback to session

  const sql = "SELECT * FROM grades WHERE school_id = ? ORDER BY grade_level ASC, stream ASC";
  db.query(sql, [school_id], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, data: results });
  });
});

module.exports = router;
