const express = require('express');
const controller = require('../controllers/authController');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

router.post('/register', validateBody(['name', 'email', 'password'], ['name', 'email', 'password']), controller.register);
router.post('/login', validateBody(['email', 'password'], ['email', 'password']), controller.login);

module.exports = router;
