// -------------------- FETCH & DISPLAY SUBJECTS --------------------
async function loadSubjects() {
  const res = await fetch('/subjects'); // Your backend route
  const subjects = await res.json();

  const tbody = document.querySelector('#subjectsTable tbody');
  tbody.innerHTML = '';

  subjects.forEach(subject => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
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
    `;
    tbody.appendChild(tr);
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

  loadSubjects();
  e.target.reset();
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

  document.getElementById('editSubjectSection').style.display = 'none';
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
loadSubjects();
