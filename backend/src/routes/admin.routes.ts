import { Router } from 'express';
import { seedController } from '../controllers/seed.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

/**
 * POST /api/v1/admin/seed
 * Idempotent — creates campaign + 101 coupons if they don't exist.
 * Restricted to superadmin only.
 */
router.post('/seed', authenticate, requireRole('superadmin'), seedController.seed);

export default router;
