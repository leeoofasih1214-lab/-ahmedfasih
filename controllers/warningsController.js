const db = require('../lib/db');



const getAllWarnings = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT w.*, e.name as employeeName 
      FROM warnings w 
      JOIN employees e ON w.employeeId = e.id 
      ORDER BY w.id DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/warnings
const createWarning = async (req, res) => {
  const { employeeId, reason, date } = req.body;

  if (!employeeId || !reason) {
    return res.status(400).json({ error: 'employeeId and reason are required' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO warnings (employeeId, reason, date) VALUES (?, ?, ?)',
      [parseInt(employeeId), reason, date || new Date().toISOString().split('T')[0]]
    );
    
    const [newWarning] = await db.execute('SELECT w.*, e.name as employeeName FROM warnings w JOIN employees e ON w.employeeId = e.id WHERE w.id = ?', [result.insertId]);
    res.status(201).json(newWarning[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/warnings/:id
const deleteWarning = async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const [result] = await db.execute('DELETE FROM warnings WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Warning not found' });
    }
    
    res.json({ message: 'Warning deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllWarnings,
  createWarning,
  deleteWarning
};

