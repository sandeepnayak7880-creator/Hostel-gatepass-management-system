// Gate Pass Management System - Firebase Backend
// Version: 3.0.0 - Database-Backed System

// System Configuration
const SYSTEM_CONFIG = {
    version: "3.0.0",
    autoApprovalRoles: ["admin", "warden"],
    manualApprovalRoles: ["student", "parent", "security"],
    autoSaveInterval: 3000,
    otpValidityMinutes: 10,
    sessionTimeoutMinutes: 30
};

// Global State Management
let currentUser = null;
let currentPage = 'welcomePage';
let registrationData = {};
let currentStep = 1;
let generatedOTP = null;
let unsubscribeListeners = [];

// Firebase references (will be available after Firebase loads)
let auth, db, firebase;

// Initialize Application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Waiting for Firebase...');
    
    // Wait for Firebase to be available
    const checkFirebase = setInterval(() => {
        if (window.firebase) {
            clearInterval(checkFirebase);
            initializeFirebaseApp();
        }
    }, 100);
});

// Initialize Firebase Application
function initializeFirebaseApp() {
    console.log('Firebase available - Initializing system...');
    
    // Get Firebase references
    auth = window.firebase.auth;
    db = window.firebase.db;
    firebase = window.firebase;
    
    // Initialize system
    initializeSystem();
    setupEventListeners();
    
    // Listen for auth state changes
    firebase.onAuthStateChanged(auth, handleAuthStateChange);
    
    console.log('Firebase system initialized successfully');
}

// System Initialization
async function initializeSystem() {
    try {
        // Create default collections if they don't exist
        await initializeFirebaseCollections();
        
        console.log('System initialized with Firebase backend');
    } catch (error) {
        console.error('System initialization error:', error);
        showNotification('System initialization failed. Please refresh the page.', 'error');
    }
}

// Initialize Firebase Collections
async function initializeFirebaseCollections() {
    try {
        // Check if system config exists, create if not
        const systemConfigRef = firebase.doc(db, 'system', 'config');
        const systemConfigDoc = await firebase.getDoc(systemConfigRef);
        
        if (!systemConfigDoc.exists()) {
            await firebase.setDoc(systemConfigRef, {
                ...SYSTEM_CONFIG,
                createdAt: new Date(),
                lastUpdated: new Date()
            });
        }
        
        // Initialize counters if they don't exist
        const countersRef = firebase.doc(db, 'system', 'counters');
        const countersDoc = await firebase.getDoc(countersRef);
        
        if (!countersDoc.exists()) {
            await firebase.setDoc(countersRef, {
                totalUsers: 0,
                approvedUsers: 0,
                pendingRegistrations: 0,
                gatePassRequests: 0,
                qrScans: 0
            });
        }
        
    } catch (error) {
        console.error('Error initializing Firebase collections:', error);
    }
}

// Authentication State Handler
function handleAuthStateChange(user) {
    if (user) {
        // User is signed in
        loadUserProfile(user.uid);
    } else {
        // User is signed out
        currentUser = null;
        showPage('welcomePage');
    }
}

// Load User Profile from Firestore
async function loadUserProfile(userId) {
    try {
        showLoadingSpinner(true);
        
        const userDoc = await firebase.getDoc(firebase.doc(db, 'users', userId));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            currentUser = { uid: userId, ...userData };
            
            if (userData.status === 'approved' || SYSTEM_CONFIG.autoApprovalRoles.includes(userData.role)) {
                showNotification(`Welcome back, ${userData.fullName}!`, 'success');
                showDashboard(userData.role);
            } else if (userData.status === 'pending') {
                showNotification('Your account is pending approval. Please wait for admin/warden approval.', 'warning');
                showPage('welcomePage');
                firebase.signOut(auth);
            } else {
                showNotification('Your account has been rejected. Please contact administration.', 'error');
                showPage('welcomePage');
                firebase.signOut(auth);
            }
        } else {
            showNotification('User profile not found. Please register again.', 'error');
            firebase.signOut(auth);
        }
        
        showLoadingSpinner(false);
    } catch (error) {
        console.error('Error loading user profile:', error);
        showNotification('Error loading user profile', 'error');
        showLoadingSpinner(false);
    }
}

