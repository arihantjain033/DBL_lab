import { Request, Response, NextFunction } from 'express';
import { adminLoginSchema } from '../validators/index.js';
import { authService } from '../services/auth.service.js';

export const authController = {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const data = adminLoginSchema.parse(req.body);
      const result = await authService.login(data);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const admin = (req as any).admin;
      res.json({ success: true, data: admin });
    } catch (err) {
      next(err);
    }
  },
};
