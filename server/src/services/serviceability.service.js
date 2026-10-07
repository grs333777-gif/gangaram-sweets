import config from '../config/env.js';
import logger from '../config/logger.js';

/**
 * Serviceability service — checks if a pincode is deliverable.
 * Isolated behind this interface so the logic can be replaced with:
 * - A database of pincodes
 * - A third-party logistics API
 * - Geo-fencing
 * without touching checkout code.
 */
export const serviceabilityService = {
  /**
   * Returns true if delivery is available to the given pincode.
   */
  async isServiceable(pincode) {
    if (!pincode) return false;

    const serviceablePincodes = config.SERVICEABLE_PINCODES;

    // If no pincodes configured, allow all (useful for local pickup stores)
    if (!serviceablePincodes || serviceablePincodes.length === 0) {
      return true;
    }

    const isServiceable = serviceablePincodes.includes(pincode.trim());
    logger.debug({ pincode, isServiceable }, 'Serviceability check');
    return isServiceable;
  },

  /**
   * Returns delivery estimate string.
   */
  async getDeliveryEstimate(pincode) {
    const serviceable = await this.isServiceable(pincode);
    if (!serviceable) return null;
    // Could call a logistics API here
    return '1-2 hours';
  },
};
