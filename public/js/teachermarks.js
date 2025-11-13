document.addEventListener("DOMContentLoaded", async () => {
  const examType = document.getElementById("examType");
  const termSelect = document.getElementById("termSelect");
  const subjectSelect = document.getElementById("subjectSelect");
  const gradeSelect = document.getElementById("gradeSelect");
  const loadStudentsBtn = document.getElementById("loadStudentsBtn");
  const saveMarksBtn = document.getElementById("saveMarksBtn");
  const tbody = document.querySelector("#marksTable tbody");
  const message = document.getElementById("message");

  // Summary elements
  const classAverageEl = document.getElementById("classAverage");
  const highestMarkEl = document.getElementById("highestMark");
  const lowestMarkEl = document.getElementById("lowestMark");
  const studentCountEl = document.getElementById("studentCount");

  let assignments = [];
  let autosaveTimeouts = {};

  // ===== Load teacher assignments =====
  try {
    const res = await fetch("/marks/teacher-assignments", { credentials: "include" });
    const data = await res.json();

    if (!data.assignments.length) {
      subjectSelect.innerHTML = `<option value="">No subjects</option>`;
      gradeSelect.innerHTML = `<option value="">No grades</option>`;
      subjectSelect.disabled = gradeSelect.disabled = true;
    } else {
      assignments = data.assignments;

      const subjects = [...new Map(assignments.map(a => [a.subject_id, a.subject_name]))]
        .map(([id, name]) => ({ id, name }));
      subjectSelect.innerHTML = `<option value="">Select Subject</option>`;
      subjects.forEach(s => subjectSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`);

      subjectSelect.addEventListener("change", () => {
        const subjectId = subjectSelect.value;
        const grades = assignments.filter(a => a.subject_id == subjectId);
        gradeSelect.innerHTML = `<option value="">Select Grade</option>`;
        grades.forEach(g => gradeSelect.innerHTML += `<option value="${g.grade_id}">Grade ${g.grade_level} ${g.stream}</option>`);
      });
    }
  } catch (err) {
    console.error(err);
    alert("Failed to load assignments");
  }

  // ===== Load students =====
  loadStudentsBtn.addEventListener("click", async () => {
    const subjectId = subjectSelect.value;
    const gradeId = gradeSelect.value;
    const exam_type = examType.value;
    const term = termSelect.value;

    if (!exam_type || !term || !subjectId || !gradeId) {
      alert("Please select all fields before loading students.");
      return;
    }

    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Loading students...</td></tr>`;

    try {
      const res = await fetch(`/marks/students?gradeId=${gradeId}&subjectId=${subjectId}&exam_type=${exam_type}&term=${term}`, { credentials: "include" });
      const students = await res.json();

      if (!students.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No students found.</td></tr>`;
        updateSummary(0, "-", "-", "-", 0);
        return;
      }

      tbody.innerHTML = "";
      students.forEach((s, i) => {
        const displayValue = s.marks ?? (s.status === 'ABSENT' ? 'X' : s.status === 'CHEATED' ? 'Y' : '');
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${i + 1}</td>
          <td>${s.name}</td>
          <td>${s.admission_no}</td>
          <td>
            <input type="text" class="markInput" 
              data-student="${s.id}" 
              data-existing="${s.marks !== null || s.status ? 'true' : 'false'}" 
              value="${displayValue}" 
              placeholder="0-100 or X/Y">
          </td>
          <td class="level">${s.level ?? ''}</td>
          <td class="points">${s.points ?? ''}</td>
          <td class="position">${s.position ? s.position + '/' + students.length : ''}</td>
        `;
        tbody.appendChild(row);
      });

      const inputs = document.querySelectorAll(".markInput");
      inputs.forEach(input => input.addEventListener("input", handleInputChange));

      recalculatePositions();
      recalculateSummary();
      highlightRows();

    } catch (err) {
      console.error(err);
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:red;">Error loading students.</td></tr>`;
    }
  });

  // ===== Manual save =====
  saveMarksBtn.addEventListener("click", async () => {
    const allInputs = Array.from(document.querySelectorAll(".markInput"));
    allInputs.forEach(input => input.dispatchEvent(new Event("input")));
    message.textContent = "All marks saved!";
    message.style.color = "blue";
    setTimeout(() => message.textContent = "", 2000);
  });

  // ===== Input handler =====
  async function handleInputChange(event) {
    const input = event.target;
    const row = input.closest("tr");
    const value = input.value.toUpperCase().trim();

    let marksNum = null;
    let status = null;
    if (value === 'X') status = 'ABSENT';
    else if (value === 'Y') status = 'CHEATED';
    else if (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 100)
      marksNum = parseFloat(value);
    else { input.style.borderColor = "red"; return; }
    input.style.borderColor = "#ccc";

    const { level, points } = calculateLevelAndPoints(marksNum);
    row.querySelector(".level").textContent = level;
    row.querySelector(".points").textContent = points;

    recalculatePositions();
    recalculateSummary();
    highlightRows();

    const studentId = input.dataset.student;
    const subjectId = subjectSelect.value;
    const gradeId = gradeSelect.value;
    const exam_type = examType.value;
    const term = termSelect.value;

    if (autosaveTimeouts[studentId]) clearTimeout(autosaveTimeouts[studentId]);
    autosaveTimeouts[studentId] = setTimeout(async () => {
      try {
        const res = await fetch("/marks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            studentId,
            subjectId,
            gradeId,
            exam_type,
            term,
            marks: marksNum,
            status,
            existing: input.dataset.existing === "true"
          })
        });
        if (!res.ok) throw new Error("Failed to save mark");
        input.dataset.existing = "true";
        message.textContent = `✅ Autosaved ${row.querySelector("td:nth-child(2)").textContent}`;
        message.style.color = "green";
        setTimeout(() => message.textContent = "", 2000);
      } catch (err) {
        console.error(err);
        message.textContent = `❌ Autosave failed for ${row.querySelector("td:nth-child(2)").textContent}`;
        message.style.color = "red";
      }
    }, 1500);
  }

  // ===== Helper functions =====
  function calculateLevelAndPoints(marks) {
    if (marks === null) return { level: "", points: "" };
    if (marks >= 90) return { level: "EE1", points: 4.0 };
    if (marks >= 75) return { level: "EE2", points: 3.5 };
    if (marks >= 58) return { level: "ME1", points: 3.0 };
    if (marks >= 41) return { level: "ME2", points: 2.5 };
    if (marks >= 31) return { level: "AE1", points: 2.0 };
    if (marks >= 21) return { level: "AE2", points: 1.5 };
    if (marks >= 11) return { level: "BE1", points: 1.0 };
    return { level: "BE2", points: 0.5 };
  }

  function recalculatePositions() {
    const rows = Array.from(tbody.querySelectorAll("tr"));
    const studentsWithMarks = rows.map(row => {
      const input = row.querySelector(".markInput");
      const val = input.value.toUpperCase().trim();
      const marks = (val === 'X' || val === 'Y' || val === '') ? -1 : parseFloat(val);
      return { row, marks };
    });
    studentsWithMarks.sort((a, b) => b.marks - a.marks);

    let currentPosition = 0, lastMarks = null, rank = 0;
    studentsWithMarks.forEach(s => {
      if (s.marks === -1) { s.row.querySelector(".position").textContent = ''; return; }
      rank++;
      if (s.marks !== lastMarks) currentPosition = rank;
      s.row.querySelector(".position").textContent = `${currentPosition}/${studentsWithMarks.length}`;
      lastMarks = s.marks;
    });
  }

  function recalculateSummary() {
    const inputs = Array.from(document.querySelectorAll(".markInput"));
    const validMarks = inputs.map(i => {
      const v = i.value.toUpperCase().trim();
      return (v === 'X' || v === 'Y' || v === '') ? null : parseFloat(v);
    }).filter(m => m !== null);

    const count = validMarks.length;
    const avg = count ? (validMarks.reduce((a, b) => a + b, 0) / count).toFixed(2) : '-';
    const high = count ? Math.max(...validMarks) : '-';
    const low = count ? Math.min(...validMarks) : '-';

    updateSummary(count, avg, high, low, inputs.length);
  }

  function updateSummary(validCount, avg, high, low, total) {
    classAverageEl.textContent = avg;
    highestMarkEl.textContent = high;
    lowestMarkEl.textContent = low;
    studentCountEl.textContent = `${validCount}/${total}`;
  }

  function highlightRows() {
    const rows = Array.from(tbody.querySelectorAll("tr"));
    let max = -1;
    rows.forEach(r => {
      const val = r.querySelector(".markInput").value.toUpperCase().trim();
      const marks = (val === 'X' || val === 'Y' || val === '') ? -1 : parseFloat(val);
      if (marks > max) max = marks;
      r.style.backgroundColor = "";
    });
    rows.forEach(r => {
      const val = r.querySelector(".markInput").value.toUpperCase().trim();
      const marks = (val === 'X' || val === 'Y' || val === '') ? -1 : parseFloat(val);
      if (marks !== -1) {
        if (marks === max) r.style.backgroundColor = "#d4edda";
        else if (marks < 40) r.style.backgroundColor = "#f8d7da";
      }
    });
  }
});
