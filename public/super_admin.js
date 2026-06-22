const API_URL = '/api';

// State Management
let accessToken = localStorage.getItem('sa_access_token');
let superAdminUser = JSON.parse(localStorage.getItem('sa_user'));
let usersList = [];
let permissionsList = [];

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const loginForm = document.getElementById('login-form');
const enrollmentForm = document.getElementById('enrollment-form');
const usersTableBody = document.getElementById('users-table-body');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const logoutBtn = document.getElementById('logout-btn');
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelEnrollBtn = document.getElementById('cancel-enroll-btn');
const enrollmentModal = document.getElementById('enrollment-modal');
const togglePasswordBtn = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
const adminEmailDisplay = document.getElementById('admin-email-display');

// Permissions DOM Elements
const menuStaff = document.getElementById('menu-staff');
const menuPermissions = document.getElementById('menu-permissions');
const staffSection = document.getElementById('staff-section');
const permissionsSection = document.getElementById('permissions-section');
const permissionsTableBody = document.getElementById('permissions-table-body');
const permissionSearchInput = document.getElementById('permission-search-input');
const permissionRefreshBtn = document.getElementById('permission-refresh-btn');
const openPermissionModalBtn = document.getElementById('open-permission-modal-btn');
const closePermissionModalBtn = document.getElementById('close-permission-modal-btn');
const cancelPermissionBtn = document.getElementById('cancel-permission-btn');
const permissionModal = document.getElementById('permission-modal');
const permissionForm = document.getElementById('permission-form');
const permissionModalTitle = document.getElementById('permission-modal-title');
const permissionSubmitText = document.getElementById('permission-submit-text');

// Stat Elements
const statTotalStaff = document.getElementById('stat-total-staff');
const statAdmins = document.getElementById('stat-admins');
const statGuards = document.getElementById('stat-guards');

// Toast System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = document.createElement('i');
    icon.className = type === 'success' 
        ? 'fa-solid fa-circle-check' 
        : 'fa-solid fa-circle-exclamation';
        
    const textNode = document.createElement('span');
    textNode.innerText = message;
    
    toast.appendChild(icon);
    toast.appendChild(textNode);
    container.appendChild(toast);
    
    // Animate out and remove
    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Authentication Check
function checkAuth() {
    accessToken = localStorage.getItem('sa_access_token');
    superAdminUser = JSON.parse(localStorage.getItem('sa_user'));

    if (accessToken && superAdminUser && superAdminUser.role === 'Super Admin') {
        loginScreen.style.display = 'none';
        dashboardScreen.style.display = 'grid';
        adminEmailDisplay.textContent = superAdminUser.email;
        fetchUsers();
        fetchPermissions();
    } else {
        localStorage.removeItem('sa_access_token');
        localStorage.removeItem('sa_user');
        dashboardScreen.style.display = 'none';
        loginScreen.style.display = 'flex';
        if (window.location.pathname !== '/super-admin/login') {
            window.history.pushState(null, '', '/super-admin/login');
        }
    }
}

// Toggle password visibility
togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    const icon = togglePasswordBtn.querySelector('i');
    icon.className = type === 'password' ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
});

// Super Admin Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = passwordInput.value;
    const submitBtn = document.getElementById('login-submit-btn');

    // Show loading spinner on button
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="loader-spinner"></div> <span>Logging in...</span>`;

    try {
        const response = await fetch(`${API_URL}/super-admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            localStorage.setItem('sa_access_token', resData.data.accessToken);
            localStorage.setItem('sa_user', JSON.stringify(resData.data.user));
            showToast('Welcome back, Super Admin!', 'success');
            window.history.pushState(null, '', '/super-admin');
            checkAuth();
            loginForm.reset();
        } else {
            showToast(resData.error || 'Authentication failed. Please check your credentials.', 'error');
        }
    } catch (err) {
        showToast('Network error. Failed to connect to server.', 'error');
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});

