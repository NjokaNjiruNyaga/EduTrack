let subjectsData = [];
let currentPage = 1;
const rowsPerPage = 5;

// -------------------- FETCH SUBJECTS --------------------
async function loadSubjects() {
  const res = await fetch('/subjects'); // backend route
  subjectsData = await res.json();
  currentPage = 1;
  displaySubjects();
}

// -------------------- DISPLAY SUBJECTS WITH SEARCH & PAGINATION --------------------
function displaySubjects(searchText = '') {
  const tbody = document.querySelector('#subjectsTable tbody');
  tbody.innerHTML = '';

  // Filter based on search input
  const filtered = subjectsData.filter(sub =>
    sub.subject_name.toLowerCase().includes(searchText.toLowerCase()) ||
    sub.category.toLowerCase().includes(searchText.toLowerCase()) ||
    sub.grade_from.toString().includes(searchText) ||
    sub.grade_to.toString().includes(searchText)
  );

  // Pagination
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginated = filtered.slice(start, end);

  paginated.forEach(subject => {
    const row = `
      <tr>
        <td>${subject.subject_id}</td>
        <td>${subject.subject_name}</td>
        <td>${subject.grade_from}</td>
        <td>${subject.grade_to}</td>
        <td>${subject.category}</td>
        <td>${subject.status}</td>
        <td>
          <button onclick="editSubject(${subject.subject_id})" class="btn-edit">Edit</button>
          <button onclick="deleteSubject(${subject.subject_id})" class="btn-cancel">Delete</button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });

  renderPagination(filtered.length);
}

// -------------------- RENDER PAGINATION --------------------
function renderPagination(totalRows) {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  const pageCount = Math.ceil(totalRows / rowsPerPage);
  for (let i = 1; i <= pageCount; i++) {
    const btn = document.createElement('button');
    btn.innerText = i;
    btn.classList.toggle('active', i === currentPage);
    btn.addEventListener('click', () => {
      currentPage = i;
      displaySubjects(document.getElementById('searchSubject').value);
    });
    pagination.appendChild(btn);
  }
}

// -------------------- SEARCH INPUT --------------------
const searchInput = document.getElementById('searchSubject');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    currentPage = 1;
    displaySubjects(searchInput.value);
  });
}

// -------------------- ADD SUBJECT --------------------
document.getElementById('addSubjectForm').addEventListener('submit', async e => {
  e.preventDefault();
  const subject = {
    subject_name: document.getElementById('subject_name').value,
    grade_from: document.getElementById('grade_from').value,
    grade_to: document.getElementById('grade_to').value,
    category: document.getElementById('category').value,
    status: document.getElementById('status').value
  };
  await fetch('/subjects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subject)
  });
  e.target.reset();
  loadSubjects();
});

// -------------------- EDIT SUBJECT --------------------
async function editSubject(id) {
  const res = await fetch(`/subjects/${id}`);
  const subject = await res.json();

  document.getElementById('edit_subject_id').value = subject.subject_id;
  document.getElementById('edit_subject_name').value = subject.subject_name;
  document.getElementById('edit_grade_from').value = subject.grade_from;
  document.getElementById('edit_grade_to').value = subject.grade_to;
  document.getElementById('edit_category').value = subject.category;
  document.getElementById('edit_status').value = subject.status;

  document.getElementById('editSubjectSection').style.display = 'block';
}

// -------------------- UPDATE SUBJECT --------------------
document.getElementById('editSubjectForm').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('edit_subject_id').value;
  const updatedSubject = {
    subject_name: document.getElementById('edit_subject_name').value,
    grade_from: document.getElementById('edit_grade_from').value,
    grade_to: document.getElementById('edit_grade_to').value,
    category: document.getElementById('edit_category').value,
    status: document.getElementById('edit_status').value
  };
  await fetch(`/subjects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedSubject)
  });
  cancelSubjectEdit();
  loadSubjects();
});

// -------------------- CANCEL EDIT --------------------
function cancelSubjectEdit() {
  document.getElementById('editSubjectSection').style.display = 'none';
}

// -------------------- DELETE SUBJECT --------------------
async function deleteSubject(id) {
  if (confirm('Are you sure you want to delete this subject?')) {
    await fetch(`/subjects/${id}`, { method: 'DELETE' });
    loadSubjects();
  }
}

// -------------------- INITIAL LOAD --------------------
document.addEventListener('DOMContentLoaded', loadSubjects);
