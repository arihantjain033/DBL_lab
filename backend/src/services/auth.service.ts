import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { adminRepository } from '../repositories/admin.repository.js';
import { AppError } from '../middlewares/errorHandler.js';
import { AdminLoginInput } from '../validators/index.js';
import { AdminRole } from '../types/index.js';

export const authService = {
  async login(data: AdminLoginInput) {
    const admin = await adminRepository.findByEmail(data.email);
    if (!admin) {
      // Constant-time comparison to prevent timing attacks
      await adminRepository.verifyPassword('$2a$12$invalid.hash.to.prevent.timing', data.password);
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await adminRepository.verifyPassword(admin.passwordHash, data.password);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const payload = { id: admin.id, email: admin.email, role: admin.role as AdminRole };
    const token = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    return {
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    };
  },
};
