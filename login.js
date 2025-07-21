document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    /**
     * A simple function to decode a JWT payload.
     * Note: This does NOT verify the token's signature. Verification happens on the server.
     * @param {string} token The JWT string.
     * @returns {object|null} The decoded payload or null if invalid.
     */
    function parseJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const employeeId = document.getElementById('employeeId').value;
        const password = document.getElementById('password').value;
        errorMessage.textContent = '';

        try {
            const response = await fetch('https://lgu-helpdesk-api.onrender.com/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ employeeId, password })
            });

            if (response.ok) {
                // SUCCESS: We received a token
                const { token } = await response.json();
                
                // Store the raw token in localStorage
                localStorage.setItem('authToken', token);
                
                // Decode the token to get user info (name, role)
                const decodedToken = parseJwt(token);
                if (decodedToken && decodedToken.user) {
                    // Store the user object for other parts of the app to use
                    localStorage.setItem('currentUser', JSON.stringify(decodedToken.user));
                } else {
                    throw new Error("Invalid token received from server.");
                }
                
                // Redirect to the main application page
                window.location.href = 'index.html';

            } else {
                const errorData = await response.json();
                errorMessage.textContent = errorData.message;
            }
        } catch (error) {
            errorMessage.textContent = 'Cannot connect to the server or login failed.';
        }
    });
});
