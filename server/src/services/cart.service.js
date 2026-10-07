import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { ERROR_CODES } from '../constants/index.js';
import config from '../config/env.js';

/**
 * Get or compute enriched cart details (never trusts stored price).
 * Returns raw cart items (productId, variantId, quantity only).
 */
export async function getCart(userId) {
  const cart = await Cart.findOne({ userId }).lean();
  if (!cart) return { items: [] };
  return cart;
}

/**
 * Add item to cart — validates product and variant existence and availability.
 */
export async function addItem(userId, { productId, variantId, quantity }) {
  const product = await Product.findById(productId).lean();
  if (!product) throw new NotFoundError('Product not found', ERROR_CODES.PRODUCT_NOT_FOUND);
  if (!product.isActive) throw new BadRequestError('Product is not available', ERROR_CODES.PRODUCT_INACTIVE);

  const variant = product.variants.find((v) => v.variantId === variantId);
  if (!variant) throw new NotFoundError('Variant not found', ERROR_CODES.VARIANT_NOT_FOUND);
  if (!variant.isActive) throw new BadRequestError('Variant is not available', ERROR_CODES.VARIANT_INACTIVE);
  if (variant.stock < quantity) {
    throw new BadRequestError(
      `Only ${variant.stock} units available`,
      ERROR_CODES.INSUFFICIENT_STOCK,
    );
  }

  const cart = await Cart.findOne({ userId });
  if (cart) {
    const existingItem = cart.items.find(
      (i) => i.productId.toString() === productId && i.variantId === variantId,
    );

    if (existingItem) {
      const newQty = existingItem.quantity + quantity;
      if (newQty > config.MAX_CART_ITEM_QUANTITY) {
        throw new BadRequestError(
          `Maximum quantity per item is ${config.MAX_CART_ITEM_QUANTITY}`,
          ERROR_CODES.INVALID_INPUT,
        );
      }
      existingItem.quantity = newQty;
    } else {
      if (cart.items.length >= config.MAX_CART_ITEMS) {
        throw new BadRequestError(
          `Cart cannot exceed ${config.MAX_CART_ITEMS} items`,
          ERROR_CODES.INVALID_INPUT,
        );
      }
      cart.items.push({ productId, variantId, quantity });
    }
    await cart.save();
    return cart;
  }

  const newCart = await Cart.create({
    userId,
    items: [{ productId, variantId, quantity }],
  });
  return newCart;
}

/**
 * Update quantity of a specific item.
 */
export async function updateItem(userId, variantId, quantity) {
  const cart = await Cart.findOne({ userId });
  if (!cart) throw new NotFoundError('Cart not found', ERROR_CODES.NOT_FOUND);

  const item = cart.items.find((i) => i.variantId === variantId);
  if (!item) throw new NotFoundError('Item not in cart', ERROR_CODES.NOT_FOUND);

  if (quantity > config.MAX_CART_ITEM_QUANTITY) {
    throw new BadRequestError(
      `Maximum quantity per item is ${config.MAX_CART_ITEM_QUANTITY}`,
      ERROR_CODES.INVALID_INPUT,
    );
  }

  // Validate current stock
  const product = await Product.findById(item.productId).lean();
  if (!product || !product.isActive) {
    throw new BadRequestError('Product no longer available', ERROR_CODES.PRODUCT_INACTIVE);
  }
  const variant = product.variants.find((v) => v.variantId === variantId);
  if (!variant || !variant.isActive) {
    throw new BadRequestError('Variant no longer available', ERROR_CODES.VARIANT_INACTIVE);
  }
  if (variant.stock < quantity) {
    throw new BadRequestError(
      `Only ${variant.stock} units available`,
      ERROR_CODES.INSUFFICIENT_STOCK,
    );
  }

  item.quantity = quantity;
  await cart.save();
  return cart;
}

/**
 * Remove a specific item by variantId.
 */
export async function removeItem(userId, variantId) {
  const cart = await Cart.findOne({ userId });
  if (!cart) return;
  cart.items = cart.items.filter((i) => i.variantId !== variantId);
  await cart.save();
  return cart;
}

/**
 * Clear the entire cart.
 */
export async function clearCart(userId, session = null) {
  await Cart.findOneAndUpdate({ userId }, { $set: { items: [] } }, session ? { session } : {});
}

/**
 * Get enriched cart with product details and computed prices.
 * Used for display — prices always fetched from DB.
 */
export async function getEnrichedCart(userId) {
  const cart = await Cart.findOne({ userId }).lean();
  if (!cart || cart.items.length === 0) return { items: [], subtotalPaise: 0 };

  const productIds = [...new Set(cart.items.map((i) => i.productId.toString()))];
  const products = await Product.find({
    _id: { $in: productIds },
    isActive: true,
  }).lean();

  const productMap = new Map(products.map((p) => [p._id.toString(), p]));
  const enrichedItems = [];
  let subtotalPaise = 0;

  for (const item of cart.items) {
    const product = productMap.get(item.productId.toString());
    if (!product || !product.isActive) continue;

    const variant = product.variants.find(
      (v) => v.variantId === item.variantId && v.isActive,
    );
    if (!variant) continue;

    const itemSubtotal = variant.pricePaise * item.quantity;
    subtotalPaise += itemSubtotal;

    enrichedItems.push({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      productName: product.name,
      variantName: variant.name,
      pricePaise: variant.pricePaise,
      subtotalPaise: itemSubtotal,
      images: product.images,
      slug: product.slug,
    });
  }

  return { items: enrichedItems, subtotalPaise };
}