// Event Listeners Setup
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Welcome page buttons
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', () => showPage('loginPage'));
    }
    if (registerBtn) {
        registerBtn.addEventListener('click', () => showPage('registerPage'));
    }
    
    // Back buttons
    const loginBackBtn = document.getElementById('loginBackBtn');
    const registerBackBtn = document.getElementById('registerBackBtn');
    
    if (loginBackBtn) {
        loginBackBtn.addEventListener('click', () => showPage('welcomePage'));
    }
    if (registerBackBtn) {
        registerBackBtn.addEventListener('click', () => showPage('welcomePage'));
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Registration navigation
    setupRegistrationNavigation();
    
    // Password toggles
    document.addEventListener('click', function(e) {
        if (e.target.closest('.password-toggle')) {
            const toggle = e.target.closest('.password-toggle');
            const targetId = toggle.getAttribute('data-target');
            if (targetId) {
                togglePassword(targetId);
            }
        }
    });
    
    // Role selection
    document.addEventListener('click', function(e) {
        const roleCard = e.target.closest('.role-card');
        if (roleCard) {
            const role = roleCard.getAttribute('data-role');
            if (role) {
                selectRole(role);
            }
        }
    });
    
    // Action cards
    document.addEventListener('click', function(e) {
        const actionCard = e.target.closest('[data-action]');
        if (actionCard) {
            const action = actionCard.getAttribute('data-action');
            handleDashboardAction(action);
        }
    });
    
    // Logout buttons
    const logoutButtons = [
        'studentLogoutBtn', 'parentLogoutBtn', 'securityLogoutBtn', 
        'wardenLogoutBtn', 'adminLogoutBtn'
    ];
    logoutButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', handleLogout);
        }
    });
    
    // Modal handlers
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalBackdrop = document.querySelector('.modal-backdrop');
    
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeModal);
    }
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', closeModal);
    }
    
    console.log('Event listeners setup complete');
}

// Registration Navigation Setup
function setupRegistrationNavigation() {
    const backToStep1Btn = document.getElementById('backToStep1Btn');
    const proceedToStep3Btn = document.getElementById('proceedToStep3Btn');
    const backToStep2Btn = document.getElementById('backToStep2Btn');
    const copyOTPBtn = document.getElementById('copyOTPBtn');
    const resendOTPBtn = document.getElementById('resendOTPBtn');
    const verifyOTPBtn = document.getElementById('verifyOTPBtn');
    
    if (backToStep1Btn) {
        backToStep1Btn.addEventListener('click', () => showRegisterStep(1));
    }
    if (proceedToStep3Btn) {
        proceedToStep3Btn.addEventListener('click', proceedToStep3);
    }
    if (backToStep2Btn) {
        backToStep2Btn.addEventListener('click', () => showRegisterStep(2));
    }
    if (copyOTPBtn) {
        copyOTPBtn.addEventListener('click', copyOTP);
    }
    if (resendOTPBtn) {
        resendOTPBtn.addEventListener('click', resendOTP);
    }
    if (verifyOTPBtn) {
        verifyOTPBtn.addEventListener('click', verifyOTP);
    }
}

// Page Navigation
function showPage(pageId) {
    console.log('Navigating to page:', pageId);
    
    // Clean up any listeners when leaving pages
    cleanupListeners();
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = pageId;
        
        // Initialize page-specific content
        if (pageId.includes('Dashboard')) {
            initializeDashboard(pageId);
        }
    } else {
        console.error('Page not found:', pageId);
    }
}

// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    console.log('Handling login...');
    
    const role = document.getElementById('loginRole').value;
    const email = document.getElementById('loginCredential').value.toLowerCase().trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!role || !email || !password) {
        showStatusMessage('loginStatus', 'Please fill in all required fields', 'error');
        return;
    }
    
    try {
        showLoadingSpinner(true);
        
        // Sign in with Firebase Auth
        await firebase.signInWithEmailAndPassword(auth, email, password);
        
        // Auth state change handler will take care of the rest
        showLoadingSpinner(false);
        
    } catch (error) {
        showLoadingSpinner(false);
        console.error('Login error:', error);
        
        let errorMessage = 'Login failed. Please check your credentials.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email address.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        }
        
        showStatusMessage('loginStatus', errorMessage, 'error');
    }
}

