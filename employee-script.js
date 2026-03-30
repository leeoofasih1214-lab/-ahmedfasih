// Employee-only lightweight script
const BASE_URL = 'http://localhost:5000/api';
let authToken = localStorage.getItem('authToken');

async function apiRequest(endpoint, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  };
  if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
  try {
    const response = await fetch(BASE_URL + endpoint, config);
    if (!response.ok) {
      if (response.status === 401) logout();
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'خطأ');
    }
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

async function getEmployees() { return await apiRequest('/employees'); }
async function getWarnings() { return await apiRequest('/warnings'); }

async function loadDashboard() {
  try {
    const currentUser = localStorage.getItem('currentUser');
    if (!currentUser) return logout();
    
    // Show loading
    document.getElementById('emp-name').textContent = 'جاري التحميل...';
    
    const [employees, warnings] = await Promise.all([getEmployees(), getWarnings()]);
    const employee = employees.find(e => String(e.displayId || e.id) === String(currentUser));
    if (!employee) throw new Error('بياناتك غير موجودة');
    
    // Profile
    document.getElementById('profile-img').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(employee.name)}&background=2563eb&color=fff&size=80`;
    document.getElementById('emp-id').textContent = employee.displayId || employee.id;
    document.getElementById('emp-name').textContent = employee.name || 'غير معروف';
    document.getElementById('emp-dept').textContent = employee.department || employee.position || 'غير محدد';
    
    // Warnings
    const empWarnings = warnings.filter(w => String(w.employeeId) === String(employee.id));
    document.getElementById('emp-warnings').textContent = empWarnings.length;
    
    let status = 'جيد';
    if (empWarnings.length >= 3) status = 'خطر';
    else if (empWarnings.length > 0) status = 'تحذير';
    document.getElementById('employee-status').textContent = status;
    
    // Table
    const tableBody = document.getElementById('warnings-list');
    if (!tableBody) throw new Error('Table not found');
    tableBody.innerHTML = empWarnings.length ? 
      empWarnings.slice(0,10).map((w,i) => `<tr><td>${i+1}</td><td>${w.reason}</td><td>${w.date}</td></tr>`).join('') : 
      '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">لا يوجد إنذارات ✓</td></tr>';

    // Notification
    if (empWarnings.length > 0) {
      const notif = document.createElement('div');
      notif.className = 'notification';
      notif.innerHTML = `⚠️ لديك ${empWarnings.length} إنذار`;
      document.body.insertBefore(notif, document.body.firstChild);
      setTimeout(() => notif.remove(), 5000);
    }

  } catch (e) {
    console.error('Load error:', e);
    document.getElementById('emp-name').textContent = 'خطأ: ' + e.message;
    document.getElementById('warnings-list').innerHTML = '<tr><td colspan="3" style="color:red;">خطأ في التحميل</td></tr>';
  }
}

function logout() {
  localStorage.clear();
window.location.href = '../login.html';
}

function toggleTheme() {
  const isDark = document.body.classList.contains('dark');
  const newDark = !isDark;
  localStorage.setItem('darkMode', newDark);
  applyTheme();
}

function applyTheme() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  document.body.classList.toggle('dark', isDark);
  const btn = document.querySelector('.theme-btn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
}

document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  applyTheme();
});
