// ===========================
// INITIAL DATA & CONFIGURATION
// ===========================

const TOTAL_STUDENTS = 48;

// Pre-set students
const STUDENTS_DB = {
    'kmssa8100250': {
        studentId: 'kmssa8100250',
        name: 'Prashanta Bhusal',
        class: '10T',
        roll: 31
    },
    'kmssa8100251': {
        studentId: 'kmssa8100251',
        name: 'Prarambha Bashyal',
        class: '10T',
        roll: 29
    }
};

// Initialize localStorage if empty
function initializeStorage() {
    if (!localStorage.getItem('attendanceRecords')) {
        localStorage.setItem('attendanceRecords', JSON.stringify([]));
    }
}

initializeStorage();

// ===========================
// UTILITY FUNCTIONS
// ===========================

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Format time as HH:MM:SS
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false });
}

// Get all attendance records
function getAttendanceRecords() {
    return JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
}

// Save attendance records
function saveAttendanceRecords(records) {
    localStorage.setItem('attendanceRecords', JSON.stringify(records));
}

// Check if student already marked today
function isAlreadyMarkedToday(studentId) {
    const records = getAttendanceRecords();
    const today = getTodayDate();
    return records.some(record => 
        record.studentId === studentId && record.date === today
    );
}

// Show toast notification
function showToast(message, type = 'success', duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Update statistics on main page
function updateStatistics() {
    // Statistics removed from main page - only shown in teacher portal
}

// Load recent attendance on main page
function loadMainPageRecent() {
    const recentList = document.getElementById('mainRecentList');
    if (!recentList) return;
    
    const records = getAttendanceRecords();
    const today = getTodayDate();
    const todayRecords = records.filter(r => r.date === today);
    const recent = records.slice(0, 10); // Get last 10 records
    
    // Update today count badge
    const todayCount = document.getElementById('todayCount');
    if (todayCount) {
        todayCount.textContent = `${todayRecords.length} Today`;
    }
    
    if (recent.length === 0) {
        recentList.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding: 2rem;">No attendance records yet</p>';
        return;
    }
    
    recentList.innerHTML = recent.map(record => `
        <div class="recent-item">
            <div class="recent-info">
                <h4>${record.name}</h4>
                <p style="color:var(--text-secondary); font-size: 0.9rem;">${record.studentId} • ${record.class} • Roll: ${record.roll}</p>
                <p style="font-size:0.85rem; color:var(--text-light); margin-top: 0.25rem;">
                    <i class="fas fa-calendar"></i> ${record.date} at ${record.time}
                </p>
            </div>
            <span class="recent-status ${record.status.toLowerCase()}">${record.status}</span>
        </div>
    `).join('');
}

// ===========================
// ATTENDANCE MARKING FUNCTION
// ===========================

function markAttendance(studentData, status) {
    if (!studentData.studentId || !studentData.name) {
        showToast('Invalid student data!', 'error');
        return false;
    }
    
    // Check if already marked today
    if (isAlreadyMarkedToday(studentData.studentId)) {
        showToast(`${studentData.name} is already marked for today!`, 'error');
        return false;
    }
    
    // Create attendance record
    const record = {
        studentId: studentData.studentId,
        name: studentData.name,
        class: studentData.class,
        roll: studentData.roll,
        date: getTodayDate(),
        time: getCurrentTime(),
        status: status,
        timestamp: new Date().toISOString()
    };
    
    // Save record
    const records = getAttendanceRecords();
    records.unshift(record); // Add to beginning
    saveAttendanceRecords(records);
    
    // Show success message
    showToast(`✓ ${studentData.name} marked as ${status}!`, 'success');
    
    // Update displays
    loadMainPageRecent();
    updateDashboardStats();
    loadRecentAttendance();
    
    return true;
}

// ===========================
// QR CODE SCANNER (CAMERA)
// ===========================

let html5QrCode = null;
const QR_ALLOWED_CLASS = '10T';
const QR_CLASS_REJECTION_NOTICE = 'You are not registered as the Class 10T students If you are student but class is mistake Please Contact Hemraj Shahi and Arbind Kumar Dube';

function isAllowedQrClass(studentData) {
    if (!studentData || studentData.class === undefined || studentData.class === null) {
        return false;
    }

    const studentClass = String(studentData.class).trim().toUpperCase();
    return studentClass === QR_ALLOWED_CLASS;
}

function startQRScanner() {
    const qrReaderDiv = document.getElementById('qr-reader');
    const startBtn = document.getElementById('startScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');
    const scanResult = document.getElementById('scanResult');
    
    if (!qrReaderDiv) return;
    
    qrReaderDiv.style.display = 'block';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-flex';
    scanResult.style.display = 'none';
    
    html5QrCode = new Html5Qrcode("qr-reader");
    
    const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
    };
    
    html5QrCode.start(
        { facingMode: "environment" },
        config,
        onScanSuccess,
        onScanError
    ).catch(err => {
        console.error("Error starting scanner:", err);
        showToast('Failed to start camera. Please check permissions.', 'error');
        stopQRScanner();
    });
}

