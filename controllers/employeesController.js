const db = require('../lib/db');

// GET /api/employees
const getAllEmployees = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, displayId, name, COALESCE(position, \'\') as position, COALESCE(department, \'\') as department FROM employees ORDER BY id DESC');
    res.json(rows);
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST /api/employees
const createEmployee = async (req, res) => {
  const { displayId: employeeId, name, position, department, password } = req.body;

  // Make department optional with default
  const finalDepartment = department || 'General';
  const finalPosition = position || 'Staff';

  if (!name || !employeeId || !password) {
    return res.status(400).json({ error: 'Missing required fields: displayId, name, password' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO employees (displayId, name, position, department, password) VALUES (?, ?, ?, ?, ?)',
      [employeeId, name, finalPosition, finalDepartment, password]
    );
    const [newEmployee] = await db.execute('SELECT * FROM employees WHERE id = ?', [result.insertId]);
    res.status(201).json(newEmployee[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Display ID already exists' });
    }
    console.error('Create employee error:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /api/employees/:id/password
const updateEmployeePassword = async (req, res) => {
  const id = parseInt(req.params.id);
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }

  try {
    const [result] = await db.execute(
      'UPDATE employees SET password = ? WHERE id = ?',
      [password, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const [updated] = await db.execute('SELECT id, displayId, name, COALESCE(position, \'\') as position, COALESCE(department, \'\') as department FROM employees WHERE id = ?', [id]);
    res.json({ message: 'Password updated successfully', employee: updated[0] });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const [result] = await db.execute('DELETE FROM employees WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /api/employees/:id - Get single employee with warning stats
const getEmployeeById = async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const [rows] = await db.execute(`
      SELECT 
        e.id, e.displayId, e.name, COALESCE(e.position, '') as position, COALESCE(e.department, '') as department,
        COUNT(w.id) as warningCount,
        GROUP_CONCAT(CONCAT(w.date, ': ', w.reason) SEPARATOR '; ') as warningsList
      FROM employees e 
      LEFT JOIN warnings w ON e.id = w.employeeId 
      WHERE e.id = ? 
      GROUP BY e.id
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Get employee by ID error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllEmployees,
  createEmployee,
  updateEmployeePassword,
  deleteEmployee,
  getEmployeeById
};
