import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  discount: integer("discount").default(0),
  stock: integer("stock").notNull().default(0),
  image: text("image").notNull(),
  images: text("images").array(),
  color: text("color"),
  colors: text("colors").array(), // Available colors
  colorVariants: text("color_variants"), // JSON string for color-image mapping
  sizes: text("sizes").array(),
  featured: boolean("featured").default(false),
  isNew: boolean("is_new").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  image: text("image").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  productId: varchar("product_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
  selectedSize: text("selected_size"),
  selectedColor: text("selected_color"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  customerAddress: text("customer_address").notNull(),
  customerCity: text("customer_city").notNull(),
  customerState: text("customer_state").notNull(),
  customerZip: text("customer_zip").notNull(),
  paymentMethod: text("payment_method").notNull().default("cod"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  items: text("items").notNull(), // JSON string of cart items
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  shipping: decimal("shipping", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
}).extend({
  originalPrice: z.string().optional(),
  isNew: z.boolean().optional().default(false),
  images: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  colorVariants: z.string().optional(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchemaZod = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().min(1).optional(),
  customerAddress: z.string().min(1),
  customerCity: z.string().min(1),
  customerState: z.string().min(1),
  customerZip: z.string().min(1),
  paymentMethod: z.enum(["cod", "jazzcash", "card", "bank"]).default("cod"),
  paymentStatus: z.enum(["pending", "processing", "completed", "failed"]).default("pending"),
  items: z.string(), // JSON string of cart items
  subtotal: z.string(),
  tax: z.string(),
  shipping: z.string(),
  total: z.string(),
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]).default("pending"),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const Product = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.string(),
  originalPrice: z.string().optional(),
  image: z.string(),
  images: z.array(z.union([z.string(), z.object({ url: z.string() })])).optional(),
  category: z.string(),
  subcategory: z.string().optional(),
  sizes: z.array(z.string()).default(["One Size"]),
  colors: z.array(z.string()).default([]),
  colorVariants: z.union([z.string(), z.array(z.object({
    color: z.string(),
    images: z.array(z.union([z.string(), z.object({ url: z.string() })]))
  }))]).optional(),
  stock: z.number().default(0),
  featured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  createdAt: z.string().optional(),
  color: z.string().optional(),
});
