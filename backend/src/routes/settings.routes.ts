import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.get('/', authenticate, requireRole('superadmin', 'admin'), settingsController.getAll);
router.patch('/:key', authenticate, requireRole('superadmin', 'admin'), settingsController.update);

export default router;
