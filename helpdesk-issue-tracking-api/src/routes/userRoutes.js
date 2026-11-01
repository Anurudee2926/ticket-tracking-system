const express = require('express');
const controller = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.get('/me', controller.me);
router.get('/', authorize('admin'), controller.list);

module.exports = router;
