import { Request, Response, NextFunction } from 'express';
import { seedService } from '../services/seed.service.js';
import { logger } from '../utils/logger.js';

export const seedController = {
  /**
   * POST /api/v1/admin/seed
   *
   * Idempotent endpoint — creates the campaign and generates coupons
   * if they don't already exist. Safe to call multiple times.
   *
   * Requires: superadmin role
   */
  async seed(req: Request, res: Response, next: NextFunction) {
    try {
      logger.info('Admin triggered seed via API');
      const result = await seedService.run();

      res.status(result.alreadySeeded ? 200 : 201).json({
        success: true,
        data: {
          campaignCreated: result.campaignCreated,
          campaignId: result.campaignId,
          campaignName: result.campaignName,
          couponsGenerated: result.couponsGenerated,
          totalCoupons: result.prizeDistribution.reduce((s, p) => s + p.quantity, 0),
          alreadySeeded: result.alreadySeeded,
          prizeDistribution: result.prizeDistribution,
        },
        message: result.alreadySeeded
          ? 'Campaign already seeded — no changes made.'
          : `Campaign created and ${result.couponsGenerated} coupons generated successfully.`,
      });
    } catch (err) {
      next(err);
    }
  },
};
