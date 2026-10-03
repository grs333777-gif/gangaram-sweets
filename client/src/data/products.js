import menu from './menu.json';

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const products = menu.categories.flatMap((cat) =>
  cat.items.map((item, index) => ({
    _id: `${cat.id}-${index + 1}`,
    name: item.name,
    slug: slugify(item.name),
    category: cat.id,
    categoryName: cat.name,
    description: item.description,
    isVeg: true,
    isBestseller: Boolean(item.bestseller),
    inStock: true,
    isMrp: Boolean(item.mrp),
    variants: [
      {
        weight: 'Plate',
        price: item.mrp ? null : item.price,
      },
    ],
    images: [item.image || cat.image],
    tags: item.bestseller ? ['bestseller'] : [],
  }))
);

export default products;
