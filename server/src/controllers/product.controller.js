import * as productService from '../services/product.service.js';
import { asyncHandler, successResponse, paginatedResponse } from '../utils/helpers.js';

// ─── Public ───

export const listProducts = asyncHandler(async (req, res) => {
  const { items, total, page, limit } = await productService.listPublicProducts(req.query);
  return paginatedResponse(res, items, { page, limit, total });
});

export const getProduct = asyncHandler(async (req, res) => {
  const product = await productService.getPublicProduct(req.params.slug);
  return successResponse(res, product);
});

// ─── Admin ───

export const adminListProducts = asyncHandler(async (req, res) => {
  const { items, total, page, limit } = await productService.listAdminProducts(req.query);
  return paginatedResponse(res, items, { page, limit, total });
});

export const adminGetProduct = asyncHandler(async (req, res) => {
  const product = await productService.getAdminProduct(req.params.id);
  return successResponse(res, product);
});

export const adminCreateProduct = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, req.user._id);
  return successResponse(res, product, 201);
});

export const adminUpdateProduct = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body, req.user._id);
  return successResponse(res, product);
});

export const adminDeactivateProduct = asyncHandler(async (req, res) => {
  const product = await productService.deactivateProduct(req.params.id, req.user._id);
  return successResponse(res, product);
});

export const adminActivateProduct = asyncHandler(async (req, res) => {
  const product = await productService.activateProduct(req.params.id, req.user._id);
  return successResponse(res, product);
});

export const adminUpdateStock = asyncHandler(async (req, res) => {
  const { variantId, stock } = req.body;
  const product = await productService.updateStock(req.params.id, variantId, stock, req.user._id);
  return successResponse(res, product);
});

export const adminUpdateVariantPrice = asyncHandler(async (req, res) => {
  const { variantId, pricePaise } = req.body;
  const product = await productService.updateVariantPrice(
    req.params.id, variantId, pricePaise, req.user._id,
  );
  return successResponse(res, product);
});

export const adminUpdateVariantStatus = asyncHandler(async (req, res) => {
  const { variantId, isActive } = req.body;
  const product = await productService.updateVariantStatus(
    req.params.id, variantId, isActive, req.user._id,
  );
  return successResponse(res, product);
});

export const adminAddVariant = asyncHandler(async (req, res) => {
  const product = await productService.addVariant(req.params.id, req.body, req.user._id);
  return successResponse(res, product);
});
