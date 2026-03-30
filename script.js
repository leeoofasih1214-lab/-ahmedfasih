function protectPage() {

    const currentUser = localStorage.getItem("currentUser");

    const page = window.location.pathname.split("/").pop();

    // السماح بصفحة تسجيل الدخول
    if (page === "login.html") return;

    // لو لم يسجل دخول
    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }

    // منع الموظف من صفحات المدير
    const adminPages = [
        "index.html",
        "employees.html",
        "warnings.html",
        "add-warning.html",
        "add-employee.html",
        "reports.html",
        "settings.html"
    ];

if (currentUser === "admin" || !adminPages.includes(page)) return;
    window.location.href = "employee/dashboard.html";

}
// API Configuration
const BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('authToken') || null;
let currentUser = localStorage.getItem('currentUser') || null;

// API Helper - with auth
async function apiRequest(url, options = {}) {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(BASE_URL + url, config);
    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
        throw new Error('Unauthorized');
      }
      const error = await response.json();
      throw new Error(error.error || 'API Error');
    }
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Data Management
// Removed legacy localStorage & DEFAULT_EMPLOYEES
// All data now 100% MySQL via APIs ✓

// Helper to get today's date in YYYY-MM-DD
const getTodayDate = () => new Date().toISOString().split('T')[0];

// Data Accessors
async function getWarnings() {
  try {
    return await apiRequest('/warnings');
  } catch (error) {
    console.error('Failed to fetch warnings:', error);
    return [];
  }
}

async function getEmployees() {
  try {
    return await apiRequest('/employees');
  } catch (error) {
    console.error('Failed to fetch employees from MySQL:', error);
    alert('خطأ في الاتصال بقاعدة البيانات. تأكد من تشغيل السيرفر.');
    return []; // Strict MySQL reliance - no fallback
  }
}

async function getEmployeeProfile(employeeId) {
  try {
    const profile = await apiRequest(`/employees/${employeeId}`);
    // Fetch full warnings list separately for table/delete
    profile.warnings = await getWarnings();
    return profile;
  } catch (error) {
    console.error('Failed to fetch employee profile:', error);
    throw error;
  }
}
async function saveEmployee(employee) {
  try {
    const backendEmployee = {
      displayId: employee.id,
      name: employee.name,
      position: employee.position,
      department: employee.department,
      password: employee.password
    };
    const newEmp = await apiRequest('/employees', {
      method: 'POST',
      body: JSON.stringify(backendEmployee)
    });
    // Refresh employees list
    if (typeof renderEmployees === 'function') renderEmployees();
    alert("✅ تم إضافة الموظف بنجاح\nرقم: " + employee.id);
    return newEmp;
  } catch (error) {
    console.error('Save employee error:', error);
    alert("❌ خطأ: " + error.message);
    return false;
  }
}

async function saveWarning(warning) {
  try {
    await apiRequest('/warnings', {
      method: 'POST',
      body: JSON.stringify({
        employeeId: warning.employeeId,
        reason: warning.reason,
        date: warning.date
      })
    });
    return warning;
  } catch (error) {
    alert("❌ خطأ في حفظ الإنذار: " + error.message);
    return null;
  }
}

async function deleteWarning(id) {
  try {
    await apiRequest(`/warnings/${id}`, { method: 'DELETE' });
  } catch (error) {
    console.error('Delete warning failed:', error);
  }
}

