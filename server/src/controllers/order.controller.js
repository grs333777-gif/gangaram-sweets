import * as orderService from '../services/order.service.js';
import { asyncHandler, successResponse, paginatedResponse } from '../utils/helpers.js';

// ─── Customer ───

export const checkout = asyncHandler(async (req, res) => {
  const idempotencyKey = req.headers['idempotency-key'] || null;
  const result = await orderService.checkout(req.user._id, req.body, idempotencyKey);
  return successResponse(res, result, 201);
});

export const trackOrder = asyncHandler(async (req, res) => {
  const order = await orderService.trackOrder(req.body.orderNumber, req.body.phone);
  return successResponse(res, order);
});

export const getOrders = asyncHandler(async (req, res) => {
  const { orders, total, page, limit } = await orderService.getCustomerOrders(
    req.user._id,
    req.query,
  );
  return paginatedResponse(res, orders, { page, limit, total });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getCustomerOrderById(req.user._id, req.params.id);
  return successResponse(res, order);
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};
  const order = await orderService.cancelOrder(req.user._id, req.params.id, reason);
  return successResponse(res, {
    _id: order._id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    stockRestored: order.stockRestored,
  });
});

// ─── Admin ───

export const adminGetOrders = asyncHandler(async (req, res) => {
  const { orders, total, page, limit } = await orderService.getAdminOrders(req.query);
  return paginatedResponse(res, orders, { page, limit, total });
});

export const adminGetOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getAdminOrderById(req.params.id);
  return successResponse(res, order);
});

export const adminUpdateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const order = await orderService.updateOrderStatus(
    req.params.id,
    status,
    req.user._id,
    note,
  );
  return successResponse(res, {
    _id: order._id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    statusHistory: order.statusHistory,
  });
});

export const adminCancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.adminCancelOrder(
    req.params.id,
    req.user._id,
    req.body?.reason,
  );
  return successResponse(res, {
    _id: order._id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
  });
});

export const adminRefundOrder = asyncHandler(async (req, res) => {
  const order = await orderService.adminRefundOrder(req.params.id, req.user._id);
  return successResponse(res, {
    _id: order._id,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
  });
});