// Registration System
function selectRole(role) {
    console.log('Selecting role:', role);
    
    // Remove previous selection
    document.querySelectorAll('.role-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select new role
    const selectedCard = document.querySelector(`[data-role="${role}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    registrationData.role = role;
    
    // Auto-proceed after selection
    setTimeout(() => {
        showRegisterStep(2);
        setupRoleSpecificFields(role);
    }, 500);
}

function showRegisterStep(step) {
    console.log('Showing registration step:', step);
    
    // Update progress bar
    document.querySelectorAll('.progress-step').forEach((stepEl, index) => {
        stepEl.classList.remove('active', 'completed');
        if (index + 1 < step) {
            stepEl.classList.add('completed');
        } else if (index + 1 === step) {
            stepEl.classList.add('active');
        }
    });
    
    // Show current step
    document.querySelectorAll('.register-step').forEach(stepEl => {
        stepEl.classList.remove('active');
    });
    
    const targetStep = document.getElementById(`registerStep${step}`);
    if (targetStep) {
        targetStep.classList.add('active');
        currentStep = step;
    }
    
    // Update step title
    if (step === 2) {
        const roleTitle = registrationData.role ? 
            `${registrationData.role.charAt(0).toUpperCase() + registrationData.role.slice(1)} Details` : 
            'Personal Details';
        const titleElement = document.getElementById('step2Title');
        if (titleElement) {
            titleElement.textContent = roleTitle;
        }
    }
}

function setupRoleSpecificFields(role) {
    const container = document.getElementById('roleSpecificFields');
    if (!container) return;
    
    let fieldsHTML = '';
    
    switch(role) {
        case 'student':
            fieldsHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <label for="studentId" class="form-label">
                            <i class="fas fa-id-card"></i> Student ID *
                        </label>
                        <input type="text" id="studentId" class="form-control" placeholder="Enter student ID" required>
                    </div>
                    <div class="form-group">
                        <label for="course" class="form-label">
                            <i class="fas fa-book"></i> Course *
                        </label>
                        <input type="text" id="course" class="form-control" placeholder="e.g., Computer Science" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="year" class="form-label">
                            <i class="fas fa-calendar"></i> Year *
                        </label>
                        <select id="year" class="form-control" required>
                            <option value="">Select year</option>
                            <option value="1">First Year</option>
                            <option value="2">Second Year</option>
                            <option value="3">Third Year</option>
                            <option value="4">Fourth Year</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="roomNumber" class="form-label">
                            <i class="fas fa-bed"></i> Room Number *
                        </label>
                        <input type="text" id="roomNumber" class="form-control" placeholder="e.g., A-101" required>
                    </div>
                </div>
            `;
            break;
            
        case 'parent':
            fieldsHTML = `
                <div class="form-group">
                    <label for="relationship" class="form-label">
                        <i class="fas fa-heart"></i> Relationship *
                    </label>
                    <select id="relationship" class="form-control" required>
                        <option value="">Select relationship</option>
                        <option value="father">Father</option>
                        <option value="mother">Mother</option>
                        <option value="guardian">Guardian</option>
                        <option value="uncle">Uncle</option>
                        <option value="aunt">Aunt</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="occupation" class="form-label">
                        <i class="fas fa-briefcase"></i> Occupation
                    </label>
                    <input type="text" id="occupation" class="form-control" placeholder="Your occupation">
                </div>
                <div class="form-group">
                    <label for="childStudentId" class="form-label">
                        <i class="fas fa-child"></i> Child's Student ID *
                    </label>
                    <input type="text" id="childStudentId" class="form-control" placeholder="Enter child's student ID" required>
                </div>
            `;
            break;
            
        case 'security':
            fieldsHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <label for="securityId" class="form-label">
                            <i class="fas fa-id-badge"></i> Security ID *
                        </label>
                        <input type="text" id="securityId" class="form-control" placeholder="Enter security ID" required>
                    </div>
                    <div class="form-group">
                        <label for="shift" class="form-label">
                            <i class="fas fa-clock"></i> Shift *
                        </label>
                        <select id="shift" class="form-control" required>
                            <option value="">Select shift</option>
                            <option value="morning">Morning (6 AM - 2 PM)</option>
                            <option value="afternoon">Afternoon (2 PM - 10 PM)</option>
                            <option value="night">Night (10 PM - 6 AM)</option>
                        </select>
                    </div>
                </div>
            `;
            break;
            
        case 'warden':
            fieldsHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <label for="employeeId" class="form-label">
                            <i class="fas fa-id-card"></i> Employee ID *
                        </label>
                        <input type="text" id="employeeId" class="form-control" placeholder="Enter employee ID" required>
                    </div>
                    <div class="form-group">
                        <label for="department" class="form-label">
                            <i class="fas fa-building"></i> Department *
                        </label>
                        <input type="text" id="department" class="form-control" placeholder="e.g., Student Affairs" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="designation" class="form-label">
                        <i class="fas fa-user-tie"></i> Designation *
                    </label>
                    <input type="text" id="designation" class="form-control" placeholder="e.g., Senior Warden" required>
                </div>
            `;
            break;
            
        case 'admin':
            fieldsHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <label for="adminId" class="form-label">
                            <i class="fas fa-id-card"></i> Admin ID *
                        </label>
                        <input type="text" id="adminId" class="form-control" placeholder="Enter admin ID" required>
                    </div>
                    <div class="form-group">
                        <label for="accessLevel" class="form-label">
                            <i class="fas fa-key"></i> Access Level *
                        </label>
                        <select id="accessLevel" class="form-control" required>
                            <option value="">Select access level</option>
                            <option value="full">Full Access</option>
                            <option value="limited">Limited Access</option>
                        </select>
                    </div>
                </div>
            `;
            break;
    }
    
    container.innerHTML = fieldsHTML;
}

async function proceedToStep3() {
    // Collect all form data
    const formData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value,
        role: registrationData.role
    };
    
    // Validate required fields
    if (!formData.fullName || !formData.email || !formData.phone || 
        !formData.username || !formData.password || !formData.confirmPassword) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    if (formData.password !== formData.confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    // Collect role-specific data
    const roleSpecificData = collectRoleSpecificData(registrationData.role);
    
    // Store registration data
    registrationData = { ...registrationData, ...formData, ...roleSpecificData };
    
    // Generate OTP
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update UI for step 3
    showRegisterStep(3);
    document.getElementById('phoneDisplay').textContent = formData.phone;
    document.getElementById('otpCode').textContent = generatedOTP;
}

function collectRoleSpecificData(role) {
    const data = {};
    
    switch(role) {
        case 'student':
            data.studentId = document.getElementById('studentId')?.value;
            data.course = document.getElementById('course')?.value;
            data.year = document.getElementById('year')?.value;
            data.roomNumber = document.getElementById('roomNumber')?.value;
            break;
        case 'parent':
            data.relationship = document.getElementById('relationship')?.value;
            data.occupation = document.getElementById('occupation')?.value;
            data.childStudentId = document.getElementById('childStudentId')?.value;
            break;
        case 'security':
            data.securityId = document.getElementById('securityId')?.value;
            data.shift = document.getElementById('shift')?.value;
            break;
        case 'warden':
            data.employeeId = document.getElementById('employeeId')?.value;
            data.department = document.getElementById('department')?.value;
            data.designation = document.getElementById('designation')?.value;
            break;
        case 'admin':
            data.adminId = document.getElementById('adminId')?.value;
            data.accessLevel = document.getElementById('accessLevel')?.value;
            break;
    }
    
    return data;
}

async function verifyOTP() {
    const enteredOTP = document.getElementById('otpInput').value;
    
    if (!enteredOTP) {
        showNotification('Please enter the OTP code', 'error');
        return;
    }
    
    if (enteredOTP !== generatedOTP) {
        showNotification('Invalid OTP code. Please try again.', 'error');
        return;
    }
    
    try {
        showLoadingSpinner(true);
        
        // Create user with Firebase Auth
        const userCredential = await firebase.createUserWithEmailAndPassword(
            auth, 
            registrationData.email, 
            registrationData.password
        );
        
        const user = userCredential.user;
        
        // Save user profile to Firestore
        const userProfile = {
            uid: user.uid,
            fullName: registrationData.fullName,
            email: registrationData.email,
            phone: registrationData.phone,
            username: registrationData.username,
            role: registrationData.role,
            status: SYSTEM_CONFIG.autoApprovalRoles.includes(registrationData.role) ? 'approved' : 'pending',
            createdAt: new Date(),
            lastLogin: null,
            ...collectRoleSpecificData(registrationData.role)
        };
        
        await firebase.setDoc(firebase.doc(db, 'users', user.uid), userProfile);
        
        // Update counters
        await updateUserCounters('increment');
        
        // Log activity
        await logActivity('User registration completed', 'registration', user.uid);
        
        showLoadingSpinner(false);
        
        if (SYSTEM_CONFIG.autoApprovalRoles.includes(registrationData.role)) {
            showNotification('Registration completed successfully! You can now login.', 'success');
            showPage('loginPage');
        } else {
            showNotification('Registration completed! Please wait for admin approval before logging in.', 'success');
            showPage('welcomePage');
        }
        
        // Clear registration data
        registrationData = {};
        generatedOTP = null;
        
    } catch (error) {
        showLoadingSpinner(false);
        console.error('Registration error:', error);
        
        let errorMessage = 'Registration failed. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Email address is already registered.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Please choose a stronger password.';
        }
        
        showNotification(errorMessage, 'error');
    }
}

// Dashboard Management
function showDashboard(role) {
    const dashboardId = `${role}Dashboard`;
    showPage(dashboardId);
}

async function initializeDashboard(dashboardId) {
    if (!currentUser) return;
    
    try {
        // Load dashboard-specific data
        switch(dashboardId) {
            case 'studentDashboard':
                await initializeStudentDashboard();
                break;
            case 'parentDashboard':
                await initializeParentDashboard();
                break;
            case 'securityDashboard':
                await initializeSecurityDashboard();
                break;
            case 'wardenDashboard':
                await initializeWardenDashboard();
                break;
            case 'adminDashboard':
                await initializeAdminDashboard();
                break;
        }
    } catch (error) {
        console.error(`Error initializing ${dashboardId}:`, error);
        showNotification('Error loading dashboard data', 'error');
    }
}

async function initializeStudentDashboard() {
    // Update user info
    document.getElementById('studentName').textContent = `Welcome, ${currentUser.fullName}`;
    document.getElementById('studentInfo').textContent = `${currentUser.course} - Year ${currentUser.year}`;
    
    // Load student-specific data
    await loadStudentGatePasses();
    await loadStudentActivity();
}

async function initializeParentDashboard() {
    document.getElementById('parentName').textContent = `Welcome, ${currentUser.fullName}`;
    document.getElementById('parentInfo').textContent = `Parent of ${currentUser.childStudentId}`;
    
    await loadChildActivity();
    await loadParentNotifications();
}

async function initializeSecurityDashboard() {
    document.getElementById('securityName').textContent = `Welcome, ${currentUser.fullName}`;
    document.getElementById('securityInfo').textContent = `Security - ${currentUser.shift} shift`;
    
    await loadSecurityStats();
    await loadRecentScans();
}

async function initializeWardenDashboard() {
    document.getElementById('wardenName').textContent = `Welcome, ${currentUser.fullName}`;
    document.getElementById('wardenInfo').textContent = `${currentUser.department} - ${currentUser.designation}`;
    
    await loadWardenStats();
    await loadPendingApprovals();
}

async function initializeAdminDashboard() {
    document.getElementById('adminName').textContent = `Welcome, ${currentUser.fullName}`;
    document.getElementById('adminInfo').textContent = 'System Administrator';
    
    await loadSystemStats();
    await loadSystemAlerts();
}

// Data Loading Functions
async function loadStudentGatePasses() {
    try {
        const gatePassesQuery = firebase.query(
            firebase.collection(db, 'gatePassRequests'),
            firebase.where('studentId', '==', currentUser.uid),
            firebase.orderBy('createdAt', 'desc')
        );
        
        const snapshot = await firebase.getDocs(gatePassesQuery);
        const activePasses = snapshot.docs.filter(doc => doc.data().status === 'approved');
        
        document.getElementById('activePassesCount').textContent = activePasses.length;
        
        // Determine current status
        const latestPass = snapshot.docs[0];
        if (latestPass && latestPass.data().status === 'approved') {
            document.getElementById('studentStatusText').textContent = 'Out';
        } else {
            document.getElementById('studentStatusText').textContent = 'In';
        }
        
    } catch (error) {
        console.error('Error loading student gate passes:', error);
    }
}

async function loadStudentActivity() {
    try {
        const activityQuery = firebase.query(
            firebase.collection(db, 'auditLogs'),
            firebase.where('userId', '==', currentUser.uid),
            firebase.orderBy('timestamp', 'desc')
        );
        
        const snapshot = await firebase.getDocs(activityQuery);
        const activityList = document.getElementById('studentRecentActivity');
        
        if (snapshot.empty) {
            activityList.innerHTML = `
                <div class="activity-item">
                    <i class="fas fa-info-circle"></i>
                    <div class="activity-content">
                        <p>No recent activity</p>
                    </div>
                </div>
            `;
        } else {
            activityList.innerHTML = snapshot.docs.slice(0, 5).map(doc => {
                const data = doc.data();
                const time = new Date(data.timestamp.toDate()).toLocaleString();
                return `
                    <div class="activity-item">
                        <i class="fas fa-clock"></i>
                        <div class="activity-content">
                            <p><strong>${data.activity}</strong></p>
                            <p><small>${time}</small></p>
                        </div>
                    </div>
                `;
            }).join('');
        }
        
    } catch (error) {
        console.error('Error loading student activity:', error);
    }
}

async function loadWardenStats() {
    try {
        // Get total students count
        const studentsQuery = firebase.query(
            firebase.collection(db, 'users'),
            firebase.where('role', '==', 'student')
        );
        const studentsSnapshot = await firebase.getDocs(studentsQuery);
        document.getElementById('totalStudentsCount').textContent = studentsSnapshot.size;
        
        // Get pending approvals count
        const pendingQuery = firebase.query(
            firebase.collection(db, 'users'),
            firebase.where('status', '==', 'pending')
        );
        const pendingSnapshot = await firebase.getDocs(pendingQuery);
        document.getElementById('pendingApprovalsCount').textContent = pendingSnapshot.size;
        document.getElementById('pendingRegsBadge').textContent = pendingSnapshot.size;
        
        // Get active gate passes
        const gatePassQuery = firebase.query(
            firebase.collection(db, 'gatePassRequests'),
            firebase.where('status', '==', 'approved')
        );
        const gatePassSnapshot = await firebase.getDocs(gatePassQuery);
        document.getElementById('activeGatePassesCount').textContent = gatePassSnapshot.size;
        document.getElementById('gatePassBadge').textContent = gatePassSnapshot.size;
        
    } catch (error) {
        console.error('Error loading warden stats:', error);
    }
}

async function loadSystemStats() {
    try {
        // Get total users count
        const usersSnapshot = await firebase.getDocs(firebase.collection(db, 'users'));
        document.getElementById('totalUsersCount').textContent = usersSnapshot.size;
        
        // Get approved users count
        const approvedQuery = firebase.query(
            firebase.collection(db, 'users'),
            firebase.where('status', '==', 'approved')
        );
        const approvedSnapshot = await firebase.getDocs(approvedQuery);
        document.getElementById('approvedUsersCount').textContent = approvedSnapshot.size;
        
        // System alerts (placeholder)
        document.getElementById('systemAlertsCount').textContent = '0';
        
    } catch (error) {
        console.error('Error loading system stats:', error);
    }
}

// Dashboard Actions
function handleDashboardAction(action) {
    console.log('Dashboard action:', action);
    
    switch(action) {
        case 'showGatePassRequest':
            showGatePassRequestModal();
            break;
        case 'showQRScanner':
            showQRScannerModal();
            break;
        case 'showFoodSchedule':
            showFoodScheduleModal();
            break;
        case 'showComplaints':
            showComplaintsModal();
            break;
        case 'linkChild':
            showLinkChildModal();
            break;
        case 'showPendingRegistrations':
            showPendingRegistrationsModal();
            break;
        case 'showGatePassRequests':
            showGatePassRequestsModal();
            break;
        case 'showUserManagement':
            showUserManagementModal();
            break;
        case 'showSystemAnalytics':
            showSystemAnalyticsModal();
            break;
        case 'showAuditLog':
            showAuditLogModal();
            break;
        case 'showSystemSettings':
            showSystemSettingsModal();
            break;
        default:
            showNotification('Feature coming soon!', 'info');
    }
}

// Modal Functions
function showGatePassRequestModal() {
    const content = `
        <form id="gatePassForm">
            <div class="form-group">
                <label for="purpose" class="form-label">Purpose of Visit</label>
                <textarea id="purpose" class="form-control" rows="3" placeholder="Describe the purpose of your visit" required></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="fromDate" class="form-label">From Date</label>
                    <input type="datetime-local" id="fromDate" class="form-control" required>
                </div>
                <div class="form-group">
                    <label for="toDate" class="form-label">To Date</label>
                    <input type="datetime-local" id="toDate" class="form-control" required>
                </div>
            </div>
            <div class="form-group">
                <label for="destination" class="form-label">Destination</label>
                <input type="text" id="destination" class="form-control" placeholder="Where are you going?" required>
            </div>
        </form>
    `;
    
    showModal('Gate Pass Request', content, [
        { text: 'Cancel', class: 'btn--outline', action: 'closeModal' },
        { text: 'Submit Request', class: 'btn--primary', action: 'submitGatePassRequest' }
    ]);
}

async function submitGatePassRequest() {
    try {
        const purpose = document.getElementById('purpose').value;
        const fromDate = document.getElementById('fromDate').value;
        const toDate = document.getElementById('toDate').value;
        const destination = document.getElementById('destination').value;
        
        if (!purpose || !fromDate || !toDate || !destination) {
            showNotification('Please fill in all fields', 'error');
            return;
        }
        
        const gatePassRequest = {
            studentId: currentUser.uid,
            studentName: currentUser.fullName,
            purpose,
            fromDate: new Date(fromDate),
            toDate: new Date(toDate),
            destination,
            status: 'pending',
            createdAt: new Date(),
            requestId: generateId()
        };
        
        await firebase.addDoc(firebase.collection(db, 'gatePassRequests'), gatePassRequest);
        
        await logActivity(`Gate pass request submitted: ${purpose}`, 'gate_pass', currentUser.uid);
        
        showNotification('Gate pass request submitted successfully!', 'success');
        closeModal();
        
        // Refresh dashboard
        if (currentUser.role === 'student') {
            await loadStudentGatePasses();
        }
        
    } catch (error) {
        console.error('Error submitting gate pass request:', error);
        showNotification('Error submitting request', 'error');
    }
}

async function showPendingRegistrationsModal() {
  try {
    console.log("showPendingRegistrationsModal called");

    // Query users with status 'pending' without orderBy for simplicity
    const pendingQuery = firebase.query(
      firebase.collection(db, 'users'),
      firebase.where('status', '==', 'pending')
    );

    const snapshot = await firebase.getDocs(pendingQuery);

    console.log("Fetched pending registrations count:", snapshot.size);

    if (snapshot.empty) {
      console.log("No pending registrations found");
      showModal('Pending Registrations', '<p>No pending registrations</p>', [
        { text: 'Close', class: 'btn--primary', action: 'closeModal' }
      ]);
      return;
    }

    // Build the HTML content for pending registrations
    let content = '<div class="pending-registrations">';
    snapshot.docs.forEach(doc => {
      const user = doc.data();
      console.log("Pending user data:", user);
      content += `
        <div class="pending-user">
          <div class="user-info">
            <h4>${user.fullName || 'No Name'}</h4>
            <p>Role: ${user.role || 'Unknown'} | Email: ${user.email || 'No Email'}</p>
            <p>Phone: ${user.phone || 'No Phone'}</p>
          </div>
          <div class="approval-actions">
            <button class="btn btn--primary btn--sm" onclick="approveUser('${doc.id}')">Approve</button>
            <button class="btn btn--outline btn--sm" onclick="rejectUser('${doc.id}')">Reject</button>
          </div>
        </div>
      `;
    });
    content += '</div>';

    showModal('Pending Registrations', content, [
      { text: 'Close', class: 'btn--primary', action: 'closeModal' }
    ]);
  } catch (error) {
    console.error("Error fetching pending registrations:", error);
    showNotification("Error loading pending registrations", "error");
  }
}



// Approval Functions
async function approveUser(userId) {
    try {
        await firebase.updateDoc(firebase.doc(db, 'users', userId), {
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: currentUser.uid
        });
        
        await logActivity(`User approved: ${userId}`, 'approval', currentUser.uid);
        
        showNotification('User approved successfully!', 'success');
        closeModal();
        
        // Refresh stats
        if (currentUser.role === 'warden') {
            await loadWardenStats();
        }
        
    } catch (error) {
        console.error('Error approving user:', error);
        showNotification('Error approving user', 'error');
    }
}

async function rejectUser(userId) {
    try {
        await firebase.updateDoc(firebase.doc(db, 'users', userId), {
            status: 'rejected',
            rejectedAt: new Date(),
            rejectedBy: currentUser.uid
        });
        
        await logActivity(`User rejected: ${userId}`, 'approval', currentUser.uid);
        
        showNotification('User rejected', 'info');
        closeModal();
        
        // Refresh stats
        if (currentUser.role === 'warden') {
            await loadWardenStats();
        }
        
    } catch (error) {
        console.error('Error rejecting user:', error);
        showNotification('Error rejecting user', 'error');
    }
}

// Utility Functions
async function updateUserCounters(operation) {
    try {
        const countersRef = firebase.doc(db, 'system', 'counters');
        const countersDoc = await firebase.getDoc(countersRef);
        
        if (countersDoc.exists()) {
            const data = countersDoc.data();
            const updates = {};
            
            if (operation === 'increment') {
                updates.totalUsers = (data.totalUsers || 0) + 1;
                updates.pendingRegistrations = (data.pendingRegistrations || 0) + 1;
            }
            
            await firebase.updateDoc(countersRef, updates);
        }
    } catch (error) {
        console.error('Error updating counters:', error);
    }
}

async function logActivity(activity, type, userId = null) {
    try {
        const logEntry = {
            activity,
            type,
            userId: userId || (currentUser ? currentUser.uid : 'system'),
            timestamp: new Date(),
            logId: generateId()
        };
        
        await firebase.addDoc(firebase.collection(db, 'auditLogs'), logEntry);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Logout Handler
async function handleLogout() {
    try {
        await firebase.signOut(auth);
        cleanupListeners();
        currentUser = null;
        showPage('welcomePage');
        showNotification('Logged out successfully', 'info');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Error logging out', 'error');
    }
}

// Cleanup Function
function cleanupListeners() {
    unsubscribeListeners.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    unsubscribeListeners = [];
}

// Other utility functions
function copyOTP() {
    if (generatedOTP) {
        navigator.clipboard.writeText(generatedOTP).then(() => {
            showNotification('OTP copied to clipboard!', 'success');
        });
    }
}

function resendOTP() {
    generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    document.getElementById('otpCode').textContent = generatedOTP;
    showNotification('New OTP generated!', 'info');
}

function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const toggle = field.parentNode.querySelector('.password-toggle i');
    
    if (field.type === 'password') {
        field.type = 'text';
        toggle.classList.remove('fa-eye');
        toggle.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        toggle.classList.remove('fa-eye-slash');
        toggle.classList.add('fa-eye');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const icon = document.getElementById('notificationIcon');
    const text = document.getElementById('notificationText');
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    icon.className = icons[type] || icons.info;
    text.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}

function showStatusMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.className = `status-message show ${type}`;
        
        setTimeout(() => {
            element.classList.remove('show');
        }, 5000);
    }
}

function showLoadingSpinner(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        if (show) {
            spinner.classList.remove('hidden');
        } else {
            spinner.classList.add('hidden');
        }
    }
}

function showModal(title, body, buttons) {
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    const modal = document.getElementById('modal');
    
    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.innerHTML = body;
    if (modalFooter) {
        modalFooter.innerHTML = buttons.map(btn => 
            `<button class="btn ${btn.class}" onclick="${btn.action === 'closeModal' ? 'closeModal()' : btn.action + '()'}">${btn.text}</button>`
        ).join('');
    }
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// Placeholder functions for other modals
function showQRScannerModal() {
    showModal('QR Code Scanner', '<p>QR Scanner interface would be implemented here using camera API</p>', [
        { text: 'Close', class: 'btn--primary', action: 'closeModal' }
    ]);
}

function showFoodScheduleModal() {
    const schedule = [
        { meal: 'Breakfast', time: '7:00 AM - 9:00 AM' },
        { meal: 'Lunch', time: '12:00 PM - 2:00 PM' },
        { meal: 'Snacks', time: '4:00 PM - 6:00 PM' },
        { meal: 'Dinner', time: '7:00 PM - 9:00 PM' }
    ];
    
    const content = `
        <div class="food-schedule">
            ${schedule.map(item => `
                <div class="meal-item">
                    <strong>${item.meal}</strong>
                    <span>${item.time}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    showModal('Food Schedule', content, [
        { text: 'Close', class: 'btn--primary', action: 'closeModal' }
    ]);
}

function showComplaintsModal() {
    showModal('Lodge Complaint', '<p>Complaints system coming soon</p>', [
        { text: 'Close', class: 'btn--primary', action: 'closeModal' }
    ]);
}

function showLinkChildModal() {
    showModal('Link Child Account', '<p>Child account linking coming soon</p>', [
        { text: 'Close', class: 'btn--primary', action: 'closeModal' }
    ]);
}

function showGatePassRequestsModal() {
    showModal('Gate Pass Requests', '<p>Loading gate pass requests...</p>', [
        { text: 'Close', class: 'btn--primary', action: 'closeModal' }
    ]);
}

function showUserManagementModal() {
    showModal('User Management', '<p>User management interface coming soon</p>', [
        { text: 'Close', class: 'btn--primary', action: 'closeModal' }
    ]);
}

function showSystemAnalyticsModal() {
    showModal('System Analytics', '<p>Analytics dashboard coming soon</p>', [
        { text: 'Close', class: 'btn--primary', action: 'closeModal' }
    ]);
}

function showAuditLogModal() {
    showModal('Audit Log', '<p>Loading audit logs...</p>', [
        { text: 'Close', class: 'btn--primary', action: 'closeModal' }
    ]);
}

function showSystemSettingsModal() {
    showModal('System Settings', '<p>System configuration coming soon</p>', [
        { text: 'Close', class: 'btn--primary', action: 'closeModal' }
    ]);
}

// Placeholder functions for missing dashboard initializations
async function loadChildActivity() {
    // Placeholder for parent dashboard
}

async function loadParentNotifications() {
    // Placeholder for parent dashboard
}

async function loadSecurityStats() {
    // Placeholder for security dashboard
}

async function loadRecentScans() {
    // Placeholder for security dashboard
}

async function loadPendingApprovals() {
    // Placeholder for warden dashboard
}

async function loadSystemAlerts() {
    // Placeholder for admin dashboard
}

// Global functions for modal actions
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.submitGatePassRequest = submitGatePassRequest;
window.closeModal = closeModal;
