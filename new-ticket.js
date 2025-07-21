document.addEventListener('DOMContentLoaded', () => {
    // Check for logged-in user first
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    const categorySelect = document.getElementById('category');
    const subCategorySelect = document.getElementById('sub-category');
    const ticketForm = document.getElementById('new-ticket-form');
    const formMessage = document.getElementById('form-message');
    const submitButton = document.getElementById('submit-button');

    const subCategories = {
        Hardware: ['Laptop/Desktop Issue', 'Monitor/Peripherals', 'Biometrics Machine'],
        Software: ['MS Office', 'Antivirus', 'e-Tax System', 'Other Application'],
        Network: ['No Internet Connection', 'Slow Connection', 'Wi-Fi Access'],
        Printer: ['Not Printing', 'Paper Jam', 'Toner/Ink Replacement'],
        Account: ['Password Reset', 'New Account Request', 'Permission Issue']
    };

    categorySelect.addEventListener('change', () => {
        const selectedCategory = categorySelect.value;
        subCategorySelect.innerHTML = '<option value="">Select a sub-category...</option>';
        subCategorySelect.disabled = true;
        subCategorySelect.classList.add('bg-gray-100');

        if (selectedCategory && subCategories[selectedCategory]) {
            subCategorySelect.disabled = false;
            subCategorySelect.classList.remove('bg-gray-100');
            subCategories[selectedCategory].forEach(sub => {
                const option = document.createElement('option');
                option.value = sub;
                option.textContent = sub;
                subCategorySelect.appendChild(option);
            });
        }
    });

    ticketForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        formMessage.textContent = '';
        formMessage.className = 'text-sm';

        const formData = new FormData(ticketForm);
        const ticketData = {
            category: formData.get('category'),
            subCategory: formData.get('sub-category'),
            urgency: formData.get('urgency'),
            subject: formData.get('subject'),
            description: formData.get('description'),
            requesterName: currentUser.name,
            requesterRole: currentUser.role
        };

        try {
            // --- MODIFICATION HERE ---
            const token = localStorage.getItem('authToken'); // Get the token
            const response = await fetch('https://lgu-helpdesk-api.onrender.com/tickets', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // Add the token to the header
                },
                body: JSON.stringify(ticketData)
            });

            const result = await response.json();

            if (response.ok) {
                formMessage.textContent = `${result.message} Your Ticket ID is ${result.ticket.id}. Redirecting...`;
                formMessage.classList.add('text-green-600');
                ticketForm.reset();
                setTimeout(() => {
                    window.location.href = 'app.html';
                }, 2000);
            } else {
                throw new Error(result.message || 'Failed to create ticket.');
            }

        } catch (error) {
            formMessage.textContent = `Error: ${error.message}`;
            formMessage.classList.add('text-red-600');
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Ticket';
        }
    });
});