// Fetch Users List
async function fetchUsers() {
    // Show table loader
    usersTableBody.innerHTML = `
        <tr class="table-loading">
            <td colspan="6">
                <div class="loader-spinner"></div>
                <span>Fetching staff records...</span>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`${API_URL}/users`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            usersList = resData.data;
            renderUsers(usersList);
            updateStats(usersList);
        } else {
            showToast(resData.error || 'Failed to retrieve staff records.', 'error');
            if (response.status === 401 || response.status === 403) {
                logout();
            }
        }
    } catch (err) {
        showToast('Failed to fetch records from server.', 'error');
        console.error(err);
    }
}

// Render Users to Table
function renderUsers(users) {
    if (!users || users.length === 0) {
        usersTableBody.innerHTML = `
            <tr class="table-empty">
                <td colspan="6">
                    <i class="fa-regular fa-folder-open"></i>
                    <span>No staff records found.</span>
                </td>
            </tr>
        `;
        return;
    }

    usersTableBody.innerHTML = users.map(user => {
        const roleBadgeClass = user.role === 'Admin' ? 'badge-admin' : 'badge-guard';
        const formattedDate = user.created_at 
            ? new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'N/A';
            
        return `
            <tr>
                <td class="staff-name-col">${escapeHTML(user.name)}</td>
                <td>${escapeHTML(user.phone_number)}</td>
                <td><span class="badge ${roleBadgeClass}">${escapeHTML(user.role)}</span></td>
                <td><span class="badge-level">${escapeHTML(user.access_level || 'N/A')}</span></td>
                <td>${escapeHTML(user.location || 'N/A')}</td>
                <td>${formattedDate}</td>
            </tr>
        `;
    }).join('');
}

// Update Statistics Counters
function updateStats(users) {
    const total = users.length;
    const admins = users.filter(u => u.role === 'Admin').length;
    const guards = users.filter(u => u.role === 'Security Guard').length;

    statTotalStaff.textContent = total;
    statAdmins.textContent = admins;
    statGuards.textContent = guards;
}

// Enroll New Staff Member
enrollmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('staff-name').value.trim();
    const phone_number = document.getElementById('staff-phone').value.trim();
    const role = document.getElementById('staff-role').value;
    const access_level = document.getElementById('staff-access').value.trim();
    const location = document.getElementById('staff-location').value.trim();
    const submitBtn = document.getElementById('enroll-submit-btn');

    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="loader-spinner"></div> <span>Saving...</span>`;

    try {
        const response = await fetch(`${API_URL}/add-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                name,
                phone_number,
                role,
                access_level,
                location
            })
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            showToast('Staff member enrolled successfully!', 'success');
            closeModal();
            enrollmentForm.reset();
            fetchUsers();
        } else {
            showToast(resData.error || 'Failed to save staff record.', 'error');
        }
    } catch (err) {
        showToast('Network error. Failed to save record.', 'error');
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});

// Search Filter Input Listener
searchInput.addEventListener('keyup', () => {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
        renderUsers(usersList);
        return;
    }

    const filtered = usersList.filter(user => {
        const name = (user.name || '').toLowerCase();
        const phone = (user.phone_number || '').toLowerCase();
        const role = (user.role || '').toLowerCase();
        const location = (user.location || '').toLowerCase();
        const access = (user.access_level || '').toLowerCase();

        return name.includes(query) || 
               phone.includes(query) || 
               role.includes(query) ||
               location.includes(query) ||
               access.includes(query);
    });

    renderUsers(filtered);
});

// Modal Actions
function openModal() {
    enrollmentModal.classList.add('open');
}

function closeModal() {
    enrollmentModal.classList.remove('open');
    enrollmentForm.reset();
}

openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
cancelEnrollBtn.addEventListener('click', closeModal);

// Close modal when clicking outside the modal card
enrollmentModal.addEventListener('click', (e) => {
    if (e.target === enrollmentModal) {
        closeModal();
    }
});

// Refresh button
refreshBtn.addEventListener('click', () => {
    fetchUsers();
    showToast('Records refreshed.', 'success');
});

// Logout
function logout() {
    localStorage.removeItem('sa_access_token');
    localStorage.removeItem('sa_user');
    showToast('Logged out successfully.', 'success');
    window.history.pushState(null, '', '/super-admin/login');
    checkAuth();
}

logoutBtn.addEventListener('click', logout);

// Sidebar Switching Logic
menuStaff.addEventListener('click', (e) => {
    e.preventDefault();
    menuStaff.classList.add('active');
    menuPermissions.classList.remove('active');
    staffSection.style.display = 'block';
    permissionsSection.style.display = 'none';
});

menuPermissions.addEventListener('click', (e) => {
    e.preventDefault();
    menuPermissions.classList.add('active');
    menuStaff.classList.remove('active');
    staffSection.style.display = 'none';
    permissionsSection.style.display = 'block';
    fetchPermissions();
});

// Fetch Permissions List
async function fetchPermissions() {
    permissionsTableBody.innerHTML = `
        <tr class="table-loading">
            <td colspan="4">
                <div class="loader-spinner"></div>
                <span>Fetching permissions...</span>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`${API_URL}/permissions`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            permissionsList = resData.data;
            renderPermissions(permissionsList);
        } else {
            showToast(resData.error || 'Failed to retrieve permissions.', 'error');
        }
    } catch (err) {
        showToast('Failed to fetch permissions from server.', 'error');
        console.error(err);
    }
}

