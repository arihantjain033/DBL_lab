import { Router } from 'express';
import { campaignController } from '../controllers/campaign.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

// Public — get active campaign for the user-facing app
router.get('/active', campaignController.getActive);
router.get('/:id', campaignController.getById);

// Admin-only routes
router.use(authenticate);
router.get('/', requireRole('superadmin', 'admin'), campaignController.list);
router.post('/', requireRole('superadmin', 'admin'), campaignController.create);
router.put('/:id', requireRole('superadmin', 'admin'), campaignController.update);
router.patch('/:id/activate', requireRole('superadmin', 'admin'), campaignController.activate);
router.patch('/:id/deactivate', requireRole('superadmin', 'admin'), campaignController.deactivate);
router.delete('/:id', requireRole('superadmin'), campaignController.delete);

// Participants — users with coupon details joined
router.get(
  '/:id/participants',
  requireRole('superadmin', 'admin', 'receptionist'),
  campaignController.participants,
);

export default router;

