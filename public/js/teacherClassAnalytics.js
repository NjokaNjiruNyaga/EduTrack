document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/analytics/class/class-performance", { credentials: "include" });

    if (!res.ok) throw new Error(`Server returned ${res.status}: ${res.statusText}`);

    const { data, message } = await res.json();

    // --- Handle No Data ---
    if (!data) {
      document.querySelector("#teacherGrade").textContent = "N/A";
      document.querySelector("#currentExam").textContent = "N/A";
      document.querySelector("#classAverage").textContent = "N/A";
      document.querySelector("#topstream").textContent = "N/A";
      document.querySelector("#topStudentsTable tbody").innerHTML =
        `<tr><td colspan="3" style="text-align:center; color:gray;">${message || "No analytics data available."}</td></tr>`;
      return;
    }

    // --- 📘 Class Summary ---
    document.querySelector("#teacherGrade").textContent = `${data.grade_level} ${data.stream}`;
    document.querySelector("#currentExam").textContent = `${data.exam_type} (Term ${data.term})`;
    document.querySelector("#classAverage").textContent =
      data.class_average !== null ? `${data.class_average}%` : "N/A";

    // --- 🏆 Top Stream ---
    if (data.stream_comparison && data.stream_comparison.length > 0) {
      const topStream = data.stream_comparison.reduce((a, b) => (a.avg > b.avg ? a : b));
      document.querySelector("#topstream").textContent = `${topStream.stream} (${topStream.avg}%)`;
    } else {
      document.querySelector("#topstream").textContent = "N/A";
    }

    // --- 📊 Subject Performance by Stream ---
    const ctx1 = document.getElementById("subjectChart");
    const subjectLabels = [
      ...new Set(data.subject_comparison.flatMap(s => s.subjects.map(sub => sub.subject_name)))
    ];

    const datasets = data.subject_comparison.map((streamData, index) => ({
      label: `${streamData.stream}`,
      data: subjectLabels.map(subName => {
        const subject = streamData.subjects.find(s => s.subject_name === subName);
        return subject ? subject.average : 0;
      }),
      backgroundColor: getColor(index, 0.7),
      borderColor: getColor(index, 1),
      borderWidth: 1,
      borderRadius: 6,
    }));

    new Chart(ctx1, {
      type: "bar",
      data: { labels: subjectLabels, datasets },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: "Average (%)",
            },
          },
          x: {
            title: {
              display: true,
              text: "Subjects",
            },
            ticks: { autoSkip: false },
          },
        },
        plugins: {
          legend: { position: "bottom" },
          title: {
            display: true,
            text: "📊 Subject Performance by Stream (Average Marks)",
            font: { size: 16, weight: "bold" },
          },
        },
      },
    });

    // --- 🧭 Stream Performance Comparison (Pie Chart) ---
    const ctx2 = document.getElementById("streamChart");
    new Chart(ctx2, {
      type: "pie",
      data: {
        labels: data.stream_comparison.map(s => s.stream),
        datasets: [{
          label: "Average Marks (%)",
          data: data.stream_comparison.map(s => s.avg),
          backgroundColor: [
            "rgba(255, 99, 132, 0.7)",
            "rgba(54, 162, 235, 0.7)",
            "rgba(255, 206, 86, 0.7)",
            "rgba(75, 192, 192, 0.7)",
            "rgba(153, 102, 255, 0.7)",
          ],
          borderColor: "#fff",
          borderWidth: 2,
        }],
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: "🏫 Stream Performance Summary (Average Marks)",
            font: { size: 16, weight: "bold" },
          },
          legend: { position: "bottom" },
        },
      },
    });

    // --- 🥇 Top 5 Students ---
    const tbody = document.querySelector("#topStudentsTable tbody");
    tbody.innerHTML = "";
    data.top_students.forEach((st, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${i + 1}</td><td>${st.name}</td><td>${st.avg_marks}%</td>`;
      tbody.appendChild(tr);
    });

  } catch (error) {
    console.error("Error loading class analytics:", error);
    document.querySelector("#teacherGrade").textContent = "Error";
    document.querySelector("#currentExam").textContent = "Error";
    document.querySelector("#classAverage").textContent = "Error";
    document.querySelector("#topstream").textContent = "Error";
    document.querySelector("#topStudentsTable tbody").innerHTML =
      `<tr><td colspan="3" style="text-align:center; color:red;">Failed to load data</td></tr>`;
  }
});

// --- 🎨 Color Generator ---
function getColor(index, alpha = 1) {
  const colors = [
    `rgba(255, 99, 132, ${alpha})`,   // Red
    `rgba(54, 162, 235, ${alpha})`,   // Blue
    `rgba(255, 206, 86, ${alpha})`,   // Yellow
    `rgba(75, 192, 192, ${alpha})`,   // Teal
    `rgba(153, 102, 255, ${alpha})`,  // Purple
    `rgba(255, 159, 64, ${alpha})`,   // Orange
  ];
  return colors[index % colors.length];
}
