document.addEventListener("DOMContentLoaded", async () => {
  try {
    const meRes = await fetch("/studentDashboard/me", { credentials: "include" });
    const me = await meRes.json();
    const studentId = me.id;
    if (!studentId) return console.error("Student ID not found.");

    const res = await fetch(`/studentDashboard/${studentId}/allTerms`, { credentials: "include" });
    const dataAllTerms = await res.json();
    const terms = dataAllTerms.terms;
    if (!terms || Object.keys(terms).length === 0) {
      document.getElementById("summaryBox").innerHTML = `<p style="color:red;">No report data available.</p>`;
      return;
    }

    const latestTermKey = Object.keys(terms).map(Number).sort((a, b) => b - a)[0];
    const data = terms[latestTermKey];

    document.getElementById("welcomeMsg").textContent = `Welcome Back, ${me.name} 👋`;
    document.getElementById("termInfo").textContent = `📅 Current Term: ${data.summary.term}`;

    const examOrder = ["Opener", "Midterm", "Endterm"];
    const conductedExams = examOrder.filter(exam => data.subjects.some(s => s[exam] != null));
    if (!conductedExams.length) {
      document.getElementById("summaryBox").innerHTML = `<p style="color:red;">No exams have been conducted this term.</p>`;
      return;
    }

    // Determine latest and previous exams
    const lastExamType = conductedExams[conductedExams.length - 1];
    const prevExamType = conductedExams.length > 1 ? conductedExams[conductedExams.length - 2] : null;

    // Build table headers
    const tableHead = document.querySelector(".report-table thead tr");
    tableHead.innerHTML = `<th>Subject</th>`;
    conductedExams.forEach(exam => tableHead.innerHTML += `<th>${exam}</th>`);
    if (prevExamType) tableHead.innerHTML += `<th>Dev</th>`;
    tableHead.innerHTML += `<th>Grade</th><th>Rank</th><th>Teacher</th>`;

    // Total marks using latest exam only
    const totalMarks = data.subjects.reduce((sum, sub) => sum + (Number(sub[lastExamType]) || 0), 0);
    const maxMarks = data.subjects.length * 100;

    document.getElementById("summaryBox").innerHTML = `
      <p><strong>Total Marks:</strong> ${totalMarks} / ${maxMarks}</p>
      <p><strong>Mean Points:</strong> ${data.summary.mean_points}</p>
      <p><strong>Performance:</strong> ${data.summary.performance}</p>
      <p><strong>Class Position:</strong> ${data.summary.position}</p>
    `;

    // Build table rows
    const tbody = document.getElementById("subjectBody");
    tbody.innerHTML = "";
    data.subjects.forEach(sub => {
      let row = `<td>${sub.subject_name}</td>`;
      conductedExams.forEach(exam => {
        row += `<td>${sub[exam] != null ? sub[exam] : "-"}</td>`;
      });

      // Add Dev column with arrows/colors
      if (prevExamType) {
        let devDisplay = "-";
        if (sub[lastExamType] != null && sub[prevExamType] != null) {
          const dev = sub[lastExamType] - sub[prevExamType];
          if (dev > 0) devDisplay = `<span style="color:green;">⬆️ ${dev}</span>`;
          else if (dev < 0) devDisplay = `<span style="color:red;">⬇️ ${Math.abs(dev)}</span>`;
          else devDisplay = `<span style="color:gray;">➡️ 0</span>`;
        }
        row += `<td>${devDisplay}</td>`;
      }

      row += `<td>${sub.Gr ?? "-"}</td>`;
      row += `<td>${sub.Rank ?? "-"}</td>`;
      row += `<td>${sub.teacher_name ?? "-"}</td>`;
      tbody.innerHTML += `<tr>${row}</tr>`;
    });

  } catch (err) {
    console.error("Error loading dashboard:", err);
  }
});
