import config from '../config/env.js';
import logger from '../config/logger.js';

const SHOP = { latitude: 25.6693575, longitude: 85.8367071 };
export const DELIVERY_RADIUS_KM = 3;

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/** Straight-line kilometres. No map service. */
export function distanceKm(fromLat, fromLng, toLat, toLng) {
  const earthKm = 6371;
  const dLat = toRad(toLat - fromLat);
  const dLng = toRad(toLng - fromLng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Serviceability service — checks if a pincode is deliverable.
 * Isolated behind this interface so the logic can be replaced with:
 * - A database of pincodes
 * - A third-party logistics API
 * - Geo-fencing
 * without touching checkout code.
 */
export const serviceabilityService = {
  distanceFromShopKm(latitude, longitude) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return distanceKm(SHOP.latitude, SHOP.longitude, latitude, longitude);
  },

  isWithinDeliveryRange(latitude, longitude) {
    const km = this.distanceFromShopKm(latitude, longitude);
    return km != null && km <= DELIVERY_RADIUS_KM;
  },

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
