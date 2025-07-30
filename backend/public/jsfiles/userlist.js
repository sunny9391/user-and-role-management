let users = [];
let currentUserId = null;
let deleteUserId = null;

const API = "/api/users";

async function fetchUsers() {
  try {
    const resp = await fetch(API, { credentials: 'include' });
    if (!resp.ok) throw new Error("Failed to fetch users");
    users = await resp.json();
    renderUserTable();
  } catch (error) {
    alert('Failed to load users: ' + error.message);
    console.error(error);
  }
}

window.onload = fetchUsers;

async function submitAddUser(event) {
  event.preventDefault();

  const body = {
    name: document.getElementById('newUserName').value.trim(),
    username: document.getElementById('newUsername').value.trim(),
    password: document.getElementById('newUserPassword').value.trim(),
    email: document.getElementById('newUserEmail').value.trim(),
    phone: document.getElementById('newUserPhone').value.trim(),
    role: document.getElementById('newUserRole').value,
    status: document.getElementById('newUserStatus').value,
    created: new Date().toISOString(),
    lastLogin: null,
  };

  try {
    const resp = await fetch(API, {
      method: "POST",
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await resp.json();

    if (resp.ok) {
      closeAddUserModal();
      fetchUsers();
      if (data.needsRefresh) {
        await refreshUserDataAndPermissions();
      }
    } else {
      alert(data.error || "Could not add user.");
    }
  } catch (e) {
    alert("Could not add user: " + e.message);
  }
}

function editUser(id) {
  const user = users.find(u => u._id === id);
  if (!user) return;

  document.getElementById('editUserId').value = user._id;
  document.getElementById('editUserName').value = user.name || '';
  document.getElementById('editUserEmail').value = user.email || '';
  document.getElementById('editUserPhone').value = user.phone || '';
  document.getElementById('editUserRole').value = user.role || '';
  document.getElementById('editUserStatus').value = user.status || '';
  document.getElementById('editUserModal').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editUserModal').style.display = 'none';
}

async function submitEditUser(event) {
  event.preventDefault();
  const id = document.getElementById('editUserId').value;

  const body = {
    name: document.getElementById('editUserName').value.trim(),
    email: document.getElementById('editUserEmail').value.trim(),
    phone: document.getElementById('editUserPhone').value.trim(),
    role: document.getElementById('editUserRole').value,
    status: document.getElementById('editUserStatus').value
  };

  try {
    const resp = await fetch(`${API}/${id}`, {
      method: "PUT",
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await resp.json();

    if (resp.ok) {
      closeEditModal();
      await fetchUsers();
      if (data.needsRefresh) {
        await refreshUserDataAndPermissions();
      }
    } else {
      alert(data.error || "Failed to update user");
    }
  } catch (err) {
    alert('Failed to update user: ' + err.message);
  }
}

function openDeleteModal(id) {
  deleteUserId = id;
  const user = users.find(u => u._id === id);
  if (user) {
    document.getElementById('deleteUserName').textContent = user.name || user.username || '';
    document.getElementById('deleteUserModal').style.display = 'flex';
  }
}

function closeDeleteModal() {
  deleteUserId = null;
  document.getElementById('deleteUserModal').style.display = 'none';
}

async function confirmDeleteUser() {
  if (!deleteUserId) return;
  try {
    const resp = await fetch(`${API}/${deleteUserId}`, {
      method: "DELETE",
      credentials: 'include'
    });
    const data = await resp.json();
    if (resp.ok) {
      fetchUsers();
      closeDeleteModal();
      if (data.needsRefresh) {
        await refreshUserDataAndPermissions();
      }
    } else {
      alert(data.error || "Failed to delete user");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

function openUserModal(user) {
  currentUserId = user._id;
  document.getElementById('modalName').textContent = user.name || '';
  document.getElementById('modalEmail').textContent = user.email || '';
  document.getElementById('modalPhone').textContent = user.phone || '';
  document.getElementById('modalRole').textContent = user.role || '';
  document.getElementById('modalStatus').textContent = user.status || '';
  document.getElementById('modalCreated').textContent = user.created ? new Date(user.created).toLocaleDateString() : "-";
  document.getElementById('modalLogin').textContent = user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "-";
  document.getElementById('userProfileModal').style.display = 'flex';
}

function closeUserModal() {
  document.getElementById('userProfileModal').style.display = 'none';
}

window.addEventListener('click', function (e) {
  if (e.target === document.getElementById('userProfileModal')) closeUserModal();
  if (e.target === document.getElementById('deleteUserModal')) closeDeleteModal();
  if (e.target === document.getElementById('editUserModal')) closeEditModal();
  if (e.target === document.getElementById('addUserModal')) closeAddUserModal();
});

function openAddUserModal() {
  document.getElementById('addUserModal').style.display = 'flex';
  populateRolesDropdown();
}

function closeAddUserModal() {
  document.getElementById('addUserModal').style.display = 'none';
  document.getElementById('newUserName').value = '';
  document.getElementById('newUsername').value = '';
  document.getElementById('newUserPassword').value = '';
  document.getElementById('newUserEmail').value = '';
  document.getElementById('newUserPhone').value = '';
  document.getElementById('newUserRole').value = '';
  document.getElementById('newUserStatus').value = '';
}

document.getElementById('userSearchInput').oninput = filterUsersByName;

function filterUsersByName() {
  const query = document.getElementById('userSearchInput').value.toLowerCase();
  const filtered = users.filter(user =>
    user.name && user.name.toLowerCase().includes(query)
  );
  renderUserTable(filtered);
}

function renderUserTable(filteredUsers = users) {
  const tbody = document.getElementById('usertablerow');
  tbody.innerHTML = '';
  filteredUsers.forEach(user => {
    const row = document.createElement('tr');
    row.classList.add('clickable-row');
    row.onclick = () => openUserModal(user);
    row.innerHTML = `
      <td>${user.userId || ''}</td>
      <td>${user.name || ""}</td>
      <td>${user.username || ""}</td>
      <td>${user.email || ""}</td>
      <td>${user.role || ""}</td>
      <td>${user.status || ""}</td>
      <td class="actions">
        <i class="fas fa-pen-to-square text-primary" title="Edit" onclick="event.stopPropagation(); editUser('${user._id}')" data-permission="user:update"></i>
        <i class="fas fa-trash text-danger" style="color:red" title="Delete" onclick="event.stopPropagation(); openDeleteModal('${user._id}')" data-permission="user:delete"></i>
      </td>
    `;
    tbody.appendChild(row);
  });
  applyPermissionsToUI();
}

async function populateRolesDropdown() {
  const select = document.getElementById("newUserRole");
  select.innerHTML = "<option value='' disabled selected>Select a role</option>";
  try {
    const res = await fetch("/api/roles", { credentials: 'include' });
    if (!res.ok) throw new Error("Failed to load roles");
    const roles = await res.json();

    roles.forEach(role => {
      const option = document.createElement("option");
      option.value = role.name;
      option.textContent = role.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to load roles", error);
    select.innerHTML = "<option value='' disabled>Failed to load roles</option>";
  }
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                if (response.ok) {
                    localStorage.clear();
                    window.location.href = 'index.html';
                } else {
                    alert('Failed to log out.');
                }
            } catch (error) {
                console.error('Logout error:', error);
                alert('An error occurred during logout.');
            }
        });
    }
});