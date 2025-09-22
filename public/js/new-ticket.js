const API_BASE_URL = 'https://lgu-helpdesk-copy.onrender.com';
const PORTAL_LOGIN_URL = 'https://lgu-employee-portal.netlify.app/index.html';

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
        
        const originalButtonText = submitButton.innerHTML;

        // --- Set Loading State ---
        submitButton.disabled = true;
        submitButton.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Submitting...
        `;
        
        const formData = new FormData(ticketForm);
        const ticketData = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('https://lgu-helpdesk-copy.onrender.com/api/tickets', {
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
