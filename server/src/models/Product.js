import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema(
  {
    variantId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    pricePaise: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'pricePaise must be an integer',
      },
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'stock must be an integer',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    externalId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    images: {
      type: [String],
      default: [],
    },
    variants: {
      type: [variantSchema],
      validate: {
        validator: (v) => v.length > 0,
        message: 'Product must have at least one variant',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    isVeg: {
      type: Boolean,
      default: true,
    },
    isBestseller: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// ─── Indexes ───
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ isActive: 1, isBestseller: 1 });
productSchema.index({ tags: 1, isActive: 1 });
productSchema.index(
  { name: 'text', description: 'text', category: 'text', tags: 'text' },
  { weights: { name: 10, tags: 5, category: 3, description: 1 }, name: 'product_text_search' },
);

const Product = mongoose.model('Product', productSchema);
export default Product;
