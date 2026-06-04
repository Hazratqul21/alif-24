import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.STRING, defaultValue: 'customer' },
  avatar: { type: DataTypes.STRING },
  rating: { type: DataTypes.FLOAT, defaultValue: 0 },
  totalSales: { type: DataTypes.INTEGER, defaultValue: 0 },
  joinedAt: { type: DataTypes.STRING },
  bio: { type: DataTypes.TEXT },
  phone: { type: DataTypes.STRING },
  company: { type: DataTypes.STRING }
});

export const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  sellerId: { type: DataTypes.UUID, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  category: { type: DataTypes.STRING },
  price: { type: DataTypes.INTEGER, allowNull: false },
  originalPrice: { type: DataTypes.INTEGER },
  stock: { type: DataTypes.INTEGER, defaultValue: 0 },
  image: { type: DataTypes.STRING },
  images: { type: DataTypes.JSONB, defaultValue: [] },
  description: { type: DataTypes.TEXT },
  tags: { type: DataTypes.JSONB, defaultValue: [] },
  priceTiers: { type: DataTypes.JSONB, defaultValue: [] },
  rating: { type: DataTypes.FLOAT, defaultValue: 0 },
  reviews: { type: DataTypes.INTEGER, defaultValue: 0 },
  sold: { type: DataTypes.INTEGER, defaultValue: 0 },
  minOrder: { type: DataTypes.INTEGER, defaultValue: 1 }
});

export const Order = sequelize.define('Order', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  contractNumber: { type: DataTypes.STRING },
  customerId: { type: DataTypes.UUID, allowNull: false },
  buyerName: { type: DataTypes.STRING },
  buyerCompany: { type: DataTypes.STRING },
  buyerPhone: { type: DataTypes.STRING },
  items: { type: DataTypes.JSONB, defaultValue: [] },
  subtotal: { type: DataTypes.INTEGER, defaultValue: 0 },
  deliveryFee: { type: DataTypes.INTEGER, defaultValue: 0 },
  total: { type: DataTypes.INTEGER, defaultValue: 0 },
  address: { type: DataTypes.STRING },
  coords: { type: DataTypes.JSONB },
  paymentMethod: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  transferReceipt: { type: DataTypes.JSONB }
});

export const Review = sequelize.define('Review', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  productId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  userName: { type: DataTypes.STRING },
  rating: { type: DataTypes.INTEGER, defaultValue: 5 },
  comment: { type: DataTypes.TEXT }
});

export const CartItem = sequelize.define('CartItem', {
  id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
  userId: { type: DataTypes.UUID, allowNull: false },
  productId: { type: DataTypes.UUID, allowNull: false },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 }
});

// Relationships
User.hasMany(Product, { foreignKey: 'sellerId', as: 'products' });
Product.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

User.hasMany(Order, { foreignKey: 'customerId', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

Product.hasMany(Review, { foreignKey: 'productId', as: 'reviewsList' });
Review.belongsTo(Product, { foreignKey: 'productId' });

User.hasMany(CartItem, { foreignKey: 'userId', as: 'cart' });
CartItem.belongsTo(User, { foreignKey: 'userId' });
CartItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

export default { User, Product, Order, Review, CartItem, sequelize };
