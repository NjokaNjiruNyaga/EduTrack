document.addEventListener('DOMContentLoaded', () => {
  const examsTableBody = document.querySelector('#examsTable tbody');
  const examForm = document.getElementById('examForm');
  const cancelEditBtn = document.getElementById('cancelEdit');
  const formTitle = document.getElementById('formTitle');

  let editingExamId = null;

  // ------------------ Fetch and Display Exams ------------------
  function loadExams() {
    fetch('/exams')
      .then(res => res.json())
      .then(exams => {
        if (!Array.isArray(exams)) {
          console.error('Exams data is not an array:', exams);
          return;
        }        

        examsTableBody.innerHTML = '';
        exams.forEach(exam => {
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
      })
      .catch(err => console.error('Error fetching exams:', err));
  }

  loadExams();

  // ------------------ Add or Update Exam ------------------
  examForm.addEventListener('submit', (e) => {
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

    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
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
      })
      .catch(err => {
        console.error('Error saving exam:', err);
        alert('Error connecting to server');
      });
  });

  // ------------------ Edit Exam ------------------
  window.editExam = (examId) => {
    fetch(`/exams/${examId}`)
      .then(res => res.json())
      .then(exam => {
        editingExamId = examId;
        document.getElementById('school_id').value = exam.school_id;
        document.getElementById('exam_type').value = exam.exam_type;
        document.getElementById('exam_term').value = exam.term;

        formTitle.textContent = 'Edit Exam';
        cancelEditBtn.style.display = 'inline-block';
      })
      .catch(err => console.error('Error editing exam:', err));
  };

  // ------------------ Cancel Edit ------------------
  cancelEditBtn.addEventListener('click', () => {
    examForm.reset();
    editingExamId = null;
    formTitle.textContent = 'Add New Exam';
    cancelEditBtn.style.display = 'none';
  });

  // ------------------ Delete Exam ------------------
  window.deleteExam = (examId) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;

    fetch(`/exams/${examId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert('Exam deleted successfully!');
          loadExams();
        } else {
          alert(data.error || 'Error deleting exam');
        }
      })
      .catch(err => {
        console.error('Error deleting exam:', err);
        alert('Error connecting to server');
      });
  };
});
