import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import campaignRoutes from './campaign.routes.js';
import couponRoutes from './coupon.routes.js';
import settingsRoutes from './settings.routes.js';
import adminRoutes from './admin.routes.js';
import { prizeRulesRouter } from './prize-rules.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/coupons', couponRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin', adminRoutes);
router.use('/prize-rules', prizeRulesRouter);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
