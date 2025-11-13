// ===================== USERS =====================

let usersData = []; // store fetched users globally
let currentPage = 1;
const rowsPerPage = 5; // adjust as needed
const schoolId = localStorage.getItem("school_id"); // ✅ get school from login

// Fetch and display all users
async function loadUsers() {
  try {
    const res = await fetch(`/admin/users?school_id=${schoolId}`); // ✅ filter by school
    usersData = await res.json(); // save all users globally
    currentPage = 1; // reset page when data loads
    displayUsers();
  } catch (err) {
    console.error('Error loading users:', err);
  }
}

// Display users with pagination and optional search
function displayUsers(searchText = '') {
  const tbody = document.querySelector('#usersTable tbody');
  tbody.innerHTML = '';

  // Filter users by search text
  const filtered = usersData.filter(user =>
    user.username.toLowerCase().includes(searchText.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchText.toLowerCase())) ||
    user.role.toLowerCase().includes(searchText.toLowerCase())
  );

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const paginatedUsers = filtered.slice(start, end);

  paginatedUsers.forEach(user => {
    const encodedUsername = encodeURIComponent(user.username);
    const encodedEmail = encodeURIComponent(user.email || '');
    const row = `
      <tr>
        <td>${user.user_id}</td>
        <td>${user.username}</td>
        <td>${user.email || '—'}</td>
        <td>${user.role}</td>
        <td>${user.school_id}</td>
        <td>
          <button onclick="startEdit(${user.user_id}, '${encodedUsername}', '${encodedEmail}', '${user.role}')">✏️ Edit</button>
          <button onclick="deleteUser(${user.user_id})">🗑️ Delete</button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });

  renderPagination(filtered.length);
}

// ===================== SEARCH =====================
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchUser');

  searchInput.addEventListener('input', () => {
    currentPage = 1;
    displayUsers(searchInput.value);
  });

  loadUsers();
  fetchStats();
});

// ===================== PAGINATION =====================
function renderPagination(totalRows) {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  const pageCount = Math.ceil(totalRows / rowsPerPage);
  for (let i = 1; i <= pageCount; i++) {
    const btn = document.createElement('button');
    btn.innerText = i;
    btn.classList.toggle('active', i === currentPage);
    btn.addEventListener('click', () => {
      currentPage = i;
      displayUsers(document.getElementById('searchUser').value);
    });
    pagination.appendChild(btn);
  }
}

// ===================== ADD USER =====================
document.getElementById('addUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const role = document.getElementById('role').value;

  if (!email.includes('@')) {
    alert('Please enter a valid email.');
    return;
  }

  if (!role) {
    alert('Please select a role.');
    return;
  }

  try {
    const res = await fetch('/admin/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, role, school_id: schoolId }) // ✅ attach school
    });

    const data = await res.json();
    alert(data.message);
    loadUsers();
    fetchStats();
    e.target.reset();
  } catch (err) {
    console.error('Error adding user:', err);
  }
});

// ===================== DELETE USER =====================
async function deleteUser(userId) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  try {
    const res = await fetch(`/admin/users/${userId}`, { method: 'DELETE' });
    const data = await res.json();
    alert(data.message);
    loadUsers();
    fetchStats();
  } catch (err) {
    console.error('Error deleting user:', err);
  }
}

// ===================== EDIT USER =====================
function startEdit(user_id, username, email, role) {
  document.getElementById('editSection').style.display = 'block';
  document.getElementById('edit_user_id').value = user_id;
  document.getElementById('edit_username').value = decodeURIComponent(username);
  document.getElementById('edit_email').value = decodeURIComponent(email);
  document.getElementById('edit_role').value = role;
}

function cancelEdit() {
  document.getElementById('editSection').style.display = 'none';
  document.getElementById('editUserForm').reset();
}

document.getElementById('editUserForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const user_id = document.getElementById('edit_user_id').value;
  const username = document.getElementById('edit_username').value.trim();
  const email = document.getElementById('edit_email').value.trim();
  const role = document.getElementById('edit_role').value;

  if (!email.includes('@')) {
    alert('Please enter a valid email.');
    return;
  }

  if (!role) {
    alert('Please select a role.');
    return;
  }

  try {
    const res = await fetch(`/admin/users/${user_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, role, school_id: schoolId }) // ✅ attach school
    });

    const data = await res.json();
    alert(data.message);
    loadUsers();
    fetchStats();
    cancelEdit();
  } catch (err) {
    console.error('Error updating user:', err);
  }
});

// ===================== STATS =====================
function fetchStats() {
  fetch(`/admin/stats?school_id=${schoolId}`) // ✅ per school stats
    .then(res => res.json())
    .then(data => {
      document.getElementById("totalUsers").innerText = data.totalUsers || 0;
      document.getElementById("totalStudents").innerText = data.totalStudents || 0;
      document.getElementById("totalTeachers").innerText = data.totalTeachers || 0;
      document.getElementById("totalParents").innerText = data.totalParents || 0;
    })
    .catch(err => console.error("Error loading stats:", err));
}

// ===================== LOGOUT =====================
async function logout() {
  try {
    const res = await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include' // ✅ include session cookie
    });

    if (res.redirected) {
      window.location.href = res.url; // ✅ follow backend redirect
    } else {
      window.location.href = "/"; // fallback: send to school selection
    }
  } catch (err) {
    console.error("Logout error:", err);
    alert("Logout failed. Try again.");
  }
}

// Attach logout button event listener
document.getElementById("logoutBtn").addEventListener("click", logout);
