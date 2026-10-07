import User from '../models/User.js';
import { serviceabilityService } from './serviceability.service.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { ERROR_CODES } from '../constants/index.js';
import logger from '../config/logger.js';

/**
 * Get all addresses for a user.
 */
export async function getUserAddresses(userId) {
  const user = await User.findById(userId).select('addresses').lean();
  if (!user) throw new NotFoundError('User not found');
  return user.addresses;
}

/**
 * Get a single address — enforces ownership (IDOR prevention).
 */
export async function getAddressById(userId, addressId) {
  const user = await User.findById(userId).select('addresses').lean();
  if (!user) throw new NotFoundError('User not found');
  const address = user.addresses.find((a) => a._id.toString() === addressId);
  if (!address) throw new NotFoundError('Address not found', ERROR_CODES.ADDRESS_NOT_FOUND);
  return address;
}

/**
 * Add a new address. If isDefault, unset existing defaults.
 */
export async function addAddress(userId, data) {
  const user = await User.findById(userId).select('addresses');
  if (!user) throw new NotFoundError('User not found');

  // Validate serviceability
  if (data.pincode) {
    const serviceable = await serviceabilityService.isServiceable(data.pincode);
    if (!serviceable) {
      throw new BadRequestError(
        'Sorry, we do not deliver to this pincode yet.',
        ERROR_CODES.ADDRESS_NOT_SERVICEABLE,
      );
    }
  }

  if (data.isDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  user.addresses.push(data);
  await user.save();

  logger.info({ userId, addressCount: user.addresses.length }, 'Address added');
  return user.addresses[user.addresses.length - 1];
}

/**
 * Update an address by ID — ownership enforced.
 */
export async function updateAddress(userId, addressId, updates) {
  const user = await User.findById(userId).select('addresses');
  if (!user) throw new NotFoundError('User not found');

  const address = user.addresses.id(addressId);
  if (!address) throw new NotFoundError('Address not found', ERROR_CODES.ADDRESS_NOT_FOUND);

  // Validate serviceability on pincode change
  const newPincode = updates.pincode || address.pincode;
  if (updates.pincode && updates.pincode !== address.pincode) {
    const serviceable = await serviceabilityService.isServiceable(updates.pincode);
    if (!serviceable) {
      throw new BadRequestError(
        'Sorry, we do not deliver to this pincode yet.',
        ERROR_CODES.ADDRESS_NOT_SERVICEABLE,
      );
    }
  }

  if (updates.isDefault) {
    user.addresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  Object.assign(address, updates);
  await user.save();

  logger.info({ userId, addressId }, 'Address updated');
  return address;
}

/**
 * Delete an address by ID — ownership enforced.
 */
export async function deleteAddress(userId, addressId) {
  const user = await User.findById(userId).select('addresses');
  if (!user) throw new NotFoundError('User not found');

  const address = user.addresses.id(addressId);
  if (!address) throw new NotFoundError('Address not found', ERROR_CODES.ADDRESS_NOT_FOUND);

  address.deleteOne();
  await user.save();

  logger.info({ userId, addressId }, 'Address deleted');
}
