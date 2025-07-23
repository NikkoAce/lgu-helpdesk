document.addEventListener('DOMContentLoaded', () => {
    // --- View and Form Elements ---
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

     // --- Employee ID Inputs ---
    const loginEmployeeIdInput = document.getElementById('login-employeeId');
    const registerEmployeeIdInput = document.getElementById('register-employeeId');

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

  // --- NEW: Auto-formatting function for Employee ID ---
    const formatEmployeeId = (input) => {
        let value = input.value.replace(/\D/g, ''); // Remove all non-digits
        let formattedValue = '';

        if (value.length > 0) {
            formattedValue += value.substring(0, 1);
        }
        if (value.length > 1) {
            formattedValue += '-' + value.substring(1, 3);
        }
        if (value.length > 3) {
            formattedValue += '-' + value.substring(3, 6);
        }
        if (value.length > 6) {
            formattedValue += '-' + value.substring(6, 9);
        }
        input.value = formattedValue;
    };

    // --- NEW: Apply formatting to both ID inputs ---
    loginEmployeeIdInput.addEventListener('input', () => formatEmployeeId(loginEmployeeIdInput));
    registerEmployeeIdInput.addEventListener('input', () => formatEmployeeId(registerEmployeeIdInput));




    // --- Login Form Submission ---
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const submitButton = loginForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;

        // Set Loading State
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing In...
        `;

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
            
            const decodedToken = JSON.parse(atob(token.split('.')[1]));
            localStorage.setItem('currentUser', JSON.stringify(decodedToken.user));

            window.location.href = 'app.html';
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            // Restore Button State
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });

    // --- Register Form Submission ---
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = registerForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;

        // Set Loading State
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Registering...
        `;

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
            showToast(`${result.message} Please sign in.`);
            registerForm.reset();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            // Restore Button State
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
});
