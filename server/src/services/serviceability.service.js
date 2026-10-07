import config from '../config/env.js';
import logger from '../config/logger.js';
import { BadRequestError } from '../utils/errors.js';
import { ERROR_CODES } from '../constants/index.js';

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
export async function lookupNearbyAddress(latitude, longitude) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));
  url.searchParams.set('zoom', '18');
  url.searchParams.set('addressdetails', '1');

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GangaramSweets/1.0 (gangaramdss12@gmail.com)',
      },
    });
  } catch {
    throw new BadRequestError('Could not read that location. Type the address instead.', ERROR_CODES.SERVICE_UNAVAILABLE);
  }
  if (!response.ok) {
    throw new BadRequestError('Could not read that location. Type the address instead.', ERROR_CODES.SERVICE_UNAVAILABLE);
  }

  const body = await response.json();
  const place = body.address || {};
  const locality = place.city || place.town || place.village || place.hamlet || place.county;
  const district = place.state_district && place.state_district !== locality ? place.state_district : '';
  const parts = [
    [place.house_number, place.road || place.pedestrian || place.footway].filter(Boolean).join(' '),
    place.neighbourhood || place.suburb,
    locality,
    district,
    place.state,
  ].filter(Boolean);
  const address = (parts.length > 1 ? parts.join(', ') : body.display_name || parts[0] || '').trim();
  if (!address) {
    throw new BadRequestError('Could not read that location. Type the address instead.', ERROR_CODES.SERVICE_UNAVAILABLE);
  }
  return address.slice(0, 255);
}

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
