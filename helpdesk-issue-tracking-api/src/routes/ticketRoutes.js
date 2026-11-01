const express = require('express');
const controller = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);
router.post('/', validateBody(['title', 'description', 'category', 'priority'], ['title', 'description']), controller.create);
router.get('/', controller.list);
router.get('/:id', controller.get);
router.patch('/:id/assign', authorize('agent', 'admin'), validateBody(['assignedTo'], ['assignedTo']), controller.assign);
router.patch('/:id/resolve', authorize('agent', 'admin'), validateBody([]), controller.resolve);
router.get('/:id/comments', controller.listComments);
router.post('/:id/comments', validateBody(['body'], ['body']), controller.addComment);
router.get('/:id/history', controller.history);
router.patch('/:id', validateBody(['title', 'description', 'category', 'priority', 'status']), controller.update);

module.exports = router;
