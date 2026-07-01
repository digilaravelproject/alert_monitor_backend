const API_URL = '/api';

// State Management
let accessToken = localStorage.getItem('sa_access_token');
let superAdminUser = JSON.parse(localStorage.getItem('sa_user'));
let usersList = [];
let permissionsList = [];
let levelsList = [];
let rolesList = [];
let locationsList = [];
let devicesList = [];
let selectedDeviceTypeFilter = 'All';
let deviceTypesList = [];

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
const menuVendors = document.getElementById('menu-vendors');
const vendorsSection = document.getElementById('vendors-section');
const vendorsTableBody = document.getElementById('vendors-table-body');
const vendorSearchInput = document.getElementById('vendor-search-input');
const vendorRefreshBtn = document.getElementById('vendor-refresh-btn');
const openVendorModalBtn = document.getElementById('open-vendor-modal-btn');
const closeVendorModalBtn = document.getElementById('close-vendor-modal-btn');
const cancelVendorBtn = document.getElementById('cancel-vendor-btn');
const vendorModal = document.getElementById('vendor-modal');
const vendorForm = document.getElementById('vendor-form');
const vendorModalTitle = document.getElementById('vendor-modal-title');
const vendorSubmitText = document.getElementById('vendor-submit-text');
const statTotalVendors = document.getElementById('stat-total-vendors');
const statActiveVendors = document.getElementById('stat-active-vendors');
const statBlockedVendors = document.getElementById('stat-blocked-vendors');

const menuStaff = document.getElementById('menu-staff');
const menuPermissions = document.getElementById('menu-permissions');
const menuLevels = document.getElementById('menu-levels');
const menuRoles = document.getElementById('menu-roles');
const menuLocations = document.getElementById('menu-locations');
const menuDevices = document.getElementById('menu-devices');
const staffSection = document.getElementById('staff-section');
const permissionsSection = document.getElementById('permissions-section');
const levelsSection = document.getElementById('levels-section');
const rolesSection = document.getElementById('roles-section');
const locationsSection = document.getElementById('locations-section');
const devicesSection = document.getElementById('devices-section');
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

// Levels and Roles DOM Elements
const levelsTableBody = document.getElementById('levels-table-body');
const rolesTableBody = document.getElementById('roles-table-body');
const levelSearchInput = document.getElementById('level-search-input');
const levelRefreshBtn = document.getElementById('level-refresh-btn');
const roleSearchInput = document.getElementById('role-search-input');
const roleRefreshBtn = document.getElementById('role-refresh-btn');

// Level Modal DOM Elements
const levelModal = document.getElementById('level-modal');
const levelForm = document.getElementById('level-form');
const levelModalTitle = document.getElementById('level-modal-title');
const levelSubmitText = document.getElementById('level-submit-text');
const closeLevelModalBtn = document.getElementById('close-level-modal-btn');
const cancelLevelBtn = document.getElementById('cancel-level-btn');

// Role Modal DOM Elements
const roleModal = document.getElementById('role-modal');
const roleForm = document.getElementById('role-form');
const roleModalTitle = document.getElementById('role-modal-title');
const roleSubmitText = document.getElementById('role-submit-text');
const closeRoleModalBtn = document.getElementById('close-role-modal-btn');
const cancelRoleBtn = document.getElementById('cancel-role-btn');
const rolePermissionsList = document.getElementById('role-permissions-list');

// Location DOM Elements
const locationsTableBody = document.getElementById('locations-table-body');
const locationSearchInput = document.getElementById('location-search-input');
const locationRefreshBtn = document.getElementById('location-refresh-btn');
const openLocationModalBtn = document.getElementById('open-location-modal-btn');
const closeLocationModalBtn = document.getElementById('close-location-modal-btn');
const cancelLocationBtn = document.getElementById('cancel-location-btn');
const locationModal = document.getElementById('location-modal');
const locationForm = document.getElementById('location-form');
const locationModalTitle = document.getElementById('location-modal-title');
const locationSubmitText = document.getElementById('location-submit-text');

// Stat Elements
const statTotalStaff = document.getElementById('stat-total-staff');
const statAdmins = document.getElementById('stat-admins');
const statGuards = document.getElementById('stat-guards');
const statTotalLocations = document.getElementById('stat-total-locations');
const statLocationsNodes = document.getElementById('stat-locations-nodes');
const statLocationsActive = document.getElementById('stat-locations-active');

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
        fetchLevels();
        fetchRoles();
        fetchLocations();
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
            <td colspan="7">
                <div class="loader-spinner"></div>
                <span>Fetching staff records...</span>
            </td>
        </tr>
    `;
    if (vendorsTableBody) {
        vendorsTableBody.innerHTML = `
            <tr class="table-loading">
                <td colspan="5">
                    <div class="loader-spinner"></div>
                    <span>Fetching vendor records...</span>
                </td>
            </tr>
        `;
    }

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
            const staffUsers = usersList.filter(u => u.role !== 'Admin');
            const vendorUsers = usersList.filter(u => u.role === 'Admin');

            renderUsers(staffUsers);
            updateStaffStats(staffUsers);

            renderVendors(vendorUsers);
            updateVendorStats(vendorUsers);
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
                <td colspan="7">
                    <i class="fa-regular fa-folder-open"></i>
                    <span>No staff records found.</span>
                </td>
            </tr>
        `;
        return;
    }

    usersTableBody.innerHTML = users.map(user => {
        const formattedDate = user.created_at 
            ? new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'N/A';
        const locationText = user.location
            ? (typeof user.location === 'object' ? user.location.name : user.location)
            : 'N/A';
            
        return `
            <tr>
                <td class="staff-name-col">${escapeHTML(user.name)}</td>
                <td>${escapeHTML(user.phone_number)}</td>
                <td><span class="badge badge-guard">${escapeHTML(user.role)}</span></td>
                <td><span class="badge-level">${escapeHTML(user.access_level || 'N/A')}</span></td>
                <td>${escapeHTML(locationText)}</td>
                <td>${formattedDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" onclick="openViewStaffModal(${user.id})" title="View">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-edit" onclick="openEditStaffModal(${user.id})" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteStaff(${user.id})" title="Delete">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Render Vendors to Table
function renderVendors(vendors) {
    if (!vendors || vendors.length === 0) {
        vendorsTableBody.innerHTML = `
            <tr class="table-empty">
                <td colspan="5">
                    <i class="fa-regular fa-folder-open"></i>
                    <span>No vendor records found.</span>
                </td>
            </tr>
        `;
        return;
    }

    vendorsTableBody.innerHTML = vendors.map(vendor => {
        const formattedDate = vendor.created_at 
            ? new Date(vendor.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : 'N/A';
            
        return `
            <tr>
                <td class="staff-name-col">${escapeHTML(vendor.name)}</td>
                <td>${escapeHTML(vendor.phone_number)}</td>
                <td><span class="badge badge-admin">${escapeHTML(vendor.role)}</span></td>
                <td>${formattedDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="openEditVendorModal(${vendor.id})" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteVendor(${vendor.id})" title="Delete">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Update Statistics Counters for Staff
function updateStaffStats(staffUsers) {
    const total = staffUsers.length;
    const managers = staffUsers.filter(u => u.role === 'Manager' || u.role === 'Supervisor').length;
    const guards = staffUsers.filter(u => u.role === 'Security Guard').length;

    statTotalStaff.textContent = total;
    statAdmins.textContent = managers;
    statGuards.textContent = guards;
}

// Update Statistics Counters for Vendors
function updateVendorStats(vendorUsers) {
    const total = vendorUsers.length;
    const active = vendorUsers.filter(u => !u.is_blocked).length;
    const blocked = total - active;

    statTotalVendors.textContent = total;
    statActiveVendors.textContent = active;
    statBlockedVendors.textContent = blocked;
}

// Populate enrollment select fields from database lists
function populateEnrollmentDropdowns() {
    const roleSelect = document.getElementById('staff-role');
    const accessSelect = document.getElementById('staff-access');
    const locationSelect = document.getElementById('staff-location');

    // Populate Roles Select (excluding Admin)
    roleSelect.innerHTML = '<option value="" disabled selected>Select Role</option>';
    rolesList.forEach(role => {
        if (role.name !== 'Admin') {
            const option = document.createElement('option');
            option.value = role.id;
            option.textContent = role.name;
            roleSelect.appendChild(option);
        }
    });

    // Populate Access Levels Select
    accessSelect.innerHTML = '<option value="" disabled selected>Select Access Level</option>';
    levelsList.forEach(level => {
        const option = document.createElement('option');
        option.value = level.id;
        option.textContent = level.name;
        accessSelect.appendChild(option);
    });

    // Populate Locations Select
    locationSelect.innerHTML = '<option value="" disabled selected>Select Location</option>';
    locationsList.forEach(loc => {
        if (loc.is_active) {
            const option = document.createElement('option');
            option.value = loc.id;
            option.textContent = loc.name;
            locationSelect.appendChild(option);
        }
    });
}

// Edit Staff Member (Form Submit Handler)
enrollmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const staffId = document.getElementById('staff-id').value;
    const name = document.getElementById('staff-name').value.trim();
    const phone_number = document.getElementById('staff-phone').value.trim();
    const role = document.getElementById('staff-role').value;
    const access_level = document.getElementById('staff-access').value;
    const location_id = document.getElementById('staff-location').value;
    const submitBtn = document.getElementById('enroll-submit-btn');

    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="loader-spinner"></div> <span>Saving...</span>`;

    try {
        const response = await fetch(`${API_URL}/staff/${staffId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                name,
                phone_number,
                role,
                access_level,
                location_id
            })
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            showToast('Staff record updated successfully!', 'success');
            closeModal();
            fetchUsers();
        } else {
            showToast(resData.error || 'Failed to update staff record.', 'error');
        }
    } catch (err) {
        showToast('Network error. Failed to save record.', 'error');
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});

