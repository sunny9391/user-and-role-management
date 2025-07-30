const USERS_API = "/api/users";
const ROLES_API = "/api/roles";
const PERMS_API = "/api/permissions";
const ACTIVITIES_API = "/api/activities"; 

let users = [];
let roles = [];
let permissions = [];

window.onload = async () => {
  await loadStats();
  renderCharts();
  buildRolePermissionMatrix();
  loadActivities(); 
  applyPermissionsToUI();
};

async function loadStats() {
  try {
    const [usersRes, rolesRes, permsRes] = await Promise.all([
      fetch(USERS_API, { credentials: 'include' }),
      fetch(ROLES_API, { credentials: 'include' }),
      fetch(PERMS_API, { credentials: 'include' }),
    ]);

    if (!usersRes.ok) throw new Error(`Failed to fetch users: ${usersRes.status}`);
    if (!rolesRes.ok) throw new Error(`Failed to fetch roles: ${rolesRes.status}`);
    if (!permsRes.ok) throw new Error(`Failed to fetch permissions: ${permsRes.status}`);

    users = await usersRes.json();
    roles = await rolesRes.json();
    permissions = await permsRes.json();

    const totalUsers = users.length;
    const activeUsers = users.filter(u => /active|online/i.test(u.status)).length;

    document.getElementById("totalUsers").textContent = `👤 Total Users: ${totalUsers}`;
    document.getElementById("activeUsers").textContent = `✅ Active Users: ${activeUsers}`;
    document.getElementById("rolesCount").textContent = `🛡️ Roles: ${roles.length}`;
    document.getElementById("permissionsCount").textContent = `🔑 Permissions: ${permissions.length}`;
  } catch (error) {
    console.error("Failed to load data for dashboard:", error);
  }
}

async function loadActivities() {
  try {
    const res = await fetch(ACTIVITIES_API, { 
      credentials: "include"
    });

    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }

    const activities = await res.json();

    const activityList = document.getElementById("activityList"); 
    activityList.innerHTML = '';

    if (!Array.isArray(activities) || activities.length === 0) {
      activityList.innerHTML = '<li>No recent activity.</li>';
      return;
    }

    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const recentActivities = activities.slice(0, 5); 

    recentActivities.forEach(act => {
      const li = document.createElement("li");
      const timeStr = new Date(act.timestamp).toLocaleString();

      const performedBy = act.userId && act.userId.username ? ` by <strong>${act.userId.username}</strong>` : '';

      li.innerHTML = `
        <span class="activity-time">${timeStr}</span>
        <span class="activity-desc">${act.action} - <strong>${act.target}</strong>${performedBy}</span>
      `;
      activityList.appendChild(li);
    });
  } catch (err) {
    console.error("Failed to load activities for dashboard:", err); 
    const activityList = document.getElementById("activityList");
    activityList.innerHTML = '<li>Failed to load recent activity for dashboard. Please try again.</li>';
  }
}

function renderCharts() {
  const registrationsChartCtx = document.getElementById("registrationsChart");
  if (registrationsChartCtx) {
    renderRegistrationsChart(registrationsChartCtx);
  }

  const usersByRoleChartCtx = document.getElementById("usersByRoleChart");
  if (usersByRoleChartCtx) {
    renderUsersByRoleChart(usersByRoleChartCtx);
  }
}

function renderRegistrationsChart(ctx) {
  const labels = [];
  const counts = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const label = date.toISOString().split("T")[0].slice(5);
    labels.push(label);

    const matchCount = users.filter(user => {
      const createdDate = new Date(user.created);
      return createdDate.toDateString() === date.toDateString();
    }).length;

    counts.push(matchCount);
  }

  new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "User Signups",
        data: counts,
        backgroundColor: "#1976d2",
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderUsersByRoleChart(ctx) {
  const labels = roles.map(role => role.name);
  const data = roles.map(role => users.filter(user => user.role === role.name).length);

  new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: ["#42a5f5", "#66bb6a", "#ffa726", "#ef5350", "#ab47bc"]
      }]
    },
    options: {
      responsive: true
    }
  });
}

function buildRolePermissionMatrix() {
  const headerRow = document.getElementById("matrixHeader");
  const body = document.getElementById("matrixBody");

  if (!headerRow || !body || !roles.length || !permissions.length) return;

  headerRow.innerHTML = "<th>Permission</th>" + roles.map(role => `<th>${role.name}</th>`).join("");

  const rows = permissions.map(perm => {
    const cells = roles.map(role => {
      const list = role.permissions || [];

      const hasPermission = list.some(p =>
        typeof p === "string" ? p === perm.key :
        p && typeof p === "object" && p.key === perm.key
      );

      return `<td style="text-align:center">${hasPermission ? "✅" : "❌"}</td>`;
    });

    return `<tr><td>${perm.key}</td>${cells.join("")}</tr>`;
  });

  body.innerHTML = rows.join("");
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