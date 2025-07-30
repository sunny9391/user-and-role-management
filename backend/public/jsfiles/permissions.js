let permissions = [];
let roles = [];
const PERMISSIONS_API = "/api/permissions";
const ROLES_API = "/api/roles";
let permissionIdToDelete = null;
let isEditMode = false;

window.onload = async () => {
  await fetchData();
  applyPermissionsToUI();
};

async function fetchData() {
  try {
    const [permRes, roleRes] = await Promise.all([
      fetch(PERMISSIONS_API, { credentials: 'include' }),
      fetch(ROLES_API, { credentials: 'include' })
    ]);

    if (!permRes.ok) throw new Error(`Failed to fetch permissions: ${permRes.status}`);
    if (!roleRes.ok) throw new Error(`Failed to fetch roles: ${roleRes.status}`);

    permissions = await permRes.json();
    roles = await roleRes.json();

    renderPermissionsTable();
    applyPermissionsToUI();
  } catch (error) {
    console.error("Error fetching data:", error);
    permissions = [];
    roles = [];
    renderPermissionsTable();
  }
}

function renderPermissionsTable(data = permissions) {
  const tbody = document.getElementById('permissionsTableBody');
  tbody.innerHTML = '';

  data.forEach((perm) => {
    const assignedRoles = roles
      .filter(role =>
        (role.permissions || []).some(p =>
          typeof p === 'string' ? p === perm.key :
          typeof p === 'object' && p.key === perm.key
        )
      )
      .map(role => role.name);

    const displayRoles = assignedRoles.slice(0, 2).join(', ');
    const remaining = assignedRoles.length - 2;

    const rolesHtml = remaining > 0
      ? `${displayRoles}, <a href="#" onclick="event.stopPropagation(); showFullRolesModal('${perm.key}')" style="color:blue;">+${remaining} more</a>`
      : assignedRoles.join(', ');

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${perm.key}</td>
      <td>${perm.description}</td>
      <td>${rolesHtml}</td>
      <td class="actions">
        <i class="fas fa-pen-to-square text-blue" onclick="openEditPermissionModal('${perm._id || perm.id}')"
           data-permission="permission:update"></i>
        <i class="fas fa-trash text-red" onclick="openDeletePermissionModal('${perm._id || perm.id}')"
           data-permission="permission:delete"></i>
      </td>
    `;
    tbody.appendChild(row);
  });
  applyPermissionsToUI();
}

function filterPermissions() {
  const query = document.getElementById('permissionSearchInput').value.toLowerCase();
  const filtered = permissions.filter(p =>
    p.key && p.key.toLowerCase().includes(query)
  );
  renderPermissionsTable(filtered);
}

function openAddPermissionModal() {
  isEditMode = false;
  document.getElementById('modalPermissionTitle').innerText = 'Add Permission';
  document.getElementById('permissionForm').reset();
  document.getElementById('permissionId').value = '';
  document.getElementById('addPermissionModal').style.display = 'flex';
}

function openEditPermissionModal(id) {
  const perm = permissions.find(p => (p._id === id || String(p.id) === String(id)));
  if (!perm) return;
  isEditMode = true;
  document.getElementById('modalPermissionTitle').innerText = 'Edit Permission';
  document.getElementById('permissionId').value = perm._id || perm.id;
  document.getElementById('permissionKey').value = perm.key;
  document.getElementById('permissionDescription').value = perm.description;
  document.getElementById('addPermissionModal').style.display = 'flex';
}

function closePermissionModal() {
  document.getElementById('addPermissionModal').style.display = 'none';
}

async function submitPermissionForm(event) {
  event.preventDefault();
  const id = document.getElementById('permissionId').value;
  const key = document.getElementById('permissionKey').value.trim();
  const description = document.getElementById('permissionDescription').value.trim();
  if (!key || !description) return;

  try {
    let response;
    if (isEditMode && id) {
      response = await fetch(`${PERMISSIONS_API}/${id}`, {
        method: "PUT",
        headers: {'Content-Type':'application/json'},
        credentials: 'include',
        body: JSON.stringify({ key, description })
      });
    } else {
      response = await fetch(PERMISSIONS_API, {
        method: "POST",
        headers: {'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({ key, description, roles: [] })
      });
    }

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to perform operation.');
    }

    const data = await response.json();

    closePermissionModal();
    fetchData();
    if (data.needsRefresh) {
      await refreshUserDataAndPermissions();
    }
  } catch (error) {
    console.error("Error submitting permission form:", error);
    alert("Error: " + error.message);
  }
}

function openDeletePermissionModal(id) {
  permissionIdToDelete = id;
  const perm = permissions.find(p => (p._id === id || String(p.id) === String(id)));
  document.getElementById('deletePermissionName').innerText = perm?.key || '';
  document.getElementById('deletePermissionModal').style.display = 'flex';
}

function closeDeletePermissionModal() {
  permissionIdToDelete = null;
  document.getElementById('deletePermissionModal').style.display = 'none';
}

async function confirmDeletePermission() {
  if (!permissionIdToDelete) return;
  try {
    const response = await fetch(`${PERMISSIONS_API}/${permissionIdToDelete}`, {
      method: "DELETE",
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete permission.');
    }

    const data = await response.json();

    fetchData();
    closeDeletePermissionModal();
    if (data.needsRefresh) {
      await refreshUserDataAndPermissions();
    }
  } catch (error) {
    console.error("Error deleting permission:", error);
    alert("Error: " + error.message);
  }
}

function showFullRolesModal(permissionKey) {
  const assignedRoles = roles
    .filter(role =>
      (role.permissions || []).some(p =>
        typeof p === 'string' ? p === permissionKey :
        typeof p === 'object' && p.key === permissionKey
      )
    )
    .map(role => role.name);

  const ul = document.getElementById('fullRolesList');
  ul.innerHTML = '';

  assignedRoles.forEach(roleName => {
    const li = document.createElement('li');
    li.textContent = roleName;
    ul.appendChild(li);
  });

  document.getElementById('fullRolesTitle').textContent = `Roles assigned to "${permissionKey}"`;
  document.getElementById('fullRolesModal').style.display = 'flex';
}

function closeFullRolesModal() {
  document.getElementById('fullRolesModal').style.display = 'none';
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