import { Request, Response, NextFunction } from 'express';
import { generateCouponsSchema, redeemCouponSchema, paginationSchema, updateCouponSchema, batchUpdateCouponSchema } from '../validators/index.js';
import { couponService } from '../services/coupon.service.js';
import { couponRepository } from '../repositories/coupon.repository.js';

export const couponController = {
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = generateCouponsSchema.parse(req.body);
      const result = await couponService.generateCoupons(data);
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const { couponNo } = req.params;
      const result = await couponService.verifyCoupon(couponNo.toUpperCase());
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async redeem(req: Request, res: Response, next: NextFunction) {
    try {
      const data = redeemCouponSchema.parse(req.body);
      const coupon = await couponService.redeemCoupon(data);
      res.json({ success: true, data: coupon });
    } catch (err) {
      next(err);
    }
  },

  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { campaignId } = req.params;
      const stats = await couponService.getDashboardStats(campaignId);
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { campaignId } = req.params;
      const { page, limit } = paginationSchema.parse(req.query);
      const { status } = req.query as { status?: string };
      const offset = (page - 1) * limit;
      const [coupons, total] = await Promise.all([
        couponRepository.listByCampaign(campaignId, offset, limit, status),
        couponRepository.countTotalByCampaign(campaignId, status)
      ]);
      res.json({ 
        success: true, 
        data: { 
          coupons, 
          total, 
          page, 
          limit, 
          totalPages: Math.ceil(total / limit) 
        } 
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = updateCouponSchema.parse(req.body);
      const result = await couponService.updateCoupon(id, data);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await couponService.deleteCoupon(id);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async batchUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const { campaignId, targetPrize, count, updateData } = batchUpdateCouponSchema.parse(req.body);
      const result = await couponService.batchUpdateCoupons(campaignId, targetPrize, count, updateData);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
