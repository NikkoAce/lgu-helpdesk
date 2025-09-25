async function initializeUsersPage() {
    try {
        // Page protection: Only allow ICTO Head to see this page
        if (!currentUser || currentUser.role !== 'ICTO Head') {
            alert('Access Denied: This page is for the ICTO Head only.');
            window.location.href = 'app.html';
            return;
        }

        // If authorized, set up the page and fetch initial data
        setupUserPageEventListeners(); // Rename to avoid conflict
        fetchAndRenderUsers();
    } catch (error) {
        console.error("Initialization check failed:", error);
        window.location.href = PORTAL_LOGIN_URL;
    }
}

    // A simple cache to hold the fetched user data to avoid re-fetching
    let usersCache = [];
    // To keep track of which user is being edited or deleted.
    let selectedUserId = null;

    // --- 3. CORE FUNCTIONS ---
    async function fetchAndRenderUsers(searchTerm = '') {
        const tableBody = document.getElementById('users-table-body');
        // Show a loading state in the table
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4"><span class="loading loading-spinner"></span></td></tr>`;
        try {
            const url = new URL(`${API_BASE_URL}/api/users`);
            if (searchTerm) {
                url.searchParams.append('search', searchTerm.trim());
            }

            const response = await fetch(url, {
                credentials: 'include' // Use cookie for authentication
            });
            if (!response.ok) throw new Error((await response.json()).message);
            usersCache = await response.json();
            renderTable(usersCache);
        } catch (error) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4 text-error">Error: ${error.message}</td></tr>`;
        }
    }

    function renderTable(users) {
        const tableBody = document.getElementById('users-table-body');
        if (users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center p-4">No users found.</td></tr>`;
            return;
        }
        tableBody.innerHTML = ''; // Clear the table body
        users.forEach(user => {
            const row = document.createElement('tr');
            row.className = 'hover';
           row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${user.name}</div>
                    <div class="text-sm text-gray-500">${user.employeeId}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">${user.office || 'N/A'}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="badge badge-ghost badge-sm">${user.role}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button data-action="edit" data-userid="${user._id}" class="btn btn-ghost btn-xs">Edit</button>
                    <button data-action="delete" data-userid="${user._id}" class="btn btn-ghost btn-xs text-error">Delete</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    // --- 4. MODAL & EVENT HANDLING ---
    function openEditModal(user) {
        const editModal = document.getElementById('edit-user-modal');
        const editUserName = document.getElementById('edit-user-name');
        const editUserOffice = document.getElementById('edit-user-office');
        const editRoleSelect = document.getElementById('edit-role-select');

        selectedUserId = user._id;
        editUserName.value = user.name; // FIX: Use .value for input fields
        editUserOffice.value = user.office; // New
        editRoleSelect.value = user.role;
        editModal.showModal();
    }

    function openDeleteModal(user) {
        const deleteModal = document.getElementById('delete-user-modal');
        const deleteUserNameConfirm = document.getElementById('delete-user-name-confirm');
        const confirmInput = document.getElementById('delete-confirm-input');
        const confirmBtn = document.getElementById('confirm-delete-btn');

        selectedUserId = user._id;
        deleteUserNameConfirm.textContent = user.name;
        confirmInput.value = ''; // Clear previous input
        confirmBtn.disabled = true; // Disable button initially
        deleteModal.showModal();

        // Add a listener to enable the button only when the name matches
        confirmInput.oninput = () => {
            confirmBtn.disabled = confirmInput.value !== user.name;
        };
    }

    function closeModal() {
        const editModal = document.getElementById('edit-user-modal');
        const deleteModal = document.getElementById('delete-user-modal');
        // Use the built-in close method for <dialog> elements
        if (editModal) editModal.close();
        if (deleteModal) deleteModal.close();
    }

function setupUserPageEventListeners() {
    const tableBody = document.getElementById('users-table-body');
    const searchInput = document.getElementById('search-input');

    // --- Debounce for Search ---
    let debounceTimer;
    const debounce = (func, delay) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(func, delay);
    };

    // Edit Modal Elements
    const editForm = document.getElementById('edit-user-form');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    // Delete Modal Elements
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    // Search input listener
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            debounce(() => fetchAndRenderUsers(searchInput.value), 300);
        });
    }

    // Event delegation for the entire table body
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const userId = e.target.dataset.userid;
        if (!action || !userId) return;

        const user = usersCache.find(u => u._id === userId);
        if (!user) return;

        if (action === 'edit') openEditModal(user);
        if (action === 'delete') openDeleteModal(user);
    });
    }

    // Handle the edit form submission
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const saveButton = editForm.querySelector('button[type="submit"]');
        const originalButtonText = saveButton.innerHTML;
        
        // --- NEW: Set Loading State ---
        saveButton.disabled = true;
        saveButton.innerHTML = `
            <span class="loading loading-spinner"></span>
            Saving...
        `;

        const updatedData = {
            name: document.getElementById('edit-user-name').value,
            office: document.getElementById('edit-user-office').value,
            role: document.getElementById('edit-role-select').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${selectedUserId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData),
                credentials: 'include'
            });
            if (!response.ok) throw new Error((await response.json()).message);
            
            showToast('User updated successfully!');
            await fetchAndRenderUsers();
            closeModal();

        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
        } finally {
            // --- NEW: Restore Button State ---
            // This 'finally' block ensures the button is always restored,
            // even if there's an error.
            saveButton.disabled = false;
            saveButton.innerHTML = originalButtonText;
        }
    });
    }

    // Handle the delete confirmation
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            const originalButtonText = confirmDeleteBtn.innerHTML;
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = `
                <span class="loading loading-spinner"></span>
                Deleting...
            `;

        try {
            const response = await fetch(`${API_BASE_URL}/api/users/${selectedUserId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) throw new Error((await response.json()).message);
            showToast('User deleted successfully.'); // Use toast for success
            await fetchAndRenderUsers(); // Refresh the table
            closeModal();
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error'); // Use toast for error
        } finally {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = originalButtonText;
        }
    });
    }

    // Handle cancel buttons
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', closeModal);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeModal);
}

document.addEventListener('DOMContentLoaded', initializeUsersPage);
