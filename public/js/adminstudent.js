let studentsData = [];
let currentPage = 1;
const rowsPerPage = 5;

// ===== Fetch students from backend =====
async function loadStudents() {
  const res = await fetch("/students");
  studentsData = await res.json();
  currentPage = 1;
  displayStudents();
}

// ===== Display students with search and pagination =====
function displayStudents(searchText = '') {
  const tbody = document.querySelector("#studentsTable tbody");
  tbody.innerHTML = '';

  // Filter students based on search input
  const filtered = studentsData.filter(stu =>
    stu.name.toLowerCase().includes(searchText.toLowerCase()) ||
    stu.admission_no.toLowerCase().includes(searchText.toLowerCase()) ||
    stu.stream.toLowerCase().includes(searchText.toLowerCase()) ||
    stu.grade.toString().includes(searchText)
  );

  // Pagination logic
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedStudents = filtered.slice(start, end);

  paginatedStudents.forEach(stu => {
    const row = `
      <tr>
        <td>${stu.id}</td>
        <td>${stu.admission_no}</td>
        <td>${stu.name}</td>
        <td>${stu.grade}</td>
        <td>${stu.stream}</td>
        <td>${stu.date_of_birth.split("T")[0]}</td>
        <td>${stu.gender}</td>
        <td>${stu.parent_contact}</td>
        <td>${stu.status}</td>
        <td>
          <button onclick="editStudent(${stu.id})">✏️ Edit</button>
          <button onclick="deleteStudent(${stu.id})">🗑️ Delete</button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });

  renderPagination(filtered.length);
}

// ===== Render pagination buttons =====
function renderPagination(totalRows) {
  const pagination = document.getElementById("pagination"); // ✅ fixed ID
  if (!pagination) return;
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

// ===== Search input listener =====
const searchInput = document.getElementById('searchStudent');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    currentPage = 1;
    displayStudents(searchInput.value);
  });
}

// ===== Add Student =====
document.getElementById("addStudentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const student = {
    name: document.getElementById("name").value,
    admission_no: document.getElementById("admission_no").value,
    date_of_birth: document.getElementById("date_of_birth").value,
    gender: document.getElementById("gender").value,
    grade: document.getElementById("grade").value,
    stream: document.getElementById("stream").value,
    parent_contact: document.getElementById("parent_contact").value,
  };
  await fetch("/students", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(student)
  });
  e.target.reset();
  loadStudents();
});

// ===== Edit Student =====
async function editStudent(id) {
  const res = await fetch(`/students/${id}`);
  const stu = await res.json();

  document.getElementById("edit_student_id").value = stu.id;
  document.getElementById("edit_name").value = stu.name;
  document.getElementById("edit_admission_no").value = stu.admission_no;
  document.getElementById("edit_date_of_birth").value = stu.date_of_birth.split("T")[0];
  document.getElementById("edit_gender").value = stu.gender;
  document.getElementById("edit_grade").value = stu.grade;
  document.getElementById("edit_stream").value = stu.stream;
  document.getElementById("edit_parent_contact").value = stu.parent_contact;
  document.getElementById("edit_status").value = stu.status;
  document.getElementById("editStudentSection").style.display = "block";
}

document.getElementById("editStudentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("edit_student_id").value;
  const student = {
    name: document.getElementById("edit_name").value,
    admission_no: document.getElementById("edit_admission_no").value,
    date_of_birth: document.getElementById("edit_date_of_birth").value,
    gender: document.getElementById("edit_gender").value,
    grade: document.getElementById("edit_grade").value,
    stream: document.getElementById("edit_stream").value,
    parent_contact: document.getElementById("edit_parent_contact").value,
    status: document.getElementById("edit_status").value
  };
  await fetch(`/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(student)
  });
  cancelStudentEdit();
  loadStudents();
});

function cancelStudentEdit() {
  document.getElementById("editStudentSection").style.display = "none";
}

// ===== Delete Student =====
async function deleteStudent(id) {
  if (!confirm("Are you sure you want to delete this student?")) return;
  await fetch(`/students/${id}`, { method: "DELETE" });
  loadStudents();
}

// ===== Load students on page load =====
document.addEventListener('DOMContentLoaded', loadStudents);
