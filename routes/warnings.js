const express = require('express');
const router = express.Router();
const {
  getAllWarnings,
  createWarning,
  deleteWarning
} = require('../controllers/warningsController');

// GET /api/warnings
router.get('/', getAllWarnings);

// POST /api/warnings
router.post('/', createWarning);

// DELETE /api/warnings/:id
router.delete('/:id', deleteWarning);

module.exports = router;

