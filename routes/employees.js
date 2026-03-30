const express = require('express');
const router = express.Router();
const {
  getAllEmployees,
  createEmployee,
  updateEmployeePassword,
  deleteEmployee,
  getEmployeeById
} = require('../controllers/employeesController');

// GET /api/employees
router.get('/', getAllEmployees);

// POST /api/employees
router.post('/', createEmployee);

// GET /api/employees/:id
router.get('/:id', getEmployeeById);

// PUT /api/employees/:id/password
router.put('/:id/password', updateEmployeePassword);

// DELETE /api/employees/:id
router.delete('/:id', deleteEmployee);

module.exports = router;

