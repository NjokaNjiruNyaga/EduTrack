document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/student/profile/data", { credentials: "include" });
    const result = await res.json();

    if (!result.success || !result.student) {
      console.error(result.message || "Failed to load student info");
      return;
    }

    const s = result.student;

    // Fill profile fields
    document.getElementById("studentName").textContent = s.name || "N/A";
    document.getElementById("adm").textContent = s.admission_no || "N/A";
    document.getElementById("grade").textContent = s.grade || "N/A";
    document.getElementById("gender").textContent = s.gender || "N/A";
    document.getElementById("email").textContent = s.email || "N/A";
    document.getElementById("parent").textContent = s.parent_contact || "N/A";

    // Avatar color based on gender
    const avatar = document.getElementById("avatar");
    if (s.gender?.toLowerCase() === "female") {
      avatar.textContent = "👩";
      avatar.style.background = "#ffb6c1";
    } else {
      avatar.textContent = "👨";
      avatar.style.background = "#a5d8ff";
    }

  } catch (error) {
    console.error("Error loading profile:", error);
  }
});
 // Toggle Change Password form visibility
    const quickBtn = document.getElementById("quickActionsBtn");
    const passwordForm = document.getElementById("passwordForm");

    quickBtn.addEventListener("click", () => {
      if (passwordForm.style.display === "none") {
        passwordForm.style.display = "block";
      } else {
        passwordForm.style.display = "none";
      }
    });

// Handle password change
document.getElementById("passwordForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const msg = document.getElementById("statusMsg");

  const res = await fetch("/student/profile/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const data = await res.json();
  msg.textContent = data.message;
  msg.style.color = data.success ? "green" : "red";

  if (data.success) document.getElementById("passwordForm").reset();
});
