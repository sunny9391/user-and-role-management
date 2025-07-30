const user = JSON.parse(localStorage.getItem('loggedInUser'));
if (user && user.username) {
  document.getElementById('welcomeUser').textContent = `Welcome, ${user.username}`;
} else {
  document.getElementById('welcomeUser').textContent = 'Welcome!';
}
if(user && user.role){
  document.getElementById("homeRole").textContent=`${user.role}`;
}

document.addEventListener('DOMContentLoaded', () => {
  const userCount = 0;
  if (userCount === 0) {
    document.getElementById('contextSuggestion').style.display = 'flex';
  }

  loadActivities();
  updateDynamicDate();
  applyPermissionsToUI(); 
});

async function loadActivities() {
  try {
    const res = await fetch("/api/activities", {
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
    console.error("Failed to load activities", err);
    const activityList = document.getElementById("activityList");
    activityList.innerHTML = '<li>Failed to load recent activity. Please try again.</li>';
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

function updateDynamicDate() {
  const dateElement = document.querySelector('.sub-note'); 
  if (dateElement) {
    const now = new Date();
    
    const options = {
      weekday: 'long', 
      year: 'numeric', 
      month: 'long',   
      day: 'numeric',  
      hour: 'numeric', 
      minute: 'numeric',
      hour12: true,    
      timeZoneName: 'short' 
    };
    const formattedDate = now.toLocaleString('en-US', options); 
    dateElement.textContent = `Today is ${formattedDate}`;
  }
}