// Render Permissions to Table
function renderPermissions(permissions) {
    if (!permissions || permissions.length === 0) {
        permissionsTableBody.innerHTML = `
            <tr class="table-empty">
                <td colspan="4" style="text-align: center; padding: 40px 0;">
                    <i class="fa-regular fa-folder-open" style="font-size: 24px; margin-bottom: 8px; display: block; color: var(--text-darker);"></i>
                    <span>No permissions found.</span>
                </td>
            </tr>
        `;
        return;
    }

    permissionsTableBody.innerHTML = permissions.map(perm => {
        const checkedAttr = perm.is_active ? 'checked' : '';
        return `
            <tr>
                <td class="staff-name-col">${escapeHTML(perm.name)}</td>
                <td>${escapeHTML(perm.description || 'N/A')}</td>
                <td style="text-align: center;">
                    <label class="switch">
                        <input type="checkbox" ${checkedAttr} onchange="togglePermissionStatus(${perm.id})">
                        <span class="slider round"></span>
                    </label>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="openEditPermissionModal(${perm.id})" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deletePermission(${perm.id})" title="Delete">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Toggle Permission active status
async function togglePermissionStatus(id) {
    try {
        const response = await fetch(`${API_URL}/permissions/${id}/toggle`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            showToast(resData.message || 'Permission status updated.', 'success');
            // update local list
            const perm = permissionsList.find(p => p.id === id);
            if (perm) perm.is_active = !perm.is_active;
        } else {
            showToast(resData.error || 'Failed to toggle permission status.', 'error');
            fetchPermissions();
        }
    } catch (err) {
        showToast('Failed to connect to server.', 'error');
        fetchPermissions();
    }
}

// Delete Permission
async function deletePermission(id) {
    if (!confirm('Are you sure you want to delete this permission?')) return;

    try {
        const response = await fetch(`${API_URL}/permissions/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            showToast('Permission deleted successfully!', 'success');
            fetchPermissions();
        } else {
            showToast(resData.error || 'Failed to delete permission.', 'error');
        }
    } catch (err) {
        showToast('Failed to connect to server.', 'error');
    }
}

// Modal actions for permissions
function openAddPermissionModal() {
    permissionModalTitle.textContent = 'Add New Permission';
    permissionSubmitText.textContent = 'Save Permission';
    document.getElementById('permission-id').value = '';
    permissionForm.reset();
    document.getElementById('permission-active').checked = true;
    permissionModal.classList.add('open');
}

function openEditPermissionModal(id) {
    const perm = permissionsList.find(p => p.id === id);
    if (!perm) return;
    permissionModalTitle.textContent = 'Edit Permission';
    permissionSubmitText.textContent = 'Update Permission';
    document.getElementById('permission-id').value = perm.id;
    document.getElementById('permission-name').value = perm.name;
    document.getElementById('permission-desc').value = perm.description || '';
    document.getElementById('permission-active').checked = perm.is_active ? true : false;
    permissionModal.classList.add('open');
}

function closePermissionModal() {
    permissionModal.classList.remove('open');
    permissionForm.reset();
}

openPermissionModalBtn.addEventListener('click', openAddPermissionModal);
closePermissionModalBtn.addEventListener('click', closePermissionModal);
cancelPermissionBtn.addEventListener('click', closePermissionModal);
permissionModal.addEventListener('click', (e) => {
    if (e.target === permissionModal) {
        closePermissionModal();
    }
});

// Permission Form Submit
permissionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('permission-id').value;
    const name = document.getElementById('permission-name').value.trim();
    const description = document.getElementById('permission-desc').value.trim();
    const is_active = document.getElementById('permission-active').checked ? 1 : 0;
    const submitBtn = document.getElementById('permission-submit-btn');

    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="loader-spinner"></div> <span>Saving...</span>`;

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/permissions/${id}` : `${API_URL}/permissions`;

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ name, description, is_active })
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            showToast(id ? 'Permission updated successfully!' : 'Permission created successfully!', 'success');
            closePermissionModal();
            fetchPermissions();
        } else {
            showToast(resData.error || 'Failed to save permission.', 'error');
        }
    } catch (err) {
        showToast('Network error. Failed to save permission.', 'error');
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});

// Permission Search & Refresh
permissionSearchInput.addEventListener('keyup', () => {
    const query = permissionSearchInput.value.toLowerCase().trim();
    if (!query) {
        renderPermissions(permissionsList);
        return;
    }

    const filtered = permissionsList.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(query) || desc.includes(query);
    });

    renderPermissions(filtered);
});

permissionRefreshBtn.addEventListener('click', () => {
    fetchPermissions();
    showToast('Permissions list refreshed.', 'success');
});

// Expose permission functions globally so they can be called from dynamically rendered HTML
window.togglePermissionStatus = togglePermissionStatus;
window.openEditPermissionModal = openEditPermissionModal;
window.deletePermission = deletePermission;

// HTML Escaping Utility to prevent XSS injection
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Initial Bootstrapping
window.addEventListener('DOMContentLoaded', checkAuth);
