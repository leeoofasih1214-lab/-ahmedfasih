const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const db = require('./lib/db');

dotenv.config();

const auth = require('./middleware/auth');
const employeeRoutes = require('./routes/employees');
const warningRoutes = require('./routes/warnings');

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secure-employee-login-jwt-2024-change-in-prod';

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Auth route (public)
app.post('/api/auth/login', async (req, res) => {
  console.log('🔍 Backend Login Request:', req.body);
  const { username, password, role } = req.body;

  try {
    if (role === 'admin') {
      if (username === 'admin' && password === 'admin') {
        const user = { id: 1, username: 'admin', role: 'admin' };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ token, user });
      }
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    // Employee login by displayId (plaintext for now - will hash later)
    const [rows] = await db.execute(
      'SELECT id, displayId, name, position FROM employees WHERE displayId = ? AND password = ?',
      [username, password]
    );
    
    if (rows.length > 0) {
      const user = rows[0];
      user.username = user.displayId || user.email;
      user.role = 'employee';
      const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
      return res.json({ token, user });
    }

    res.status(401).json({ error: 'Invalid credentials' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login server error' });
  }
});

// Protected routes
app.use('/api/employees', auth, employeeRoutes);
app.use('/api/warnings', auth, warningRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// DB migration function
async function runMigration(connection) {
  try {
    console.log('🗑️ Dropping tables...');
    await connection.execute('DROP TABLE IF EXISTS warnings');
    await connection.execute('DROP TABLE IF EXISTS employees');

    console.log('📊 Creating employees table...');
    await connection.execute(`
      CREATE TABLE employees (
        id INT PRIMARY KEY AUTO_INCREMENT,
        displayId VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        position VARCHAR(255),
        department VARCHAR(255) NOT NULL DEFAULT 'General',
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('📊 Creating warnings table...');
    await connection.execute(`
      CREATE TABLE warnings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        employeeId INT,
        reason TEXT,
        \`date\` DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
      )
    `);

    console.log('📝 Inserting sample data...');
    await connection.execute(`
      INSERT IGNORE INTO employees (displayId, name, position, department, password) VALUES
        ('EMP001', 'John Doe', 'Developer', 'IT', 'password123'),
        ('EMP002', 'Jane Smith', 'Designer', 'Design', 'password456')
    `);

    console.log('✅ All migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    throw err;
  }
}

// DB Connection Test (NO AUTO-MIGRATION - Persistent Data)
db.getConnection()
  .then(async (connection) => {
    console.log('✅ MySQL Connected successfully');
    
    try {
      // Verify tables exist (no DROP/create)
      const [employees] = await connection.execute('SELECT COUNT(*) as count FROM employees');
      console.log(`✅ DB Ready - Employees: ${employees[0].count}`);
      
    } catch (error) {
      console.error('❌ DB tables missing - Run manual migration:', error.message);
    } finally {
      connection.release();
    }
  })
  .catch(err => {
    console.error('❌ MySQL Connection failed:', err);
  });

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME || 'employee_management'}`);
});
