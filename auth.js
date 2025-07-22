document.addEventListener('DOMContentLoaded', () => {
    // --- View and Form Elements ---
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // --- Message Elements ---
    const loginMessage = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');

    // --- Toggle Buttons ---
    const showRegisterBtn = document.getElementById('show-register-btn');
    const showLoginBtn = document.getElementById('show-login-btn');

    // --- Event Listeners to Toggle Views ---
    showRegisterBtn.addEventListener('click', () => {
        loginView.classList.add('hidden');
        registerView.classList.remove('hidden');
    });

    showLoginBtn.addEventListener('click', () => {
        registerView.classList.add('hidden');
        loginView.classList.remove('hidden');
    });

    // --- Login Form Submission ---
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        const loginData = Object.fromEntries(formData.entries());
        loginMessage.textContent = '';

        try {
            const response = await fetch('https://lgu-helpdesk-api.onrender.com/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginData)
            });
            if (!response.ok) throw new Error((await response.json()).message);

            const { token } = await response.json();
            localStorage.setItem('authToken', token);
            
            // Decode token to get user info for the app
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            localStorage.setItem('currentUser', JSON.stringify(decodedToken.user));

            window.location.href = 'app.html';
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error'); 
        }
    });

    // --- Register Form Submission ---
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(registerForm);
        const registerData = Object.fromEntries(formData.entries());
        registerMessage.textContent = '';
        registerMessage.className = 'text-sm';

        try {
            const response = await fetch('https://lgu-helpdesk-api.onrender.com/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registerData)
            });
            if (!response.ok) throw new Error((await response.json()).message);
            
            const result = await response.json();
          // THIS IS THE NEW WAY
        showToast('User registered successfully! Please sign in.'); // Success toast
        registerForm.reset();

    } catch (error) {
        // You can also use it for errors
        showToast(`Error: ${error.message}`, 'error'); // Error toast
    }
});
});
