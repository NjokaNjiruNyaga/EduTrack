document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/analytics/subject-performance");
    const data = await res.json();

    if (!data.data || !data.data.length) {
      document.getElementById("subject-summary").innerHTML =
        "<p>No performance data found.</p>";
      return;
    }

    const trendLabels = new Set();
    const datasets = [];
    const streamDatasets = [];
    const streamLabels = new Set();
    let topRowsHTML = "";

    for (const [index, subjectData] of data.data.entries()) {
      const subject = subjectData.subject_name;
      const latestAverage = subjectData.class_average || "N/A";

      // --- Summary Card ---
      const summaryDiv = document.createElement("div");
      summaryDiv.classList.add("subject-card");
      summaryDiv.innerHTML = `
        <h4>${subject}</h4>
        <p><b>Grade:</b> ${subjectData.grade || "N/A"}</p>
        <p><b>Stream:</b> ${subjectData.stream || "N/A"}</p>
        <p><b>Current Term:</b> ${subjectData.current_term || "—"}</p>
        <p><b>Class Average:</b> ${latestAverage}%</p>
        <p><b>Improvement:</b> ${subjectData.improvement || "—"}</p>
      `;
      document.getElementById("subject-summary").appendChild(summaryDiv);

      // --- Term & Exam Trend Data ---
      const termLabels = subjectData.term_averages.map(
        (t) => `Term ${t.term} - ${t.exam_type}`
      );
      const averages = subjectData.term_averages.map((t) => t.average);
      termLabels.forEach((l) => trendLabels.add(l));

      // ✅ Give each bar its own color (not one color per subject)
      const barColors = averages.map((_, i) => mixColors(i));

      datasets.push({
        label: `${subject} (${subjectData.grade}${subjectData.stream ? "-" + subjectData.stream : ""})`,
        data: averages,
        borderColor: barColors,
        backgroundColor: barColors,
        borderWidth: 1,
        borderRadius: 3,
      });

      // --- Stream Comparison Chart Data ---
      if (subjectData.stream_comparison && subjectData.stream_comparison.length) {
        subjectData.stream_comparison.forEach((sc) => {
          streamLabels.add(sc.stream);
        });

        // ✅ Each stream bar has a different color
        streamDatasets.push({
          label: `${subject} (Grade ${subjectData.grade})`,
          data: subjectData.stream_comparison.map((s) => s.avg_marks),
          backgroundColor: subjectData.stream_comparison.map(
            (_, i) => mixColors(i)
          ),
          borderWidth: 1,
          borderRadius: 4,
        });
      }

      // --- Top Performers Table ---
      subjectData.top_students.forEach((s, i) => {
        topRowsHTML += `
          <tr>
            <td>${i + 1}</td>
            <td>${s.name}</td>
            <td>${s.marks}</td>
            <td>${subject}</td>
          </tr>
        `;
      });
    }

    document.getElementById("topPerformersTable").innerHTML = topRowsHTML;

    // --- 📊 Performance Trend Over Terms ---
    const ctx = document.getElementById("subjectTrendChart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: Array.from(trendLabels),
        datasets,
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "📈 Performance Trend Over Terms (Average Marks)",
            font: { size: 16, weight: "bold" },
          },
          legend: { position: "bottom" },
        },
        scales: {
          x: {
            title: { display: true, text: "Term & Exam Type" },
            ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 },
          },
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: "Average (%)" },
          },
        },
      },
    });

    // --- 🧩 Stream Comparison Chart ---
    const streamCtx = document.getElementById("streamComparisonChart").getContext("2d");
    new Chart(streamCtx, {
      type: "bar",
      data: {
        labels: Array.from(streamLabels),
        datasets: streamDatasets,
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: "🏫 Stream-wise Subject Performance (Average Marks)",
            font: { size: 16, weight: "bold" },
          },
          legend: { position: "bottom" },
        },
        scales: {
          x: {
            title: { display: true, text: "Streams" },
            ticks: { autoSkip: false, maxRotation: 45, minRotation: 45 },
          },
          y: {
            beginAtZero: true,
            max: 100,
            title: { display: true, text: "Average (%)" },
          },
        },
      },
    });

  } catch (error) {
    console.error("Error loading analytics:", error);
  }
});

// --- 🎨 Color Helpers ---
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

function mixColors(index) {
  const mixedColors = [
    "rgba(255, 99, 132, 0.7)",
    "rgba(54, 162, 235, 0.7)",
    "rgba(255, 206, 86, 0.7)",
    "rgba(75, 192, 192, 0.7)",
    "rgba(153, 102, 255, 0.7)",
    "rgba(255, 159, 64, 0.7)",
    "rgba(199, 199, 199, 0.7)",
    "rgba(255, 205, 210, 0.7)",
  ];
  return mixedColors[index % mixedColors.length];
}
