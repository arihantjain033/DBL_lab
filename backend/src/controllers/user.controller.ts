import { Request, Response, NextFunction } from 'express';
import { registerUserSchema, scratchSchema } from '../validators/index.js';
import { userService, scratchService } from '../services/user.service.js';

export const userController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const data = registerUserSchema.parse(req.body);
      const result = await userService.register(data);

      if (result.alreadyRegistered && result.existingCoupon) {
        return res.status(200).json({
          success: true,
          data: {
            user: result.user,
            alreadyRegistered: true,
            coupon: {
              couponNo: result.existingCoupon.couponNo,
              prize: result.existingCoupon.prize,
              expiryDate: result.existingCoupon.expiryDate?.toISOString() ?? null,
            },
          },
          message: 'You have already registered and scratched your card.',
        });
      }

      res.status(result.alreadyRegistered ? 200 : 201).json({
        success: true,
        data: { user: result.user, alreadyRegistered: result.alreadyRegistered },
      });
    } catch (err) {
      next(err);
    }
  },

  async scratch(req: Request, res: Response, next: NextFunction) {
    try {
      const data = scratchSchema.parse(req.body);
      const result = await scratchService.scratch(data, req);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
};
