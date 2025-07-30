document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const username = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const errorText = document.getElementById('loginError');
  errorText.style.display = 'none';

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    localStorage.setItem('loggedInUser', JSON.stringify(data.user));

    await fetchAndStorePermissions(data.user.role);

    window.location.href = 'home.html';

  } catch (err) {
    errorText.innerText = err.message;
    errorText.style.display = 'block';
  }
});

async function fetchAndStorePermissions(role) {
  try {
    const res = await fetch('/api/permissions', {
      credentials: 'include'
    });

    if (!res.ok) throw new Error("Failed to fetch permissions");

    const allPermissions = await res.json();

    const userPermissions = allPermissions
      .filter(p => p.roles.includes(role))
      .map(p => p.key);

    localStorage.setItem('userPermissions', JSON.stringify(userPermissions));
  } catch (error) {
    console.error("Error fetching permissions:", error);
  }
}