function stopQRScanner() {
    const qrReaderDiv = document.getElementById('qr-reader');
    const startBtn = document.getElementById('startScanBtn');
    const stopBtn = document.getElementById('stopScanBtn');
    
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            qrReaderDiv.style.display = 'none';
            startBtn.style.display = 'inline-flex';
            stopBtn.style.display = 'none';
        }).catch(err => {
            console.error("Error stopping scanner:", err);
        });
    }
}

function onScanSuccess(decodedText, decodedResult) {
    try {
        // Try to parse QR code data as JSON
        const studentData = JSON.parse(decodedText);
        
        // Validate data
        if (!studentData.studentId || !studentData.name) {
            showToast('Invalid QR code format!', 'error');
            return;
        }

        if (!isAllowedQrClass(studentData)) {
            showToast(QR_CLASS_REJECTION_NOTICE, 'error', 10000);
            stopQRScanner();
            return;
        }
        
        // Display student info
        displayScannedStudent(studentData);
        
        // Auto mark as present
        markAttendance(studentData, 'Present');
        
        // Stop scanner after successful scan
        setTimeout(() => {
            stopQRScanner();
        }, 1000);
        
    } catch (e) {
        showToast('Invalid QR code data format!', 'error');
    }
}

function onScanError(errorMessage) {
    // Ignore scan errors (they happen frequently during scanning)
}

// Display scanned student info
function displayScannedStudent(studentData) {
    const scanResult = document.getElementById('scanResult');
    if (!scanResult) return;
    
    scanResult.innerHTML = `
        <div class="student-card" style="margin-top: 1rem;">
            <div class="student-avatar">
                <i class="fas fa-user-graduate"></i>
            </div>
            <div class="student-info">
                <h3>${studentData.name}</h3>
                <div class="student-details">
                    <p><strong>Student ID:</strong> ${studentData.studentId}</p>
                    <p><strong>Class:</strong> ${studentData.class}</p>
                    <p><strong>Roll No:</strong> ${studentData.roll}</p>
                    <p style="color: var(--success); font-weight: 600; margin-top: 0.5rem;">
                        <i class="fas fa-check-circle"></i> Marked Present
                    </p>
                </div>
            </div>
        </div>
    `;
    
    scanResult.style.display = 'block';
}

// ===========================
// QR CODE UPLOAD FROM FILE
// ===========================

function handleQRFileUpload(file) {
    if (!file) return;
    
    const html5QrCode = new Html5Qrcode("qr-reader");
    
    html5QrCode.scanFile(file, true)
        .then(decodedText => {
            try {
                const studentData = JSON.parse(decodedText);
                
                if (!studentData.studentId || !studentData.name) {
                    showToast('Invalid QR code format!', 'error');
                    return;
                }

                if (!isAllowedQrClass(studentData)) {
                    showToast(QR_CLASS_REJECTION_NOTICE, 'error', 10000);
                    return;
                }
                
                displayScannedStudent(studentData);
                markAttendance(studentData, 'Present');
                
            } catch (e) {
                showToast('Invalid QR code data format!', 'error');
            }
        })
        .catch(err => {
            showToast('Failed to read QR code from image!', 'error');
            console.error(err);
        });
}

// ===========================
// MANUAL ATTENDANCE ENTRY
// ===========================

function searchStudent(studentId) {
    const student = STUDENTS_DB[studentId];
    const studentDetail = document.getElementById('studentDetail');
    
    if (!studentDetail) return;
    
    if (student) {
        // Display student details
        document.getElementById('studentName').textContent = student.name;
        document.getElementById('studentId').textContent = student.studentId;
        document.getElementById('studentClass').textContent = student.class;
        document.getElementById('studentRoll').textContent = student.roll;
        
        studentDetail.style.display = 'block';
        
        // Store current student for marking
        studentDetail.dataset.studentId = student.studentId;
        
    } else {
        studentDetail.style.display = 'none';
        showToast('Student not found! Please check the ID.', 'error');
    }
}

