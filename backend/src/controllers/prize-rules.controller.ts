import { Request, Response, NextFunction } from 'express';
import { prizeRulesRepository } from '../repositories/prize-rules.repository.js';
import { AppError } from '../middlewares/errorHandler.js';

export const prizeRulesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const rules = await prizeRulesRepository.findAll();
      res.json({ success: true, data: rules });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body;
      const rule = await prizeRulesRepository.upsert(data);
      res.json({ success: true, data: rule });
    } catch (err) {
      next(err);
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await prizeRulesRepository.delete(id);
      res.json({ success: true, data: { success: true } });
    } catch (err) {
      next(err);
    }
  }
};
