import { Request, Response, NextFunction } from 'express';
import { createCampaignSchema, updateCampaignSchema, paginationSchema } from '../validators/index.js';
import { campaignRepository } from '../repositories/campaign.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { AppError } from '../middlewares/errorHandler.js';

export const campaignController = {
  async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const campaigns = await campaignRepository.listAll();
      res.json({ success: true, data: campaigns });
    } catch (err) {
      next(err);
    }
  },

  async getActive(_req: Request, res: Response, next: NextFunction) {
    try {
      const campaign = await campaignRepository.findActive();
      res.json({ success: true, data: campaign });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const campaign = await campaignRepository.findById(req.params.id);
      if (!campaign) throw new AppError('Campaign not found', 404, 'NOT_FOUND');
      res.json({ success: true, data: campaign });
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createCampaignSchema.parse(req.body);
      const campaign = await campaignRepository.create(data);
      res.status(201).json({ success: true, data: campaign });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = updateCampaignSchema.parse(req.body);
      const campaign = await campaignRepository.update(req.params.id, data);
      if (!campaign) throw new AppError('Campaign not found', 404, 'NOT_FOUND');
      res.json({ success: true, data: campaign });
    } catch (err) {
      next(err);
    }
  },

  async activate(req: Request, res: Response, next: NextFunction) {
    try {
      await campaignRepository.deactivateAll();
      const campaign = await campaignRepository.setActive(req.params.id, true);
      if (!campaign) throw new AppError('Campaign not found', 404, 'NOT_FOUND');
      res.json({ success: true, data: campaign });
    } catch (err) {
      next(err);
    }
  },

  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const campaign = await campaignRepository.setActive(req.params.id, false);
      if (!campaign) throw new AppError('Campaign not found', 404, 'NOT_FOUND');
      res.json({ success: true, data: campaign });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const deleted = await campaignRepository.delete(req.params.id);
      if (!deleted) throw new AppError('Campaign not found', 404, 'NOT_FOUND');
      res.json({ success: true, data: { deleted: true } });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /campaigns/:id/participants
   * Returns all users with their coupon details joined in one query.
   * Lets admins see: who registered, what they won, current status, expiry.
   */
  async participants(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { page, limit } = paginationSchema.parse(req.query);
      const offset = (page - 1) * limit;

      const campaign = await campaignRepository.findById(id);
      if (!campaign) throw new AppError('Campaign not found', 404, 'NOT_FOUND');

      const [rows, total] = await Promise.all([
        userRepository.listByCampaignWithCoupon(id, offset, limit),
        userRepository.countByCampaign(id),
      ]);

      res.json({
        success: true,
        data: {
          campaign: { id: campaign.id, name: campaign.name },
          participants: rows,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  },
};
