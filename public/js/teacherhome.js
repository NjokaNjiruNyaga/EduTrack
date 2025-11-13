// ==================== MAIN DASHBOARD LOADER ====================
document.addEventListener("DOMContentLoaded", async () => {
  await loadTeacherDashboard();  // Load main stats
  await loadTeacherSubjects();   // Load My Subjects
  await loadTeacherClasses();    // Load My Class
});

// ==================== LOAD TEACHER DASHBOARD ====================
async function loadTeacherDashboard() {
  const ids = [
    "teacherName",
    "currentTerm",
    "subjectsCount",
    "classesCount",
    "studentsCount",
    "examsCount"
  ];

  try {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = "—";
        el.classList.add("loading");
      }
    });

    const res = await fetch("/teacherDashboard/home");
    if (!res.ok) {
      const errMsg = await res.text();
      console.error("Failed to load teacher dashboard:", errMsg);
      alert("Failed to load dashboard data.");
      return;
    }

    const data = await res.json();

    document.getElementById("teacherName").textContent = data.teacherName || "Teacher";
    document.getElementById("currentTerm").textContent = data.currentTerm || "Not Set";
    document.getElementById("subjectsCount").textContent = data.subjectsCount || 0;
    document.getElementById("classesCount").textContent = data.classesCount || 0;
    document.getElementById("studentsCount").textContent = data.studentsCount || 0;
    document.getElementById("examsCount").textContent = data.examsCount || 0;
  } catch (err) {
    console.error("Dashboard load error:", err);
    alert("Error loading dashboard data");
  } finally {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove("loading");
    });
  }
}

// ==================== TAB HANDLING ====================
function showTab(tabId, event = null) {
  document.querySelectorAll(".tab-content").forEach(tab => {
    tab.classList.add("hidden");
    tab.classList.remove("active-tab");
  });

  const targetTab = document.getElementById(tabId);
  if (targetTab) {
    targetTab.classList.remove("hidden");
    targetTab.classList.add("active-tab");
  }

  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active-tab-btn"));
  if (event && event.target) event.target.classList.add("active-tab-btn");

  if (tabId === "subjects") loadTeacherSubjects();
  if (tabId === "classes") loadTeacherClasses();
}

// ==================== LOAD MY SUBJECTS ====================
async function loadTeacherSubjects() {
  try {
    const res = await fetch("/teacherDashboard/subjects");
    if (!res.ok) throw new Error("Failed to load subjects");
    const data = await res.json();

    const tbody = document.querySelector("#subjectsTable tbody");
    tbody.innerHTML = data.length
      ? data.map((row, i) =>
          `<tr>
             <td>${i + 1}</td>
             <td>${row.subject_name}</td>
             <td>${row.grade_level}</td>
             <td>${row.stream}</td>
             <td>
               <button onclick="viewSubjectStudents('${row.grade_id}', '${row.subject_id}', '${row.subject_name}', '${row.grade_level}', '${row.stream}')">
                 👁️ View Students
               </button>
             </td>
           </tr>`
        ).join("")
      : `<tr><td colspan="5" style="text-align:center;">No subjects assigned</td></tr>`;
  } catch (err) {
    console.error("Error loading subjects:", err);
  }
}

// ==================== LOAD MY CLASSES ====================
async function loadTeacherClasses() {
  try {
    const res = await fetch("/teacherDashboard/class");
    if (!res.ok) throw new Error("Failed to load class");
    const data = await res.json();

    const tbody = document.querySelector("#classesTable tbody");
    tbody.innerHTML = data.length
      ? data.map((row, i) =>
          `<tr>
             <td>${i + 1}</td>
             <td>${row.grade_level}</td>
             <td>${row.stream}</td>
             <td>${row.student_count}</td>
             <td>
               <button onclick="viewStudents('${row.grade_id}', '${row.grade_level}', '${row.stream}')">
                  View Students
               </button>
             </td>
           </tr>`
        ).join("")
      : `<tr><td colspan="5" style="text-align:center;">No classes found</td></tr>`;
  } catch (err) {
    console.error("Error loading class:", err);
  }
}

// ==================== VIEW STUDENTS IN A SUBJECT ====================
async function viewSubjectStudents(grade_id, subject_id, subject_name, grade_level, stream) {
  console.log("📘 View Students Clicked:", { grade_id, subject_id }); // ✅ Debug log

  try {
    const res = await fetch(`/teacherDashboard/subject/${grade_id}/${subject_id}/students`);
    if (!res.ok) throw new Error("Failed to fetch students");
    const students = await res.json();

    document.getElementById("studentsModalTitle").innerText =
      `Students in ${subject_name} — Grade ${grade_level} ${stream}`;

    const tbody = document.querySelector("#studentsTable tbody");
    tbody.innerHTML = students.length
      ? students.map((s, i) =>
          `<tr>
             <td>${i + 1}</td>
             <td>${s.name}</td>
             <td>${s.admission_no}</td>
             <td>${s.gender}</td>
           </tr>`
        ).join("")
      : `<tr><td colspan="4" style="text-align:center;">No students found</td></tr>`;

    document.getElementById("studentsModal").style.display = "flex";
  } catch (err) {
    console.error("Error loading subject students:", err);
    alert("Unable to load students for this subject.");
  }
}

// ==================== VIEW STUDENTS IN CLASS ====================
async function viewStudents(grade_id, grade_level = "", stream = "") {
  try {
    const res = await fetch(`/teacherDashboard/class/${grade_id}/students`);
    if (!res.ok) throw new Error("Failed to fetch students");
    const students = await res.json();

    document.getElementById("studentsModalTitle").innerText =
      `Students in Grade ${grade_level} ${stream}`;

    const tbody = document.querySelector("#studentsTable tbody");
    tbody.innerHTML = students.length
      ? students.map((s, i) =>
          `<tr>
             <td>${i + 1}</td>
             <td>${s.name}</td>
             <td>${s.admission_no}</td>
             <td>${s.gender}</td>
           </tr>`
        ).join("")
      : `<tr><td colspan="4" style="text-align:center;">No students found</td></tr>`;

    document.getElementById("studentsModal").style.display = "flex";
  } catch (err) {
    console.error("Error loading students:", err);
    alert("Unable to load students.");
  }
}

// ==================== CLOSE MODAL ====================
function closeStudentsModal() {
  document.getElementById("studentsModal").style.display = "none";
}

// ==================== QUICK ACTIONS TOGGLE ====================
document.addEventListener("DOMContentLoaded", () => {
  const quickBtn = document.getElementById("quickActionsBtn");
  const tabButtons = document.getElementById("tabButtons");
  const tabContents = document.querySelectorAll(".tab-content");

  let quickActionsVisible = false;

  quickBtn.addEventListener("click", () => {
    quickActionsVisible = !quickActionsVisible;

    if (quickActionsVisible) {
      tabButtons.classList.remove("hidden");
      tabButtons.classList.add("show");
      quickBtn.textContent = "❌ Hide Quick Actions";
      showTab("subjects");
    } else {
      tabButtons.classList.add("hidden");
      tabButtons.classList.remove("show");
      tabContents.forEach(tab => tab.classList.add("hidden"));
      quickBtn.textContent = "⚡ Quick Actions";
    }
  });
});
