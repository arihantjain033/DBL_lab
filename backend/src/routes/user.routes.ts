import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';

const router = Router();

// Public routes — no auth required
router.post('/register', userController.register);
router.post('/scratch', userController.scratch);

export default router;
