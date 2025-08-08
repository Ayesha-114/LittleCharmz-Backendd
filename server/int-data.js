import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const categories = [
  {
    id: randomUUID(),
    name: "Ladies Collection",
    description: "Elegant and stylish clothing for women",
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=400&fit=crop"
  },
  {
    id: randomUUID(),
    name: "Kids Collection", 
    description: "Adorable and comfortable clothes for children",
    image: "https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=400&h=400&fit=crop"
  },
  {
    id: randomUUID(),
    name: "Jewelry",
    description: "Beautiful jewelry pieces for special occasions",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop"
  }
];

const products = [
  // Ladies Collection
  {
    id: randomUUID(),
    name: "Elegant Formal Dress",
    description: "Beautiful formal dress perfect for special occasions",
    category: "Ladies Collection",
    price: "4500",
    originalPrice: "5500",
    discount: 18,
    stock: 10,
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop",
    color: "Navy Blue",
    sizes: ["S", "M", "L", "XL"],
    featured: true,
    isNew: true
  },
  {
    id: randomUUID(),
    name: "Casual Summer Top",
    description: "Light and comfortable top for casual wear",
    category: "Ladies Collection", 
    price: "2500",
    discount: 0,
    stock: 15,
    image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=400&h=400&fit=crop",
    color: "White",
    sizes: ["S", "M", "L"],
    featured: false,
    isNew: false
  },
  {
    id: randomUUID(),
    name: "Designer Kurta Set",
    description: "Traditional kurta with modern embroidery work",
    category: "Ladies Collection",
    price: "3200",
    originalPrice: "4000", 
    discount: 20,
    stock: 8,
    image: "https://images.unsplash.com/photo-1583391733956-6c78339af9d6?w=400&h=400&fit=crop",
    color: "Pink",
    sizes: ["M", "L", "XL"],
    featured: false,
    isNew: false
  },
  
  // Kids Collection
  {
    id: randomUUID(),
    name: "Cute Baby Dress",
    description: "Adorable dress for little girls",
    category: "Kids Collection",
    price: "1800",
    discount: 0,
    stock: 12,
    image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&h=400&fit=crop",
    color: "Pink",
    sizes: ["6M", "12M", "18M", "2T"],
    featured: true,
    isNew: true
  },
  {
    id: randomUUID(),
    name: "Boys Casual Shirt",
    description: "Comfortable casual shirt for boys",
    category: "Kids Collection",
    price: "1500", 
    originalPrice: "2000",
    discount: 25,
    stock: 20,
    image: "https://images.unsplash.com/photo-1503919006281-e80acadaa664?w=400&h=400&fit=crop",
    color: "Blue",
    sizes: ["2T", "3T", "4T", "5T"],
    featured: false,
    isNew: false
  },
  
  // Jewelry
  {
    id: randomUUID(),
    name: "Gold Plated Necklace",
    description: "Beautiful gold plated necklace with intricate design",
    category: "Jewelry",
    price: "3500",
    originalPrice: "4500",
    discount: 22,
    stock: 5,
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=400&fit=crop",
    color: "Gold",
    sizes: ["One Size"],
    featured: true,
    isNew: false
  },
  {
    id: randomUUID(),
    name: "Pearl Earrings",
    description: "Classic pearl earrings for elegant look",
    category: "Jewelry",
    price: "2200",
    discount: 0,
    stock: 8,
    image: "https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?w=400&h=400&fit=crop",
    color: "White",
    sizes: ["One Size"],
    featured: false,
    isNew: true
  }
];

async function initData() {
  const dataDir = path.join(__dirname, 'data');
  
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, 'categories.json'), JSON.stringify(categories, null, 2));
    await fs.writeFile(path.join(dataDir, 'products.json'), JSON.stringify(products, null, 2));
    console.log('Sample data initialized successfully!');
  } catch (error) {
    console.error('Error initializing data:', error);
  }
}

initData();
