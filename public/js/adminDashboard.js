// ===================== USERS =====================

// Fetch and display all users
async function loadUsers() {
  try {
    const res = await fetch('/admin/users');
    const users = await res.json();

    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';

    users.forEach(user => {
      const row = `
        <tr>
          <td>${user.user_id}</td>
          <td>${user.username}</td>
          <td>${user.role}</td>
          <td>${user.school_id}</td>
          <td>
            <button onclick="startEdit(${user.user_id}, '${user.username}', '${user.role}', ${user.school_id})">✏️ Edit</button>
            <button onclick="deleteUser(${user.user_id})">🗑️ Delete</button>
          </td>
        </tr>
      `;
      tbody.innerHTML += row;
    });
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

// Register new user
document.getElementById('addUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const school_id = document.getElementById('school_id').value;

  try {
    const res = await fetch('/admin/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role, school_id })
    });

    const data = await res.json();
    alert(data.message);
    loadUsers();
    fetchStats(); // ✅ refresh stats
    e.target.reset();
  } catch (err) {
    console.error('Error adding user:', err);
  }
});

// Delete user
async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  try {
    const res = await fetch(`/admin/users/${userId}`, { method: 'DELETE' });
    const data = await res.json();
    alert(data.message);
    loadUsers();
    fetchStats(); // ✅ refresh stats
  } catch (err) {
    console.error('Error deleting user:', err);
  }
}

// Start editing user
function startEdit(user_id, username, role, school_id) {
  document.getElementById('editSection').style.display = 'block';
  document.getElementById('edit_user_id').value = user_id;
  document.getElementById('edit_username').value = username;
  document.getElementById('edit_role').value = role;
  document.getElementById('edit_school_id').value = school_id;
}

// Cancel edit
function cancelEdit() {
  document.getElementById('editSection').style.display = 'none';
}

// Update user
document.getElementById('editUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const user_id = document.getElementById('edit_user_id').value;
  const username = document.getElementById('edit_username').value;
  const role = document.getElementById('edit_role').value;
  const school_id = document.getElementById('edit_school_id').value;

  try {
    const res = await fetch(`/admin/users/${user_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, role, school_id })
    });

    const data = await res.json();
    alert(data.message);
    loadUsers();
    fetchStats(); // ✅ refresh stats
    cancelEdit();
  } catch (err) {
    console.error('Error updating user:', err);
  }
});

// ===================== STATS =====================

// Fetch stats from backend
function fetchStats() {
  fetch("/admin/stats") // ✅ correct API endpoint
    .then(res => res.json())
    .then(data => {   
      document.getElementById("totalUsers").innerText = data.totalUsers || 0;
      document.getElementById("totalStudents").innerText = data.totalStudents || 0;
      document.getElementById("totalTeachers").innerText = data.totalTeachers || 0;
      document.getElementById("totalParents").innerText = data.totalParents || 0;
    })
    .catch(err => console.error("Error loading stats:", err));
}

// ===================== INIT =====================
document.addEventListener("DOMContentLoaded", () => {
  fetchStats();
  loadUsers();
});
