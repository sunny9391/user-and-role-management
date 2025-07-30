let roles = [];
let permissionsList = [];
const ROLES_API = "/api/roles";
const PERMS_API = "/api/permissions";
let roleIdToDelete = null;

window.onload = async () => {
  await fetchPermissionsList();
  fetchRoles();
  applyPermissionsToUI(); 
};

async function fetchRoles() {
  try {
    const resp = await fetch(ROLES_API, { credentials: 'include' });
    if (!resp.ok) throw new Error("Failed to fetch roles");
    roles = await resp.json();
    renderRolesTable();
  } catch (error) {
    console.error("Failed to load roles:", error);
    roles = [];
    renderRolesTable();
  }
}

async function fetchPermissionsList() {
  try {
    const resp = await fetch(PERMS_API, { credentials: 'include' });
    if (!resp.ok) throw new Error("Failed to fetch permissions");
    permissionsList = await resp.json();
  } catch (error) {
    console.error("Failed to load permissions:", error);
    permissionsList = [];
  }
}

function formatPermissionsList(perms, roleName) {
  if (!Array.isArray(perms)) return "";

  const visible = perms.slice(0, 2).map(p => typeof p === 'string' ? p : p.key);
  const hidden = perms.slice(2).map(p => typeof p === 'string' ? p : p.key);

  let html = visible.join(', ');
  if (hidden.length > 0) {
    html += `, <a href="#" onclick="event.stopPropagation(); showFullPermissionsModal('${roleName}')" style="color: blue;">+${hidden.length} more</a>`;
  }
  return html;
}

function renderRolesTable(filteredRoles = roles) {
  const tbody = document.getElementById('rolesTableBody');
  tbody.innerHTML = '';
  filteredRoles.forEach(role => {
    const row = document.createElement('tr');
    row.classList.add('clickable-row');
    row.onclick = () => openViewRoleModal(role);

    const permissionsDisplay = formatPermissionsList(role.permissions || [], role.name);

    row.innerHTML = `
      <td>${role.name}</td>
      <td>${role.users || 0}</td>
      <td>${permissionsDisplay}</td>
      <td>${role.status}</td>
      <td>${role.createdBy || ""}</td>
      <td>${role.lastUpdated ? (role.lastUpdated.split('T')[0]) : ""}</td>
      <td class="actions">
        <i class="fas fa-pen-to-square text-blue" title="Edit"
          onclick="event.stopPropagation(); editRole('${role._id || role.id}')" data-permission="role:update"></i>
        <i class="fas fa-trash text-red" title="Delete"
          onclick="event.stopPropagation(); deleteRole('${role._id || role.id}')" data-permission="role:delete"></i>
      </td>
    `;
    tbody.appendChild(row);
  });
  applyPermissionsToUI(); 
}

function filterRolesByName() {
  const query = document.getElementById('roleSearchInput').value.toLowerCase();
  const filtered = roles.filter(role =>
    role.name && role.name.toLowerCase().includes(query)
  );
  renderRolesTable(filtered);
}

function openViewRoleModal(role) {
  document.getElementById('viewRoleName').innerText = role.name;
  document.getElementById('viewRoleUsers').innerText = role.users || 0;
  document.getElementById('viewRolePermissions').innerText = Array.isArray(role.permissions) ? role.permissions.join(', ') : (role.permissions || "");
  document.getElementById('viewRoleStatus').innerText = role.status;
  document.getElementById('viewRoleCreatedBy').innerText = role.createdBy || "";
  document.getElementById('viewRoleUpdated').innerText = role.lastUpdated ? (new Date(role.lastUpdated).toLocaleDateString()) : "";
  document.getElementById('viewRoleModal').style.display = 'flex';
}

function closeViewRoleModal() {
  document.getElementById('viewRoleModal').style.display = 'none';
}

function openAddNewRoleModal() {
  document.getElementById('addNewRoleModal').style.display = 'flex';
  populatePermissionsCheckboxes('newPermissionsCheckboxes', []);
}

function closeAddNewRoleModal() {
  document.getElementById('addNewRoleModal').style.display = 'none';
  document.getElementById('addNewRoleForm').reset();
  populatePermissionsCheckboxes('newPermissionsCheckboxes', []);
}

