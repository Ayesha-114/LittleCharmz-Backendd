import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertProductSchema,
  insertCategorySchema,
  insertOrderSchema,
} from "@shared/schema";
import { z } from "zod";

// Importing multer for file uploads
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = "uploads";
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Setting up storage for uploaded files
const storageConfig = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Ensure this 'uploads' directory exists in your project root
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

const upload = multer({ storage: storageConfig });

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files statically
  app.use("/uploads", express.static("uploads"));
  app.use(
    "/uploads",
    (req, res, next) => {
      // Add CORS headers for images
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept",
      );
      next();
    },
    express.static("uploads"),
  );

  // Admin authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    const { authorization } = req.headers;
    if (
      authorization === "admin-token-123" ||
      authorization === "admin-token"
    ) {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  };

  // Store admin credentials (in production, use database)
  let adminCredentials = {
    email: "admin@littlecharmz.com",
    password: "admin123",
  };

  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    const { email, password } = req.body;

    if (
      email === adminCredentials.email &&
      password === adminCredentials.password
    ) {
      res.json({ success: true, token: "admin-token-123" });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });

  // Update admin credentials
  app.post("/api/admin/update-credentials", async (req, res) => {
    const { currentEmail, currentPassword, newEmail, newPassword } = req.body;

    // Verify current credentials
    if (
      currentEmail !== adminCredentials.email ||
      currentPassword !== adminCredentials.password
    ) {
      return res
        .status(401)
        .json({ message: "Current credentials are incorrect" });
    }

    // Update credentials
    adminCredentials.email = newEmail;
    adminCredentials.password = newPassword;

    res.json({ success: true, message: "Credentials updated successfully" });
  });

  // Get all products with pagination
  app.get("/api/products", async (req, res) => {
    try {
      const { category, featured, page = "1", limit = "12" } = req.query;
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      let products = await storage.getProducts();

      if (category && category !== "all" && category !== "") {
        if (category === "new-arrivals") {
          products = await storage.getNewArrivals();
        } else if (category === "sale") {
          products = await storage.getSaleProducts();
        } else if (typeof category === "string" && category.includes(",")) {
          // Handle multiple categories (e.g., "ladies-formal,ladies-casual,ladies-fancy")
          const categories = category.split(",").map((c) => c.trim());
          products = products.filter((p) => categories.includes(p.category));
        } else {
          // Filter by single category
          products = products.filter((p) => p.category === category);
        }
      }

      if (featured === "true") {
        products = products.filter((p) => p.featured);
      }

      // Apply pagination
      const total = products.length;
      const paginatedProducts = products.slice(offset, offset + limitNum);

      res.json({
        products: paginatedProducts,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalProducts: total,
          hasMore: offset + limitNum < total,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  // Get new arrivals
  app.get("/api/products/new-arrivals", async (req, res) => {
    try {
      const products = await storage.getNewArrivals();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching new arrivals" });
    }
  });

  // Get sale products
  app.get("/api/products/sale", async (req, res) => {
    try {
      const products = await storage.getSaleProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching sale products" });
    }
  });

  // Get single product
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Error fetching product" });
    }
  });

  // Create product (admin only)
  // Updated to handle file uploads using multer and color variants
  app.post("/api/products", upload.array("images", 20), async (req, res) => {
    try {
      const token = req.headers.authorization;
      if (token !== "admin-token-123") {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const {
        name,
        description,
        category,
        price,
        discount,
        stock,
        color,
        colors,
        colorVariants,
        sizes,
        featured,
        isNew,
        image, // URL image
      } = req.body;

      let imageUrls: string[] = [];
      let primaryImage = "";
      let parsedColorVariants = null;

      // Handle uploaded files
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        imageUrls = req.files.map((file: any) => `/uploads/${file.filename}`);
        primaryImage = imageUrls[0]; // First uploaded image as primary
      }
      // Handle URL image if no files uploaded
      else if (image) {
        imageUrls = [image];
        primaryImage = image;
      }

      // Parse color variants and map uploaded files to color variant images
      if (colorVariants) {
        try {
          const variants = JSON.parse(colorVariants);
          
          // Map uploaded files to color variants
          const processedVariants = variants.map((variant: any) => {
            const processedImages = variant.images.map((imageName: string) => {
              // Check if this is a file name that was uploaded
              const uploadedFile = req.files?.find((file: any) => 
                file.filename === imageName || file.originalname === imageName
              );
              
              if (uploadedFile) {
                return `/uploads/${uploadedFile.filename}`;
              }
              
              // If it starts with variant_ prefix, it's a mapped file
              if (imageName.startsWith('variant_')) {
                const actualFile = req.files?.find((file: any) => 
                  file.filename === imageName
                );
                if (actualFile) {
                  return `/uploads/${actualFile.filename}`;
                }
              }
              
              // Otherwise return as-is (URL)
              return imageName;
            });
            
            return {
              color: variant.color,
              images: processedImages
            };
          });
          
          parsedColorVariants = JSON.stringify(processedVariants);
        } catch (e) {
          console.error("Error parsing color variants:", e);
        }
      }

      // If no regular images but color variants exist, use color variant images
      if (imageUrls.length === 0 && parsedColorVariants) {
        try {
          const variants = JSON.parse(parsedColorVariants);
          if (
            variants.length > 0 &&
            variants[0].images &&
            variants[0].images.length > 0
          ) {
            primaryImage = variants[0].images[0];
            imageUrls = variants[0].images;
          }
        } catch (e) {
          console.error("Error extracting images from color variants:", e);
        }
      }

      if (!primaryImage && imageUrls.length === 0) {
        return res
          .status(400)
          .json({ message: "At least one image is required" });
      }

      const newProduct = await storage.createProduct({
        name,
        description: description || "",
        category,
        price,
        discount: parseInt(discount) || 0,
        stock: parseInt(stock) || 0,
        image: primaryImage, // Primary image for compatibility
        color: color || "",
        colors: colors ? JSON.parse(colors) : [],
        colorVariants: parsedColorVariants,
        sizes: sizes ? JSON.parse(sizes) : [],
        featured: featured === "true",
        isNew: isNew === "true",
        images: imageUrls, // All images
      });

      res.json(newProduct);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Update product (admin only)
  app.put(
    "/api/products/:id",
    upload.array("images", 20),
    requireAuth,
    async (req, res) => {
      try {
        const {
          name,
          description,
          category,
          price,
          discount,
          stock,
          color,
          colors,
          colorVariants,
          sizes,
          featured,
          isNew,
          existingImages,
        } = req.body;

        let imageUrls: string[] = [];

        // Handle existing images
        if (existingImages) {
          try {
            imageUrls = JSON.parse(existingImages);
          } catch (e) {
            console.error("Error parsing existing images:", e);
          }
        }

        // Handle new uploaded files
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
          const newImageUrls = req.files.map(
            (file) => `/uploads/${file.filename}`,
          );
          imageUrls = [...imageUrls, ...newImageUrls];
        }

        // Parse color variants - simplified to just store color names  
        let parsedColorVariants = null;
        if (colorVariants) {
          try {
            const variants = JSON.parse(colorVariants);
            parsedColorVariants = JSON.stringify(variants);
          } catch (e) {
            console.error("Error parsing color variants:", e);
          }
        }

        const updates = {
          name,
          description: description || "",
          category,
          price,
          discount: parseInt(discount) || 0,
          stock: parseInt(stock) || 0,
          color: color || "",
          colors: colors ? JSON.parse(colors) : [],
          colorVariants: parsedColorVariants,
          sizes: sizes ? JSON.parse(sizes) : [],
          featured: featured === "true",
          isNew: isNew === "true",
          images: imageUrls,
          image: imageUrls.length > 0 ? imageUrls[0] : "", // Primary image
        };

        const product = await storage.updateProduct(req.params.id, updates);
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }
        res.json(product);
      } catch (error) {
        console.error("Error updating product:", error);
        res.status(500).json({ message: "Error updating product" });
      }
    },
  );

  // Delete product (admin only)
  app.delete("/api/products/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting product" });
    }
  });

  // Create order
  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);

      // Process payment based on method
      let paymentStatus = "pending";
      if (orderData.paymentMethod === "cod") {
        paymentStatus = "pending"; // COD stays pending until delivery
      } else if (orderData.paymentMethod === "jazzcash") {
        paymentStatus = "processing"; // Would integrate with JazzCash API
      } else if (orderData.paymentMethod === "card") {
        paymentStatus = "processing"; // Would integrate with payment gateway
      } else if (orderData.paymentMethod === "bank") {
        paymentStatus = "pending"; // Bank transfer requires manual verification
      }

      const order = await storage.createOrder({
        ...orderData,
        paymentStatus,
      });

      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid order data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error creating order" });
      }
    }
  });

  // Create payment intent for Stripe
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;

      // If Stripe is not configured, return an error
      if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(400).json({
          message:
            "Payment processing not configured. Please set up Stripe keys.",
        });
      }

      const Stripe = require("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          integration_check: "accept_a_payment",
        },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({
        message: "Error creating payment intent: " + error.message,
      });
    }
  });

  // Get orders (admin only)
  app.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Error fetching orders" });
    }
  });

  // Get single order
  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Error fetching order" });
    }
  });

  // Category routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching categories" });
    }
  });

  app.post("/api/categories", upload.single("image"), requireAuth, async (req, res) => {
    try {
      const { name, description, image: imageUrl } = req.body;

      let finalImageUrl = "";

      // Handle uploaded file first (priority)
      if (req.file) {
        finalImageUrl = `/uploads/${req.file.filename}`;
      }
      // Handle URL image as fallback
      else if (imageUrl && imageUrl.trim() !== "") {
        finalImageUrl = imageUrl;
      }

      const categoryData = {
        name,
        description: description || "",
        image: finalImageUrl
      };

      const validatedData = insertCategorySchema.parse(categoryData);
      const category = await storage.createCategory(validatedData);
      res.status(201).json(category);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid category data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error creating category" });
      }
    }
  });

  app.put("/api/categories/:id", upload.single("image"), requireAuth, async (req, res) => {
    try {
      const { name, description, image: imageUrl } = req.body;

      let finalImageUrl = "";

      // Handle uploaded file first (priority)
      if (req.file) {
        finalImageUrl = `/uploads/${req.file.filename}`;
      }
      // Handle URL image as fallback
      else if (imageUrl && imageUrl.trim() !== "") {
        finalImageUrl = imageUrl;
      }

      const categoryData: any = {};
      if (name) categoryData.name = name;
      if (description !== undefined) categoryData.description = description;
      if (finalImageUrl) categoryData.image = finalImageUrl;

      const validatedData = insertCategorySchema.partial().parse(categoryData);
      const updatedCategory = await storage.updateCategory(
        req.params.id,
        validatedData,
      );

      if (!updatedCategory) {
        return res.status(404).json({ message: "Category not found" });
      }

      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ message: "Invalid category data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Error updating category" });
      }
    }
  });

  app.delete("/api/categories/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteCategory(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json({ message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Error deleting category" });
    }
  });

  // Cart routes
  app.get("/api/cart/:sessionId", async (req, res) => {
    try {
      const cartItems = await storage.getCartItems(req.params.sessionId);
      res.json(cartItems);
    } catch (error) {
      res.status(500).json({ message: "Error fetching cart items" });
    }
  });

  app.post("/api/cart", async (req, res) => {
    try {
      const {
        productId,
        quantity = 1,
        sessionId,
        selectedSize,
        selectedColor,
      } = req.body;

      if (!productId || !sessionId) {
        return res
          .status(400)
          .json({ message: "Product ID and session ID are required" });
      }

      const cartItem = await storage.addToCart({
        productId,
        quantity,
        sessionId,
        selectedSize: selectedSize || null,
        selectedColor: selectedColor || null,
      });

      res.status(201).json(cartItem);
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({ message: "Error adding item to cart" });
    }
  });

  app.patch("/api/cart/:itemId", async (req, res) => {
    try {
      const { quantity } = req.body;
      const updatedItem = await storage.updateCartItem(req.params.itemId, {
        quantity,
      });

      if (!updatedItem) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      res.json(updatedItem);
    } catch (error) {
      res.status(500).json({ message: "Error updating cart item" });
    }
  });

  app.delete("/api/cart/:itemId", async (req, res) => {
    try {
      const deleted = await storage.removeFromCart(req.params.itemId);

      if (!deleted) {
        return res.status(404).json({ message: "Cart item not found" });
      }

      res.json({ message: "Item removed from cart" });
    } catch (error) {
      res.status(500).json({ message: "Error removing cart item" });
    }
  });

  app.delete("/api/cart/clear/:sessionId", async (req, res) => {
    try {
      await storage.clearCart(req.params.sessionId);
      res.json({ message: "Cart cleared" });
    } catch (error) {
      res.status(500).json({ message: "Error clearing cart" });
    }
  });

  // Get admin dashboard stats
  app.get("/api/admin/stats", requireAuth, async (req, res) => {
    try {
      const products = await storage.getProducts();
      const orders = await storage.getOrders();
      const categories = await storage.getCategories();

      const totalRevenue = orders.reduce(
        (sum, order) => sum + parseFloat(order.total),
        0,
      );

      res.json({
        totalProducts: products.length,
        totalOrders: orders.length,
        totalCategories: categories.length,
        totalRevenue: totalRevenue.toFixed(2),
        activeUsers: 1234, // Mock data
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching stats" });
    }
  });

  // Public shipping settings route (for checkout page)
  app.get("/api/shipping", async (req, res) => {
    try {
      const settings = await storage.getShippingSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Error fetching shipping settings" });
    }
  });

  // Shipping settings routes
  app.get("/api/admin/shipping", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getShippingSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Error fetching shipping settings" });
    }
  });

  app.put("/api/admin/shipping", requireAuth, async (req, res) => {
    try {
      const updatedSettings = await storage.updateShippingSettings(req.body);
      res.json(updatedSettings);
    } catch (error) {
      res.status(500).json({ message: "Error updating shipping settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
