document.addEventListener('DOMContentLoaded', () => {
    // --- View and Form Elements ---
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

     
 // --- Input Elements ---
    const loginEmploymentType = document.getElementById('login-employmentType');
    const loginEmployeeId = document.getElementById('login-employeeId');
    const registerEmploymentType = document.getElementById('register-employmentType');
    const registerEmployeeId = document.getElementById('register-employeeId');


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

// --- NEW: Function to update Employee ID input attributes ---
    const updateEmployeeIdInput = (type, inputElement) => {
        if (type === 'Permanent') {
            inputElement.placeholder = '0-00-000-000';
            inputElement.pattern = '\\d{1}-\\d{2}-\\d{3}-\\d{3}';
            inputElement.maxLength = 12;
            inputElement.title = 'Format: 0-00-000-000';
        } else { // Job Order
            inputElement.placeholder = 'JO-00-000-00000';
            inputElement.pattern = 'JO-\\d{2}-\\d{3}-\\d{5}';
            inputElement.maxLength = 15;
            inputElement.title = 'Format: JO-00-000-00000 (e.g., JO-02-123-45678)';
        }
        inputElement.value = ''; // Clear the input when type changes
    };


 // --- NEW: Function to auto-format the ID as the user types ---
    const formatEmployeeId = (type, inputElement) => {
        let value = inputElement.value.replace(/[^0-9]/g, ''); // Remove all non-digits for formatting
        let formatted = '';

        if (type === 'Permanent') {
            if (value.length > 0) formatted += value.substring(0, 1);
            if (value.length > 1) formatted += '-' + value.substring(1, 3);
            if (value.length > 3) formatted += '-' + value.substring(3, 6);
            if (value.length > 6) formatted += '-' + value.substring(6, 9);
        } else { // Job Order
            formatted = 'JO-';
            if (value.length > 0) formatted += value.substring(0, 2);
            if (value.length > 2) formatted += '-' + value.substring(2, 5);
            if (value.length > 5) formatted += '-' + value.substring(5, 10);
        }
        inputElement.value = formatted;
    };

    // --- NEW: Event Listeners for the dropdowns ---
    loginEmploymentType.addEventListener('change', () => updateEmployeeIdInput(loginEmploymentType.value, loginEmployeeId));
    registerEmploymentType.addEventListener('change', () => updateEmployeeIdInput(registerEmploymentType.value, registerEmployeeId));

    loginEmployeeId.addEventListener('input', () => formatEmployeeId(loginEmploymentType.value, loginEmployeeId));
    registerEmployeeId.addEventListener('input', () => formatEmployeeId(registerEmploymentType.value, registerEmployeeId));

       // --- Initialize the inputs on page load ---
    updateEmployeeIdInput(loginEmploymentType.value, loginEmployeeId);
    updateEmployeeIdInput(registerEmploymentType.value, registerEmployeeId);

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
            const response = await fetch('https://lgu-helpdesk-copy.onrender.com/api/auth/login', {
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
            const response = await fetch('https://lgu-helpdesk-copy.onrender.com/api/auth/register', {
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
