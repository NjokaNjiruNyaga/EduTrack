// js/logout.js
 async function logout() {
      if (!confirm("Are you sure you want to log out?")) return;
      try {
        await fetch('/auth/logout', { method: 'POST' });
      } catch (err) {
        console.error("Logout error:", err);
      }
      localStorage.clear(); // ✅ clear all saved data
      window.location.href = "index.html"; // ✅ redirect to school selection
    }