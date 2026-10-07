import * as addressService from '../services/address.service.js';
import { asyncHandler, successResponse } from '../utils/helpers.js';

export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await addressService.getUserAddresses(req.user._id);
  return successResponse(res, addresses);
});

export const getAddress = asyncHandler(async (req, res) => {
  const address = await addressService.getAddressById(req.user._id, req.params.id);
  return successResponse(res, address);
});

export const addAddress = asyncHandler(async (req, res) => {
  const address = await addressService.addAddress(req.user._id, req.body);
  return successResponse(res, address, 201);
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await addressService.updateAddress(req.user._id, req.params.id, req.body);
  return successResponse(res, address);
});

export const deleteAddress = asyncHandler(async (req, res) => {
  await addressService.deleteAddress(req.user._id, req.params.id);
  return successResponse(res, { message: 'Address deleted successfully' });
});
