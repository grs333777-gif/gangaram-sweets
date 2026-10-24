import Product from '../models/Product.js';
import * as productRepo from '../repositories/product.repository.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { ERROR_CODES } from '../constants/index.js';
import logger from '../config/logger.js';
import { parsePagination } from '../utils/helpers.js';
import { publishedExternalIds, writeMenuPrice, writeMenuRemoval } from './catalog.service.js';

export async function listCatalog() {
  const allowed = publishedExternalIds();
  const items = (await productRepo.findCatalog()).filter((product) => allowed.has(product.externalId));
  return items.map((product) => ({
    _id: product._id,
    name: product.name,
    slug: product.slug,
    externalId: product.externalId,
    description: product.description,
    category: product.category,
    images: product.images,
    tags: product.tags,
    isVeg: product.isVeg,
    isBestseller: product.isBestseller,
    isActive: product.isActive,
    variants: (product.variants || []).map((variant) => ({
      variantId: variant.variantId,
      name: variant.name,
      pricePaise: variant.pricePaise,
      isActive: variant.isActive,
    })),
  }));
}

export async function listPublicProducts(query) {
  const { page, limit, skip } = parsePagination(query, 100);
  const { items, total } = await productRepo.findProducts({
    page, limit, skip,
    category: query.category,
    search: query.search,
    sortBy: query.sortBy || 'createdAt',
    order: query.order || 'desc',
    tags: query.tags,
  });
  return { items, total, page, limit };
}

export async function getPublicProduct(slug) {
  const product = await productRepo.findProductBySlug(slug);
  if (!product) throw new NotFoundError('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
  return product;
}

export async function listAdminProducts(query) {
  const { page, limit, skip } = parsePagination(query, 1000);
  const allowed = [...publishedExternalIds()];
  const { items, total } = await productRepo.findAllProductsForAdmin({
    page, limit, skip,
    category: query.category,
    search: query.search,
    isActive: query.isActive,
    externalIds: allowed,
  });
  return { items, total, page, limit };
}

export async function getAdminProduct(id) {
  const product = await productRepo.findProductByIdForAdmin(id);
  if (!product) throw new NotFoundError('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
  return product;
}

export async function createProduct(data, adminId) {
  const product = await productRepo.createProduct(data);
  logger.info({ productId: product._id, adminId }, 'Product created');
  return product;
}

export async function updateProduct(id, updates, adminId) {
  // Prevent slug changes through update (would break existing URLs)
  delete updates.slug;
  const product = await productRepo.updateProduct(id, updates);
  if (!product) throw new NotFoundError('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
  logger.info({ productId: id, adminId }, 'Product updated');
  return product;
}

export async function deactivateProduct(id, adminId) {
  const product = await productRepo.deactivateProduct(id);
  if (!product) throw new NotFoundError('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
  logger.info({ productId: id, adminId }, 'Product deactivated');
  return product;
}

export async function activateProduct(id, adminId) {
  const product = await productRepo.activateProduct(id);
  if (!product) throw new NotFoundError('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
  logger.info({ productId: id, adminId }, 'Product activated');
  return product;
}

export async function updateStock(id, variantId, stock, adminId) {
  const product = await productRepo.updateProductStock(id, variantId, stock);
  if (!product) throw new NotFoundError('Product or variant not found', ERROR_CODES.VARIANT_NOT_FOUND);
  logger.info({ productId: id, variantId, stock, adminId }, 'Stock updated');
  return product;
}

export async function updateVariantPrice(id, variantId, pricePaise, adminId) {
  const product = await productRepo.updateVariantPrice(id, variantId, pricePaise);
  if (!product) throw new NotFoundError('Product or variant not found', ERROR_CODES.VARIANT_NOT_FOUND);
  if (product.externalId) await writeMenuPrice(product.externalId, pricePaise);
  logger.info({ productId: id, variantId, pricePaise, adminId }, 'Variant price updated');
  return product;
}

export async function updateVariantStatus(id, variantId, isActive, adminId) {
  const product = await productRepo.updateVariantStatus(id, variantId, isActive);
  if (!product) throw new NotFoundError('Product or variant not found', ERROR_CODES.VARIANT_NOT_FOUND);
  logger.info({ productId: id, variantId, isActive, adminId }, 'Variant status updated');
  return product;
}

export async function deleteProduct(id, adminId) {
  const product = await productRepo.deleteProduct(id);
  if (!product) throw new NotFoundError('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
  if (product.externalId) await writeMenuRemoval(product.externalId);
  logger.info({ productId: id, adminId }, 'Product removed');
  return product;
}

export async function addVariant(id, variant, adminId) {
  // Check for duplicate variantId
  const existing = await Product.findById(id);
  if (!existing) throw new NotFoundError('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
  const duplicateVariant = existing.variants.some((v) => v.variantId === variant.variantId);
  if (duplicateVariant) {
    throw new BadRequestError(`Variant with id '${variant.variantId}' already exists`, ERROR_CODES.CONFLICT);
  }
  const product = await productRepo.addVariant(id, variant);
  logger.info({ productId: id, variantId: variant.variantId, adminId }, 'Variant added');
  return product;
}