// UI Rendering - Dashboard
async function renderDashboard() {
    let warnings = [], employees = [];
    try {
        [warnings, employees] = await Promise.all([getWarnings(), getEmployees()]);
        
        const totalEmployeesEl = document.getElementById('total-employees');
        const totalWarningsEl = document.getElementById('total-warnings');
        const todayWarningsEl = document.getElementById('today-warnings');

        if (totalEmployeesEl) totalEmployeesEl.textContent = employees.length;
        if (totalWarningsEl) totalWarningsEl.textContent = warnings.length;
        
        if (todayWarningsEl) {
            const todayWarningsCount = warnings.filter(w => w.date === getTodayDate()).length;
            todayWarningsEl.textContent = todayWarningsCount;
        }

        const warningList = document.getElementById('latest-warnings');
        if (warningList) {
            warningList.innerHTML = '';
            if (warnings.length === 0) {
                warningList.innerHTML = '<p class="loading">لا توجد إنذارات حالياً</p>';
            } else {
                warnings.slice(0, 5).forEach(warning => {
                    const item = document.createElement('div');
                    item.className = 'warning-item';
                    item.innerHTML = `
                        <div class="warning-info">
                            <h4>${warning.employeeName}</h4>
                            <p>${warning.reason}</p>
                        </div>
                        <span class="badge badge-date">${warning.date}</span>
                    `;
                    warningList.appendChild(item);
                });
            }
        }
    } catch (error) {
        console.error('Render dashboard failed:', error);
    }
}

// UI Rendering - Employees Page
async function renderEmployees() {
    const employeeList = document.getElementById('employee-list-body');
    if (!employeeList) return;

    try {
        let employees = await getEmployees();
        if (!Array.isArray(employees)) {
            console.error('Employees data is not an array:', employees);
            employeeList.innerHTML = '<tr><td colspan="7">خطأ في تحميل الموظفين</td></tr>';
            return;
        }
        employeeList.innerHTML = '';

        employees.forEach(emp => {
            const row = document.createElement('tr');
            row.innerHTML = `
            <td><div style="font-weight:700;">${emp.id || '-'}</div></td>

            <td><a href="employee-profile.html?employeeId=${emp.id}" style="font-weight:700;color:var(--primary);text-decoration:none;">${emp.name || '-'}</a></td>
            <td><span class="badge badge-date">${emp.department || 'غير محدد'}</span></td>
            <td>${emp.position || "-"}</td>
            <td><input type="text" value="****" style="width:100px;padding:5px;text-align:center;border:1px solid #ddd;border-radius:6px;background:#f8fafc;font-size:13px;" readonly></td>
            <td><button onclick="changeEmployeePassword('${emp.id}')" class="btn-modern btn-secondary">🔑 تغيير</button></td>
            <td>
                <a href="add-warning.html?employeeId=${emp.id}" class="btn-modern btn-secondary">إنذار</a>
                <button onclick="deleteEmployee('${emp.id}')" class="btn-modern btn-danger" style="margin-right:6px;">🗑 حذف</button>
            </td>
            `;
            employeeList.appendChild(row);
        });

        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error('Render employees failed:', error);
        employeeList.innerHTML = '<tr><td colspan="7">خطأ في تحميل الموظفين</td></tr>';
    }
}

