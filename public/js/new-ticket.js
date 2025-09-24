async function initializeNewTicketPage() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            method: 'GET',
            credentials: 'include',
        });

        if (!response.ok) {
            // If not authenticated, redirect to the main portal login.
            window.location.href = PORTAL_LOGIN_URL;
            return;
        }

        // If authenticated, set up the form event listeners.
        setupNewTicketForm();

    } catch (error) {
        console.error("Authentication check failed:", error);
        window.location.href = PORTAL_LOGIN_URL;
    }
}

function setupNewTicketForm() {
    const categorySelect = document.getElementById('category');
    const subCategorySelect = document.getElementById('sub-category');
    const ticketForm = document.getElementById('new-ticket-form');
    const submitButton = document.getElementById('submit-button');

    const subCategories = {
        Hardware: ['Laptop/Desktop Issue', 'Monitor/Peripherals', 'Biometrics Machine', 'Hardware Initial Setup', 'Others'],
        Software: ['MS Office','Operating System', 'Antivirus', 'e-Tax System', 'ECPAC System', 'Other Application', 'Others'],
        Network: ['No Internet Connection', 'Slow Connection', 'Wi-Fi Access', 'Others'],
        Printer: ['Not Printing', 'Paper Jam', 'Toner/Ink Replacement', 'Reset', 'Initial Setup of Printer', 'Others'],
        Account: ['Password Reset', 'New Account Request', 'Permission Issue']
    };

    categorySelect.addEventListener('change', () => {
        const selectedCategory = categorySelect.value;
        subCategorySelect.innerHTML = '<option value="" disabled selected>Select a sub-category</option>';
        subCategorySelect.disabled = true;

        if (selectedCategory && subCategories[selectedCategory]) {
            subCategorySelect.disabled = false;
            subCategorySelect.innerHTML += subCategories[selectedCategory].map(sub => `<option value="${sub}">${sub}</option>`).join('');
        }
    });

    ticketForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const originalButtonText = submitButton.innerHTML;

        // --- Set Loading State ---
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <span class="loading loading-spinner"></span> Submitting...
        `;

        try {
            const response = await fetch(`${API_BASE_URL}/api/tickets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ticketData),
                credentials: 'include' // Use cookie for authentication
            });
            if (!response.ok) throw new Error((await response.json()).message);
            
            showToast('Ticket created successfully! Redirecting...');
            ticketForm.reset();
            setTimeout(() => {
                window.location.href = 'app.html';
            }, 2000);

        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            // --- Restore Button State ---
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
};
