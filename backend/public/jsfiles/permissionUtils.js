function getUserPermissions() {
  try {
    const permissionsJson = localStorage.getItem('userPermissions');
    return permissionsJson ? JSON.parse(permissionsJson) : [];
  } catch (error) {
    console.error("Error parsing user permissions from localStorage:", error);
    return [];
  }
}

function hasPermission(permissionKey) {
  const userPermissions = getUserPermissions();
  return userPermissions.includes(permissionKey);
}

function applyPermissionsToUI() {
  const elements = document.querySelectorAll('[data-permission]');

  elements.forEach(element => {
    const requiredPermission = element.dataset.permission;
    const permissionAction = element.dataset.permissionAction || 'hide';

    if (hasPermission(requiredPermission)) {
      if (permissionAction === 'hide') {
        element.style.display = '';
      } else if (permissionAction === 'disable') {
        element.removeAttribute('disabled');
      } else if (permissionAction === 'show') {
        element.style.display = '';
      }
    } else {
      if (permissionAction === 'hide') {
        element.style.display = 'none';
      } else if (permissionAction === 'disable') {
        element.setAttribute('disabled', 'true');
      } else if (permissionAction === 'show') {
        element.style.display = 'none';
      }
    }
  });
}

async function refreshUserDataAndPermissions() {
  try {
    const response = await fetch('/api/auth/current-user', {
      credentials: 'include'
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 404) {
        console.warn("Session expired or user not found. Redirecting to login.");
        localStorage.clear();
        window.location.href = 'login.html';
        return;
      }
      throw new Error(`Failed to refresh user data: ${response.status}`);
    }

    const data = await response.json();

    localStorage.setItem('loggedInUser', JSON.stringify({
      name: data.name,
      username: data.username,
      role: data.role,
      email: data.email,
      userId: data.userId
    }));

    localStorage.setItem('userPermissions', JSON.stringify(data.permissions));

    applyPermissionsToUI();

    console.log("User data and permissions refreshed automatically.");
  } catch (error) {
    console.error("Auto-refresh failed:", error);
  }
}

async function logout() {
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
}

window.getUserPermissions = getUserPermissions;
window.hasPermission = hasPermission;
window.applyPermissionsToUI = applyPermissionsToUI;
window.refreshUserDataAndPermissions = refreshUserDataAndPermissions;
window.logout = logout;