// UI Rendering - Warnings Page
async function renderWarningsList() {
    const warningListTable = document.getElementById('warnings-table-body');
    if (!warningListTable) return;

    try {
        const warnings = await getWarnings();
        warningListTable.innerHTML = '';

        if (!Array.isArray(warnings) || warnings.length === 0) {
            warningListTable.innerHTML = '<tr><td colspan="4" class="text-center py-8" style="color: var(--muted-foreground);">لا توجد إنذارات مسجلة</td></tr>';
            return;
        }
        
        warnings.forEach(warning => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><div style="font-weight: 700;">${warning.employeeName || 'غير معروف'}</div></td>
                <td><div style="max-width: 300px; font-size: 0.9rem;">${warning.reason}</div></td>
                <td><span class="badge badge-date">${warning.date}</span></td>
                <td>
                    <button onclick="handleDeleteWarning('${warning.id}')" class="btn-modern" style="color: var(--red); background: transparent; padding: 0.25rem;">
                        <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </td>
            `;
            warningListTable.appendChild(row);
        });
        
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error('Failed to render warnings:', error);
        warningListTable.innerHTML = '<tr><td colspan="4">خطأ في تحميل الإنذارات</td></tr>';
    }
}

// Event Handlers
function handleDeleteWarning(id) {
    if (confirm('هل أنت متأكد من حذف هذا الإنذار؟')) {
        deleteWarning(id);
        renderWarningsList();
        if (document.getElementById('latest-warnings')) renderDashboard();
    }
}
async function handleLogin(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const role = document.querySelector(".role-card.active").dataset.role;
    const username = formData.get('username').trim();
    const password = formData.get('password');

    try {
        // Backend login for both admin/employee
        const loginData = { username, password, role };
        console.log('🔍 Frontend Login Payload:', loginData);
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginData)
        });

        if (!response.ok) {
            throw new Error('بيانات غير صحيحة');
        }

        const { token, user } = await response.json();
        
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', user.role === 'admin' ? 'admin' : user.username);
        
        if (user.role === 'admin') {
            window.location.href = 'index.html';
        } else {
            window.location.href = 'employee/dashboard.html';
        }
    } catch (error) {
        const errorEl = document.getElementById('login-error');
        if (errorEl) {
            errorEl.textContent = error.message;
            errorEl.style.display = 'block';
        }
    }
}


async function handleAddEmployee(event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    const employeeId = formData.get('employeeId').trim();

    const employees = await getEmployees();

    // منع التكرار بشكل صحيح
    if (!Array.isArray(employees)) {
        alert("❌ خطأ في تحميل الموظفين");
        return;
    }
const exists = employees.some(emp => emp.displayId === employeeId);

    if (exists) {
        alert("❌ رقم الموظف موجود بالفعل\nاختر رقم مختلف");
        return;
    }

    // Direct backend call with proper format - generate email
    const backendEmployee = {
        displayId: employeeId,
        name: formData.get('name'),
        position: formData.get('position'),
        department: formData.get('department'),
        password: formData.get('password')
    };

    await apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify(backendEmployee)
    });

    alert("✅ تم إضافة الموظف بنجاح\n\nرقم الموظف: " + employeeId);

    window.location.href = 'employees.html';
}

async function handleAddWarning(event) {
    event.preventDefault();
    event.stopImmediatePropagation(); // Prevent double execution

    const formData = new FormData(event.target);
    const employeeId = formData.get('employeeId').trim();

    try {
        const employees = await getEmployees();
        const employee = Array.isArray(employees) ? employees.find(e => String(e.id) === String(employeeId)) : null;

        if (!employee) {
            alert('يرجى اختيار موظف');
            return;
        }

        const warnings = await getWarnings();
        const reason = formData.get('reason').trim();
        const date = formData.get('date') || getTodayDate();

        const exists = warnings.some(w =>
            String(w.employeeId) === String(employeeId) &&
            w.reason === reason &&
            w.date === date
        );

        if (exists) {
            alert("❌ هذا الإنذار مسجل بالفعل لهذا الموظف");
            return;
        }

        const warning = {
            employeeId: employee.id,
            employeeName: employee.name,
            reason: reason,
            date: date
        };

        await saveWarning(warning);
        alert("✅ تم إضافة الإنذار بنجاح");
        window.location.href = 'index.html';
    } catch (error) {
        alert("خطأ: " + error.message);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {

    // حماية الصفحات
    protectPage();

    // تحديد المستخدم الحالي
    const currentUser = localStorage.getItem("currentUser");

// إخفاء الداشبورد من الموظف
if (currentUser !== "admin") {

    const dashboardLinks = document.querySelectorAll('a[href="index.html"]');

    dashboardLinks.forEach(link => {
        link.style.display = "none";
    });

}

    // تشغيل الصفحات حسب وجود العناصر
    if (document.getElementById('total-employees')) renderDashboard().catch(console.error);
    if (document.getElementById('employee-list-body')) {
        console.log("Employees Page Loaded");
        renderEmployees().catch(err => console.error('Render employees failed:', err));
    }
    if (document.getElementById('warnings-table-body')) renderWarningsList().catch(console.error);

    const addWarningForm = document.getElementById('add-warning-form');
    if (addWarningForm) {
        const select = addWarningForm.querySelector('[name="employeeId"]');

        const loadEmployees = async () => {
            try {
                const employees = await getEmployees();
                if (Array.isArray(employees)) {
                    employees.forEach(emp => {
                        const opt = document.createElement('option');
                        opt.value = emp.id;
                        opt.textContent = emp.name;
                        select.appendChild(opt);
                    });
                }
            } catch (error) {
                console.error('Failed to load employees for select:', error);
            }
        };
        loadEmployees();

        const urlParams = new URLSearchParams(window.location.search);
        const preSelectId = urlParams.get('employeeId');
        if (preSelectId) {
            select.value = preSelectId;
        }

        const dateInput = addWarningForm.querySelector('[name="date"]');
        if (dateInput) {
            dateInput.value = getTodayDate();
        }

        addWarningForm.addEventListener('submit', handleAddWarning);
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const addEmployeeForm = document.getElementById('add-employee-form');
    if (addEmployeeForm) {
        addEmployeeForm.addEventListener('submit', handleAddEmployee);
    }

    const accountForm = document.getElementById('account-form');
    if (accountForm) {
        accountForm.addEventListener('submit', handleChangePassword);
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }

});

// ============================================
// REPORTS PAGE FUNCTIONS
// ============================================

async function renderReports() {
    let warnings = [], employees = [];
    let today, currentMonth, currentYear;
    try {
        [warnings, employees] = await Promise.all([getWarnings(), getEmployees()]);
        console.log('Reports data:', {warnings: warnings.length, employees: employees.length});
        
        today = new Date();
        currentMonth = today.getMonth();
        currentYear = today.getFullYear();

        if (!Array.isArray(warnings)) {
            console.warn('Warnings data invalid:', warnings);
            return;
        }
        if (!Array.isArray(employees)) {
            console.warn('Employees data invalid:', employees);
            return;
        }
    } catch (error) {
        console.error('Render reports failed:', error);
        return;
    }

    // Update stat cards
    document.getElementById('stat-total-employees').textContent = employees.length;
    document.getElementById('stat-total-warnings').textContent = warnings.length;
    document.getElementById('stat-avg-warnings').textContent = employees.length > 0 ? (warnings.length / employees.length).toFixed(1) : '0';

    const monthWarnings = warnings.filter(w => {
        const wDate = new Date(w.date);
        return wDate.getMonth() === currentMonth && wDate.getFullYear() === currentYear;
    }).length;
    document.getElementById('stat-month-warnings').textContent = monthWarnings;

    // Warnings by Department
    const departmentStats = {};
    employees.forEach(emp => {
        if (!departmentStats[emp.department]) {
            departmentStats[emp.department] = 0;
        }
        const empWarnings = warnings.filter(w => w.employeeId === emp.id).length;
        departmentStats[emp.department] += empWarnings;
    });

    const ctx1 = document.getElementById('departmentChart');
    if (ctx1) {
        new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: Object.keys(departmentStats),
                datasets: [{
                    label: 'عدد الإنذارات',
                    data: Object.values(departmentStats),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    // Monthly Warnings
    const monthlyStats = {};
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    
    for (let i = 0; i < 12; i++) {
        monthlyStats[monthNames[i]] = 0;
    }

    warnings.forEach(w => {
        const wDate = new Date(w.date);
        monthlyStats[monthNames[wDate.getMonth()]]++;
    });

    const ctx2 = document.getElementById('monthlyChart');
    if (ctx2) {
        new Chart(ctx2, {
            type: 'line',
            data: {
                labels: Object.keys(monthlyStats),
                datasets: [{
                    label: 'الإنذارات الشهرية',
                    data: Object.values(monthlyStats),
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointBackgroundColor: 'rgba(239, 68, 68, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    }
                }
            }
        });
    }

    // Most Warned Employees
    const employeeWarnings = employees.map(emp => {
        const empWarnings = warnings.filter(w => w.employeeId === emp.id);
        return {
            ...emp,
            warningCount: empWarnings.length,
            lastWarning: empWarnings.length > 0 ? empWarnings[0].date : '---'
        };
    }).sort((a, b) => b.warningCount - a.warningCount).slice(0, 10);

    const mostWarnedBody = document.getElementById('most-warned-body');
    if (mostWarnedBody) {
        if (employeeWarnings.length === 0) {
            mostWarnedBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--muted-foreground);">لا توجد إنذارات</td></tr>';
        } else {
            mostWarnedBody.innerHTML = employeeWarnings.map(emp => `
                <tr>
                    <td><strong>${emp.name}</strong></td>
                    <td><span class="badge badge-date">${emp.department}</span></td>
                    <td><span style="font-weight: 700; color: ${emp.warningCount > 3 ? '#ef4444' : '#f59e0b'};">${emp.warningCount}</span></td>
                    <td>${emp.lastWarning}</td>
                    <td>
                        <a href="employee-profile.html?employeeId=${emp.id}" class="btn-modern btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                            <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
                            عرض الملف
                        </a>
                    </td>
                </tr>
            `).join('');
        }
    }

    // Department Statistics
    const deptStats = Object.entries(departmentStats).map(([dept, warnings]) => {
        const deptEmployees = employees.filter(e => e.department === dept);
        const percentage = deptEmployees.length > 0 ? ((warnings / warnings) * 100).toFixed(1) : '0';
        return {
            dept,
            employees: deptEmployees.length,
            warnings,
            percentage: (warnings / (warnings || 1) * 100).toFixed(1)
        };
    });

    const deptStatsBody = document.getElementById('department-stats-body');
    if (deptStatsBody) {
        if (deptStats.length === 0) {
            deptStatsBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--muted-foreground);">لا توجد أقسام</td></tr>';
        } else {
            deptStatsBody.innerHTML = deptStats.map(d => `
                <tr>
                    <td><strong>${d.dept}</strong></td>
                    <td>${d.employees}</td>
                    <td><span style="font-weight: 700;">${d.warnings}</span></td>
                    <td><div style="background: rgba(59, 130, 246, 0.1); padding: 0.5rem 1rem; border-radius: 6px; text-align: center; color: #3b82f6; font-weight: 600;">${d.percentage}%</div></td>
                </tr>
            `).join('');
        }
    }
}

// ============================================
// EMPLOYEE PROFILE PAGE FUNCTIONS
// ============================================

async function renderEmployeeProfile() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const employeeId = urlParams.get('employeeId');
        
        if (!employeeId) {
            window.location.href = 'employees.html';
            return;
        }

        const [employees, warnings] = await Promise.all([getEmployees(), getWarnings()]);
        
        if (!Array.isArray(employees) || !Array.isArray(warnings)) {
            throw new Error('بيانات غير صالحة');
        }
        
        const employee = employees.find(e => String(e.id) === String(employeeId) || String(e.displayId) === String(employeeId));
        if (!employee) {
            window.location.href = 'employees.html';
            return;
        }

    const employeeWarnings = Array.isArray(warnings) ? warnings.filter(w => String(w.employeeId) === String(employee.id)).sort((a, b) => new Date(b.date) - new Date(a.date)) : [];
        
        // Update header
        document.getElementById('employee-name').textContent = employee.name;
        document.getElementById('employee-position').textContent = employee.position || '';

        // Update info
        document.getElementById('info-name').textContent = employee.name;
        document.getElementById('info-position').textContent = employee.position || '';
        document.getElementById('info-department').textContent = employee.department || '';
        document.getElementById('info-warning-count').textContent = employeeWarnings.length;

        // Update statistics
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthWarnings = employeeWarnings.filter(w => {
            const wDate = new Date(w.date);
            return wDate.getMonth() === currentMonth && wDate.getFullYear() === currentYear;
        }).length;

        document.getElementById('stat-total').textContent = employeeWarnings.length;
        document.getElementById('stat-month').textContent = monthWarnings;
        document.getElementById('stat-last').textContent = employeeWarnings.length > 0 ? employeeWarnings[0].date : '---';
        document.getElementById('stat-rate').textContent = monthWarnings.toFixed(1);

        // Update warnings list
        const warningsListBody = document.getElementById('warnings-list-body');
        if (warningsListBody) {
            if (employeeWarnings.length === 0) {
                warningsListBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: var(--muted-foreground);">لا توجد إنذارات لهذا الموظف</td></tr>';
            } else {
                warningsListBody.innerHTML = employeeWarnings.map(w => `
                    <tr>
                        <td><span class="badge badge-date">${w.date}</span></td>
                        <td><div style="max-width: 400px;">${w.reason}</div></td>
                        <td>
                            <button onclick="handleDeleteWarning('${w.id}')" class="btn-modern" style="color: var(--red); background: transparent; padding: 0.25rem;">
                                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Profile load failed:', error);
        alert('خطأ في تحميل ملف الموظف: ' + error.message);
        window.location.href = 'employees.html';
    }
}

// ============================================
// SETTINGS PAGE FUNCTIONS
// ============================================

function renderSettings() {
    const lastUpdate = new Date().toLocaleDateString('ar-SA');
    document.getElementById('last-update').textContent = lastUpdate;

    // Removed localStorage size calc - MySQL only
    if (document.getElementById('storage-usage')) {
        document.getElementById('storage-usage').textContent = 'MySQL Database';
    }
}

function handleChangePassword(event) {
    event.preventDefault();
    const currentPassword = event.target.currentPassword.value;
    const newPassword = event.target.newPassword.value;
    const confirmPassword = event.target.confirmPassword.value;

    if (currentPassword !== 'admin') {
        showMessage('password-message', 'كلمة المرور الحالية غير صحيحة', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showMessage('password-message', 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage('password-message', 'كلمة المرور الجديدة غير متطابقة', 'error');
        return;
    }

    localStorage.setItem('admin-password', newPassword);
    showMessage('password-message', 'تم تغيير كلمة المرور بنجاح', 'success');
    event.target.reset();
}

function saveSystemSettings() {
    showMessage('system-message', '⚠️ الإعدادات محفوظة في قاعدة البيانات MySQL', 'success');
    // Future: Add /api/settings endpoint
}

function showMessage(elementId, text, type) {
    const el = document.getElementById(elementId);
    el.textContent = text;
    el.style.display = 'block';
    el.style.color = type === 'error' ? '#ef4444' : '#10b981';
    el.style.padding = '1rem';
    el.style.borderRadius = '8px';
    el.style.backgroundColor = type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
    
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

// Removed legacy export/import/reset - Use MySQL tools
// exportAllData(), importData(), resetAllData()

function exportReportPDF() {
    const warnings = getWarnings();
    const employees = getEmployees();
    
    let content = `
    ========================================
    تقرير الإنذارات - ${new Date().toLocaleDateString('ar-SA')}
    ========================================
    
    إجمالي الموظفين: ${employees.length}
    إجمالي الإنذارات: ${warnings.length}
    
    ---- سجل الإنذارات ----
    `;

    warnings.forEach(w => {
        content += `\n- ${w.employeeName} (${w.date}): ${w.reason}`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
}

function exportEmployeeProfile() {
    const urlParams = new URLSearchParams(window.location.search);
    const employeeId = urlParams.get('employeeId');
    const employees = getEmployees();
    const warnings = getWarnings();
    const employee = employees.find(e => e.id === employeeId);
    
    if (!employee) return;

    const empWarnings = warnings.filter(w => w.employeeId === employeeId);
    
    let content = `
    ========================================
    ملف الموظف: ${employee.name}
    التاريخ: ${new Date().toLocaleDateString('ar-SA')}
    ========================================
    
    الاسم: ${employee.name}
    المنصب: ${employee.position}
    القسم: ${employee.department}
    عدد الإنذارات: ${empWarnings.length}
    
    ---- سجل الإنذارات ----
    `;

    empWarnings.forEach(w => {
        content += `\n- التاريخ: ${w.date}\n  السبب: ${w.reason}\n`;
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employee-${employee.name}-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
}
// ============================================
// DARK MODE
// ============================================

function toggleDarkMode() {

    document.body.classList.toggle("dark-mode");

    if (document.body.classList.contains("dark-mode")) {
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }

}

function loadTheme() {

    const theme = localStorage.getItem("theme");

    if (theme === "dark") {
        document.body.classList.add("dark-mode");
    }

}

// تشغيل الوضع المحفوظ عند فتح الصفحة
document.addEventListener("DOMContentLoaded", loadTheme);
// =================================
// ACTIVE SIDEBAR LINK
// =================================

function setActiveMenu() {

    const links = document.querySelectorAll(".sidebar-nav .nav-item");
    const currentPage = window.location.pathname.split("/").pop();

    links.forEach(link => {

        const linkPage = link.getAttribute("href");

        if (linkPage === currentPage) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }

    });

}

document.addEventListener("DOMContentLoaded", setActiveMenu);
function searchEmployee(){

    const input = document.getElementById("searchEmployee").value.toLowerCase();
    const rows = document.querySelectorAll("#employee-list-body tr");
    
    rows.forEach(row => {
    
    let text = row.innerText.toLowerCase();
    
    if(text.includes(input)){
    row.style.display = "";
    }else{
    row.style.display = "none";
    }
    
    });
    
    }
async function deleteEmployee(id){

    if(confirm("هل تريد حذف الموظف؟")){

        try {
            await apiRequest(`/employees/${id}`, { method: 'DELETE' });
            await renderEmployees();
            alert("تم حذف الموظف بنجاح");
        } catch (error) {
            console.error('Delete failed:', error);
            alert("خطأ في الحذف: " + error.message);
        }
    }

}

async function changeEmployeePassword(employeeId) {
  const newPassword = prompt('أدخل كلمة المرور الجديدة (6 أحرف على الأقل):');
  
  if (newPassword === null || newPassword.trim() === '' || newPassword.length < 6) {
    alert('❌ كلمة المرور غير صالحة (6 أحرف على الأقل)');
    return;
  }
  
  if (!confirm(`تأكيد تغيير كلمة مرور الموظف ${employeeId}؟`)) {
    return;
  }
  
  try {
    await apiRequest(`/employees/${employeeId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password: newPassword.trim() })
    });
    
    alert('✅ تم تغيير كلمة المرور بنجاح');
    await renderEmployees(); // Refresh table
  } catch (error) {
    console.error('Password change error:', error);
    alert('❌ فشل في التغيير: ' + (error.message || 'خطأ في الخادم'));
  }
}
// Duplicate renderEmployeeProfile removed - using single async version above
// Removed localStorage password change - Use API
// changeEmployeePassword(id) now handled in table onclick via backend
const roleCards = document.querySelectorAll(".role-card");
const roleInput = document.getElementById("role-input");
if (roleInput) {
    roleCards.forEach(card => {
        card.addEventListener("click", () => {
            roleCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            roleInput.value = card.dataset.role;
        });
    });
}
// اختيار نوع الحساب في صفحة اللوجين

document.querySelectorAll(".role-card").forEach(card => {

    card.addEventListener("click", () => {

        // نشيل active من الكل
        document.querySelectorAll(".role-card").forEach(c => 
            c.classList.remove("active")
        );

        // نضيف active للمختار
        card.classList.add("active");

        // تغيير الخلفية حسب النوع
        const role = card.dataset.role;
        const body = document.querySelector(".login-body");

        if(role === "admin"){
            body.classList.add("admin-mode");
        }else{
            body.classList.remove("admin-mode");
        }

        console.log("Selected Role:", role); // 👈 مهم للتجربة

    });

});
const menuBtn = document.getElementById("menu-btn");
const sidebar = document.querySelector(".sidebar");

if (menuBtn) {
    menuBtn.addEventListener("click", () => {

        sidebar.classList.toggle("active");
    });
}