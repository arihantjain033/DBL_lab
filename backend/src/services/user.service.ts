import { userRepository } from '../repositories/user.repository.js';
import { couponRepository, claimRepository } from '../repositories/coupon.repository.js';
import { campaignRepository } from '../repositories/campaign.repository.js';
import { settingsRepository } from '../repositories/settings.repository.js';
import { AppError } from '../middlewares/errorHandler.js';
import { RegisterUserInput, ScratchInput } from '../validators/index.js';
import { Request } from 'express';

export const userService = {
  async register(data: RegisterUserInput) {
    // Check campaign exists and is active
    const campaign = await campaignRepository.findById(data.campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
    }
    if (!campaign.active) {
      throw new AppError('This campaign is not currently active', 400, 'CAMPAIGN_INACTIVE');
    }

    // Check if scratch is enabled
    const scratchEnabled = await settingsRepository.get('scratch_enabled');
    if (scratchEnabled === 'false') {
      throw new AppError('Scratch cards are temporarily disabled', 503, 'SCRATCH_DISABLED');
    }

    // Check for duplicate registration (one phone per campaign)
    const existing = await userRepository.findByPhoneAndCampaign(data.phone, data.campaignId);
    if (existing) {
      // If they already have a coupon, return it
      const existingCoupon = await couponRepository.findByUserId(existing.id);
      if (existingCoupon) {
        return { user: existing, alreadyRegistered: true, existingCoupon };
      }
      return { user: existing, alreadyRegistered: true, existingCoupon: null };
    }

    // Create user
    const user = await userRepository.create(data);
    return { user, alreadyRegistered: false, existingCoupon: null };
  },
};

export const scratchService = {
  async scratch(data: ScratchInput, req: Request) {
    // Validate user exists
    const user = await userRepository.findById(data.userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Ensure user belongs to this campaign
    if (user.campaignId !== data.campaignId) {
      throw new AppError('User is not part of this campaign', 403, 'FORBIDDEN');
    }

    // Check if user already has a coupon
    const existingClaim = await claimRepository.findByUserId(data.userId);
    if (existingClaim) {
      const existingCoupon = await couponRepository.findById(existingClaim.couponId);
      throw new AppError(
        `You have already scratched your card. Coupon: ${existingCoupon?.couponNo}`,
        409,
        'ALREADY_SCRATCHED',
      );
    }

    // Atomically assign coupon
    const coupon = await couponRepository.assignCoupon(data.userId, data.campaignId);
    if (!coupon) {
      throw new AppError(
        'All coupons have been claimed! Please contact the lab.',
        410,
        'NO_COUPONS_AVAILABLE',
      );
    }

    // Extract device info
    const userAgent = req.headers['user-agent'] ?? '';
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';

    // Create immutable claim record
    await claimRepository.create({
      userId: data.userId,
      couponId: coupon.id,
      ip,
      device: extractDevice(userAgent),
      browser: extractBrowser(userAgent),
    });

    return {
      couponNo: coupon.couponNo,
      prize: coupon.prize,
      expiryDate: coupon.expiryDate?.toISOString() ?? null,
    };
  },
};

// Helper functions for device detection
function extractDevice(ua: string): string {
  if (/mobile/i.test(ua)) return 'Mobile';
  if (/tablet|ipad/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

function extractBrowser(ua: string): string {
  if (/chrome/i.test(ua) && !/chromium|edg/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/edg/i.test(ua)) return 'Edge';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Unknown';
}
