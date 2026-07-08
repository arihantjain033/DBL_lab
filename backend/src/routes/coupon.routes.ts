import { Router } from 'express';
import { couponController } from '../controllers/coupon.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

// Receptionist & above — verify and redeem
router.get('/verify/:couponNo', authenticate, couponController.verify);
router.post('/redeem', authenticate, requireRole('superadmin', 'admin', 'receptionist'), couponController.redeem);

// Admin & above
router.post('/generate', authenticate, requireRole('superadmin', 'admin'), couponController.generate);
router.get('/campaign/:campaignId/dashboard', authenticate, requireRole('superadmin', 'admin'), couponController.dashboard);
router.get('/campaign/:campaignId', authenticate, requireRole('superadmin', 'admin'), couponController.list);
router.put('/batch/update', authenticate, requireRole('superadmin', 'admin'), couponController.batchUpdate);
router.put('/:id', authenticate, requireRole('superadmin', 'admin'), couponController.update);
router.delete('/:id', authenticate, requireRole('superadmin', 'admin'), couponController.delete);

export default router;
