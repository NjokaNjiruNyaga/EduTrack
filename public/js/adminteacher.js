// ================= CONFIG =================
const API_URL = "http://localhost:5000/teachers"; // adjust if needed

let teachersCache = [];
let gradesCache = [];
let subjectsCache = [];
let activeTab = "teachers"; // track active tab

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initDropdowns();
  loadAllData();
  initSearchFilters();
  initFormHandlers();
});

// ================= INITIALIZATION =================
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
      btn.classList.add("active");
      const tabId = btn.dataset.tab;
      document.getElementById(tabId).classList.add("active");
      activeTab = tabId;
    });
  });
}

function initDropdowns() {
  loadTeacherDropdown();
  loadGradesDropdown();
  loadSubjectsDropdown();
}

function loadAllData() {
  loadTeachers();
  loadTeacherSubjects();
  loadClassTeachers();
  loadAvailableUsers();
}

function initSearchFilters() {
  document.getElementById("teacherSearch")?.addEventListener("input", filterTeachers);
  document.getElementById("gradeFilter")?.addEventListener("input", () =>
    filterGradesDropdown("gradeFilter", "grade_id_subject")
  );
  document.getElementById("classTeacherSearch")?.addEventListener("input", () =>
    filterGradesDropdown("classTeacherSearch", "grade_id_class")
  );
}

// ================= FORM HANDLERS =================
function initFormHandlers() {
  // ---- Add Teacher ----
  document.getElementById("addTeacherForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const data = {
      user_id: document.getElementById("user_id").value,
      phone: document.getElementById("phone").value,
    };
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      alert(result.message);
      document.getElementById("addTeacherForm").reset();
      await loadTeachers();
      await loadTeacherDropdown();
      showActiveTab();
    } catch (err) {
      console.error(err);
    }
  });

  // ---- Edit Teacher ----
  document.getElementById("editTeacherForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const id = document.getElementById("edit_teacher_id").value;
    const updated = {
      username: document.getElementById("edit_username").value,
      email: document.getElementById("edit_email").value,
      phone: document.getElementById("edit_phone").value,
    };
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      alert(data.message);
      cancelEditTeacher();
      await loadTeachers();
      await loadTeacherDropdown();
      showActiveTab();
    } catch (err) {
      console.error(err);
    }
  });

  // ---- Edit Teacher-Subject ----
  document.getElementById("editSubjectForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const id = document.getElementById("edit_subject_id").value;
    const updated = {
      teacher_id: document.getElementById("edit_teacher_id_subject_modal").value,
      grade_id: document.getElementById("edit_grade_id_subject_modal").value,
      subject_id: document.getElementById("edit_subject_id_modal").value,
    };
    try {
      const res = await fetch(`${API_URL}/subjects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      alert(data.message);
      cancelEditSubject();
      await loadTeacherSubjects();
      showActiveTab();
    } catch (err) {
      console.error(err);
    }
  });

  // ---- Assign Subject ----
  document.getElementById("assignSubjectForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const data = {
      teacher_id: document.getElementById("teacher_id_subject").value,
      grade_id: document.getElementById("grade_id_subject").value,
      subject_id: document.getElementById("subject_id").value,
    };
    try {
      const res = await fetch(`${API_URL}/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      alert(result.message);
      await loadTeacherSubjects();
      showActiveTab();
    } catch (err) {
      console.error(err);
    }
  });
}

// ================= CANCEL MODALS =================
function cancelEditTeacher() { document.getElementById("editTeacherCard").style.display = "none"; }
function cancelEditSubject() { document.getElementById("editSubjectCard").style.display = "none"; }
function cancelEditClass() { document.getElementById("editClassTeacherCard").style.display = "none"; }

