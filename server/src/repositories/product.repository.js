import Product from '../models/Product.js';
import { slugify } from '../utils/helpers.js';

// ─── Public Queries ───

export async function findProducts({ page, limit, skip, category, search, sortBy, order, tags }) {
  const filter = { isActive: true };

  if (category) filter.category = category;
  if (tags) {
    const tagList = tags.split(',').map((t) => t.trim().toLowerCase());
    filter.tags = { $in: tagList };
  }

  let sort = {};
  if (search) {
    filter.$text = { $search: search };
    sort = { score: { $meta: 'textScore' } };
  } else {
    switch (sortBy) {
      case 'name':
        sort = { name: order === 'asc' ? 1 : -1 };
        break;
      case 'priceLow':
        sort = { 'variants.0.pricePaise': 1 };
        break;
      case 'priceHigh':
        sort = { 'variants.0.pricePaise': -1 };
        break;
      case 'popularity':
        sort = { isBestseller: -1, createdAt: -1 };
        break;
      default:
        sort = { createdAt: order === 'asc' ? 1 : -1 };
    }
  }

  const projection = {
    name: 1,
    slug: 1,
    description: 1,
    category: 1,
    images: 1,
    variants: 1,
    tags: 1,
    isVeg: 1,
    isBestseller: 1,
    createdAt: 1,
    ...(search ? { score: { $meta: 'textScore' } } : {}),
  };

  const [items, total] = await Promise.all([
    Product.find(filter, projection).sort(sort).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return { items, total };
}

export async function findProductBySlug(slug) {
  return Product.findOne({ slug, isActive: true }).lean();
}

// ─── Admin Queries ───

export async function findProductByIdForAdmin(id) {
  return Product.findById(id).lean();
}

export async function findAllProductsForAdmin({ page, limit, skip, category, search, isActive }) {
  const filter = {};
  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  const [items, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);
  return { items, total };
}

export async function createProduct(data) {
  const slug = data.slug || slugify(data.name);
  // Ensure unique slug
  const existing = await Product.findOne({ slug });
  const finalSlug = existing ? `${slug}-${Date.now()}` : slug;

  const product = new Product({ ...data, slug: finalSlug });
  await product.save();
  return product;
}

export async function updateProduct(id, updates) {
  return Product.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
}

export async function updateProductStock(id, variantId, stock) {
  return Product.findOneAndUpdate(
    { _id: id, 'variants.variantId': variantId },
    { $set: { 'variants.$.stock': stock } },
    { new: true },
  );
}

export async function updateVariantPrice(id, variantId, pricePaise) {
  return Product.findOneAndUpdate(
    { _id: id, 'variants.variantId': variantId },
    { $set: { 'variants.$.pricePaise': pricePaise } },
    { new: true },
  );
}

export async function updateVariantStatus(id, variantId, isActive) {
  return Product.findOneAndUpdate(
    { _id: id, 'variants.variantId': variantId },
    { $set: { 'variants.$.isActive': isActive } },
    { new: true },
  );
}

export async function deactivateProduct(id) {
  return Product.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true });
}

export async function activateProduct(id) {
  return Product.findByIdAndUpdate(id, { $set: { isActive: true } }, { new: true });
}

export async function addVariant(id, variant) {
  return Product.findByIdAndUpdate(
    id,
    { $push: { variants: variant } },
    { new: true, runValidators: true },
  );
}

// ─── Stock operations (used inside transactions) ───

/**
 * Atomically decrement stock for a variant if sufficient stock exists.
 * Returns the updated product or null if stock insufficient.
 */
export async function decrementStockAtomic(session, productId, variantId, quantity) {
  return Product.findOneAndUpdate(
    {
      _id: productId,
      isActive: true,
      variants: {
        $elemMatch: {
          variantId,
          isActive: true,
          stock: { $gte: quantity },
        },
      },
    },
    {
      $inc: { 'variants.$.stock': -quantity },
    },
    { new: true, ...(session ? { session } : {}) },
  );
}

/**
 * Atomically restore stock for a variant (used on cancellation).
 */
export async function incrementStockAtomic(session, productId, variantId, quantity) {
  return Product.findOneAndUpdate(
    {
      _id: productId,
      'variants.variantId': variantId,
    },
    {
      $inc: { 'variants.$.stock': quantity },
    },
    { new: true, ...(session ? { session } : {}) },
  );
}
