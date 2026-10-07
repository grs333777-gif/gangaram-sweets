import * as cartService from '../services/cart.service.js';
import { asyncHandler, successResponse } from '../utils/helpers.js';

export const getCart = asyncHandler(async (req, res) => {
  const cart = await cartService.getEnrichedCart(req.user._id);
  return successResponse(res, cart);
});

export const addItem = asyncHandler(async (req, res) => {
  const cart = await cartService.addItem(req.user._id, req.body);
  const enriched = await cartService.getEnrichedCart(req.user._id);
  return successResponse(res, enriched, 201);
});

export const updateItem = asyncHandler(async (req, res) => {
  await cartService.updateItem(req.user._id, req.params.variantId, req.body.quantity);
  const enriched = await cartService.getEnrichedCart(req.user._id);
  return successResponse(res, enriched);
});

export const removeItem = asyncHandler(async (req, res) => {
  await cartService.removeItem(req.user._id, req.params.variantId);
  const enriched = await cartService.getEnrichedCart(req.user._id);
  return successResponse(res, enriched);
});

export const clearCart = asyncHandler(async (req, res) => {
  await cartService.clearCart(req.user._id);
  return successResponse(res, { items: [], subtotalPaise: 0 });
});
