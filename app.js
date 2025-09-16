// Gate Pass Management System - Complete Firebase Integration
// Updated to match existing database structure

let currentUser = null;
let currentUserData = null;

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    const notificationIcon = document.getElementById('notificationIcon');
    
    notificationText.textContent = message;
    
    // Update icon based on type
    const iconClasses = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notificationIcon.className = iconClasses[type] || iconClasses.info;
    notification.className = `notification notification--${type}`;
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 5000);
}

function showLoading() {
    document.getElementById('loadingSpinner').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.add('hidden');
}

function showModal(title, content, buttons = []) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    
    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    
    // Generate buttons
    let buttonsHTML = '';
    buttons.forEach(button => {
        buttonsHTML += `<button class="btn ${button.class}" onclick="${button.action}()">${button.text}</button>`;
    });
    modalFooter.innerHTML = buttonsHTML;
    
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// Authentication Functions
firebase.onAuthStateChanged(firebase.auth, (user) => {
    if (user) {
        currentUser = user;
        loadUserData();
    } else {
        currentUser = null;
        currentUserData = null;
        switchPage('welcomePage');
    }
});

async function loadUserData() {
    if (!currentUser) return;
    
    try {
        const userDoc = await firebase.getDoc(firebase.doc(firebase.db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            currentUserData = { id: userDoc.id, ...userDoc.data() };
            
            if (currentUserData.status === 'approved') {
                redirectToDashboard();
            } else if (currentUserData.status === 'pending') {
                showNotification('Your account is pending approval', 'warning');
                logout();
            } else {
                showNotification('Your account has been rejected', 'error');
                logout();
            }
        } else {
            showNotification('User data not found', 'error');
            logout();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Error loading user data', 'error');
        logout();
    }
}

function redirectToDashboard() {
    if (!currentUserData) return;
    
    switch (currentUserData.role) {
        case 'student':
            loadStudentDashboard();
            break;
        case 'parent':
            loadParentDashboard();
            break;
        case 'security':
            loadSecurityDashboard();
            break;
        case 'warden':
            loadWardenDashboard();
            break;
        case 'admin':
            loadAdminDashboard();
            break;
        default:
            showNotification('Invalid user role', 'error');
            logout();
    }
}

async function logout() {
    try {
        await firebase.signOut(firebase.auth);
        currentUser = null;
        currentUserData = null;
        switchPage('welcomePage');
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Error logging out:', error);
        showNotification('Error logging out', 'error');
    }
}

// Registration Functions
let selectedRole = null;
let registrationData = {};
let currentStep = 1;

function selectRole(role) {
    selectedRole = role;
    document.querySelectorAll('.role-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-role="${role}"]`).classList.add('selected');
    
    setTimeout(() => {
        nextStep();
    }, 500);
}

function nextStep() {
    if (currentStep === 1) {
        if (!selectedRole) {
            showNotification('Please select a role', 'warning');
            return;
        }
        showStep(2);
        setupRoleSpecificFields();
    } else if (currentStep === 2) {
        if (validateStep2()) {
            collectFormData();
            generateOTP();
            showStep(3);
        }
    }
}

function prevStep() {
    if (currentStep === 2) {
        showStep(1);
    } else if (currentStep === 3) {
        showStep(2);
    }
}

function showStep(step) {
    document.querySelectorAll('.register-step').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.progress-step').forEach(s => s.classList.remove('active'));
    
    document.getElementById(`registerStep${step}`).classList.add('active');
    for (let i = 1; i <= step; i++) {
        document.querySelector(`.progress-step:nth-child(${i})`).classList.add('active');
    }
    
    currentStep = step;
}

function setupRoleSpecificFields() {
    const fieldsContainer = document.getElementById('roleSpecificFields');
    let fieldsHTML = '';
    
    switch (selectedRole) {
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
                        <label for="roomNumber" class="form-label">
                            <i class="fas fa-bed"></i> Room Number *
                        </label>
                        <input type="text" id="roomNumber" class="form-control" placeholder="Enter room number" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="course" class="form-label">
                            <i class="fas fa-graduation-cap"></i> Course *
                        </label>
                        <input type="text" id="course" class="form-control" placeholder="Enter course" required>
                    </div>
                    <div class="form-group">
                        <label for="year" class="form-label">
                            <i class="fas fa-calendar"></i> Year *
                        </label>
                        <select id="year" class="form-control" required>
                            <option value="">Select year</option>
                            <option value="1">1st Year</option>
                            <option value="2">2nd Year</option>
                            <option value="3">3rd Year</option>
                            <option value="4">4th Year</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="parentContact" class="form-label">
                        <i class="fas fa-phone"></i> Parent Contact *
                    </label>
                    <input type="tel" id="parentContact" class="form-control" placeholder="Enter parent phone number" required>
                </div>
            `;
            break;
        case 'parent':
            fieldsHTML = `
                <div class="form-group">
                    <label for="childStudentId" class="form-label">
                        <i class="fas fa-child"></i> Child's Student ID *
                    </label>
                    <input type="text" id="childStudentId" class="form-control" placeholder="Enter your child's student ID" required>
                </div>
                <div class="form-group">
                    <label for="relationship" class="form-label">
                        <i class="fas fa-users"></i> Relationship *
                    </label>
                    <select id="relationship" class="form-control" required>
                        <option value="">Select relationship</option>
                        <option value="father">Father</option>
                        <option value="mother">Mother</option>
                        <option value="guardian">Guardian</option>
                    </select>
                </div>
            `;
            break;
        case 'security':
            fieldsHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <label for="employeeId" class="form-label">
                            <i class="fas fa-id-badge"></i> Employee ID *
                        </label>
                        <input type="text" id="employeeId" class="form-control" placeholder="Enter employee ID" required>
                    </div>
                    <div class="form-group">
                        <label for="shift" class="form-label">
                            <i class="fas fa-clock"></i> Shift *
                        </label>
                        <select id="shift" class="form-control" required>
                            <option value="">Select shift</option>
                            <option value="morning">Morning (6 AM - 2 PM)</option>
                            <option value="evening">Evening (2 PM - 10 PM)</option>
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
                            <i class="fas fa-id-badge"></i> Employee ID *
                        </label>
                        <input type="text" id="employeeId" class="form-control" placeholder="Enter employee ID" required>
                    </div>
                    <div class="form-group">
                        <label for="department" class="form-label">
                            <i class="fas fa-building"></i> Department *
                        </label>
                        <input type="text" id="department" class="form-control" placeholder="Enter department" required>
                    </div>
                </div>
            `;
            break;
        case 'admin':
            fieldsHTML = `
                <div class="form-group">
                    <label for="adminCode" class="form-label">
                        <i class="fas fa-key"></i> Admin Access Code *
                    </label>
                    <input type="password" id="adminCode" class="form-control" placeholder="Enter admin access code" required>
                </div>
            `;
            break;
    }
    
    fieldsContainer.innerHTML = fieldsHTML;
}

function validateStep2() {
    const requiredFields = ['fullName', 'email', 'phone', 'username', 'password', 'confirmPassword'];
    let isValid = true;
    
    requiredFields.forEach(field => {
        const element = document.getElementById(field);
        if (!element.value.trim()) {
            isValid = false;
            element.classList.add('error');
        } else {
            element.classList.remove('error');
        }
    });
    
    // Password validation
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (password !== confirmPassword) {
        isValid = false;
        document.getElementById('confirmPassword').classList.add('error');
        showNotification('Passwords do not match', 'error');
    }
    
    if (password.length < 6) {
        isValid = false;
        document.getElementById('password').classList.add('error');
        showNotification('Password must be at least 6 characters', 'error');
    }
    
    // Validate role-specific fields
    const roleSpecificInputs = document.querySelectorAll('#roleSpecificFields input, #roleSpecificFields select');
    roleSpecificInputs.forEach(input => {
        if (input.hasAttribute('required') && !input.value.trim()) {
            isValid = false;
            input.classList.add('error');
        } else {
            input.classList.remove('error');
        }
    });
    
    return isValid;
}

function collectFormData() {
    registrationData = {
        role: selectedRole,
        fullName: document.getElementById('fullName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        username: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value,
        status: 'pending',
        createdAt: new Date().toISOString(),
        lastLogin: null
    };
    
    // Add role-specific data
    const roleSpecificInputs = document.querySelectorAll('#roleSpecificFields input, #roleSpecificFields select');
    roleSpecificInputs.forEach(input => {
        if (input.value.trim()) {
            registrationData[input.id] = input.value.trim();
        }
    });
}

function generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    registrationData.otp = otp;
    
    document.getElementById('phoneDisplay').textContent = registrationData.phone;
    document.getElementById('otpCode').textContent = otp;
}

async function verifyOTPAndRegister() {
    const enteredOTP = document.getElementById('otpInput').value.trim();
    
    if (!enteredOTP) {
        showNotification('Please enter OTP', 'warning');
        return;
    }
    
    if (enteredOTP !== registrationData.otp) {
        showNotification('Invalid OTP', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Create Firebase Auth user
        const userCredential = await firebase.createUserWithEmailAndPassword(
            firebase.auth,
            registrationData.email,
            registrationData.password
        );
        
        const user = userCredential.user;
        
        // Remove password from data before saving
        const { password, otp, ...userData } = registrationData;
        userData.uid = user.uid;
        
        // Save user data to Firestore
        await firebase.setDoc(firebase.doc(firebase.db, 'users', user.uid), userData);
        
        hideLoading();
        showNotification('Registration successful! Please wait for approval.', 'success');
        
        // Auto logout to prevent access before approval
        await firebase.signOut(firebase.auth);
        
        setTimeout(() => {
            switchPage('welcomePage');
        }, 2000);
        
    } catch (error) {
        hideLoading();
        console.error('Registration error:', error);
        showNotification(error.message || 'Registration failed', 'error');
    }
}

// Login Functions
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginCredential').value.trim();
    const password = document.getElementById('loginPassword').value;
    const role = document.getElementById('loginRole').value;
    
    if (!email || !password || !role) {
        showNotification('Please fill all fields', 'warning');
        return;
    }
    
    try {
        showLoading();
        
        const userCredential = await firebase.signInWithEmailAndPassword(firebase.auth, email, password);
        const user = userCredential.user;
        
        // Verify user role
        const userDoc = await firebase.getDoc(firebase.doc(firebase.db, 'users', user.uid));
        if (!userDoc.exists()) {
            throw new Error('User data not found');
        }
        
        const userData = userDoc.data();
        if (userData.role !== role) {
            throw new Error('Invalid role selected');
        }
        
        if (userData.status !== 'approved') {
            await firebase.signOut(firebase.auth);
            throw new Error('Account not approved yet');
        }
        
        // Update last login
        await firebase.updateDoc(firebase.doc(firebase.db, 'users', user.uid), {
            lastLogin: new Date().toISOString()
        });
        
        hideLoading();
        showNotification('Login successful!', 'success');
        
    } catch (error) {
        hideLoading();
        console.error('Login error:', error);
        showNotification(error.message || 'Login failed', 'error');
        
        if (firebase.auth.currentUser) {
            await firebase.signOut(firebase.auth);
        }
    }
}

// Dashboard Functions
function loadStudentDashboard() {
    switchPage('studentDashboard');
    document.getElementById('studentName').textContent = `Welcome, ${currentUserData.fullName}`;
    document.getElementById('studentInfo').textContent = `${currentUserData.course} - Year ${currentUserData.year} | Room ${currentUserData.roomNumber}`;
    
    loadStudentData();
    setupStudentListeners();
}

function loadParentDashboard() {
    switchPage('parentDashboard');
    document.getElementById('parentName').textContent = `Welcome, ${currentUserData.fullName}`;
    document.getElementById('parentInfo').textContent = `Parent Dashboard`;
    
    loadParentData();
}

function loadSecurityDashboard() {
    switchPage('securityDashboard');
    document.getElementById('securityName').textContent = `Welcome, ${currentUserData.fullName}`;
    document.getElementById('securityInfo').textContent = `Security - ${currentUserData.shift} Shift`;
    
    loadSecurityData();
}

function loadWardenDashboard() {
    switchPage('wardenDashboard');
    document.getElementById('wardenName').textContent = `Welcome, ${currentUserData.fullName}`;
    document.getElementById('wardenInfo').textContent = `Warden - ${currentUserData.department}`;
    
    loadWardenData();
    setupWardenListeners();
}

function loadAdminDashboard() {
    switchPage('adminDashboard');
    document.getElementById('adminName').textContent = `Welcome, ${currentUserData.fullName}`;
    document.getElementById('adminInfo').textContent = `System Administrator`;
    
    loadAdminData();
}

// Student Dashboard Functions
async function loadStudentData() {
    try {
        // Load active gate passes from YOUR existing collection 'gatepassrequest'
        const gatePassQuery = firebase.query(
            firebase.collection(firebase.db, 'gatepassrequest'),
            firebase.where('studentId', '==', currentUser.uid),
            firebase.where('status', 'in', ['pending', 'approved'])
        );
        
        const snapshot = await firebase.getDocs(gatePassQuery);
        document.getElementById('activePassesCount').textContent = snapshot.size;
        
        // Load current status
        const statusDoc = await firebase.getDoc(firebase.doc(firebase.db, 'studentStatus', currentUser.uid));
        const status = statusDoc.exists() ? statusDoc.data().status : 'In Hostel';
        document.getElementById('studentStatusText').textContent = status;
        
        // Load recent activity
        loadStudentActivity();
        
    } catch (error) {
        console.error('Error loading student data:', error);
    }
}

function setupStudentListeners() {
    // Real-time listener for gate pass updates from YOUR existing collection
    const gatePassQuery = firebase.query(
        firebase.collection(firebase.db, 'gatepassrequest'),
        firebase.where('studentId', '==', currentUser.uid)
    );
    
    firebase.onSnapshot(gatePassQuery, (snapshot) => {
        loadStudentActivity();
        
        // Update active passes count
        const activeCount = snapshot.docs.filter(doc => 
            ['pending', 'approved'].includes(doc.data().status)
        ).length;
        document.getElementById('activePassesCount').textContent = activeCount;
    });
}

async function loadStudentActivity() {
    try {
        const gatePassQuery = firebase.query(
            firebase.collection(firebase.db, 'gatepassrequest'),
            firebase.where('studentId', '==', currentUser.uid)
        );
        
        const snapshot = await firebase.getDocs(gatePassQuery);
        const activityContainer = document.getElementById('studentRecentActivity');
        
        if (snapshot.empty) {
            activityContainer.innerHTML = `
                <div class="activity-item">
                    <i class="fas fa-info-circle"></i>
                    <div class="activity-content">
                        <p>No recent activity</p>
                    </div>
                </div>
            `;
            return;
        }
        
        let html = '';
        // Sort by creation date
        const sortedDocs = snapshot.docs.sort((a, b) => {
            const aTime = a.data().createdAt || a.data().timestamp || '0';
            const bTime = b.data().createdAt || b.data().timestamp || '0';
            return new Date(bTime) - new Date(aTime);
        }).slice(0, 5);
        
        sortedDocs.forEach(doc => {
            const data = doc.data();
            const date = new Date(data.createdAt || data.timestamp || Date.now()).toLocaleDateString();
            const statusIcon = {
                pending: 'fas fa-clock',
                approved: 'fas fa-check-circle',
                rejected: 'fas fa-times-circle',
                used: 'fas fa-door-open'
            };
            
            html += `
                <div class="activity-item">
                    <i class="${statusIcon[data.status] || 'fas fa-clock'}"></i>
                    <div class="activity-content">
                        <p><strong>Gate Pass ${data.status || 'pending'}</strong></p>
                        <p>Reason: ${data.reason || 'N/A'}</p>
                        <p>Date: ${date}</p>
                    </div>
                </div>
            `;
        });
        
        activityContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading student activity:', error);
    }
}

// Warden Dashboard Functions
async function loadWardenData() {
    try {
        // Load total students
        const studentsQuery = firebase.query(
            firebase.collection(firebase.db, 'users'),
            firebase.where('role', '==', 'student'),
            firebase.where('status', '==', 'approved')
        );
        const studentsSnapshot = await firebase.getDocs(studentsQuery);
        document.getElementById('totalStudentsCount').textContent = studentsSnapshot.size;
        
        // Load pending approvals
        const pendingQuery = firebase.query(
            firebase.collection(firebase.db, 'users'),
            firebase.where('status', '==', 'pending')
        );
        const pendingSnapshot = await firebase.getDocs(pendingQuery);
        document.getElementById('pendingApprovalsCount').textContent = pendingSnapshot.size;
        document.getElementById('pendingRegsBadge').textContent = pendingSnapshot.size;
        
        // Load active gate passes from YOUR existing collection
        const activePassesQuery = firebase.query(
            firebase.collection(firebase.db, 'gatepassrequest'),
            firebase.where('status', 'in', ['pending', 'approved'])
        );
        const activePassesSnapshot = await firebase.getDocs(activePassesQuery);
        document.getElementById('activeGatePassesCount').textContent = activePassesSnapshot.size;
        
        // Count pending gate passes
        const pendingGatePassCount = activePassesSnapshot.docs.filter(doc => 
            doc.data().status === 'pending'
        ).length;
        document.getElementById('gatePassBadge').textContent = pendingGatePassCount;
        
    } catch (error) {
        console.error('Error loading warden data:', error);
    }
}

function setupWardenListeners() {
    // Real-time listener for pending registrations
    const pendingQuery = firebase.query(
        firebase.collection(firebase.db, 'users'),
        firebase.where('status', '==', 'pending')
    );
    
    firebase.onSnapshot(pendingQuery, (snapshot) => {
        document.getElementById('pendingApprovalsCount').textContent = snapshot.size;
        document.getElementById('pendingRegsBadge').textContent = snapshot.size;
    });
    
    // Real-time listener for gate pass requests from YOUR existing collection
    const gatePassQuery = firebase.query(
        firebase.collection(firebase.db, 'gatepassrequest'),
        firebase.where('status', '==', 'pending')
    );
    
    firebase.onSnapshot(gatePassQuery, (snapshot) => {
        document.getElementById('gatePassBadge').textContent = snapshot.size;
    });
}

async function showPendingRegistrationsModal() {
    try {
        console.log("Loading pending registrations...");
        
        const pendingQuery = firebase.query(
            firebase.collection(firebase.db, 'users'),
            firebase.where('status', '==', 'pending')
        );
        
        const snapshot = await firebase.getDocs(pendingQuery);
        console.log("Found pending registrations:", snapshot.size);
        
        if (snapshot.empty) {
            showModal('Pending Registrations', '<p>No pending registrations</p>', [
                { text: 'Close', class: 'btn--primary', action: 'closeModal' }
            ]);
            return;
        }
        
        let content = '<div class="pending-registrations">';
        snapshot.docs.forEach(doc => {
            const user = doc.data();
            content += `
                <div class="pending-user" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
                    <div class="user-info">
                        <h4>${user.fullName}</h4>
                        <p><strong>Role:</strong> ${user.role} | <strong>Email:</strong> ${user.email}</p>
                        <p><strong>Phone:</strong> ${user.phone} | <strong>Username:</strong> ${user.username}</p>
                        ${user.studentId ? `<p><strong>Student ID:</strong> ${user.studentId} | <strong>Room:</strong> ${user.roomNumber}</p>` : ''}
                        ${user.course ? `<p><strong>Course:</strong> ${user.course} | <strong>Year:</strong> ${user.year}</p>` : ''}
                        <p><strong>Registered:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="approval-actions" style="margin-top: 10px;">
                        <button class="btn btn--primary btn--sm" onclick="approveUser('${doc.id}')">Approve</button>
                        <button class="btn btn--outline btn--sm" onclick="rejectUser('${doc.id}')" style="margin-left: 10px;">Reject</button>
                    </div>
                </div>
            `;
        });
        content += '</div>';
        
        showModal('Pending Registrations', content, [
            { text: 'Close', class: 'btn--primary', action: 'closeModal' }
        ]);
        
    } catch (error) {
        console.error('Error loading pending registrations:', error);
        showNotification('Error loading pending registrations', 'error');
    }
}

async function showGatePassRequestsModal() {
    try {
        console.log("Loading gate pass requests from gatepassrequest collection...");
        
        // Query YOUR existing collection 'gatepassrequest'
        const requestsQuery = firebase.query(
            firebase.collection(firebase.db, 'gatepassrequest'),
            firebase.where('status', '==', 'pending')
        );
        
        const snapshot = await firebase.getDocs(requestsQuery);
        console.log("Found gate pass requests:", snapshot.size);
        
        if (snapshot.empty) {
            showModal('Gate Pass Requests', '<p>No pending gate pass requests</p>', [
                { text: 'Close', class: 'btn--primary', action: 'closeModal' }
            ]);
            return;
        }
        
        let content = '<div class="gate-pass-requests">';
        
        for (const doc of snapshot.docs) {
            const request = doc.data();
            console.log("Processing gate pass request:", request);
            
            // Get student info
            let studentInfo = 'Unknown Student';
            try {
                if (request.studentId) {
                    const studentDoc = await firebase.getDoc(firebase.doc(firebase.db, 'users', request.studentId));
                    if (studentDoc.exists()) {
                        const student = studentDoc.data();
                        studentInfo = `${student.fullName} (${student.studentId}) - Room ${student.roomNumber}`;
                    }
                }
            } catch (error) {
                console.error('Error loading student info:', error);
            }
            
            const createdDate = request.createdAt || request.timestamp || 'Unknown date';
            const exitTime = request.exitTime || request.exitDateTime || 'Not specified';
            const returnTime = request.returnTime || request.returnDateTime || 'Not specified';
            
            content += `
                <div class="gate-pass-request" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px;">
                    <div class="request-info">
                        <h4>Gate Pass Request</h4>
                        <p><strong>Student:</strong> ${studentInfo}</p>
                        <p><strong>Reason:</strong> ${request.reason || 'Not provided'}</p>
                        <p><strong>Going to:</strong> ${request.destination || 'Not specified'}</p>
                        <p><strong>Exit Time:</strong> ${new Date(exitTime).toLocaleString()}</p>
                        <p><strong>Expected Return:</strong> ${new Date(returnTime).toLocaleString()}</p>
                        <p><strong>Requested:</strong> ${new Date(createdDate).toLocaleString()}</p>
                    </div>
                    <div class="approval-actions" style="margin-top: 10px;">
                        <button class="btn btn--primary btn--sm" onclick="approveGatePass('${doc.id}')">Approve</button>
                        <button class="btn btn--outline btn--sm" onclick="rejectGatePass('${doc.id}')" style="margin-left: 10px;">Reject</button>
                    </div>
                </div>
            `;
        }
        content += '</div>';
        
        showModal('Gate Pass Requests', content, [
            { text: 'Close', class: 'btn--primary', action: 'closeModal' }
        ]);
        
    } catch (error) {
        console.error('Error loading gate pass requests:', error);
        showNotification('Error loading gate pass requests: ' + error.message, 'error');
    }
}

async function approveUser(userId) {
    try {
        await firebase.updateDoc(firebase.doc(firebase.db, 'users', userId), {
            status: 'approved',
            approvedAt: new Date().toISOString(),
            approvedBy: currentUser.uid
        });
        
        showNotification('User approved successfully', 'success');
        closeModal();
        loadWardenData();
    } catch (error) {
        console.error('Error approving user:', error);
        showNotification('Error approving user', 'error');
    }
}

async function rejectUser(userId) {
    try {
        await firebase.updateDoc(firebase.doc(firebase.db, 'users', userId), {
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectedBy: currentUser.uid
        });
        
        showNotification('User rejected', 'success');
        closeModal();
        loadWardenData();
    } catch (error) {
        console.error('Error rejecting user:', error);
        showNotification('Error rejecting user', 'error');
    }
}

async function approveGatePass(requestId) {
    try {
        // Update in YOUR existing collection 'gatepassrequest'
        await firebase.updateDoc(firebase.doc(firebase.db, 'gatepassrequest', requestId), {
            status: 'approved',
            approvedAt: new Date().toISOString(),
            approvedBy: currentUser.uid
        });
        
        showNotification('Gate pass approved successfully', 'success');
        closeModal();
        loadWardenData();
    } catch (error) {
        console.error('Error approving gate pass:', error);
        showNotification('Error approving gate pass', 'error');
    }
}

async function rejectGatePass(requestId) {
    try {
        // Update in YOUR existing collection 'gatepassrequest'
        await firebase.updateDoc(firebase.doc(firebase.db, 'gatepassrequest', requestId), {
            status: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectedBy: currentUser.uid
        });
        
        showNotification('Gate pass rejected', 'success');
        closeModal();
        loadWardenData();
    } catch (error) {
        console.error('Error rejecting gate pass:', error);
        showNotification('Error rejecting gate pass', 'error');
    }
}

// Gate Pass Request Functions
function showGatePassRequestModal() {
    const content = `
        <div class="gate-pass-form">
            <form id="gatePassForm">
                <div class="form-group">
                    <label for="gatePassReason" class="form-label">
                        <i class="fas fa-comment"></i> Reason for Exit *
                    </label>
                    <select id="gatePassReason" class="form-control" required>
                        <option value="">Select reason</option>
                        <option value="medical">Medical Emergency</option>
                        <option value="family">Family Visit</option>
                        <option value="shopping">Shopping</option>
                        <option value="academic">Academic Work</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                
                <div class="form-group" id="otherReasonGroup" style="display: none;">
                    <label for="otherReason" class="form-label">
                        <i class="fas fa-edit"></i> Specify Other Reason *
                    </label>
                    <input type="text" id="otherReason" class="form-control" placeholder="Enter specific reason">
                </div>
                
                <div class="form-group">
                    <label for="destination" class="form-label">
                        <i class="fas fa-map-marker-alt"></i> Destination *
                    </label>
                    <input type="text" id="destination" class="form-control" placeholder="Where are you going?" required>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="exitDateTime" class="form-label">
                            <i class="fas fa-calendar-plus"></i> Exit Date & Time *
                        </label>
                        <input type="datetime-local" id="exitDateTime" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label for="returnDateTime" class="form-label">
                            <i class="fas fa-calendar-check"></i> Expected Return *
                        </label>
                        <input type="datetime-local" id="returnDateTime" class="form-control" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="contactPerson" class="form-label">
                        <i class="fas fa-user-friends"></i> Emergency Contact
                    </label>
                    <input type="text" id="contactPerson" class="form-control" placeholder="Name and phone of person to contact">
                </div>
                
                <button type="submit" class="btn btn--primary btn--full-width">
                    <i class="fas fa-paper-plane"></i> Submit Gate Pass Request
                </button>
            </form>
        </div>
    `;
    
    showModal('Request Gate Pass', content, [
        { text: 'Cancel', class: 'btn--outline', action: 'closeModal' }
    ]);
    
    // Handle reason change
    document.getElementById('gatePassReason').addEventListener('change', function() {
        const otherReasonGroup = document.getElementById('otherReasonGroup');
        if (this.value === 'other') {
            otherReasonGroup.style.display = 'block';
            document.getElementById('otherReason').required = true;
        } else {
            otherReasonGroup.style.display = 'none';
            document.getElementById('otherReason').required = false;
        }
    });
    
    // Handle form submission
    document.getElementById('gatePassForm').addEventListener('submit', submitGatePassRequest);
}

async function submitGatePassRequest(event) {
    event.preventDefault();
    
    const reason = document.getElementById('gatePassReason').value;
    const otherReason = document.getElementById('otherReason').value;
    const destination = document.getElementById('destination').value;
    const exitDateTime = document.getElementById('exitDateTime').value;
    const returnDateTime = document.getElementById('returnDateTime').value;
    const contactPerson = document.getElementById('contactPerson').value;
    
    if (!reason || !destination || !exitDateTime || !returnDateTime) {
        showNotification('Please fill all required fields', 'warning');
        return;
    }
    
    if (reason === 'other' && !otherReason) {
        showNotification('Please specify the reason', 'warning');
        return;
    }
    
    try {
        showLoading();
        
        const requestData = {
            studentId: currentUser.uid,
            reason: reason === 'other' ? otherReason : reason,
            destination: destination,
            exitTime: exitDateTime,
            returnTime: returnDateTime,
            contactPerson: contactPerson,
            status: 'pending',
            createdAt: new Date().toISOString(),
            timestamp: new Date().toISOString() // Added for compatibility
        };
        
        // Save to YOUR existing collection 'gatepassrequest'
        await firebase.addDoc(firebase.collection(firebase.db, 'gatepassrequest'), requestData);
        
        hideLoading();
        showNotification('Gate pass request submitted successfully!', 'success');
        closeModal();
        loadStudentData();
        
    } catch (error) {
        hideLoading();
        console.error('Error submitting gate pass request:', error);
        showNotification('Error submitting request', 'error');
    }
}

// QR Code Functions
function showQRScannerModal() {
    const content = `
        <div class="qr-scanner">
            <div class="qr-info">
                <i class="fas fa-qrcode"></i>
                <h3>Scan QR Code</h3>
                <p>Scan the security QR code to log your entry/exit</p>
            </div>
            
            <div class="manual-entry">
                <h4>Or enter code manually:</h4>
                <input type="text" id="qrCodeInput" class="form-control" placeholder="Enter QR code" style="margin-bottom: 10px;">
                <button onclick="processQRCode()" class="btn btn--primary btn--full-width">
                    <i class="fas fa-sign-in-alt"></i> Log Entry/Exit
                </button>
            </div>
            
            <div class="qr-status" id="qrStatus" style="margin-top: 15px;"></div>
        </div>
    `;
    
    showModal('QR Code Scanner', content, [
        { text: 'Close', class: 'btn--outline', action: 'closeModal' }
    ]);
}

async function processQRCode() {
    const qrCode = document.getElementById('qrCodeInput').value.trim();
    
    if (!qrCode) {
        showNotification('Please enter QR code', 'warning');
        return;
    }
    
    if (!qrCode.startsWith('GP-SEC-')) {
        showNotification('Invalid QR code format', 'error');
        return;
    }
    
    try {
        // Get current student status
        const statusDoc = await firebase.getDoc(firebase.doc(firebase.db, 'studentStatus', currentUser.uid));
        const currentStatus = statusDoc.exists() ? statusDoc.data().status : 'In Hostel';
        
        const newStatus = currentStatus === 'In Hostel' ? 'Out of Hostel' : 'In Hostel';
        const action = newStatus === 'Out of Hostel' ? 'exit' : 'entry';
        
        // Update status
        await firebase.setDoc(firebase.doc(firebase.db, 'studentStatus', currentUser.uid), {
            status: newStatus,
            lastUpdated: new Date().toISOString(),
            qrCode: qrCode
        });
        
        // Log the scan
        await firebase.addDoc(firebase.collection(firebase.db, 'scanLogs'), {
            studentId: currentUser.uid,
            action: action,
            qrCode: qrCode,
            timestamp: new Date().toISOString(),
            status: newStatus
        });
        
        document.getElementById('qrStatus').innerHTML = `
            <div style="text-align: center; color: green;">
                <i class="fas fa-check-circle" style="font-size: 2em; margin-bottom: 10px;"></i>
                <p><strong>${action.toUpperCase()} LOGGED</strong></p>
                <p>Status: ${newStatus}</p>
                <p>Time: ${new Date().toLocaleString()}</p>
            </div>
        `;
        
        showNotification(`${action} logged successfully!`, 'success');
        
        // Update dashboard
        document.getElementById('studentStatusText').textContent = newStatus;
        
    } catch (error) {
        console.error('Error processing QR code:', error);
        showNotification('Error processing QR code', 'error');
    }
}

// Admin Dashboard Functions
async function loadAdminData() {
    try {
        // Load total users
        const usersSnapshot = await firebase.getDocs(firebase.collection(firebase.db, 'users'));
        document.getElementById('totalUsersCount').textContent = usersSnapshot.size;
        
        // Load approved users
        const approvedQuery = firebase.query(
            firebase.collection(firebase.db, 'users'),
            firebase.where('status', '==', 'approved')
        );
        const approvedSnapshot = await firebase.getDocs(approvedQuery);
        document.getElementById('approvedUsersCount').textContent = approvedSnapshot.size;
        
        // System alerts (placeholder)
        document.getElementById('systemAlertsCount').textContent = '0';
        
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

// Security Dashboard Functions
async function loadSecurityData() {
    try {
        // Load today's scans
        const today = new Date().toISOString().split('T')[0];
        const scansQuery = firebase.query(
            firebase.collection(firebase.db, 'scanLogs'),
            firebase.where('timestamp', '>=', today + 'T00:00:00.000Z'),
            firebase.where('timestamp', '<', today + 'T23:59:59.999Z')
        );
        const scansSnapshot = await firebase.getDocs(scansQuery);
        document.getElementById('todayScans').textContent = scansSnapshot.size;
        
        // Load students currently out
        const statusQuery = firebase.query(
            firebase.collection(firebase.db, 'studentStatus'),
            firebase.where('status', '==', 'Out of Hostel')
        );
        const statusSnapshot = await firebase.getDocs(statusQuery);
        document.getElementById('studentsOut').textContent = statusSnapshot.size;
        
        // Load recent scans
        loadRecentScans();
        
    } catch (error) {
        console.error('Error loading security data:', error);
    }
}

async function loadRecentScans() {
    try {
        const scansQuery = firebase.query(
            firebase.collection(firebase.db, 'scanLogs'),
            firebase.limit(5)
        );
        
        const snapshot = await firebase.getDocs(scansQuery);
        const scansContainer = document.getElementById('recentScans');
        
        if (snapshot.empty) {
            scansContainer.innerHTML = `
                <div class="scan-item">
                    <i class="fas fa-info-circle"></i>
                    <div class="scan-content">
                        <p>No recent scans</p>
                    </div>
                </div>
            `;
            return;
        }
        
        let html = '';
        // Sort by timestamp
        const sortedDocs = snapshot.docs.sort((a, b) => {
            const aTime = a.data().timestamp || '0';
            const bTime = b.data().timestamp || '0';
            return new Date(bTime) - new Date(aTime);
        });
        
        for (const doc of sortedDocs) {
            const scan = doc.data();
            
            // Get student info
            let studentName = 'Unknown Student';
            try {
                const studentDoc = await firebase.getDoc(firebase.doc(firebase.db, 'users', scan.studentId));
                if (studentDoc.exists()) {
                    studentName = studentDoc.data().fullName;
                }
            } catch (error) {
                console.error('Error loading student name:', error);
            }
            
            const actionIcon = scan.action === 'entry' ? 'fas fa-sign-in-alt' : 'fas fa-sign-out-alt';
            const actionColor = scan.action === 'entry' ? 'green' : 'orange';
            
            html += `
                <div class="scan-item">
                    <i class="${actionIcon}" style="color: ${actionColor};"></i>
                    <div class="scan-content">
                        <p><strong>${studentName}</strong></p>
                        <p>${scan.action.toUpperCase()} - ${new Date(scan.timestamp).toLocaleString()}</p>
                        <p>Status: ${scan.status}</p>
                    </div>
                </div>
            `;
        }
        
        scansContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading recent scans:', error);
    }
}

// Parent Dashboard Functions
async function loadParentData() {
    try {
        // Check if parent has linked child
        if (currentUserData.linkedChild) {
            updateParentChildInfo();
            loadChildActivity();
        } else {
            // Show link child interface
            const content = document.getElementById('childInfoContent');
            content.innerHTML = `
                <div class="action-card" onclick="showLinkChildModal()">
                    <i class="fas fa-link"></i>
                    <h4>Link Child Account</h4>
                    <p>Enter your child's student ID to link their account</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading parent data:', error);
    }
}

function showLinkChildModal() {
    const content = `
        <div class="link-child-form">
            <div class="form-group">
                <label for="childStudentId" class="form-label">
                    <i class="fas fa-id-card"></i> Child's Student ID *
                </label>
                <input type="text" id="childStudentId" class="form-control" placeholder="Enter student ID" required>
            </div>
            <button onclick="linkChildAccount()" class="btn btn--primary btn--full-width">
                <i class="fas fa-link"></i> Link Account
            </button>
        </div>
    `;
    
    showModal('Link Child Account', content, [
        { text: 'Cancel', class: 'btn--outline', action: 'closeModal' }
    ]);
}

async function linkChildAccount() {
    const studentId = document.getElementById('childStudentId').value.trim();
    
    if (!studentId) {
        showNotification('Please enter student ID', 'warning');
        return;
    }
    
    try {
        showLoading();
        
        // Find student by studentId field
        const studentsQuery = firebase.query(
            firebase.collection(firebase.db, 'users'),
            firebase.where('studentId', '==', studentId),
            firebase.where('role', '==', 'student')
        );
        
        const snapshot = await firebase.getDocs(studentsQuery);
        
        if (snapshot.empty) {
            hideLoading();
            showNotification('Student not found', 'error');
            return;
        }
        
        const studentDoc = snapshot.docs[0];
        const studentData = studentDoc.data();
        
        // Update parent record with child info
        await firebase.updateDoc(firebase.doc(firebase.db, 'users', currentUser.uid), {
            linkedChild: studentDoc.id,
            childName: studentData.fullName,
            childStudentId: studentData.studentId
        });
        
        // Update current user data
        currentUserData.linkedChild = studentDoc.id;
        currentUserData.childName = studentData.fullName;
        currentUserData.childStudentId = studentData.studentId;
        
        hideLoading();
        showNotification('Child account linked successfully!', 'success');
        closeModal();
        
        // Update UI
        updateParentChildInfo();
        loadChildActivity();
        
    } catch (error) {
        hideLoading();
        console.error('Error linking child account:', error);
        showNotification('Error linking account', 'error');
    }
}

function updateParentChildInfo() {
    if (currentUserData.linkedChild) {
        const content = `
            <div class="child-info">
                <h4>${currentUserData.childName}</h4>
                <p>Student ID: ${currentUserData.childStudentId}</p>
                <button onclick="viewChildActivity()" class="btn btn--primary btn--sm">
                    <i class="fas fa-chart-line"></i> View Activity
                </button>
            </div>
        `;
        document.getElementById('childInfoContent').innerHTML = content;
    }
}

async function loadChildActivity() {
    if (!currentUserData.linkedChild) return;
    
    try {
        const gatePassQuery = firebase.query(
            firebase.collection(firebase.db, 'gatepassrequest'),
            firebase.where('studentId', '==', currentUserData.linkedChild)
        );
        
        const snapshot = await firebase.getDocs(gatePassQuery);
        const timelineContainer = document.getElementById('childActivityTimeline');
        
        if (snapshot.empty) {
            timelineContainer.innerHTML = `
                <div class="timeline-item">
                    <i class="fas fa-info-circle"></i>
                    <div class="timeline-content">
                        <p>No activity to display</p>
                    </div>
                </div>
            `;
            return;
        }
        
        let html = '';
        // Sort by creation date
        const sortedDocs = snapshot.docs.sort((a, b) => {
            const aTime = a.data().createdAt || a.data().timestamp || '0';
            const bTime = b.data().createdAt || b.data().timestamp || '0';
            return new Date(bTime) - new Date(aTime);
        }).slice(0, 5);
        
        sortedDocs.forEach(doc => {
            const data = doc.data();
            const date = new Date(data.createdAt || data.timestamp || Date.now()).toLocaleDateString();
            const statusIcon = {
                pending: 'fas fa-clock',
                approved: 'fas fa-check-circle',
                rejected: 'fas fa-times-circle'
            };
            
            html += `
                <div class="timeline-item">
                    <i class="${statusIcon[data.status] || 'fas fa-clock'}"></i>
                    <div class="timeline-content">
                        <p><strong>Gate Pass Request - ${data.status}</strong></p>
                        <p>Reason: ${data.reason}</p>
                        <p>Destination: ${data.destination}</p>
                        <p>Date: ${date}</p>
                    </div>
                </div>
            `;
        });
        
        timelineContainer.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading child activity:', error);
    }
}

function viewChildActivity() {
    showNotification('Child activity details loaded below', 'info');
}

// Additional Modal Functions
function showFoodScheduleModal() {
    const content = `
        <div class="food-schedule">
            <h4>Today's Meal Schedule</h4>
            <div class="meal-schedule">
                <div class="meal-item" style="display: flex; align-items: center; margin: 10px 0; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
                    <i class="fas fa-sun" style="margin-right: 10px; color: #f39c12;"></i>
                    <div class="meal-info">
                        <h5>Breakfast</h5>
                        <p>7:00 AM - 9:00 AM</p>
                        <p>Poha, Toast, Tea/Coffee</p>
                    </div>
                </div>
                <div class="meal-item" style="display: flex; align-items: center; margin: 10px 0; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
                    <i class="fas fa-sun" style="margin-right: 10px; color: #f39c12;"></i>
                    <div class="meal-info">
                        <h5>Lunch</h5>
                        <p>12:00 PM - 2:00 PM</p>
                        <p>Rice, Dal, Vegetable, Roti</p>
                    </div>
                </div>
                <div class="meal-item" style="display: flex; align-items: center; margin: 10px 0; padding: 10px; border: 1px solid #eee; border-radius: 5px;">
                    <i class="fas fa-moon" style="margin-right: 10px; color: #2c3e50;"></i>
                    <div class="meal-info">
                        <h5>Dinner</h5>
                        <p>7:00 PM - 9:00 PM</p>
                        <p>Rice, Curry, Vegetable, Chapati</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    showModal('Food Schedule', content, [
        { text: 'Close', class: 'btn--primary', action: 'closeModal' }
    ]);
}

function showComplaintsModal() {
    const content = `
        <div class="complaints-form">
            <form id="complaintForm">
                <div class="form-group">
                    <label for="complaintType" class="form-label">
                        <i class="fas fa-exclamation-triangle"></i> Complaint Type *
                    </label>
                    <select id="complaintType" class="form-control" required>
                        <option value="">Select complaint type</option>
                        <option value="maintenance">Maintenance Issue</option>
                        <option value="cleanliness">Cleanliness</option>
                        <option value="food">Food Quality</option>
                        <option value="facilities">Facilities</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="complaintDescription" class="form-label">
                        <i class="fas fa-comment"></i> Description *
                    </label>
                    <textarea id="complaintDescription" class="form-control" rows="4" placeholder="Describe your complaint..." required></textarea>
                </div>
                
                <div class="form-group">
                    <label for="complaintLocation" class="form-label">
                        <i class="fas fa-map-marker-alt"></i> Location
                    </label>
                    <input type="text" id="complaintLocation" class="form-control" placeholder="Where is the issue? (Room number, floor, etc.)">
                </div>
                
                <button type="submit" class="btn btn--primary btn--full-width">
                    <i class="fas fa-paper-plane"></i> Submit Complaint
                </button>
            </form>
        </div>
    `;
    
    showModal('Lodge Complaint', content, [
        { text: 'Cancel', class: 'btn--outline', action: 'closeModal' }
    ]);
    
    document.getElementById('complaintForm').addEventListener('submit', submitComplaint);
}

async function submitComplaint(event) {
    event.preventDefault();
    
    const type = document.getElementById('complaintType').value;
    const description = document.getElementById('complaintDescription').value.trim();
    const location = document.getElementById('complaintLocation').value.trim();
    
    if (!type || !description) {
        showNotification('Please fill all required fields', 'warning');
        return;
    }
    
    try {
        showLoading();
        
        await firebase.addDoc(firebase.collection(firebase.db, 'complaints'), {
            studentId: currentUser.uid,
            type: type,
            description: description,
            location: location,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        
        hideLoading();
        showNotification('Complaint submitted successfully!', 'success');
        closeModal();
        
    } catch (error) {
        hideLoading();
        console.error('Error submitting complaint:', error);
        showNotification('Error submitting complaint', 'error');
    }
}

// Placeholder functions for admin features
function showUserManagementModal() {
    showNotification('User Management feature coming soon!', 'info');
}

function showSystemAnalyticsModal() {
    showNotification('System Analytics feature coming soon!', 'info');
}

function showAuditLogModal() {
    showNotification('Audit Log feature coming soon!', 'info');
}

function showSystemSettingsModal() {
    showNotification('System Settings feature coming soon!', 'info');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('Gate Pass Management System initialized');
    
    // Welcome page buttons
    document.getElementById('loginBtn')?.addEventListener('click', () => switchPage('loginPage'));
    document.getElementById('registerBtn')?.addEventListener('click', () => switchPage('registerPage'));
    
    // Back buttons
    document.getElementById('loginBackBtn')?.addEventListener('click', () => switchPage('welcomePage'));
    document.getElementById('registerBackBtn')?.addEventListener('click', () => switchPage('welcomePage'));
    
    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    
    // Registration navigation
    document.getElementById('backToStep1Btn')?.addEventListener('click', prevStep);
    document.getElementById('proceedToStep3Btn')?.addEventListener('click', nextStep);
    document.getElementById('backToStep2Btn')?.addEventListener('click', prevStep);
    document.getElementById('verifyOTPBtn')?.addEventListener('click', verifyOTPAndRegister);
    
    // Role selection
    document.querySelectorAll('.role-card').forEach(card => {
        card.addEventListener('click', () => selectRole(card.dataset.role));
    });
    
    // Password toggles
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const targetId = this.dataset.target;
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');
            
            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
    
    // Dashboard action cards
    document.addEventListener('click', function(e) {
        if (e.target.closest('.action-card')) {
            const action = e.target.closest('.action-card').dataset.action;
            handleActionCardClick(action);
        }
        
        if (e.target.closest('.management-card')) {
            const action = e.target.closest('.management-card').dataset.action;
            handleManagementCardClick(action);
        }
    });
    
    // Logout buttons
    document.getElementById('studentLogoutBtn')?.addEventListener('click', logout);
    document.getElementById('parentLogoutBtn')?.addEventListener('click', logout);
    document.getElementById('securityLogoutBtn')?.addEventListener('click', logout);
    document.getElementById('wardenLogoutBtn')?.addEventListener('click', logout);
    document.getElementById('adminLogoutBtn')?.addEventListener('click', logout);
    
    // Modal close
    document.getElementById('modalCloseBtn')?.addEventListener('click', closeModal);
    document.querySelector('.modal-backdrop')?.addEventListener('click', closeModal);
    
    // OTP actions
    document.getElementById('copyOTPBtn')?.addEventListener('click', function() {
        const otpCode = document.getElementById('otpCode').textContent;
        navigator.clipboard.writeText(otpCode);
        showNotification('OTP copied to clipboard', 'success');
    });
    
    document.getElementById('resendOTPBtn')?.addEventListener('click', function() {
        generateOTP();
        showNotification('New OTP generated', 'info');
    });
});

function handleActionCardClick(action) {
    switch (action) {
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
        default:
            showNotification('Feature coming soon!', 'info');
    }
}

function handleManagementCardClick(action) {
    switch (action) {
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