// ===========================
// DASHBOARD FUNCTIONS
// ===========================

function updateDashboardStats() {
    const records = getAttendanceRecords();
    const today = getTodayDate();
    
    const todayRecords = records.filter(r => r.date === today);
    const presentCount = todayRecords.filter(r => r.status === 'Present').length;
    const absentCount = todayRecords.filter(r => r.status === 'Absent').length;
    
    const dashPresentEl = document.getElementById('dashPresentCount');
    const dashAbsentEl = document.getElementById('dashAbsentCount');
    const dashTotalEl = document.getElementById('dashTotalRecords');
    
    if (dashPresentEl) dashPresentEl.textContent = presentCount;
    if (dashAbsentEl) dashAbsentEl.textContent = absentCount;
    if (dashTotalEl) dashTotalEl.textContent = records.length;
    
    // Update analytics
    updateAnalytics(presentCount, absentCount);
}

// Update analytics charts and info
function updateAnalytics(presentCount, absentCount) {
    const total = presentCount + absentCount;
    const attendanceRate = total > 0 ? Math.round((presentCount / TOTAL_STUDENTS) * 100) : 0;
    const absentRate = total > 0 ? Math.round((absentCount / TOTAL_STUDENTS) * 100) : 0;
    
    // Update circular progress
    const progressValue = document.querySelector('.progress-value');
    const circularProgress = document.getElementById('attendanceCircle');
    
    if (progressValue) {
        progressValue.textContent = attendanceRate + '%';
    }
    
    if (circularProgress) {
        const degrees = (attendanceRate / 100) * 360;
        circularProgress.style.background = `conic-gradient(
            var(--primary) 0deg,
            var(--primary-light) ${degrees}deg,
            var(--gray-200) ${degrees}deg
        )`;
    }
    
    // Update rates
    const presentRateEl = document.getElementById('presentRate');
    const absentRateEl = document.getElementById('absentRate');
    
    if (presentRateEl) presentRateEl.textContent = attendanceRate + '%';
    if (absentRateEl) absentRateEl.textContent = absentRate + '%';
    
    // Update today's trend
    const todayTrendFill = document.getElementById('todayTrendFill');
    const todayTrendPercent = document.getElementById('todayTrendPercent');
    
    if (todayTrendFill) todayTrendFill.style.height = attendanceRate + '%';
    if (todayTrendPercent) todayTrendPercent.textContent = attendanceRate + '%';
    
    // Update last update time
    const lastUpdateEl = document.getElementById('lastUpdate');
    if (lastUpdateEl) {
        const now = new Date();
        lastUpdateEl.textContent = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}

function loadRecentAttendance() {
    const recentList = document.getElementById('recentList');
    if (!recentList) return;
    
    const records = getAttendanceRecords();
    const recent = records.slice(0, 5); // Get last 5 records
    
    if (recent.length === 0) {
        recentList.innerHTML = '<p style="text-align:center; color:var(--text-secondary); padding: 2rem;">No recent attendance records</p>';
        return;
    }
    
    recentList.innerHTML = recent.map(record => `
        <div class="recent-item">
            <div class="recent-info">
                <h4>${record.name}</h4>
                <p style="color:var(--text-secondary); font-size: 0.9rem;">${record.studentId} • ${record.class} • Roll: ${record.roll}</p>
                <p style="font-size:0.85rem; color:var(--text-light); margin-top: 0.25rem;">
                    <i class="fas fa-calendar"></i> ${record.date} at ${record.time}
                </p>
            </div>
            <span class="recent-status ${record.status.toLowerCase()}">${record.status}</span>
        </div>
    `).join('');
}

function loadAttendanceTable(filters = {}) {
    const tableBody = document.getElementById('attendanceTableBody');
    const noRecords = document.getElementById('noRecords');
    const tableContainer = document.querySelector('.table-container');
    
    if (!tableBody) return;
    
    let records = getAttendanceRecords();
    
    // Apply filters
    if (filters.search) {
        const search = filters.search.toLowerCase();
        records = records.filter(r => 
            r.name.toLowerCase().includes(search) || 
            r.studentId.toLowerCase().includes(search)
        );
    }
    
    if (filters.date) {
        records = records.filter(r => r.date === filters.date);
    }
    
    if (filters.status && filters.status !== 'all') {
        records = records.filter(r => r.status === filters.status);
    }
    
    if (records.length === 0) {
        tableBody.innerHTML = '';
        if (tableContainer) tableContainer.style.display = 'none';
        if (noRecords) noRecords.style.display = 'block';
        return;
    }
    
    if (tableContainer) tableContainer.style.display = 'block';
    if (noRecords) noRecords.style.display = 'none';
    
    tableBody.innerHTML = records.map((record, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${record.studentId}</td>
            <td><strong>${record.name}</strong></td>
            <td>${record.class}</td>
            <td>${record.roll}</td>
            <td>${record.date}</td>
            <td>${record.time}</td>
            <td><span class="status-badge ${record.status.toLowerCase()}">${record.status}</span></td>
            <td>
                <div class="status-edit-controls">
                    <button class="btn-status-edit ${record.status === 'Present' ? 'active' : ''}" onclick="updateAttendanceStatus('${record.timestamp}', 'Present')">Present</button>
                    <button class="btn-status-edit ${record.status === 'Absent' ? 'active' : ''}" onclick="updateAttendanceStatus('${record.timestamp}', 'Absent')">Absent</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function getActiveDashboardFilters() {
    const searchInput = document.getElementById('searchInput');
    const dateFilter = document.getElementById('dateFilter');
    const statusFilter = document.getElementById('statusFilter');

    return {
        search: searchInput ? searchInput.value : '',
        date: dateFilter ? dateFilter.value : '',
        status: statusFilter ? statusFilter.value : 'all'
    };
}

function updateAttendanceStatus(timestamp, newStatus) {
    const records = getAttendanceRecords();
    const recordIndex = records.findIndex(record => record.timestamp === timestamp);

    if (recordIndex === -1) {
        showToast('Attendance record not found!', 'error');
        return;
    }

    if (records[recordIndex].status === newStatus) {
        showToast(`Already marked ${newStatus}.`, 'error');
        return;
    }

    records[recordIndex].status = newStatus;
    saveAttendanceRecords(records);

    showToast(`Status updated to ${newStatus}.`, 'success');

    updateDashboardStats();
    loadRecentAttendance();
    loadMainPageRecent();
    loadAttendanceTable(getActiveDashboardFilters());
}

function resetTodayAttendance() {
    if (!confirm('Are you sure you want to reset all attendance records for today?')) {
        return;
    }
    
    const records = getAttendanceRecords();
    const today = getTodayDate();
    
    const filteredRecords = records.filter(r => r.date !== today);
    saveAttendanceRecords(filteredRecords);
    
    showToast('Today\'s attendance has been reset!', 'success');
    
    // Refresh all displays
    setTimeout(() => {
        updateDashboardStats();
        loadRecentAttendance();
        loadAttendanceTable();
        loadMainPageRecent();
    }, 100);
}

function exportToCSV() {
    const records = getAttendanceRecords();
    
    if (records.length === 0) {
        showToast('No records to export!', 'error');
        return;
    }
    
    // Create CSV content
    let csv = 'Student ID,Name,Class,Roll No,Date,Time,Status\n';
    
    records.forEach(record => {
        csv += `${record.studentId},${record.name},${record.class},${record.roll},${record.date},${record.time},${record.status}\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_records_${getTodayDate()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showToast('CSV file downloaded successfully!', 'success');
}

// ===========================
// EVENT LISTENERS - MAIN PAGE
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    
    // Update date/time display
    function updateDateTime() {
        const dateTimeEl = document.getElementById('dateTime');
        if (dateTimeEl) {
            const now = new Date();
            const options = { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            dateTimeEl.textContent = now.toLocaleDateString('en-US', options);
        }
    }
    
    updateDateTime();
    setInterval(updateDateTime, 60000); // Update every minute
    
    // QR Scanner buttons
    const startScanBtn = document.getElementById('startScanBtn');
    const stopScanBtn = document.getElementById('stopScanBtn');
    
    if (startScanBtn) {
        startScanBtn.addEventListener('click', startQRScanner);
    }
    
    if (stopScanBtn) {
        stopScanBtn.addEventListener('click', stopQRScanner);
    }
    
    // QR File upload
    const qrFileInput = document.getElementById('qr-input-file');
    if (qrFileInput) {
        qrFileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                handleQRFileUpload(file);
            }
        });
    }
    
    // Manual student search
    const studentIdInput = document.getElementById('studentIdInput');
    const searchBtn = document.getElementById('searchBtn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            const studentId = studentIdInput.value.trim();
            if (studentId) {
                searchStudent(studentId);
            } else {
                showToast('Please enter a Student ID!', 'error');
            }
        });
    }
    
    if (studentIdInput) {
        studentIdInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchBtn.click();
            }
        });
    }
    
    // Mark Present button
    const markPresentBtn = document.getElementById('markPresentBtn');
    if (markPresentBtn) {
        markPresentBtn.addEventListener('click', function() {
            const studentDetail = document.getElementById('studentDetail');
            const studentId = studentDetail.dataset.studentId;
            const student = STUDENTS_DB[studentId];
            
            if (student) {
                const success = markAttendance(student, 'Present');
                if (success) {
                    studentIdInput.value = '';
                    studentDetail.style.display = 'none';
                }
            }
        });
    }
    
    // Mark Absent button
    const markAbsentBtn = document.getElementById('markAbsentBtn');
    if (markAbsentBtn) {
        markAbsentBtn.addEventListener('click', function() {
            const studentDetail = document.getElementById('studentDetail');
            const studentId = studentDetail.dataset.studentId;
            const student = STUDENTS_DB[studentId];
            
            if (student) {
                const success = markAttendance(student, 'Absent');
                if (success) {
                    studentIdInput.value = '';
                    studentDetail.style.display = 'none';
                }
            }
        });
    }
    
    // Update statistics on page load
    loadMainPageRecent();
    
    // ===========================
    // DASHBOARD PAGE EVENTS
    // ===========================
    
    // Check if we're on dashboard page and initialize
    const isDashboardPage = document.querySelector('.dashboard-page');
    if (isDashboardPage) {
        // Initialize dashboard
        setTimeout(() => {
            updateDashboardStats();
            loadRecentAttendance();
            loadAttendanceTable();
        }, 100);
    }
    
    // Update dashboard stats
    updateDashboardStats();
    loadRecentAttendance();
    loadAttendanceTable();
    
    // Reset Today button
    const resetTodayBtn = document.getElementById('resetTodayBtn');
    if (resetTodayBtn) {
        resetTodayBtn.addEventListener('click', resetTodayAttendance);
    }
    
    // Export CSV button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportToCSV);
    }
    
    // Search filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            applyFilters();
        });
    }
    
    // Date filter
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', function() {
            applyFilters();
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            applyFilters();
        });
    }
    
    // Clear filters
    const clearFilters = document.getElementById('clearFilters');
    if (clearFilters) {
        clearFilters.addEventListener('click', function() {
            if (searchInput) searchInput.value = '';
            if (dateFilter) dateFilter.value = '';
            if (statusFilter) statusFilter.value = 'all';
            loadAttendanceTable();
        });
    }
    
    function applyFilters() {
        const filters = {
            search: searchInput ? searchInput.value : '',
            date: dateFilter ? dateFilter.value : '',
            status: statusFilter ? statusFilter.value : 'all'
        };
        loadAttendanceTable(filters);
    }
});

// ===========================
// GENERATE SAMPLE QR CODES
// ===========================

// Helper function to generate QR code data for testing
// You can use this with an online QR generator like qr-code-generator.com
function generateQRData(studentId) {
    const student = STUDENTS_DB[studentId];
    if (student) {
        return JSON.stringify(student);
    }
    return null;
}

// Log QR data for testing
console.log('=== QR CODE DATA FOR TESTING ===');
console.log('Student 1 QR Data:', generateQRData('kmssa8100250'));
console.log('Student 2 QR Data:', generateQRData('kmssa8100251'));
console.log('=================================');
console.log('Use an online QR code generator to create QR codes with the above data');

// ===========================
// WINDOW LOAD - REFRESH DASHBOARD
// ===========================
window.addEventListener('load', function() {
    // Refresh dashboard if on teacher portal
    if (document.querySelector('.dashboard-page')) {
        setTimeout(() => {
            updateDashboardStats();
            loadRecentAttendance();
            loadAttendanceTable();
        }, 200);
    }
    
    // Refresh main page recent list
    if (document.getElementById('mainRecentList')) {
        loadMainPageRecent();
    }
});
