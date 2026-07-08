import { Router } from 'express';
import { prizeRulesController } from '../controllers/prize-rules.controller.js';
import { authenticate, requireRole } from '../middlewares/auth.js';

const router = Router();

router.use(authenticate as any);
router.use(requireRole('superadmin', 'admin') as any);

router.get('/', prizeRulesController.list);
router.post('/', prizeRulesController.update);
router.delete('/:id', prizeRulesController.delete);

export const prizeRulesRouter = router;
