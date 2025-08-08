import {
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Category,
  type InsertCategory,
  type CartItem,
  type InsertCartItem,
  type Order,
  type InsertOrder,
} from "@shared/schema";
import { randomUUID } from "crypto";
import fs from "fs/promises";
import path from "path";

// Folder aur file path define
const dataDir = path.join(process.cwd(), "server", "data");
const productsFile = path.join(dataDir, "products.json");
const categoriesFile = path.join(dataDir, "categories.json");

// Ensure directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch {}
}

// Product read/write functions
async function readProducts(): Promise<Product[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(productsFile, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeProducts(products: Product[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(productsFile, JSON.stringify(products, null, 2), "utf-8");
}

// Category read/write functions
async function readCategories(): Promise<Category[]> {
  try {
    await ensureDataDir();
    const data = await fs.readFile(categoriesFile, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeCategories(categories: Category[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(
    categoriesFile,
    JSON.stringify(categories, null, 2),
    "utf-8",
  );
}

// In-memory for users, cart items & orders (you can make these permanent too later)
let users: User[] = [];
let cartItems: CartItem[] = [];
let orders: Order[] = [];

// Shipping settings
let shippingSettings = {
  freeShippingThreshold: 2000, // PKR
  standardShipping: 200, // PKR
  expressShipping: 500, // PKR
  cityWiseShipping: {
    karachi: 150,
    lahore: 180,
    islamabad: 200,
    other: 250
  }
};

export const storage = {
  // USERS
  async getUser(id: string) {
    return users.find((u) => u.id === id);
  },
  async getUserByUsername(username: string) {
    return users.find((u) => u.username === username);
  },
  async createUser(user: InsertUser) {
    const newUser = { ...user, id: randomUUID() };
    users.push(newUser);
    return newUser;
  },

  // PRODUCTS
  async getProducts() {
    return await readProducts();
  },
  async getProduct(id: string) {
    const products = await readProducts();
    return products.find((p) => p.id === id);
  },
  async getProductsByCategory(category: string) {
    const products = await readProducts();
    return products.filter(
      (p) => p.category.toLowerCase() === category.toLowerCase(),
    );
  },
  async getFeaturedProducts() {
    const products = await readProducts();
    return products.filter((p) => p.isFeatured);
  },
  async getNewArrivals() {
    const products = await readProducts();
    return products.filter((p) => p.isNewArrival);
  },
  async getSaleProducts() {
    const products = await readProducts();
    return products.filter((p) => p.discount && p.discount > 0);
  },
  async createProduct(productData: any): Promise<Product> {
    const id = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Ensure images are properly formatted
    let images = [];
    if (productData.images && Array.isArray(productData.images)) {
      images = productData.images;
    } else if (productData.image) {
      images = [productData.image];
    }

    const newProduct: Product = {
      id,
      ...productData,
      images: images, // Store images as array
      image: images[0] || productData.image, // Keep primary image for compatibility
      createdAt: new Date().toISOString(),
    };

    const products = await readProducts();
    products.push(newProduct);
    await writeProducts(products);
    return newProduct;
  },
  async updateProduct(id: string, update: any): Promise<Product | undefined> {
    const products = await readProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return undefined;

    // Ensure images are properly formatted
    let images = [];
    if (update.images && Array.isArray(update.images)) {
      images = update.images;
    } else if (update.image) {
      images = [update.image];
    }

    const updatedProduct = {
      ...products[index],
      ...update,
      images: images.length > 0 ? images : products[index].images || [],
      image: images[0] || update.image || products[index].image, // Keep primary image
      colors: update.colors || products[index].colors || [],
      colorVariants: update.colorVariants || products[index].colorVariants || null,
    };
    products[index] = updatedProduct;
    await writeProducts(products);
    return products[index];
  },
  async deleteProduct(id: string) {
    const products = await readProducts();
    const filtered = products.filter((p) => p.id !== id);
    const changed = filtered.length !== products.length;
    if (changed) {
      await writeProducts(filtered);
    }
    return changed;
  },

  // CATEGORIES
  async getCategories() {
    return await readCategories();
  },
  async getCategory(id: string) {
    const categories = await readCategories();
    return categories.find((c) => c.id === id);
  },
  async createCategory(category: InsertCategory) {
    const categories = await readCategories();
    const newCategory = { ...category, id: randomUUID() };
    categories.push(newCategory);
    await writeCategories(categories);
    return newCategory;
  },
  async updateCategory(id: string, update: Partial<InsertCategory>) {
    const categories = await readCategories();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) return undefined;
    categories[index] = { ...categories[index], ...update };
    await writeCategories(categories);
    return categories[index];
  },
  async deleteCategory(id: string) {
    const categories = await readCategories();
    const filtered = categories.filter((c) => c.id !== id);
    const changed = filtered.length !== categories.length;
    if (changed) {
      await writeCategories(filtered);
    }
    return changed;
  },

  // CART
  async getCartItems(sessionId: string) {
    return cartItems.filter((item) => item.sessionId === sessionId);
  },
  async addToCart(item: InsertCartItem) {
    // Check if item already exists
    const existingIndex = cartItems.findIndex(
      (i) => i.sessionId === item.sessionId &&
             i.productId === item.productId &&
             i.selectedSize === item.selectedSize &&
             i.selectedColor === item.selectedColor
    );

    if (existingIndex !== -1) {
      // Update quantity if item exists
      cartItems[existingIndex].quantity += item.quantity;
      return cartItems[existingIndex];
    } else {
      // Add new item
      const newItem = { ...item, id: randomUUID() };
      cartItems.push(newItem);
      return newItem;
    }
  },
  async updateCartItem(itemId: string, update: { quantity: number }) {
    const index = cartItems.findIndex((item) => item.id === itemId);
    if (index === -1) return undefined;
    cartItems[index] = { ...cartItems[index], ...update };
    return cartItems[index];
  },
  async removeFromCart(itemId: string) {
    const filtered = cartItems.filter((item) => item.id !== itemId);
    const changed = filtered.length !== cartItems.length;
    if (changed) {
      cartItems.length = 0;
      cartItems.push(...filtered);
    }
    return changed;
  },
  async clearCart(sessionId: string) {
    const filtered = cartItems.filter((item) => item.sessionId !== sessionId);
    cartItems.length = 0;
    cartItems.push(...filtered);
    return true;
  },

  // ORDERS
  async getOrders() {
    return orders;
  },
  async getOrder(id: string) {
    return orders.find((o) => o.id === id);
  },
  async createOrder(order: InsertOrder) {
    const newOrder = {
      ...order,
      id: randomUUID(),
      orderNumber: "ORD" + Math.floor(Math.random() * 100000),
    };
    orders.push(newOrder);
    return newOrder;
  },

  // SHIPPING SETTINGS
  async getShippingSettings() {
    return shippingSettings;
  },
  async updateShippingSettings(updates: any) {
    shippingSettings = { ...shippingSettings, ...updates };
    return shippingSettings;
  },
};
