import menu from './menu.json';

const categories = menu.categories.map((cat, index) => ({
  _id: cat.id,
  name: cat.name,
  slug: cat.slug,
  description: cat.description,
  image: cat.image,
  order: index + 1,
}));

export default categories;