// Search Filter Input Listener for Staff
searchInput.addEventListener('keyup', () => {
    const query = searchInput.value.toLowerCase().trim();
    const staffUsers = usersList.filter(u => u.role !== 'Admin');
    if (!query) {
        renderUsers(staffUsers);
        return;
    }

    const filtered = staffUsers.filter(user => {
        const name = (user.name || '').toLowerCase();
        const phone = (user.phone_number || '').toLowerCase();
        const role = (user.role || '').toLowerCase();
        const locationObj = user.location || {};
        const locationName = (typeof locationObj === 'object' ? locationObj.name : locationObj || '').toLowerCase();
        const access = (user.access_level || '').toLowerCase();

        return name.includes(query) || 
               phone.includes(query) || 
               role.includes(query) ||
               locationName.includes(query) ||
               access.includes(query);
    });

    renderUsers(filtered);
});

// Search Filter Input Listener for Vendors
vendorSearchInput.addEventListener('keyup', () => {
    const query = vendorSearchInput.value.toLowerCase().trim();
    const vendorUsers = usersList.filter(u => u.role === 'Admin');
    if (!query) {
        renderVendors(vendorUsers);
        return;
    }

    const filtered = vendorUsers.filter(user => {
        const name = (user.name || '').toLowerCase();
        const phone = (user.phone_number || '').toLowerCase();

        return name.includes(query) || phone.includes(query);
    });

    renderVendors(filtered);
});

// Modal Actions for Staff
function openModal() {
    enrollmentModal.classList.add('open');
}

function closeModal() {
    enrollmentModal.classList.remove('open');
    enrollmentForm.reset();
    setFormFieldsDisabled(enrollmentForm, false);
    document.getElementById('enroll-submit-btn').style.display = 'inline-flex';
    document.getElementById('enroll-submit-btn').querySelector('span').textContent = 'Save Record';
}

closeModalBtn.addEventListener('click', closeModal);
cancelEnrollBtn.addEventListener('click', closeModal);

// Close modal when clicking outside the modal card
enrollmentModal.addEventListener('click', (e) => {
    if (e.target === enrollmentModal) {
        closeModal();
    }
});

// Staff Refresh button
refreshBtn.addEventListener('click', () => {
    fetchUsers();
    showToast('Records refreshed.', 'success');
});

// Vendor Modal Actions
function openAddVendorModal() {
    vendorModalTitle.textContent = 'Enroll New Vendor';
    vendorSubmitText.textContent = 'Save Record';
    document.getElementById('vendor-id').value = '';
    vendorForm.reset();
    vendorModal.classList.add('open');
}

function openEditVendorModal(id) {
    const vendor = usersList.find(u => u.id === id);
    if (!vendor) return;
    vendorModalTitle.textContent = 'Edit Vendor';
    vendorSubmitText.textContent = 'Save Changes';
    document.getElementById('vendor-id').value = vendor.id;
    document.getElementById('vendor-name').value = vendor.name;
    document.getElementById('vendor-phone').value = vendor.phone_number;
    vendorModal.classList.add('open');
}

function closeVendorModal() {
    vendorModal.classList.remove('open');
    vendorForm.reset();
}

// Event Listeners for Vendor Modal
openVendorModalBtn.addEventListener('click', openAddVendorModal);
closeVendorModalBtn.addEventListener('click', closeVendorModal);
cancelVendorBtn.addEventListener('click', closeVendorModal);
vendorModal.addEventListener('click', (e) => {
    if (e.target === vendorModal) {
        closeVendorModal();
    }
});

// Vendor Form Submit Handler
vendorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const vendorId = document.getElementById('vendor-id').value;
    const name = document.getElementById('vendor-name').value.trim();
    const phone_number = document.getElementById('vendor-phone').value.trim();
    const submitBtn = document.getElementById('vendor-submit-btn');

    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="loader-spinner"></div> <span>Saving...</span>`;

    // Find role ID for 'Admin'
    const adminRole = rolesList.find(r => r.name === 'Admin');
    const adminRoleId = adminRole ? adminRole.id : null;

    const payload = {
        name,
        phone_number,
        role: adminRoleId || 'Admin',
        access_level: 'null',
        location_id: 'null'
    };

    const isEdit = vendorId !== '';
    const url = isEdit ? `${API_URL}/staff/${vendorId}` : `${API_URL}/add-user`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(payload)
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            showToast(isEdit ? 'Vendor record updated successfully!' : 'Vendor enrolled successfully!', 'success');
            closeVendorModal();
            fetchUsers();
        } else {
            showToast(resData.error || 'Failed to save vendor record.', 'error');
        }
    } catch (err) {
        showToast('Network error. Failed to save record.', 'error');
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});

// Vendor Refresh Button
vendorRefreshBtn.addEventListener('click', () => {
    fetchUsers();
    showToast('Records refreshed.', 'success');
});

// Staff Action Handlers
function openViewStaffModal(id) {
    const user = usersList.find(u => u.id === id);
    if (!user) return;
    
    document.querySelector('#enrollment-modal h2').textContent = 'View Staff Details';
    document.getElementById('staff-id').value = user.id;
    document.getElementById('staff-name').value = user.name;
    document.getElementById('staff-phone').value = user.phone_number;
    
    populateEnrollmentDropdowns();
    
    const roleSelect = document.getElementById('staff-role');
    const accessSelect = document.getElementById('staff-access');
    const locationSelect = document.getElementById('staff-location');
    
    if (user.role_id) roleSelect.value = user.role_id;
    if (user.level_id) accessSelect.value = user.level_id;
    if (user.location && user.location.id) locationSelect.value = user.location.id;
    
    setFormFieldsDisabled(enrollmentForm, true);
    document.getElementById('enroll-submit-btn').style.display = 'none';
    
    openModal();
}

function openEditStaffModal(id) {
    const user = usersList.find(u => u.id === id);
    if (!user) return;
    
    document.querySelector('#enrollment-modal h2').textContent = 'Edit Staff';
    document.getElementById('staff-id').value = user.id;
    document.getElementById('staff-name').value = user.name;
    document.getElementById('staff-phone').value = user.phone_number;
    
    populateEnrollmentDropdowns();
    
    const roleSelect = document.getElementById('staff-role');
    const accessSelect = document.getElementById('staff-access');
    const locationSelect = document.getElementById('staff-location');
    
    if (user.role_id) roleSelect.value = user.role_id;
    if (user.level_id) accessSelect.value = user.level_id;
    if (user.location && user.location.id) locationSelect.value = user.location.id;
    
    setFormFieldsDisabled(enrollmentForm, false);
    document.getElementById('enroll-submit-btn').style.display = 'inline-flex';
    document.getElementById('enroll-submit-btn').querySelector('span').textContent = 'Save Changes';
    
    openModal();
}

async function deleteStaff(id) {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    
    try {
        const response = await fetch(`${API_URL}/staff/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const resData = await response.json();
        if (response.ok && resData.status) {
            showToast('Staff member deleted successfully!', 'success');
            fetchUsers();
        } else {
            showToast(resData.error || 'Failed to delete staff member.', 'error');
        }
    } catch (err) {
        showToast('Failed to connect to server.', 'error');
        console.error(err);
    }
}

