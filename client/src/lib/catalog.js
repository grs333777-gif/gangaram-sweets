import categories from '../data/categories';

const categoryNameById = new Map(categories.map((category) => [category._id, category.name]));

export function categoryName(categoryId) {
  return categoryNameById.get(categoryId) || categoryId || 'Menu';
}

export function toMenuProduct(product) {
  const variants = (product.variants || []).map((variant) => {
    const rupees = Number(variant.pricePaise) / 100;
    const priced = product.isActive !== false && variant.isActive !== false && Number.isFinite(rupees) && rupees > 0;
    return {
      weight: variant.name || 'Plate',
      price: priced ? rupees : null,
      variantId: variant.variantId,
    };
  });

  return {
    _id: product.externalId || String(product._id),
    name: product.name,
    slug: product.slug,
    category: product.category,
    categoryName: categoryName(product.category),
    description: product.description || '',
    isVeg: product.isVeg !== false,
    isBestseller: Boolean(product.isBestseller),
    inStock: true,
    isMrp: variants.every((variant) => variant.price == null),
    variants: variants.length ? variants : [{ weight: 'Plate', price: null }],
    images: product.images?.length ? product.images : ['/logo.jpeg'],
    tags: product.tags || [],
  };
}
