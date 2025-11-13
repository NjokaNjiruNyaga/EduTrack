document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.getElementById("studentOverviewBody");

  try {
    const res = await fetch("/analytics/class/student-overview", { credentials: "include" });
    const { data, message } = await res.json();

    if (!data || !data.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:gray;">${message || "No student data available"}</td></tr>`;
      return;
    }

    tbody.innerHTML = "";

    data.forEach((st, index) => {
      const row = document.createElement("tr");

      // ✅ Prepare subject dropdown
      const subjectList = st.subjects?.length
        ? `<ul>${st.subjects.map(sub => `<li>${sub}</li>`).join("")}</ul>`
        : `<small style="color:gray;">No subjects found</small>`;

      // ✅ Performance color scheme
      let color = "#dc2626"; // Default red
      if (st.performance === "Exceeding Expectation") color = "#16a34a";
      else if (st.performance === "Meeting Expectation") color = "#2563eb";
      else if (st.performance === "Approaching Expectation") color = "#f97316";

      const perfHTML = `
        <div class="perf-vertical">
          <div class="perf-box" style="border-color: ${color};">
            ${st.total_marks || 0} / ${st.total_outof || 0}
          </div>
          <div class="perf-pill" style="background: ${color};">${st.performance}</div>
          <div class="perf-percentage">${st.percentage ?? 0}%</div>
        </div>
      `;

      row.innerHTML = `
        <td>${index + 1}</td>
        <td class="student-info">
          <div class="student-avatar ${String(st.gender || "").toLowerCase()}">
            ${String(st.gender || "").toLowerCase() === "female" ? "👩" : "👨"}
          </div>
          <div>
            <strong>${st.name}</strong><br>
            <small>${st.adm_no || ""} | ${st.gender || ""}</small>
          </div>
        </td>
        <td class="class-label">${st.grade_level || ""} - ${st.stream || ""}</td>
        <td>
          <button class="subject-btn">Subjects</button>
          <div class="subject-dropdown">${subjectList}</div>
        </td>
        <td class="performance-cell">${perfHTML}</td>
        <td>
          <button class="view-details-btn" onclick="openStudentReport(${st.student_id}, '${st.name.replace(/'/g, "\\'")}')">
            View Report
          </button>
        </td>
      `;

      tbody.appendChild(row);
    });

    // Dropdown logic
    document.querySelectorAll(".subject-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const dropdown = btn.nextElementSibling;
        document.querySelectorAll(".subject-dropdown").forEach(d => {
          if (d !== dropdown) d.classList.remove("show");
        });
        dropdown.classList.toggle("show");
      });
    });

    document.addEventListener("click", e => {
      if (!e.target.closest(".subject-btn") && !e.target.closest(".subject-dropdown")) {
        document.querySelectorAll(".subject-dropdown").forEach(d => d.classList.remove("show"));
      }
    });

    window.addEventListener("scroll", () => {
      document.querySelectorAll(".subject-dropdown.show").forEach(d => d.classList.remove("show"));
    }, true);

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error loading data.</td></tr>`;
  }
});

/* ===========================================================
   MODAL LOGIC: Student Report View
=========================================================== */
async function openStudentReport(studentId, studentName) {
  const modal = document.getElementById("studentReportModal");
  const nameTitle = document.getElementById("studentNameTitle");
  const summaryDiv = document.getElementById("studentReportSummary");
  const contentDiv = document.getElementById("studentReportContent");

  modal.style.display = "flex";
  nameTitle.textContent = `📄 ${studentName}'s Academic Report`;
  summaryDiv.innerHTML = `<p>Loading summary...</p>`;
  contentDiv.innerHTML = `<p>Loading report...</p>`;

  try {
    const res = await fetch(`/analytics/student/${studentId}/details`, { credentials: "include" });
    const { summary, subjects, available_exams, message } = await res.json();

    if (!summary && !subjects?.length) {
      summaryDiv.innerHTML = `<p style="color:gray;">${message || "No report data found."}</p>`;
      contentDiv.innerHTML = "";
      return;
    }

    // ✅ Summary Section (Header)
    summaryDiv.innerHTML = `
      <div class="summary-header">
        <p><strong>Grade:</strong> ${summary.grade_level || ""}</p>
        <p><strong>Stream:</strong> ${summary.stream || ""}</p>
        <p><strong>Total Marks:</strong> ${summary.total_marks || 0}</p>
        <p><strong>Mean Points:</strong> ${summary.mean_points || "N/A"}</p>
        <p><strong>Position:</strong> ${summary.position || "-"}</p>
        <p><strong>Performance:</strong> ${summary.performance || "N/A"}</p>
      </div>
      <button id="printReportBtn" class="print-btn" onclick="printReport()">🖨️ Print</button>
    `;

    // ✅ Determine available exams (Opener, Midterm, Endterm)
    const exams = available_exams?.length ? available_exams : ["Opener", "Midterm", "Endterm"];
    const examCols = exams.map(e => `<th>${e}</th>`).join("");
    const hasEndterm = exams.includes("Endterm");

    // ✅ Subject Table
    if (subjects && subjects.length) {
      contentDiv.innerHTML = `
        <table class="report-table">
          <thead>
            <tr>
              <th>Learning Area</th>
              ${examCols}
              ${hasEndterm ? "<th>Dev</th>" : ""}
              <th>Gr.</th>
              <th>Rank</th>
              <th>Performance Level</th>
              <th>Teacher</th>
            </tr>
          </thead>
          <tbody id="studentReportTableBody">
            ${subjects.map(sub => {
              const opener = sub.Opener ?? "-";
              const midterm = sub.Midterm ?? "-";
              const endterm = sub.Endterm ?? "-";
              let dev = "-";
              if (sub.Endterm && (sub.Midterm || sub.Opener)) {
                const prev = sub.Midterm ?? sub.Opener;
                dev = (sub.Endterm - prev).toFixed(1);
              }

              return `
                <tr>
                  <td>${sub.subject_name}</td>
                  ${exams.map(e => `<td>${sub[e] ?? "-"}</td>`).join("")}
                  ${hasEndterm ? `<td>${dev}</td>` : ""}
                 <td>${sub.Gr || "-"}</td>    
                 <td>${sub.Rank || "-"}</td>
                 <td>${sub.Performance_Level || "-"}</td>
                 <td>${sub.teacher_name || "-"}</td>

                </tr>`;
            }).join("")}
          </tbody>
        </table>
      `;
    } else {
      contentDiv.innerHTML = `<p style="color:gray;">No subject marks found for this term.</p>`;
    }
  } catch (err) {
    console.error(err);
    summaryDiv.innerHTML = `<p style="color:red;">Error loading report data.</p>`;
  }
}

/* Close Modal */
function closeModal() {
  document.getElementById("studentReportModal").style.display = "none";
}

/* Close Modal on background click */
window.onclick = (event) => {
  const modal = document.getElementById("studentReportModal");
  if (event.target === modal) modal.style.display = "none";
};

/* ===========================================================
   PRINT REPORT FUNCTION
=========================================================== */
function printReport() {
  const modalContent = document.querySelector(".modal-content").innerHTML;
  const printWindow = window.open("", "_blank");
  printWindow.document.write(`
    <html>
      <head>
        <title>Student Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .summary-header { display: flex; flex-wrap: wrap; gap: 10px; border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: center; font-size: 13px; }
          th { background: #f5f5f5; }
          h3 { text-align: center; }
        </style>
      </head>
      <body>${modalContent}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}
