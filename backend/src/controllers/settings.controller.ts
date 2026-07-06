import { Request, Response, NextFunction } from 'express';
import { settingsRepository } from '../repositories/settings.repository.js';
import { updateSettingSchema } from '../validators/index.js';

export const settingsController = {
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const all = await settingsRepository.getAll();
      res.json({ success: true, data: all });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { key } = req.params;
      const { value } = updateSettingSchema.parse(req.body);
      await settingsRepository.set(key, value);
      res.json({ success: true, data: { key, value } });
    } catch (err) {
      next(err);
    }
  },
};
