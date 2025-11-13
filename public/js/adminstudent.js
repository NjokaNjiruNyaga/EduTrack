let studentsData = [];
let gradesData = [];
let currentPage = 1;
const rowsPerPage = 5;

// ===== Fetch grades =====
async function loadGrades() {
  const school_id = localStorage.getItem("school_id");
  if (!school_id) return;

  try {
    const res = await fetch(`/grades?school_id=${school_id}`);
    const result = await res.json();
    gradesData = result.data || [];

    // Add Student dropdown
    const gradeSelect = document.getElementById("grade_id");
    const gradeSearch = document.getElementById("gradeSearch");
    populateGradeDropdown(gradeSelect, gradesData);

    gradeSearch.addEventListener('input', () => {
      const filter = gradeSearch.value.trim();
      const filtered = gradesData.filter(g => g.grade_level.toString().startsWith(filter));
      populateGradeDropdown(gradeSelect, filtered);
    });

    // Edit Student dropdown
    const editGradeSelect = document.getElementById("edit_grade_id");
    const editGradeSearch = document.getElementById("editGradeSearch");
    populateGradeDropdown(editGradeSelect, gradesData);

    editGradeSearch.addEventListener('input', () => {
      const filter = editGradeSearch.value.trim();
      const filtered = gradesData.filter(g => g.grade_level.toString().startsWith(filter));
      populateGradeDropdown(editGradeSelect, filtered);
    });

  } catch (err) {
    console.error("Error loading grades:", err);
  }
}

// ===== Populate dropdown helper =====
function populateGradeDropdown(selectElement, data) {
  if (!selectElement) return;
  selectElement.innerHTML = '<option value="">Select Grade & Stream</option>';
  data.forEach(g => {
    const option = document.createElement("option");
    option.value = g.grade_id;
    option.textContent = `${g.grade_level}${g.stream}`;
    selectElement.appendChild(option);
  });
}

// ===== Fetch students =====
async function loadStudents() {
  const school_id = localStorage.getItem("school_id");
  if (!school_id) return alert("❌ No school selected.");

  try {
    const res = await fetch(`/students?school_id=${school_id}`);
    const result = await res.json();
    studentsData = result.data || [];
    currentPage = 1;
    displayStudents();
  } catch (err) {
    console.error("Error fetching students:", err);
  }
}

// ===== Display students with search + pagination =====
function displayStudents(searchText = '') {
  const tbody = document.querySelector("#studentsTable tbody");
  tbody.innerHTML = '';

  const filtered = studentsData.filter(stu =>
    stu.name.toLowerCase().includes(searchText.toLowerCase()) ||
    stu.admission_no.toLowerCase().includes(searchText.toLowerCase()) ||
    (gradesData.find(g => g.grade_id === stu.grade_id)?.grade_level.toString() || '').includes(searchText)
  );

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginated = filtered.slice(start, end);

  if (paginated.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10">No students found</td></tr>`;
  }

  paginated.forEach(stu => {
    const gradeInfo = gradesData.find(g => g.grade_id === stu.grade_id);
    const gradeName = gradeInfo ? `${gradeInfo.grade_level}${gradeInfo.stream}` : "N/A";

    tbody.innerHTML += `
      <tr>
        <td>${stu.id}</td>
        <td>${stu.admission_no}</td>
        <td>${stu.name}</td>
        <td>${gradeName}</td>
        <td>${stu.date_of_birth ? stu.date_of_birth.split("T")[0] : ''}</td>
        <td>${stu.gender}</td>
        <td>${stu.parent_contact}</td>
        <td>${stu.status || 'Active'}</td>
        <td>
          <button onclick="editStudent(${stu.id})">✏️ Edit</button>
          <button onclick="deleteStudent(${stu.id})">🗑️ Delete</button>
        </td>
      </tr>
    `;
  });

  renderPagination(filtered.length);
}

// ===== Pagination =====
function renderPagination(totalRows) {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = '';
  const pageCount = Math.ceil(totalRows / rowsPerPage);
  for (let i = 1; i <= pageCount; i++) {
    const btn = document.createElement('button');
    btn.innerText = i;
    btn.classList.toggle('active', i === currentPage);
    btn.addEventListener('click', () => {
      currentPage = i;
      displayStudents(document.getElementById('searchStudent').value);
    });
    pagination.appendChild(btn);
  }
}

// ===== Search input =====
document.getElementById('searchStudent')?.addEventListener('input', e => {
  currentPage = 1;
  displayStudents(e.target.value);
});

// ===== Add Student =====
document.getElementById("addStudentForm").addEventListener("submit", async e => {
  e.preventDefault();
  const school_id = localStorage.getItem("school_id");
  const student = {
    name: document.getElementById("name").value,
    admission_no: document.getElementById("admission_no").value,
    date_of_birth: document.getElementById("date_of_birth").value,
    gender: document.getElementById("gender").value,
    parent_contact: document.getElementById("parent_contact").value,
    grade_id: document.getElementById("grade_id").value,
    school_id
  };

  const res = await fetch("/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(student) });
  const result = await res.json();

  if (!result.success) {
    return alert(result.message || '❌ Failed to add student');
  }

  e.target.reset();
  loadStudents();
});

// ===== Edit Student =====
async function editStudent(id) {
  const res = await fetch(`/students/${id}`);
  const stu = (await res.json()).data;

  document.getElementById("edit_student_id").value = stu.id;
  document.getElementById("edit_name").value = stu.name;
  document.getElementById("edit_admission_no").value = stu.admission_no;
  document.getElementById("edit_date_of_birth").value = stu.date_of_birth ? stu.date_of_birth.split("T")[0] : '';
  document.getElementById("edit_gender").value = stu.gender;
  document.getElementById("edit_parent_contact").value = stu.parent_contact;
  document.getElementById("edit_status").value = stu.status || 'active';
  document.getElementById("edit_grade_id").value = stu.grade_id;

  document.getElementById("editStudentSection").style.display = "block";
}

document.getElementById("editStudentForm").addEventListener("submit", async e => {
  e.preventDefault();
  const id = document.getElementById("edit_student_id").value;
  const school_id = localStorage.getItem("school_id");

  const student = {
    name: document.getElementById("edit_name").value,
    admission_no: document.getElementById("edit_admission_no").value,
    date_of_birth: document.getElementById("edit_date_of_birth").value,
    gender: document.getElementById("edit_gender").value,
    parent_contact: document.getElementById("edit_parent_contact").value,
    status: document.getElementById("edit_status").value,
    grade_id: document.getElementById("edit_grade_id").value,
    school_id
  };

  const res = await fetch(`/students/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(student) });
  const result = await res.json();

  if (!result.success) {
    return alert(result.message || '❌ Failed to update student');
  }

  cancelStudentEdit();
  loadStudents();
});

function cancelStudentEdit() {
  document.getElementById("editStudentSection").style.display = "none";
}

// ===== Delete Student =====
async function deleteStudent(id) {
  if (!confirm("Are you sure you want to delete this student?")) return;

  try {
    const res = await fetch(`/students/${id}`, { method: "DELETE" });
    const result = await res.json();

    if (!result.success) return alert(result.message || '❌ Failed to delete student');

    alert(result.message); // Show confirmation message
    await loadStudents();  // Refresh table
  } catch (err) {
    console.error("Error deleting student:", err);
    alert("❌ An error occurred while deleting the student.");
  }
}


// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  await loadGrades();
  await loadStudents();
});
