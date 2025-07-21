document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const messageElement = document.getElementById('message');

    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(registerForm);
        const userData = Object.fromEntries(formData.entries());

        // Clear previous messages
        messageElement.textContent = '';
        messageElement.className = 'text-sm';

        try {
            const response = await fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            if (response.ok) {
                messageElement.textContent = `${result.message} You can now log in.`;
                messageElement.classList.add('text-green-600');
                registerForm.reset();
            } else {
                throw new Error(result.message || 'Registration failed.');
            }

        } catch (error) {
            messageElement.textContent = `Error: ${error.message}`;
            messageElement.classList.add('text-red-600');
        }
    });
});