async function deleteVendor(id) {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    
    try {
        const response = await fetch(`${API_URL}/staff/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const resData = await response.json();
        if (response.ok && resData.status) {
            showToast('Vendor deleted successfully!', 'success');
            fetchUsers();
        } else {
            showToast(resData.error || 'Failed to delete vendor.', 'error');
        }
    } catch (err) {
        showToast('Failed to connect to server.', 'error');
        console.error(err);
    }
}

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
menuVendors.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveMenu(menuVendors, vendorsSection);
});

menuStaff.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveMenu(menuStaff, staffSection);
});

menuPermissions.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveMenu(menuPermissions, permissionsSection);
    fetchPermissions();
});

menuLevels.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveMenu(menuLevels, levelsSection);
    fetchLevels();
});

menuRoles.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveMenu(menuRoles, rolesSection);
    fetchRoles();
});

menuLocations.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveMenu(menuLocations, locationsSection);
    fetchLocations();
});

menuDevices.addEventListener('click', (e) => {
    e.preventDefault();
    setActiveMenu(menuDevices, devicesSection);
    fetchDevices();
});

function setActiveMenu(menuItem, sectionItem) {
    [menuVendors, menuStaff, menuPermissions, menuLevels, menuRoles, menuLocations, menuDevices].forEach(m => {
        if (m) m.classList.remove('active');
    });
    [vendorsSection, staffSection, permissionsSection, levelsSection, rolesSection, locationsSection, devicesSection].forEach(s => {
        if (s) s.style.display = 'none';
    });
    menuItem.classList.add('active');
    sectionItem.style.display = 'block';
}

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

// Fetch Levels
async function fetchLevels() {
    levelsTableBody.innerHTML = `
        <tr class="table-loading">
            <td colspan="7">
                <div class="loader-spinner"></div>
                <span>Fetching levels...</span>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`${API_URL}/levels`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            levelsList = resData.data;
            renderLevels(levelsList);
        } else {
            showToast(resData.error || 'Failed to retrieve levels.', 'error');
        }
    } catch (err) {
        showToast('Failed to fetch levels from server.', 'error');
        console.error(err);
    }
}

// Render Levels to Table
function renderLevels(levels) {
    if (!levels || levels.length === 0) {
        levelsTableBody.innerHTML = `
            <tr class="table-empty">
                <td colspan="7">
                    <i class="fa-regular fa-folder-open"></i>
                    <span>No levels found.</span>
                </td>
            </tr>
        `;
        return;
    }

    levelsTableBody.innerHTML = levels.map(level => {
        const ownerText = level.admin_id 
            ? `<div class="badge-owner" data-tooltip="Name: ${escapeHTML(level.owner_name)}\nEmail: ${escapeHTML(level.owner_email)}\nRole: Admin">${escapeHTML(level.owner_name)}</div>`
            : `<div class="badge-system">System</div>`;
        return `
            <tr>
                <td class="staff-name-col">
                    <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${escapeHTML(level.color || '#fff')}; margin-right:8px; vertical-align:middle;"></span>
                    ${escapeHTML(level.name)}
                </td>
                <td>${escapeHTML(level.description || 'N/A')}</td>
                <td><span class="badge-level">${escapeHTML(level.sla_window || 'N/A')}</span></td>
                <td>${escapeHTML(level.cycle_count || 'N/A')}</td>
                <td>${escapeHTML(level.response_logic || 'N/A')}</td>
                <td>${ownerText}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="openEditLevelModal(${level.id})" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteLevel(${level.id})" title="Delete">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Level Modal Actions
function openEditLevelModal(id) {
    const level = levelsList.find(l => l.id === id);
    if (!level) return;
    levelModalTitle.textContent = 'Edit Level';
    levelSubmitText.textContent = 'Save Changes';
    document.getElementById('level-id').value = level.id;
    document.getElementById('level-name').value = level.name;
    document.getElementById('level-desc').value = level.description || '';
    document.getElementById('level-sla').value = level.sla_window || '';
    document.getElementById('level-cycles').value = level.cycle_count || '';
    document.getElementById('level-response').value = level.response_logic || '';
    document.getElementById('level-color').value = level.color || '#ffffff';
    levelModal.classList.add('open');
}

function closeLevelModal() {
    levelModal.classList.remove('open');
    levelForm.reset();
}

closeLevelModalBtn.addEventListener('click', closeLevelModal);
cancelLevelBtn.addEventListener('click', closeLevelModal);
levelModal.addEventListener('click', (e) => {
    if (e.target === levelModal) {
        closeLevelModal();
    }
});

// Level Submit
levelForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('level-id').value;
    const name = document.getElementById('level-name').value.trim();
    const description = document.getElementById('level-desc').value.trim();
    const sla_window = document.getElementById('level-sla').value.trim();
    const cycle_count = document.getElementById('level-cycles').value.trim();
    const response_logic = document.getElementById('level-response').value.trim();
    const color = document.getElementById('level-color').value;
    const submitBtn = document.getElementById('level-submit-btn');

    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="loader-spinner"></div> <span>Saving...</span>`;

    try {
        const response = await fetch(`${API_URL}/levels/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ name, description, sla_window, cycle_count, response_logic, color })
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            showToast('Level updated successfully!', 'success');
            closeLevelModal();
            fetchLevels();
        } else {
            showToast(resData.error || 'Failed to update level.', 'error');
        }
    } catch (err) {
        showToast('Network error. Failed to save level.', 'error');
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});

// Delete Level
async function deleteLevel(id) {
    if (!confirm('Are you sure you want to delete this level?')) return;

    try {
        const response = await fetch(`${API_URL}/levels/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            showToast('Level deleted successfully!', 'success');
            fetchLevels();
        } else {
            showToast(resData.error || 'Failed to delete level.', 'error');
        }
    } catch (err) {
        showToast('Failed to connect to server.', 'error');
    }
}

// Fetch Roles
async function fetchRoles() {
    rolesTableBody.innerHTML = `
        <tr class="table-loading">
            <td colspan="5">
                <div class="loader-spinner"></div>
                <span>Fetching roles...</span>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`${API_URL}/roles`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            rolesList = resData.data;
            renderRoles(rolesList);
        } else {
            showToast(resData.error || 'Failed to retrieve roles.', 'error');
        }
    } catch (err) {
        showToast('Failed to fetch roles from server.', 'error');
        console.error(err);
    }
}

// Render Roles to Table
function renderRoles(roles) {
    if (!roles || roles.length === 0) {
        rolesTableBody.innerHTML = `
            <tr class="table-empty">
                <td colspan="5">
                    <i class="fa-regular fa-folder-open"></i>
                    <span>No roles found.</span>
                </td>
            </tr>
        `;
        return;
    }

    rolesTableBody.innerHTML = roles.map(role => {
        const ownerText = role.admin_id 
            ? `<div class="badge-owner" data-tooltip="Name: ${escapeHTML(role.owner_name)}\nEmail: ${escapeHTML(role.owner_email)}\nRole: Admin">${escapeHTML(role.owner_name)}</div>`
            : `<div class="badge-system">System</div>`;
        const permissionsBadges = (role.permissions || []).map(p => 
            `<span class="badge badge-guard" style="margin-right: 4px; margin-bottom: 4px; font-size: 11px;">${escapeHTML(p.name)}</span>`
        ).join('');
        
        return `
            <tr>
                <td class="staff-name-col">${escapeHTML(role.name)}</td>
                <td>${escapeHTML(role.description || 'N/A')}</td>
                <td><div style="display:flex; flex-wrap:wrap; max-width:320px;">${permissionsBadges || 'None'}</div></td>
                <td>${ownerText}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="openEditRoleModal(${role.id})" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteRole(${role.id})" title="Delete">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Role Modal Actions
async function openEditRoleModal(id) {
    const role = rolesList.find(r => r.id === id);
    if (!role) return;
    roleModalTitle.textContent = 'Edit Role';
    roleSubmitText.textContent = 'Save Changes';
    document.getElementById('role-id').value = role.id;
    document.getElementById('role-name').value = role.name;
    document.getElementById('role-desc').value = role.description || '';

    // Populate permissions list checkboxes
    rolePermissionsList.innerHTML = `
        <div style="grid-column: span 2; text-align: center; padding: 10px;">
            <div class="loader-spinner" style="margin:0 auto 6px;"></div>
            <span>Loading permissions...</span>
        </div>
    `;
    
    try {
        if (permissionsList.length === 0) {
            const response = await fetch(`${API_URL}/permissions`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const resData = await response.json();
            if (response.ok && resData.status) {
                permissionsList = resData.data;
            }
        }
        
        const activeSystemPermissions = permissionsList.filter(p => p.is_active);
        const assignedIds = (role.permissions || []).map(p => p.id);

        if (activeSystemPermissions.length === 0) {
            rolePermissionsList.innerHTML = '<span style="grid-column: span 2; text-align:center; color:var(--text-muted);">No active permissions available.</span>';
        } else {
            rolePermissionsList.innerHTML = activeSystemPermissions.map(p => {
                const checked = assignedIds.includes(p.id) ? 'checked' : '';
                return `
                    <label class="permission-checkbox-item">
                        <input type="checkbox" value="${p.id}" ${checked}>
                        <span>${escapeHTML(p.name)}</span>
                    </label>
                `;
            }).join('');
        }
    } catch (err) {
        rolePermissionsList.innerHTML = '<span style="grid-column: span 2; text-align:center; color:var(--error);">Failed to load permissions.</span>';
        console.error(err);
    }

    roleModal.classList.add('open');
}

function closeRoleModal() {
    roleModal.classList.remove('open');
    roleForm.reset();
}

closeRoleModalBtn.addEventListener('click', closeRoleModal);
cancelRoleBtn.addEventListener('click', closeRoleModal);
roleModal.addEventListener('click', (e) => {
    if (e.target === roleModal) {
        closeRoleModal();
    }
});

// Role Submit
roleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('role-id').value;
    const name = document.getElementById('role-name').value.trim();
    const description = document.getElementById('role-desc').value.trim();
    
    const checkedCheckboxes = rolePermissionsList.querySelectorAll('input[type="checkbox"]:checked');
    const permissions = Array.from(checkedCheckboxes).map(cb => parseInt(cb.value, 10));
    
    const submitBtn = document.getElementById('role-submit-btn');
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="loader-spinner"></div> <span>Saving...</span>`;

    try {
        const response = await fetch(`${API_URL}/roles/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ name, description, permissions })
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            showToast('Role updated successfully!', 'success');
            closeRoleModal();
            fetchRoles();
        } else {
            showToast(resData.error || 'Failed to update role.', 'error');
        }
    } catch (err) {
        showToast('Network error. Failed to save role.', 'error');
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});

