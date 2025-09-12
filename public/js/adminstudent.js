// ===== Fetch and Display Students =====
async function loadStudents() {
  const res = await fetch("/students");
  const students = await res.json();

  console.log("Students fetched:", students); // 👈 debug
  const tbody = document.querySelector("#studentsTable tbody");
  tbody.innerHTML = "";

  students.forEach(stu => {
    const row = `
      <tr>
        <td>${stu.id}</td>
        <td>${stu.admission_no}</td>
        <td>${stu.name}</td>
        <td>${stu.grade}</td>
        <td>${stu.stream}</td>
        <td>${stu.date_of_birth.split("T")[0]}</td> <!-- ✅ format date -->
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
  document.getElementById("edit_name").value = stu.name;   // ✅ fixed
  document.getElementById("edit_admission_no").value = stu.admission_no;
  document.getElementById("edit_date_of_birth").value = stu.date_of_birth.split("T")[0]; // ✅ fix format
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
    name: document.getElementById("edit_name").value,   // ✅ fixed
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

// Load students on page load
loadStudents();