// ================= DROPDOWNS =================
async function loadTeacherDropdown() {
  try {
    const res = await fetch(API_URL);
    const teachers = await res.json();
    ["teacher_id_subject", "teacher_id_class", "edit_teacher_id_subject_modal", "edit_teacher_id_class"].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      select.innerHTML = `<option value="">-- Select Teacher --</option>`;
      teachers.forEach(t => select.appendChild(new Option(t.username, t.teacher_id)));
    });
  } catch (err) { console.error(err); }
}

async function loadGradesDropdown() {
  try {
    const res = await fetch(`${API_URL}/grades`);
    gradesCache = await res.json();
    ["grade_id_subject", "grade_id_class", "edit_grade_id_subject_modal", "edit_grade_id_class"].forEach(id =>
      populateGradesDropdown(gradesCache, id)
    );
  } catch (err) { console.error(err); }
}

function populateGradesDropdown(grades, elementId) {
  const select = document.getElementById(elementId);
  if (!select) return;
  select.innerHTML = `<option value="">-- Select Grade --</option>`;
  grades.forEach(g => select.appendChild(new Option(g.name, g.grade_id)));
}

function filterGradesDropdown(inputId, dropdownId) {
  const val = document.getElementById(inputId).value.toLowerCase();
  populateGradesDropdown(gradesCache.filter(g => g.name.toLowerCase().includes(val)), dropdownId);
}

async function loadSubjectsDropdown() {
  try {
    const res = await fetch(`${API_URL}/subjects-list`);
    subjectsCache = await res.json();
    ["subject_id", "edit_subject_id_modal"].forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;
      select.innerHTML = `<option value="">-- Select Subject --</option>`;
      subjectsCache.forEach(s => select.appendChild(new Option(s.name, s.subject_id)));
    });
  } catch (err) { console.error(err); }
}

// ================= RENDER FUNCTIONS =================
async function loadAvailableUsers() {
  try {
    const res = await fetch(`${API_URL}/available-users`);
    const users = await res.json();
    const select = document.getElementById("user_id");
    select.innerHTML = `<option value="">-- Select Teacher --</option>`;
    users.forEach(u => select.appendChild(new Option(u.username, u.user_id)));
  } catch (err) { console.error(err); }
}

async function loadTeachers() {
  try {
    const res = await fetch(API_URL);
    teachersCache = await res.json();
    renderTeachers(teachersCache);
  } catch (err) { console.error(err); }
}

