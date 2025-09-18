document.addEventListener('DOMContentLoaded', () => {
  const examsTableBody = document.querySelector('#examsTable tbody');
  const examForm = document.getElementById('examForm');
  const cancelEditBtn = document.getElementById('cancelEdit');
  const formTitle = document.getElementById('formTitle');
  const searchInput = document.getElementById('searchExam');
  const paginationDiv = document.getElementById('pagination');

  let examsData = [];
  let editingExamId = null;
  let currentPage = 1;
  const rowsPerPage = 5;

  // ------------------ Fetch Exams ------------------
  async function loadExams() {
    try {
      const res = await fetch('/exams');
      const data = await res.json();
      if (!Array.isArray(data)) {
        console.error('Exams data is not an array:', data);
        return;
      }
      examsData = data;
      currentPage = 1;
      displayExams();
    } catch (err) {
      console.error('Error fetching exams:', err);
    }
  }

  // ------------------ Display Exams with Search & Pagination ------------------
  function displayExams(searchText = '') {
    examsTableBody.innerHTML = '';

    const filtered = examsData.filter(exam =>
      exam.exam_id.toString().includes(searchText) ||
      exam.school_id.toString().includes(searchText) ||
      exam.exam_type.toLowerCase().includes(searchText.toLowerCase()) ||
      exam.term.toString().includes(searchText)
    );

    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginated = filtered.slice(start, end);

    paginated.forEach(exam => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${exam.exam_id}</td>
        <td>${exam.school_id}</td>
        <td>${exam.exam_type}</td>
        <td>${exam.term}</td>
        <td>${exam.created_at}</td>
        <td>
          <button type="button" onclick="editExam(${exam.exam_id})">Edit</button>
          <button type="button" onclick="deleteExam(${exam.exam_id})">Delete</button>
        </td>
      `;
      examsTableBody.appendChild(row);
    });

    renderPagination(filtered.length);
  }

  // ------------------ Render Pagination ------------------
  function renderPagination(totalRows) {
    paginationDiv.innerHTML = '';
    const pageCount = Math.ceil(totalRows / rowsPerPage);

    for (let i = 1; i <= pageCount; i++) {
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.classList.toggle('active', i === currentPage);
      btn.addEventListener('click', () => {
        currentPage = i;
        displayExams(searchInput.value);
      });
      paginationDiv.appendChild(btn);
    }
  }

  // ------------------ Search ------------------
  searchInput.addEventListener('input', () => {
    currentPage = 1;
    displayExams(searchInput.value.trim());
  });

  // ------------------ Add or Update Exam ------------------
  examForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const school_id = Number(document.getElementById('school_id').value);
    const exam_type = document.getElementById('exam_type').value.trim();
    const term = Number(document.getElementById('exam_term').value);

    if (!school_id || !exam_type || !term) {
      alert('Please fill in all fields.');
      return;
    }

    const payload = { school_id, exam_type, term };
    const url = editingExamId ? `/exams/${editingExamId}` : '/exams';
    const method = editingExamId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        alert(editingExamId ? 'Exam updated successfully!' : 'Exam added successfully!');
        examForm.reset();
        editingExamId = null;
        cancelEditBtn.style.display = 'none';
        formTitle.textContent = 'Add New Exam';
        loadExams();
      } else {
        alert(data.error || 'Error saving exam');
      }
    } catch (err) {
      console.error('Error saving exam:', err);
      alert('Error connecting to server');
    }
  });

  // ------------------ Edit Exam ------------------
  window.editExam = async (examId) => {
    try {
      const res = await fetch(`/exams/${examId}`);
      const exam = await res.json();
      editingExamId = examId;

      document.getElementById('school_id').value = exam.school_id;
      document.getElementById('exam_type').value = exam.exam_type;
      document.getElementById('exam_term').value = exam.term;

      formTitle.textContent = 'Edit Exam';
      cancelEditBtn.style.display = 'inline-block';
    } catch (err) {
      console.error('Error editing exam:', err);
    }
  };

  // ------------------ Cancel Edit ------------------
  cancelEditBtn.addEventListener('click', () => {
    examForm.reset();
    editingExamId = null;
    formTitle.textContent = 'Add New Exam';
    cancelEditBtn.style.display = 'none';
  });

  // ------------------ Delete Exam ------------------
  window.deleteExam = async (examId) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;

    try {
      const res = await fetch(`/exams/${examId}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        alert('Exam deleted successfully!');
        loadExams();
      } else {
        alert(data.error || 'Error deleting exam');
      }
    } catch (err) {
      console.error('Error deleting exam:', err);
      alert('Error connecting to server');
    }
  };

  // ------------------ Initial Load ------------------
  loadExams();
});