// Delete Role
async function deleteRole(id) {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
        const response = await fetch(`${API_URL}/roles/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            showToast('Role deleted successfully!', 'success');
            fetchRoles();
        } else {
            showToast(resData.error || 'Failed to delete role.', 'error');
        }
    } catch (err) {
        showToast('Failed to connect to server.', 'error');
    }
}

// Level Search & Refresh Event Listeners
levelSearchInput.addEventListener('keyup', () => {
    const query = levelSearchInput.value.toLowerCase().trim();
    if (!query) {
        renderLevels(levelsList);
        return;
    }
    const filtered = levelsList.filter(l => {
        const name = (l.name || '').toLowerCase();
        const desc = (l.description || '').toLowerCase();
        return name.includes(query) || desc.includes(query);
    });
    renderLevels(filtered);
});

levelRefreshBtn.addEventListener('click', () => {
    fetchLevels();
    showToast('Levels refreshed.', 'success');
});

// Role Search & Refresh Event Listeners
roleSearchInput.addEventListener('keyup', () => {
    const query = roleSearchInput.value.toLowerCase().trim();
    if (!query) {
        renderRoles(rolesList);
        return;
    }
    const filtered = rolesList.filter(r => {
        const name = (r.name || '').toLowerCase();
        const desc = (r.description || '').toLowerCase();
        return name.includes(query) || desc.includes(query);
    });
    renderRoles(filtered);
});

roleRefreshBtn.addEventListener('click', () => {
    fetchRoles();
    showToast('Roles refreshed.', 'success');
});

// Fetch Locations List
async function fetchLocations() {
    locationsTableBody.innerHTML = `
        <tr class="table-loading">
            <td colspan="7">
                <div class="loader-spinner"></div>
                <span>Fetching locations...</span>
            </td>
        </tr>
    `;

    try {
        const response = await fetch(`${API_URL}/locations`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            locationsList = resData.data;
            renderLocations(locationsList);
            updateLocationStats(resData.counts);
        } else {
            showToast(resData.error || 'Failed to retrieve locations.', 'error');
        }
    } catch (err) {
        showToast('Failed to fetch locations from server.', 'error');
        console.error(err);
    }
}

// Render Locations to Table
function renderLocations(locations) {
    if (!locations || locations.length === 0) {
        locationsTableBody.innerHTML = `
            <tr class="table-empty">
                <td colspan="7">
                    <i class="fa-regular fa-folder-open"></i>
                    <span>No locations found.</span>
                </td>
            </tr>
        `;
        return;
    }

    locationsTableBody.innerHTML = locations.map(loc => {
        const checkedAttr = loc.is_active ? 'checked' : '';
            
        return `
            <tr>
                <td class="staff-name-col">${escapeHTML(loc.name)}</td>
                <td>${escapeHTML(loc.address || 'N/A')}</td>
                <td>${escapeHTML(loc.city || 'N/A')}</td>
                <td>${escapeHTML(loc.zip_code || 'N/A')}</td>
                <td style="text-align: center;"><span class="badge-level">${loc.nodes || 0}</span></td>
                <td style="text-align: center;">
                    <label class="switch" style="margin: 0 auto; display: inline-flex;">
                        <input type="checkbox" ${checkedAttr} onchange="toggleLocationStatus(${loc.id})">
                        <span class="slider round"></span>
                    </label>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-view" onclick="openViewLocationModal(${loc.id})" title="View" style="background: rgba(16, 185, 129, 0.1); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2);">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        <button class="btn-icon btn-edit" onclick="openEditLocationModal(${loc.id})" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteLocation(${loc.id})" title="Delete">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Update Location stats cards
function updateLocationStats(counts) {
    if (!counts) return;
    statTotalLocations.textContent = counts.sites || 0;
    statLocationsNodes.textContent = counts.nodes || 0;
    statLocationsActive.textContent = counts.live || 0;
}

// Modal Actions for Locations
function openAddLocationModal() {
    locationModalTitle.textContent = 'Add New Location';
    locationSubmitText.textContent = 'Save Location';
    document.getElementById('location-id').value = '';
    locationForm.reset();
    document.getElementById('location-active').checked = true;
    document.getElementById('location-active').disabled = false;
    
    // Enable form fields
    setFormFieldsDisabled(locationForm, false);
    document.getElementById('location-submit-btn').style.display = 'inline-flex';
    locationModal.classList.add('open');
}

function openEditLocationModal(id) {
    const loc = locationsList.find(l => l.id === id);
    if (!loc) return;
    locationModalTitle.textContent = 'Edit Location';
    locationSubmitText.textContent = 'Save Changes';
    document.getElementById('location-id').value = loc.id;
    document.getElementById('location-name').value = loc.name;
    document.getElementById('location-address').value = loc.address || '';
    document.getElementById('location-city').value = loc.city || '';
    document.getElementById('location-zip').value = loc.zip_code || '';
    document.getElementById('location-active').checked = loc.is_active;
    document.getElementById('location-active').disabled = false;
    
    // Enable form fields
    setFormFieldsDisabled(locationForm, false);
    document.getElementById('location-submit-btn').style.display = 'inline-flex';
    locationModal.classList.add('open');
}

function openViewLocationModal(id) {
    const loc = locationsList.find(l => l.id === id);
    if (!loc) return;
    locationModalTitle.textContent = 'View Location';
    document.getElementById('location-id').value = loc.id;
    document.getElementById('location-name').value = loc.name;
    document.getElementById('location-address').value = loc.address || '';
    document.getElementById('location-city').value = loc.city || '';
    document.getElementById('location-zip').value = loc.zip_code || '';
    document.getElementById('location-active').checked = loc.is_active;
    document.getElementById('location-active').disabled = true;
    
    // Disable form fields
    setFormFieldsDisabled(locationForm, true);
    document.getElementById('location-submit-btn').style.display = 'none';
    locationModal.classList.add('open');
}

function setFormFieldsDisabled(form, disabled) {
    const inputs = form.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"])');
    inputs.forEach(input => input.disabled = disabled);
}

function closeLocationModal() {
    locationModal.classList.remove('open');
    locationForm.reset();
}

// Toggle status of a location
async function toggleLocationStatus(id) {
    try {
        const response = await fetch(`${API_URL}/locations/${id}/toggle`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            showToast(resData.message || 'Location status updated.', 'success');
            fetchLocations();
        } else {
            showToast(resData.error || 'Failed to toggle location status.', 'error');
            fetchLocations();
        }
    } catch (err) {
        showToast('Failed to connect to server.', 'error');
        fetchLocations();
    }
}

// Delete a location
async function deleteLocation(id) {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
        const response = await fetch(`${API_URL}/locations/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            showToast('Location deleted successfully!', 'success');
            fetchLocations();
        } else {
            showToast(resData.error || 'Failed to delete location.', 'error');
        }
    } catch (err) {
        showToast('Failed to connect to server.', 'error');
    }
}

// Location Form Submit
locationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('location-id').value;
    const name = document.getElementById('location-name').value.trim();
    const address = document.getElementById('location-address').value.trim();
    const city = document.getElementById('location-city').value.trim();
    const zip_code = document.getElementById('location-zip').value.trim();
    const is_active = document.getElementById('location-active').checked ? 1 : 0;
    
    const submitBtn = document.getElementById('location-submit-btn');
    const originalBtnHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="loader-spinner"></div> <span>Saving...</span>`;

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/locations/${id}` : `${API_URL}/locations`;

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ name, address, city, zip_code, is_active })
        });

        const resData = await response.json();

        if (response.ok && resData.status) {
            showToast(id ? 'Location updated successfully!' : 'Location created successfully!', 'success');
            closeLocationModal();
            fetchLocations();
        } else {
            showToast(resData.error || 'Failed to save location.', 'error');
        }
    } catch (err) {
        showToast('Network error. Failed to save location.', 'error');
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
});

// Location Search
locationSearchInput.addEventListener('keyup', () => {
    const query = locationSearchInput.value.toLowerCase().trim();
    if (!query) {
        renderLocations(locationsList);
        return;
    }

    const filtered = locationsList.filter(l => {
        const name = (l.name || '').toLowerCase();
        const address = (l.address || '').toLowerCase();
        const city = (l.city || '').toLowerCase();
        const zip = (l.zip_code || '').toLowerCase();
        return name.includes(query) || address.includes(query) || city.includes(query) || zip.includes(query);
    });

    renderLocations(filtered);
});

locationRefreshBtn.addEventListener('click', () => {
    fetchLocations();
    showToast('Locations list refreshed.', 'success');
});

// Location Modal bindings
openLocationModalBtn.addEventListener('click', openAddLocationModal);
closeLocationModalBtn.addEventListener('click', closeLocationModal);
cancelLocationBtn.addEventListener('click', closeLocationModal);
locationModal.addEventListener('click', (e) => {
    if (e.target === locationModal) {
        closeLocationModal();
    }
});

// Expose level and role functions globally
window.openEditLevelModal = openEditLevelModal;
window.deleteLevel = deleteLevel;
window.openEditRoleModal = openEditRoleModal;
window.deleteRole = deleteRole;

// Expose permission functions globally so they can be called from dynamically rendered HTML
window.togglePermissionStatus = togglePermissionStatus;
window.openEditPermissionModal = openEditPermissionModal;
window.deletePermission = deletePermission;

// Expose location functions globally
window.openViewLocationModal = openViewLocationModal;
window.openEditLocationModal = openEditLocationModal;
window.deleteLocation = deleteLocation;
window.toggleLocationStatus = toggleLocationStatus;

// Expose staff functions globally
window.openViewStaffModal = openViewStaffModal;
window.openEditStaffModal = openEditStaffModal;
window.deleteStaff = deleteStaff;

// Expose vendor functions globally
window.openEditVendorModal = openEditVendorModal;
window.deleteVendor = deleteVendor;

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

/* ==========================================================================
   DEVICE MANAGEMENT JS LOGIC
   ========================================================================== */

// Helper to determine FontAwesome icon based on device type
function getDeviceIconClass(type) {
    switch (type) {
        case 'Panic Button':
            return 'fa-solid fa-fingerprint';
        case 'Gunshot Sensor':
            return 'fa-solid fa-volume-high';
        case 'Fire Detector':
            return 'fa-solid fa-fire-flame-curved';
        case 'Crowd Monitor':
            return 'fa-solid fa-users';
        case 'High Noise Sensor':
            return 'fa-solid fa-ear-deaf';
        case 'Presence Radar':
            return 'fa-solid fa-wifi';
        case 'Vibration Tamper':
            return 'fa-solid fa-triangle-exclamation';
        case 'Hardware Diagnostics':
            return 'fa-solid fa-wrench';
        default:
            return 'fa-solid fa-microchip';
    }
}

// Fetch device types from server
async function fetchDeviceTypes() {
    try {
        const response = await fetch(`${API_URL}/devices/types`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const resData = await response.json();
        if (response.ok && resData.status) {
            deviceTypesList = resData.data;
            renderDeviceTypeFilters();
        }
    } catch (err) {
        console.error('Failed to fetch device types:', err);
    }
}

// Render filter pills dynamically
function renderDeviceTypeFilters() {
    const filtersContainer = document.getElementById('device-type-filters');
    if (!filtersContainer) return;
    
    let html = `<div class="filter-pill ${selectedDeviceTypeFilter === 'All' ? 'active' : ''}" onclick="setDeviceTypeFilter('All')">All</div>`;
    
    deviceTypesList.forEach(type => {
        html += `<div class="filter-pill ${selectedDeviceTypeFilter === type ? 'active' : ''}" onclick="setDeviceTypeFilter('${type}')">${escapeHTML(type)}</div>`;
    });
    
    filtersContainer.innerHTML = html;
}

// Expose filter click handler globally
window.setDeviceTypeFilter = function(type) {
    selectedDeviceTypeFilter = type;
    renderDeviceTypeFilters();
    fetchDevices();
};

// Populate dropdown selects in Add/Edit Device Modal
function populateDeviceModalDropdowns() {
    const typeSelect = document.getElementById('device-type');
    const locSelect = document.getElementById('device-location');
    
    if (typeSelect) {
        typeSelect.innerHTML = '<option value="" disabled selected>Select Device Type</option>';
        deviceTypesList.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            typeSelect.appendChild(option);
        });
    }
    
    if (locSelect) {
        locSelect.innerHTML = '<option value="" disabled selected>Select Location</option>';
        locationsList.forEach(loc => {
            if (loc.is_active) {
                const option = document.createElement('option');
                option.value = loc.id;
                option.textContent = loc.name;
                locSelect.appendChild(option);
            }
        });
    }
}

// Fetch and render devices status list
async function fetchDevices() {
    try {
        if (deviceTypesList.length === 0) {
            await fetchDeviceTypes();
        }

        const response = await fetch(`${API_URL}/alerts?type=${encodeURIComponent(selectedDeviceTypeFilter)}`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const resData = await response.json();
        
        if (response.ok && resData.status) {
            devicesList = resData.data;
            
            // Update stats
            document.getElementById('stat-devices-total').textContent = resData.counts.total;
            document.getElementById('stat-devices-active').textContent = resData.counts.active;
            document.getElementById('stat-devices-deactive').textContent = resData.counts.deactive;
            
            renderDevices(devicesList);
        } else {
            showToast(resData.error || 'Failed to fetch devices.', 'error');
        }
    } catch (err) {
        showToast('Failed to connect to server.', 'error');
        console.error(err);
    }
}

// Render card items into the grid
function renderDevices(devices) {
    const container = document.getElementById('devices-cards-container');
    if (!container) return;
    
    if (devices.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-microchip" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                <p>No devices registered match the criteria.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = devices.map(dev => {
        const iconClass = getDeviceIconClass(dev.type);
        let badgeClass = 'badge-active';
        let badgeText = 'Active';
        
        if (!dev.is_active) {
            badgeClass = 'badge-deactive';
            badgeText = 'Deactivated';
        } else if (dev.new_alert === 1) {
            badgeClass = 'badge-alerting';
            badgeText = 'Alerting';
        }
        
        const batteryIcon = dev.battery_percentage >= 80 
            ? 'fa-battery-full' 
            : dev.battery_percentage >= 50 
                ? 'fa-battery-three-quarters' 
                : dev.battery_percentage >= 20 
                    ? 'fa-battery-quarter' 
                    : 'fa-battery-empty';
                    
        return `
            <div class="device-card" id="device-card-${dev.id}">
                <div class="device-card-header">
                    <div class="device-card-icon-container">
                        <i class="${iconClass}"></i>
                    </div>
                    <div style="position: relative;">
                        <button class="device-options-btn" onclick="toggleDeviceDropdown(event, ${dev.id})">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div class="device-card-dropdown" id="dropdown-${dev.id}">
                            <div class="device-card-dropdown-item" onclick="openViewDeviceDetailsModal(${dev.id})">
                                <i class="fa-solid fa-eye"></i> View Details
                            </div>
                            <div class="device-card-dropdown-item" onclick="openDeviceAlertsModal(${dev.id})">
                                <i class="fa-solid fa-bell"></i> Alerts
                            </div>
                            <div class="device-card-dropdown-item" onclick="toggleDeviceStatus(${dev.id})">
                                <i class="fa-solid ${dev.is_active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i> ${dev.is_active ? 'Deactivate' : 'Activate'}
                            </div>
                            <div class="device-card-dropdown-item" onclick="openEditDeviceModal(${dev.id})">
                                <i class="fa-solid fa-pen"></i> Edit Device
                            </div>
                            <div class="device-card-dropdown-item text-danger" onclick="deleteDevice(${dev.id})">
                                <i class="fa-solid fa-trash"></i> Delete Device
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="device-card-type">${escapeHTML(dev.type)}</div>
                <div class="device-card-serial">ID: ${escapeHTML(dev.serial_number)}</div>
                
                <div style="margin-bottom: 12px;">
                    <span class="badge ${badgeClass}">${badgeText}</span>
                </div>
                
                <div class="device-card-zone">
                    <i class="fa-solid fa-location-dot"></i>
                    <span>${escapeHTML(dev.location ? dev.location.name : 'Unknown Location')}</span>
                </div>
                
                <div class="device-card-battery">
                    <i class="fa-solid ${batteryIcon}"></i>
                    <span>${dev.battery_percentage}% Battery</span>
                </div>
                
                <div class="device-card-owner">
                    <div class="device-card-owner-title">Location Admin</div>
                    <div>${escapeHTML(dev.admin ? dev.admin.name : 'Unassigned')}</div>
                    <div style="font-size: 11px; opacity: 0.8;">${escapeHTML(dev.admin ? dev.admin.email : 'No Contact')}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Toggle active status of a single card's action menu
window.toggleDeviceDropdown = function(event, deviceId) {
    event.stopPropagation();
    document.querySelectorAll('.device-card-dropdown').forEach(d => {
        if (d.id !== `dropdown-${deviceId}`) {
            d.classList.remove('active');
        }
    });
    
    const dropdown = document.getElementById(`dropdown-${deviceId}`);
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
};

// Global click handler to dismiss open dropdown menus
document.addEventListener('click', () => {
    document.querySelectorAll('.device-card-dropdown').forEach(d => {
        d.classList.remove('active');
    });
});

// Register / Edit Modal Toggles
window.openAddDeviceModal = function() {
    populateDeviceModalDropdowns();
    document.getElementById('device-id').value = '';
    document.getElementById('device-name').value = '';
    document.getElementById('device-serial').value = '';
    document.getElementById('device-serial').disabled = false;
    document.getElementById('device-type').value = '';
    document.getElementById('device-location').value = '';
    document.getElementById('device-modal-title').textContent = 'Register Device';
    document.getElementById('device-submit-btn').innerHTML = 'Save & Register';
    document.getElementById('device-modal').classList.add('open');
};

window.openEditDeviceModal = function(id) {
    const dev = devicesList.find(d => d.id === id);
    if (!dev) return;
    
    populateDeviceModalDropdowns();
    document.getElementById('device-id').value = dev.id;
    document.getElementById('device-name').value = dev.name;
    document.getElementById('device-serial').value = dev.serial_number;
    document.getElementById('device-serial').disabled = true;
    document.getElementById('device-type').value = dev.type;
    document.getElementById('device-location').value = dev.location ? dev.location.id : '';
    document.getElementById('device-modal-title').textContent = 'Edit Device';
    document.getElementById('device-submit-btn').innerHTML = 'Update Device';
    document.getElementById('device-modal').classList.add('open');
};

window.closeDeviceModal = function() {
    document.getElementById('device-modal').classList.remove('open');
};

// Toggle device active state (Active/Deactive)
window.toggleDeviceStatus = async function(id) {
    try {
        const response = await fetch(`${API_URL}/devices/${id}/toggle`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const resData = await response.json();
        if (response.ok && resData.status) {
            showToast(resData.message || 'Device status updated.', 'success');
            fetchDevices();
        } else {
            showToast(resData.error || 'Failed to toggle device status.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
        console.error(err);
    }
};

// Delete Device
window.deleteDevice = async function(id) {
    if (!confirm('Are you sure you want to delete this device? This will also archive its data records.')) return;
    
    try {
        const response = await fetch(`${API_URL}/devices/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        
        const resData = await response.json();
        if (response.ok && resData.status) {
            showToast('Device deleted successfully!', 'success');
            fetchDevices();
        } else {
            showToast(resData.error || 'Failed to delete device.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
        console.error(err);
    }
};

// Device details diagnostics Modal state
let currentViewDeviceId = null;

window.openViewDeviceDetailsModal = function(id) {
    const dev = devicesList.find(d => d.id === id);
    if (!dev) return;
    
    currentViewDeviceId = id;
    
    document.getElementById('detail-device-type').textContent = dev.type;
    document.getElementById('detail-device-serial').textContent = `ID: ${dev.serial_number}`;
    
    const statusBadge = document.getElementById('detail-device-status');
    statusBadge.className = 'badge';
    if (!dev.is_active) {
        statusBadge.classList.add('badge-deactive');
        statusBadge.textContent = 'DEACTIVE';
    } else if (dev.new_alert === 1) {
        statusBadge.classList.add('badge-alerting');
        statusBadge.textContent = dev.is_acknowledged === 1 ? 'ACKNOWLEDGED ALERT' : 'ALERTING';
    } else {
        statusBadge.classList.add('badge-active');
        statusBadge.textContent = 'ACTIVE';
    }
    
    let signalText = 'Excellent';
    let signalColor = '#2ecc71';
    if (dev.latest_event && dev.latest_event.rssi) {
        const rssiVal = parseInt(dev.latest_event.rssi, 10);
        if (rssiVal > -60) {
            signalText = 'Excellent';
            signalColor = '#2ecc71';
        } else if (rssiVal > -80) {
            signalText = 'Good';
            signalColor = '#f1c40f';
        } else {
            signalText = 'Weak';
            signalColor = '#e74c3c';
        }
    }
    const signalEl = document.getElementById('detail-signal-strength');
    signalEl.textContent = signalText;
    signalEl.style.color = signalColor;
    
    document.getElementById('detail-battery-level').textContent = `${dev.battery_percentage}%`;
    document.getElementById('detail-assigned-zone').textContent = dev.location ? dev.location.name : 'N/A';
    
    const dismissBtn = document.getElementById('btn-dismiss-alert');
    const ackBtn = document.getElementById('btn-acknowledge-alert');
    
    if (dev.is_active && dev.new_alert === 1) {
        dismissBtn.style.display = 'block';
        if (dev.is_acknowledged === 1) {
            ackBtn.style.display = 'none';
        } else {
            ackBtn.style.display = 'block';
        }
    } else {
        dismissBtn.style.display = 'none';
        ackBtn.style.display = 'none';
    }
    
    document.getElementById('device-details-modal').classList.add('open');
};

window.closeViewDeviceDetailsModal = function() {
    document.getElementById('device-details-modal').classList.remove('open');
};

// Open analysis log modal
window.openDeviceAnalysisModal = async function(id) {
    try {
        const response = await fetch(`${API_URL}/devices/${id}/analysis`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const resData = await response.json();
        if (!response.ok || !resData.status) {
            showToast(resData.error || 'Failed to retrieve device analysis.', 'error');
            return;
        }
        
        const analysis = resData.data;
        
        document.getElementById('analysis-device-type').textContent = analysis.device.type;
        document.getElementById('analysis-device-serial').textContent = `ID: ${analysis.device.serial_number}`;
        
        document.getElementById('analysis-total-alerts').textContent = analysis.total_alerts;
        document.getElementById('analysis-avg-response').textContent = analysis.avg_response;
        document.getElementById('analysis-uptime').textContent = analysis.uptime;
        
        const downloadBtn = document.getElementById('btn-download-pdf');
        if (downloadBtn) {
            downloadBtn.href = analysis.pdf_url;
        }
        
        const timelineContainer = document.getElementById('analysis-timeline-container');
        if (timelineContainer) {
            let html = `<div style="position: absolute; left: 8px; top: 10px; bottom: 10px; width: 2px; background: rgba(255,255,255,0.06);"></div>`;
            
            if (analysis.timeline.length === 0) {
                html += `
                    <div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px 0;">
                        No event logs recorded.
                    </div>
                `;
            } else {
                analysis.timeline.forEach(event => {
                    let markerClass = 'marker-triggered';
                    let markerIcon = 'fa-bell';
                    
                    if (event.event_type === 'Alert Triggered') {
                        markerClass = 'marker-triggered';
                        markerIcon = 'fa-bell';
                    } else if (event.event_type === 'Alert Acknowledged') {
                        markerClass = 'marker-acknowledged';
                        markerIcon = 'fa-eye';
                    } else if (event.event_type === 'Alert Dismissed') {
                        markerClass = 'marker-dismissed';
                        markerIcon = 'fa-xmark';
                    } else if (event.event_type === 'Alert Resolved') {
                        markerClass = 'marker-resolved';
                        markerIcon = 'fa-check';
                    }
                    
                    html += `
                        <div class="timeline-item">
                            <div class="timeline-marker ${markerClass}">
                                <i class="fa-solid ${markerIcon}"></i>
                            </div>
                            <div class="timeline-content">
                                <div class="timeline-header">
                                    <span class="timeline-title">${escapeHTML(event.event_type)}</span>
                                    <span class="timeline-time">${escapeHTML(event.time)}</span>
                                </div>
                                <div class="timeline-desc">${escapeHTML(event.description)}</div>
                                <div class="timeline-actor">
                                    <i class="fa-solid ${event.actor.startsWith('Sensor') ? 'fa-microchip' : event.actor.startsWith('System') ? 'fa-robot' : 'fa-user'}"></i>
                                    <span>${escapeHTML(event.actor)}</span>
                                </div>
                                ${event.info ? `<div class="timeline-info-box">${escapeHTML(event.info)}</div>` : ''}
                            </div>
                        </div>
                    `;
                });
            }
            
            timelineContainer.innerHTML = html;
        }
        
        document.getElementById('device-analysis-modal').classList.add('open');
    } catch (err) {
        showToast('Failed to load device analysis data.', 'error');
        console.error(err);
    }
};

window.closeDeviceAnalysisModal = function() {
    document.getElementById('device-analysis-modal').classList.remove('open');
};

// Add / Edit Form submit binding
document.getElementById('device-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('device-id').value;
    const name = document.getElementById('device-name').value.trim();
    const serial_number = document.getElementById('device-serial').value.trim();
    const type = document.getElementById('device-type').value;
    const location_id = document.getElementById('device-location').value;
    
    const submitBtn = document.getElementById('device-submit-btn');
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="loader-spinner"></div> <span>Saving...</span>`;
    
    const url = id ? `${API_URL}/devices/${id}` : `${API_URL}/devices`;
    const method = id ? 'PUT' : 'POST';
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({ name, serial_number, type, location_id })
        });
        
        const resData = await response.json();
        if (response.ok && resData.status) {
            showToast(id ? 'Device updated successfully!' : 'Device registered successfully!', 'success');
            closeDeviceModal();
            fetchDevices();
        } else {
            showToast(resData.error || 'Failed to save device.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
        console.error(err);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
    }
});

// Search input keyup binding
document.getElementById('device-search-input').addEventListener('keyup', () => {
    const query = document.getElementById('device-search-input').value.toLowerCase().trim();
    if (!query) {
        renderDevices(devicesList);
        return;
    }
    
    const filtered = devicesList.filter(dev => {
        const name = (dev.name || '').toLowerCase();
        const serial = (dev.serial_number || '').toLowerCase();
        const zone = (dev.location ? dev.location.name : '').toLowerCase();
        const type = (dev.type || '').toLowerCase();
        return name.includes(query) || serial.includes(query) || zone.includes(query) || type.includes(query);
    });
    
    renderDevices(filtered);
});

// Refresh button binding
document.getElementById('device-refresh-btn').addEventListener('click', () => {
    fetchDevices();
    showToast('Devices list refreshed.', 'success');
});

// Dismiss / Acknowledge alert click bindings
document.getElementById('btn-dismiss-alert').addEventListener('click', async () => {
    if (!currentViewDeviceId) return;
    try {
        const response = await fetch(`${API_URL}/devices/${currentViewDeviceId}/remove-alert`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const resData = await response.json();
        if (response.ok && resData.status) {
            showToast('Alert dismissed successfully!', 'success');
            closeViewDeviceDetailsModal();
            fetchDevices();
        } else {
            showToast(resData.error || 'Failed to dismiss alert.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
    }
});

document.getElementById('btn-acknowledge-alert').addEventListener('click', async () => {
    if (!currentViewDeviceId) return;
    try {
        const response = await fetch(`${API_URL}/devices/${currentViewDeviceId}/acknowledge-alert`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const resData = await response.json();
        if (response.ok && resData.status) {
            showToast('Alert acknowledged successfully!', 'success');
            closeViewDeviceDetailsModal();
            fetchDevices();
        } else {
            showToast(resData.error || 'Failed to acknowledge alert.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
    }
});

// Diagnostics Modal -> Open Analysis Modal link binding
document.getElementById('btn-full-analysis').addEventListener('click', () => {
    if (!currentViewDeviceId) return;
    closeViewDeviceDetailsModal();
    openDeviceAnalysisModal(currentViewDeviceId);
});

// Modal Close Button bindings
document.getElementById('open-device-modal-btn').addEventListener('click', openAddDeviceModal);
document.getElementById('close-device-modal-btn').addEventListener('click', closeDeviceModal);
document.getElementById('cancel-device-btn').addEventListener('click', closeDeviceModal);

document.getElementById('close-device-details-btn').addEventListener('click', closeViewDeviceDetailsModal);
document.getElementById('close-device-analysis-btn').addEventListener('click', closeDeviceAnalysisModal);

document.getElementById('close-device-alerts-btn').addEventListener('click', closeDeviceAlertsModal);
document.getElementById('close-alert-details-btn').addEventListener('click', closeAlertDetailsModal);
document.getElementById('btn-close-details-footer').addEventListener('click', closeAlertDetailsModal);

// Modal Backdrop Close bindings
document.getElementById('device-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('device-modal')) {
        closeDeviceModal();
    }
});
document.getElementById('device-details-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('device-details-modal')) {
        closeViewDeviceDetailsModal();
    }
});
document.getElementById('device-analysis-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('device-analysis-modal')) {
        closeDeviceAnalysisModal();
    }
});
document.getElementById('device-alerts-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('device-alerts-modal')) {
        closeDeviceAlertsModal();
    }
});
document.getElementById('alert-details-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('alert-details-modal')) {
        closeAlertDetailsModal();
    }
});

/* ==========================================================================
   ALERTS LIST AND DETAILS JS LOGIC
   ========================================================================== */

let currentAlertsDeviceId = null;
let currentAlertsList = [];

async function openDeviceAlertsModal(deviceId) {
    const dev = devicesList.find(d => d.id === deviceId);
    if (!dev) return;
    
    currentAlertsDeviceId = deviceId;
    
    document.getElementById('alerts-modal-device-name').textContent = `${dev.type} - Alerts`;
    document.getElementById('alerts-modal-device-serial').textContent = `ID: ${dev.serial_number}`;
    
    const tableBody = document.getElementById('device-alerts-table-body');
    tableBody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 20px;">
                <div class="loader-spinner" style="margin: 0 auto 10px auto;"></div>
                <span>Loading alerts data...</span>
            </td>
        </tr>
    `;
    
    document.getElementById('device-alerts-modal').classList.add('open');
    
    await fetchAndRenderAlertsList(deviceId);
}

async function fetchAndRenderAlertsList(deviceId) {
    try {
        const response = await fetch(`${API_URL}/devices/${deviceId}/alerts`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const resData = await response.json();
        if (response.ok && resData.status) {
            currentAlertsList = resData.data.alerts;
            renderAlertsList(deviceId, currentAlertsList);
        } else {
            showToast(resData.error || 'Failed to fetch device alerts.', 'error');
        }
    } catch (err) {
        showToast('Network error while fetching alerts.', 'error');
        console.error(err);
    }
}

function renderAlertsList(deviceId, alerts) {
    const tableBody = document.getElementById('device-alerts-table-body');
    if (!tableBody) return;
    
    if (alerts.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 30px; color: var(--text-muted);">
                    <i class="fa-solid fa-bell-slash" style="font-size: 24px; margin-bottom: 10px; opacity: 0.3;"></i>
                    <p>No alert logs recorded for this device.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tableBody.innerHTML = alerts.map(alert => {
        const formattedDate = alert.insert_date 
            ? new Date(alert.insert_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })
            : 'N/A';
            
        let statusBadgeClass = 'badge-alerting';
        let statusText = 'Active';
        
        if (alert.status === 'DISMISSED') {
            statusBadgeClass = 'badge-active';
            statusText = 'Dismissed';
        } else if (alert.status === 'ACKNOWLEDGED') {
            statusBadgeClass = 'badge-deactive';
            statusText = 'Acknowledged';
        }
        
        let actionButtonsHtml = '';
        if (alert.status === 'ACTIVE') {
            actionButtonsHtml += `
                <button class="alerts-action-btn" style="background: rgba(46,204,113,0.15); color: #2ecc71; border: 1px solid rgba(46,204,113,0.3); margin-right: 4px;" onclick="acknowledgeAlertInList(event, ${deviceId}, ${alert.id})">
                    <i class="fa-solid fa-check"></i> Ack
                </button>
                <button class="alerts-action-btn" style="background: rgba(231,76,60,0.15); color: #e74c3c; border: 1px solid rgba(231,76,60,0.3); margin-right: 4px;" onclick="dismissAlertInList(event, ${deviceId}, ${alert.id})">
                    <i class="fa-solid fa-xmark"></i> Dismiss
                </button>
            `;
        } else if (alert.status === 'ACKNOWLEDGED') {
            actionButtonsHtml += `
                <button class="alerts-action-btn" style="background: rgba(231,76,60,0.15); color: #e74c3c; border: 1px solid rgba(231,76,60,0.3); margin-right: 4px;" onclick="dismissAlertInList(event, ${deviceId}, ${alert.id})">
                    <i class="fa-solid fa-xmark"></i> Dismiss
                </button>
            `;
        } else {
            actionButtonsHtml += `
                <span style="color: #2ecc71; font-size: 11px; margin-right: 8px; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Closed</span>
            `;
        }
        
        return `
            <tr>
                <td>${formattedDate}</td>
                <td><span class="badge badge-level" style="text-transform: capitalize;">${escapeHTML(alert.ev)}</span></td>
                <td>${escapeHTML(alert.msg)}</td>
                <td><span class="badge ${statusBadgeClass}">${statusText}</span></td>
                <td style="text-align: right; white-space: nowrap;">
                    ${actionButtonsHtml}
                    <button class="alerts-action-btn btn-view" style="margin-right: 4px;" onclick="openAlertDetailsModal(${alert.id})">
                        <i class="fa-solid fa-code"></i> Details
                    </button>
                    <button class="alerts-action-btn btn-timeline" onclick="openDeviceAnalysisModalFromAlerts(${alert.id})">
                        <i class="fa-solid fa-stopwatch"></i> Timeline
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function closeDeviceAlertsModal() {
    document.getElementById('device-alerts-modal').classList.remove('open');
}

async function acknowledgeAlertInList(event, deviceId, feedId) {
    event.stopPropagation();
    try {
        const response = await fetch(`${API_URL}/alerts/${feedId}/acknowledge`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const resData = await response.json();
        if (response.ok && resData.status) {
            showToast('Alert acknowledged successfully!', 'success');
            await fetchAndRenderAlertsList(deviceId);
            fetchDevices();
        } else {
            showToast(resData.error || 'Failed to acknowledge alert.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
    }
}

async function dismissAlertInList(event, deviceId, feedId) {
    event.stopPropagation();
    try {
        const response = await fetch(`${API_URL}/alerts/${feedId}/remove`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        const resData = await response.json();
        if (response.ok && resData.status) {
            showToast('Alert dismissed successfully!', 'success');
            await fetchAndRenderAlertsList(deviceId);
            fetchDevices();
        } else {
            showToast(resData.error || 'Failed to dismiss alert.', 'error');
        }
    } catch (err) {
        showToast('Network error.', 'error');
    }
}

function openAlertDetailsModal(alertId) {
    const alert = currentAlertsList.find(a => a.id === alertId);
    if (!alert) return;
    
    document.getElementById('details-modal-alert-id').textContent = `Feed ID: ${alert.id}`;
    
    const jsonStr = JSON.stringify(alert.raw_data, null, 4);
    document.getElementById('alert-raw-properties').textContent = jsonStr;
    
    document.getElementById('alert-details-modal').classList.add('open');
}

function closeAlertDetailsModal() {
    document.getElementById('alert-details-modal').classList.remove('open');
}

function openDeviceAnalysisModalFromAlerts(alertId) {
    closeDeviceAlertsModal();
    openDeviceAnalysisModal(alertId);
}

// Expose device functions globally
window.openViewDeviceDetailsModal = openViewDeviceDetailsModal;
window.closeViewDeviceDetailsModal = closeViewDeviceDetailsModal;
window.openEditDeviceModal = openEditDeviceModal;
window.deleteDevice = deleteDevice;
window.openDeviceAnalysisModal = openDeviceAnalysisModal;
window.closeDeviceAnalysisModal = closeDeviceAnalysisModal;
window.openDeviceAlertsModal = openDeviceAlertsModal;
window.closeDeviceAlertsModal = closeDeviceAlertsModal;
window.acknowledgeAlertInList = acknowledgeAlertInList;
window.dismissAlertInList = dismissAlertInList;
window.openAlertDetailsModal = openAlertDetailsModal;
window.closeAlertDetailsModal = closeAlertDetailsModal;
window.openDeviceAnalysisModalFromAlerts = openDeviceAnalysisModalFromAlerts;

// Initial Bootstrapping
window.addEventListener('DOMContentLoaded', checkAuth);