async function submitAddNewRole(event) {
  event.preventDefault();
  const name = document.getElementById('newRoleName').value.trim();
  const status = document.getElementById('newRoleStatus').value;
  const createdBy = JSON.parse(localStorage.getItem('loggedInUser'))?.username || 'Unknown';

  const newPermissionsCheckboxes = document.querySelectorAll('#newPermissionsCheckboxes input[name="permissions"]:checked');
  const permissions = Array.from(newPermissionsCheckboxes).map(cb => cb.value);
  const newRole = {
    name,
    users: 0,
    permissions,
    status,
    createdBy,
    lastUpdated: new Date().toISOString()
  };
  try {
    const resp = await fetch(ROLES_API, {
      method: "POST",
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(newRole)
    });
    const data = await resp.json();
    if (resp.ok) {
      closeAddNewRoleModal();
      fetchRoles();
      if (data.needsRefresh) {
        await refreshUserDataAndPermissions();
      }
    } else {
      alert(data.error || "Failed to add role.");
    }
  } catch (e) {
    alert("Could not add role: " + e.message);
  }
}

function editRole(id) {
  const role = roles.find(r => (r._id === id || r.id == id));
  if (!role) return;
  document.getElementById('editRoleId').value = role._id || role.id;
  document.getElementById('editRoleName').value = role.name;
  document.getElementById('editRoleStatus').value = role.status;
  document.getElementById('editRoleModal').style.display = 'flex';
populatePermissionsCheckboxes('editPermissionsCheckboxes', role.permissions || []);
}

function populatePermissionsCheckboxes(containerId, selectedKeys = []) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";

    permissionsList.forEach(perm => {
        const checkboxDiv = document.createElement('div');
        checkboxDiv.className = 'checkbox-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `perm-${perm.key.replace(/:/g, '-')}`;
        checkbox.value = perm.key;
        checkbox.name = 'permissions';
        if (selectedKeys && selectedKeys.includes(perm.key)) {
            checkbox.checked = true;
        }

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.textContent = `${perm.description} (${perm.key})`;

        checkboxDiv.appendChild(checkbox);
        checkboxDiv.appendChild(label);
        container.appendChild(checkboxDiv);
    });
}

async function submitEditRole(event) {
  event.preventDefault();
  const id = document.getElementById('editRoleId').value;
  const name = document.getElementById('editRoleName').value.trim();
  const status = document.getElementById('editRoleStatus').value;
  const editPermissionsCheckboxes = document.querySelectorAll('#editPermissionsCheckboxes input[name="permissions"]:checked');
  const permissions = Array.from(editPermissionsCheckboxes).map(cb => cb.value);

  try {
    const resp = await fetch(`${ROLES_API}/${id}`, {
      method: "PUT",
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, permissions, status, lastUpdated: new Date().toISOString() })
    });
    const data = await resp.json();
    if (resp.ok) {
      closeEditRoleModal();
      fetchRoles();
      if (data.needsRefresh) {
        await refreshUserDataAndPermissions();
      }
    } else {
      alert(data.error || "Failed to update role");
    }
  } catch (err) {
    alert("Could not update role: " + err.message);
  }
}

function closeEditRoleModal() {
  document.getElementById('editRoleForm').reset();
  document.getElementById('editRoleModal').style.display = 'none';
  populatePermissionsCheckboxes('editPermissionsCheckboxes', []);
}

function deleteRole(id) {
  roleIdToDelete = id;
  const role = roles.find(r => (r._id === id || r.id == id));
  if (role) {
    document.getElementById('deleteRoleName').textContent = role.name;
    document.getElementById('deleteRoleModal').style.display = 'flex';
  }
}

async function confirmDeleteRole() {
  if (!roleIdToDelete) return;
  try {
    const resp = await fetch(`${ROLES_API}/${roleIdToDelete}`, { method: "DELETE", credentials: 'include' });
    const data = await resp.json();
    if (resp.ok) {
      fetchRoles();
      closeDeleteRoleModal();
      if (data.needsRefresh) {
        await refreshUserDataAndPermissions();
      }
    } else {
      alert(data.error || "Failed to delete role");
    }
  } catch (err) {
    alert("Network error: " + err.message);
  }
}

function showFullPermissionsModal(roleName) {
  const role = roles.find(r => r.name === roleName);
  if (!role) return;

  const list = document.getElementById('fullPermissionsList');
  list.innerHTML = "";

  (role.permissions || []).forEach(p => {
    const li = document.createElement("li");
    li.textContent = typeof p === 'string' ? p : p.key;
    list.appendChild(li);
  });

  document.getElementById('fullPermissionsTitle').textContent = `Permissions for ${roleName}`;
  document.getElementById('fullPermissionsModal').style.display = "flex";
}

function closeFullPermissionsModal() {
  document.getElementById('fullPermissionsModal').style.display = "none";
}

document.addEventListener('DOMContentLoaded', () => {
    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await logout();
        });
    }
});