function renderTeachers(list) {
  const tbody = document.querySelector("#teachersTable tbody");
  tbody.innerHTML = "";
  list.forEach(t => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${t.teacher_id}</td>
      <td>${t.username}</td>
      <td>${t.email}</td>
      <td>${t.phone || ""}</td>
      <td>
        <button class="edit" onclick="openEditModal('teacher', ${t.teacher_id}, '${t.username}', '${t.email}', '${t.phone || ""}')">Edit</button>
        <button class="delete" onclick="deleteItem('teacher', ${t.teacher_id})">Delete</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function filterTeachers() {
  const val = document.getElementById("teacherSearch").value.toLowerCase();
  renderTeachers(teachersCache.filter(t =>
    (t.username + t.email + (t.phone || "")).toLowerCase().includes(val)
  ));
}

// ================= EDIT MODAL OPEN =================
function openEditModal(type, id, ...args) {
  if (type === "teacher") {
    document.getElementById("editTeacherCard").style.display = "block";
    document.getElementById("edit_teacher_id").value = id;
    document.getElementById("edit_username").value = args[0];
    document.getElementById("edit_email").value = args[1];
    document.getElementById("edit_phone").value = args[2] || "";
  } else if (type === "subject") {
    document.getElementById("editSubjectCard").style.display = "block";
    document.getElementById("edit_subject_id").value = id;
    populateEditDropdowns("subject", args[0], args[1], args[2]);
  } else if (type === "class") {
    document.getElementById("editClassTeacherCard").style.display = "block";
    document.getElementById("edit_class_id").value = id;
    populateEditDropdowns("class", args[0], args[1]);
    activeTab = "classTeacher";
  }
}

function populateEditDropdowns(type, teacher_id, grade_id, subject_id) {
  if (type === "subject") {
    document.getElementById("edit_teacher_id_subject_modal").value = teacher_id;
    document.getElementById("edit_grade_id_subject_modal").value = grade_id;
    document.getElementById("edit_subject_id_modal").value = subject_id;
  } else if (type === "class") {
    document.getElementById("edit_teacher_id_class").value = teacher_id;
    document.getElementById("edit_grade_id_class").value = grade_id;
  }
}

// ================= TEACHER-SUBJECTS =================
async function loadTeacherSubjects() {
  try {
    const res = await fetch(`${API_URL}/subjects`);
    const data = await res.json();
    const tbody = document.querySelector("#teacherSubjectsTable tbody");
    tbody.innerHTML = "";
    data.forEach(s => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${s.id}</td>
        <td>${s.teacher_name}</td>
        <td>${s.grade_name}</td>
        <td>${s.subject_name}</td>
        <td>
          <button class="edit" onclick="openEditModal('subject', ${s.id}, ${s.teacher_id}, ${s.grade_id}, ${s.subject_id})">Edit</button>
          <button class="delete" onclick="deleteItem('subject', ${s.id})">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) { console.error(err); }
}

// ================= CLASS TEACHERS =================
async function loadClassTeachers() {
  try {
    const res = await fetch(`${API_URL}/class`);
    const data = await res.json();
    const tbody = document.querySelector("#classTeacherTable tbody");
    tbody.innerHTML = "";
    data.forEach(c => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${c.id}</td>
        <td>${c.teacher_name}</td>
        <td>${c.grade_name}</td>
        <td>
          <button class="edit" onclick="openEditModal('class', ${c.id}, ${c.teacher_id}, ${c.grade_id})">Edit</button>
          <button class="delete" onclick="deleteItem('class', ${c.id})">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) { console.error(err); }
}

// ================= KEEP TAB ACTIVE =================
function showActiveTab() {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-content").forEach(tab => tab.classList.remove("active"));
  document.querySelector(`.tab-btn[data-tab="${activeTab}"]`)?.classList.add("active");
  document.getElementById(activeTab)?.classList.add("active");
}

// ================= CLASS TEACHER HANDLERS =================

// ---- Assign Class Teacher ----
document.getElementById("assignClassForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const data = {
    teacher_id: document.getElementById("teacher_id_class").value,
    grade_id: document.getElementById("grade_id_class").value,
  };
  try {
    const res = await fetch(`${API_URL}/class`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    alert(result.message);

    document.getElementById("assignClassForm").reset();
    await loadClassTeachers(); // reload table only
  } catch (err) {
    console.error(err);
  }
});

// ---- Edit Class Teacher ----
document.getElementById("editClassForm")?.addEventListener("submit", async e => {
  e.preventDefault();
  const id = document.getElementById("edit_class_id").value;
  const updated = {
    teacher_id: document.getElementById("edit_teacher_id_class").value,
    grade_id: document.getElementById("edit_grade_id_class").value,
  };
  try {
    const res = await fetch(`${API_URL}/class/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    const data = await res.json();
    alert(data.message);

    cancelEditClass();
    await loadClassTeachers(); // reload table only

    // ✅ Keep Class Teachers tab active
    activeTab = "classTeacher";
    showActiveTab();

  } catch (err) {
    console.error(err);
  }
});


// ---- Delete Class Teacher ----
async function deleteItem(type, id) {
  if (!confirm("Are you sure?")) return;

  let url = API_URL;
  if (type === "subject") url += `/subjects/${id}`;
  else if (type === "class") url += `/class/${id}`;
  else url += `/${id}`;

  try {
    const res = await fetch(url, { method: "DELETE" });
    const data = await res.json();
    alert(data.message);

    if (type === "teacher") await loadTeachers();
    else if (type === "subject") await loadTeacherSubjects();
    else if (type === "class") await loadClassTeachers(); // reload table only
  } catch (err) {
    console.error(err);
  }
}
