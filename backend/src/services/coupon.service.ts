import { couponRepository } from '../repositories/coupon.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { campaignRepository } from '../repositories/campaign.repository.js';
import { AppError } from '../middlewares/errorHandler.js';
import { GenerateCouponsInput, RedeemCouponInput } from '../validators/index.js';
import { schema } from '../db/index.js';
import { logger } from '../utils/logger.js';

type CouponInsert = typeof schema.coupons.$inferInsert;

import { prizeRulesRepository } from '../repositories/prize-rules.repository.js';

export const couponService = {
  /**
   * Generate coupon numbers in the format DBL-XXXXXX
   * Shuffles prize pool before inserting to randomize distribution
   */
  async generateCoupons(data: GenerateCouponsInput) {
    const campaign = await campaignRepository.findById(data.campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
    }

    // Get current max coupon number for this campaign
    const existingCount = await couponRepository.countByCampaign(data.campaignId);
    const totalExisting = Object.values(existingCount).reduce((a, b) => a + b, 0);

    const totalNew = data.prizes.reduce((sum, p) => sum + p.quantity, 0);
    const expiryDate = data.expiryDate ? new Date(data.expiryDate) : null;

    // Fetch or create prize rules
    const rulesMap = new Map<string, any>();
    for (const p of data.prizes) {
      if (!rulesMap.has(p.prize)) {
        let rule = await prizeRulesRepository.findByPrize(p.prize);
        if (!rule) {
           const lower = p.prize.toLowerCase();
           const isDiscount = lower.includes('discount') || lower.includes('voucher') || lower.includes('%');
           const defaultTerms = [
             'Valid for 6 Months',
             'One Scratch Card per Patient',
             'Non-transferable',
             'Cannot be exchanged for cash',
             'Claim prize before expiry',
             'Management reserves all rights'
           ];
           rule = await prizeRulesRepository.upsert({
             prizeName: p.prize,
             minimumBilling: isDiscount ? 200 : null,
             nextVisitOnly: isDiscount,
             showMinimumBilling: isDiscount,
             terms: defaultTerms.join('\n'),
           });
        }
        rulesMap.set(p.prize, {
          minimumBilling: rule.minimumBilling,
          nextVisitOnly: rule.nextVisitOnly,
          showMinimumBilling: rule.showMinimumBilling,
          terms: rule.terms
        });
      }
    }

    // Build prize pool
    const prizePool: string[] = [];
    for (const { prize, quantity } of data.prizes) {
      for (let i = 0; i < quantity; i++) {
        prizePool.push(prize);
      }
    }

    // Fisher-Yates shuffle for randomness
    for (let i = prizePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [prizePool[i], prizePool[j]] = [prizePool[j], prizePool[i]];
    }

    // Generate coupon records
    const records: CouponInsert[] = prizePool.map((prize, index) => ({
      campaignId: data.campaignId,
      couponNo: formatCouponNo(totalExisting + index + 1),
      prize,
      status: 'available' as const,
      expiryDate,
      metadata: rulesMap.get(prize),
    }));

    await couponRepository.bulkInsert(records);

    logger.info(`Generated ${totalNew} coupons for campaign ${campaign.name}`);
    return { generated: totalNew, campaignId: data.campaignId };
  },

  async verifyCoupon(couponNo: string) {
    const coupon = await couponRepository.findByCouponNo(couponNo);
    if (!coupon) {
      throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }

    let user = null;
    if (coupon.assignedTo) {
      user = await userRepository.findById(coupon.assignedTo);
    }

    const rule = await prizeRulesRepository.findByPrize(coupon.prize);
    if (rule) {
      coupon.metadata = rule;
    }

    return { coupon, user };
  },

  async redeemCoupon(data: RedeemCouponInput) {
    const coupon = await couponRepository.findByCouponNo(data.couponNo);
    if (!coupon) {
      throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }
    if (coupon.status === 'available') {
      throw new AppError('This coupon has not been claimed by any user', 400, 'COUPON_UNCLAIMED');
    }
    if (coupon.redeemed) {
      throw new AppError('This coupon has already been redeemed', 409, 'COUPON_ALREADY_REDEEMED');
    }
    if (coupon.status === 'expired') {
      throw new AppError('This coupon has expired', 410, 'COUPON_EXPIRED');
    }
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      throw new AppError(
        `This coupon expired on ${new Date(coupon.expiryDate).toLocaleDateString('en-IN')}`,
        410,
        'COUPON_EXPIRED',
      );
    }

    // Check campaign is still active
    const campaign = await campaignRepository.findById(coupon.campaignId);
    if (!campaign?.active) {
      throw new AppError('This campaign is no longer active', 400, 'CAMPAIGN_INACTIVE');
    }

    const redeemed = await couponRepository.redeem(coupon.id);
    if (!redeemed) {
      // Race condition: another request redeemed it between our check and update
      throw new AppError('This coupon has already been redeemed', 409, 'COUPON_ALREADY_REDEEMED');
    }

    logger.info(`Coupon ${data.couponNo} redeemed successfully`);
    return redeemed;
  },

  async getDashboardStats(campaignId: string) {
    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new AppError('Campaign not found', 404, 'CAMPAIGN_NOT_FOUND');
    }

    const [counts, totalUsers, todayUsers, prizeBreakdown] = await Promise.all([
      couponRepository.countByCampaign(campaignId),
      userRepository.countByCampaign(campaignId),
      userRepository.countTodayByCampaign(campaignId),
      couponRepository.getPrizeBreakdown(campaignId),
    ]);

    return {
      campaignName: campaign.name,
      campaignActive: campaign.active,
      totalCoupons: Object.values(counts).reduce((a, b) => a + b, 0),
      availableCoupons: counts['available'] ?? 0,
      assignedCoupons: counts['assigned'] ?? 0,
      redeemedCoupons: counts['redeemed'] ?? 0,
      totalUsers,
      todayUsers,
      prizeBreakdown,
    };
  },

  async updateCoupon(id: string, data: any) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) {
      throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }

    if (data.couponNo && data.couponNo !== coupon.couponNo) {
      const existing = await couponRepository.findByCouponNo(data.couponNo);
      if (existing) {
        throw new AppError('Coupon number already exists', 409, 'COUPON_NO_EXISTS');
      }
    }

    if (data.prize && data.prize !== coupon.prize) {
      let rule = await prizeRulesRepository.findByPrize(data.prize);
      if (!rule) {
         const lower = data.prize.toLowerCase();
         const isDiscount = lower.includes('discount') || lower.includes('voucher') || lower.includes('%');
         const defaultTerms = [
           'Valid for 6 Months',
           'One Scratch Card per Patient',
           'Non-transferable',
           'Cannot be exchanged for cash',
           'Claim prize before expiry',
           'Management reserves all rights'
         ];
         rule = await prizeRulesRepository.upsert({
           prizeName: data.prize,
           minimumBilling: isDiscount ? 200 : null,
           nextVisitOnly: isDiscount,
           showMinimumBilling: isDiscount,
           terms: defaultTerms.join('\n'),
         });
      }
      data.metadata = {
        minimumBilling: rule.minimumBilling,
        nextVisitOnly: rule.nextVisitOnly,
        showMinimumBilling: rule.showMinimumBilling,
        terms: rule.terms
      };
    }

    const updated = await couponRepository.update(id, data);
    logger.info(`Coupon ${id} updated by admin`);
    return updated;
  },

  async deleteCoupon(id: string) {
    const coupon = await couponRepository.findById(id);
    if (!coupon) {
      throw new AppError('Coupon not found', 404, 'COUPON_NOT_FOUND');
    }

    await couponRepository.delete(id);
    logger.info(`Coupon ${id} deleted by admin`);
    return { success: true };
  },

  async batchUpdateCoupons(campaignId: string, targetPrize: string, count: number, updateData: any) {
    if (count <= 0) {
      throw new AppError('Count must be greater than 0', 400, 'INVALID_COUNT');
    }

    if (updateData.prize && updateData.prize !== targetPrize) {
      let rule = await prizeRulesRepository.findByPrize(updateData.prize);
      if (!rule) {
         const lower = updateData.prize.toLowerCase();
         const isDiscount = lower.includes('discount') || lower.includes('voucher') || lower.includes('%');
         const defaultTerms = [
           'Valid for 6 Months',
           'One Scratch Card per Patient',
           'Non-transferable',
           'Cannot be exchanged for cash',
           'Claim prize before expiry',
           'Management reserves all rights'
         ];
         rule = await prizeRulesRepository.upsert({
           prizeName: updateData.prize,
           minimumBilling: isDiscount ? 200 : null,
           nextVisitOnly: isDiscount,
           showMinimumBilling: isDiscount,
           terms: defaultTerms.join('\n'),
         });
      }
      updateData.metadata = {
        minimumBilling: rule.minimumBilling,
        nextVisitOnly: rule.nextVisitOnly,
        showMinimumBilling: rule.showMinimumBilling,
        terms: rule.terms
      };
    }

    const result = await couponRepository.batchUpdate(campaignId, targetPrize, count, updateData);
    logger.info(`Batch updated ${result.updated} coupons for campaign ${campaignId}`);
    return result;
  },
};

/**
 * Formats a sequential number into the DBL-XXXX coupon format.
 * Example: formatCouponNo(1) -> 'DBL-0001'
 *          formatCouponNo(101) -> 'DBL-0101'
 */
export function formatCouponNo(num: number): string {
  return `DBL-${String(num).padStart(4, '0')}`;
}
