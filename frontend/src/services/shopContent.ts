// ============================================================
// ZAVYRO POSTERS 2.0
// SHOP CONTENT
// Demo catalog + Panel product support
// ============================================================

export type PosterSize = "A6" | "A5" | "A4" | "A3";

export type ProductCategory =
  | "Anime"
  | "Movies"
  | "Music"
  | "Sports"
  | "Cars"
  | "Aesthetic"
  | "Devotional";

export type PanelSize = "A5" | "A4";

export interface ProductSizePrice {
  size: PosterSize;
  price: number;
  offerPrice: number;
  available: boolean;
}

export interface Product {
  id: string;
  title: string;
  category: ProductCategory;
  subcategory?: string;
  image: string;
  description: string;
  featured?: boolean;
  tags: string[];
  sizes: ProductSizePrice[];

  /**
   * Panel is a special product format.
   * The same source artwork is transformed continuously
   * across three physical pieces.
   */
  panelSupported?: boolean;

  panelSizes?: {
    size: PanelSize;
    available: boolean;
  }[];

  rating?: number;
  reviews?: number;
}

export const categories: ProductCategory[] = [
  "Anime",
  "Movies",
  "Music",
  "Sports",
  "Cars",
  "Aesthetic",
  "Devotional",
];

export const subcategories: Record<ProductCategory, string[]> = {
  Anime: ["Naruto", "One Piece", "Dragon Ball"],
  Movies: [
    "Kollywood",
    "Bollywood",
    "Mollywood",
    "Tollywood",
    "Hollywood",
    "Marvel",
    "DC",
  ],
  Music: [
    "Tamil Songs",
    "Telugu Songs",
    "Hindi Songs",
    "Malayalam Songs",
    "English Songs",
  ],
  Sports: ["Cricket", "Football", "Formula 1", "Other Sports"],
  Cars: ["Automotive"],
  Aesthetic: [],
  Devotional: [],
};

export const posterSizes: PosterSize[] = ["A6", "A5", "A4", "A3"];

const img = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1400&q=88`;

export const products: Product[] = [
  {
    id: "naruto-shadow",
    title: "Naruto Shadow",
    category: "Anime",
    subcategory: "Naruto",
    image: img("photo-1578632767115-351597cf2477"),
    description:
      "A dramatic Naruto-inspired wall poster with a cinematic dark composition.",
    featured: true,
    tags: ["naruto", "anime", "uzumaki", "ninja"],
    panelSupported: true,
    panelSizes: [
      { size: "A5", available: true },
      { size: "A4", available: true },
    ],
    rating: 4.9,
    reviews: 128,
    sizes: [
      { size: "A6", price: 199, offerPrice: 149, available: true },
      { size: "A5", price: 249, offerPrice: 179, available: true },
      { size: "A4", price: 399, offerPrice: 299, available: true },
      { size: "A3", price: 599, offerPrice: 449, available: true },
    ],
  },

  {
    id: "luffy-one-piece",
    title: "Straw Hat",
    category: "Anime",
    subcategory: "One Piece",
    image: img("photo-1614583224978-f4c8e6d8f5b0"),
    description:
      "A bold One Piece inspired composition designed for modern rooms.",
    featured: true,
    tags: ["luffy", "one piece", "anime", "pirate"],
    panelSupported: true,
    panelSizes: [
      { size: "A5", available: true },
      { size: "A4", available: true },
    ],
    rating: 4.8,
    reviews: 96,
    sizes: [
      { size: "A6", price: 199, offerPrice: 149, available: true },
      { size: "A5", price: 249, offerPrice: 179, available: true },
      { size: "A4", price: 399, offerPrice: 299, available: true },
      { size: "A3", price: 599, offerPrice: 449, available: true },
    ],
  },

  {
    id: "dragon-ball-energy",
    title: "Saiyan Energy",
    category: "Anime",
    subcategory: "Dragon Ball",
    image: img("photo-1538481199705-c710c4e965fc"),
    description:
      "High-energy Dragon Ball inspired artwork with a powerful cinematic finish.",
    featured: true,
    tags: ["dragon ball", "goku", "anime", "saiyan"],
    panelSupported: true,
    panelSizes: [
      { size: "A5", available: true },
      { size: "A4", available: true },
    ],
    rating: 4.9,
    reviews: 154,
    sizes: [
      { size: "A6", price: 199, offerPrice: 149, available: true },
      { size: "A5", price: 249, offerPrice: 179, available: true },
      { size: "A4", price: 399, offerPrice: 299, available: true },
      { size: "A3", price: 599, offerPrice: 449, available: true },
    ],
  },

  {
    id: "vijay-cinematic",
    title: "Cinematic Hero",
    category: "Movies",
    subcategory: "Kollywood",
    image: img("photo-1485846234645-a62644f84728"),
    description:
      "A cinematic poster composition inspired by South Indian movie aesthetics.",
    featured: true,
    tags: ["kollywood", "vijay", "movie", "cinema"],
    panelSupported: true,
    panelSizes: [
      { size: "A5", available: true },
      { size: "A4", available: true },
    ],
    rating: 4.8,
    reviews: 74,
    sizes: [
      { size: "A6", price: 199, offerPrice: 149, available: true },
      { size: "A5", price: 249, offerPrice: 179, available: true },
      { size: "A4", price: 399, offerPrice: 299, available: true },
      { size: "A3", price: 599, offerPrice: 449, available: true },
    ],
  },

  {
    id: "marvel-hero",
    title: "Marvel Universe",
    category: "Movies",
    subcategory: "Marvel",
    image: img("photo-1531259683007-016a7b628fc3"),
    description:
      "A superhero-inspired composition with a dark premium presentation.",
    featured: true,
    tags: ["marvel", "superhero", "avengers", "movie"],
    panelSupported: true,
    panelSizes: [
      { size: "A5", available: true },
      { size: "A4", available: true },
    ],
    rating: 4.9,
    reviews: 211,
    sizes: [
      { size: "A6", price: 199, offerPrice: 149, available: true },
      { size: "A5", price: 249, offerPrice: 179, available: true },
      { size: "A4", price: 399, offerPrice: 299, available: true },
      { size: "A3", price: 599, offerPrice: 449, available: true },
    ],
  },

  {
    id: "tamil-vibes",
    title: "Tamil Vibes",
    category: "Music",
    subcategory: "Tamil Songs",
    image: img("photo-1493225457124-a3eb161ffa5f"),
    description:
      "A modern music-inspired artwork built around a dark concert aesthetic.",
    tags: ["tamil", "music", "songs", "concert"],
    sizes: [
      { size: "A6", price: 199, offerPrice: 149, available: true },
      { size: "A5", price: 249, offerPrice: 179, available: true },
      { size: "A4", price: 399, offerPrice: 299, available: true },
      { size: "A3", price: 599, offerPrice: 449, available: true },
    ],
  },

  {
    id: "music-stage",
    title: "Stage Lights",
    category: "Music",
    subcategory: "English Songs",
    image: img("photo-1501386761578-eac5c94b800a"),
    description:
      "A concert-inspired visual for music lovers and creative spaces.",
    tags: ["music", "english", "concert", "stage"],
    sizes: [
      { size: "A6", price: 199, offerPrice: 149, available: true },
      { size: "A5", price: 249, offerPrice: 179, available: true },
      { size: "A4", price: 399, offerPrice: 299, available: true },
      { size: "A3", price: 599, offerPrice: 449, available: true },
    ],
  },

  {
    id: "cricket-king",
    title: "Cricket King",
    category: "Sports",
    subcategory: "Cricket",
    image: img("photo-1531415074968-036ba1b575da"),
    description:
      "A cricket-focused sports wall poster with a powerful stadium atmosphere.",
    featured: true,
    tags: ["cricket", "india", "sports", "stadium"],
    panelSupported: true,
    panelSizes: [
      { size: "A5", available: true },
      { size: "A4", available: true },
    ],
    rating: 4.9,
    reviews: 183,
    sizes: [
      { size: "A6", price: 199, offerPrice: 149, available: true },
      { size: "A5", price: 249, offerPrice: 179, available: true },
      { size: "A4", price: 399, offerPrice: 299, available: true },
      { size: "A3", price: 599, offerPrice: 449, available: true },
    ],
  },

  {
    id: "football-night",
    title: "Football Night",
    category: "Sports",
    subcategory: "Football",
    image: img("photo-1579952363873-27f3bade9f55"),
    description:
      "A stadium-lit football artwork for modern sports rooms.",
    tags: ["football", "sports", "stadium", "soccer"],
    sizes: [
      { size: "A6", price: 199, offerPrice: 149, available: true },
      { size: "A5", price: 249, offerPrice: 179, available: true },
      { size: "A4", price: 399, offerPrice: 299, available: true },
      { size: "A3", price: 599, offerPrice: 449, available: true },
    ],
  },

  {
    id: "formula-speed",
    title: "Formula Speed",
    category: "Sports",
    subcategory: "Formula 1",
    image: img("photo-1503736334956-4c8f8e92946d"),
    description:
      "A speed-focused automotive sports poster with a premium dark look.",
    tags: ["formula 1", "f1", "racing", "sports"],
    panelSupported: true,
    panelSizes: [
      { size: "A5", available: true },
      { size: "A4", available: true },
    ],
    sizes: [
      { size: "A6", price: 199, offerPrice: 149, available: true },
      { size: "A5", price: 249, offerPrice: 179, available: true },
      { size: "A4", price: 399, offerPrice: 299, available: true },
      { size: "A3", price: 599, offerPrice: 449, available: true },
    ],
  },

  {
    id: "midnight-porsche",
    title: "Midnight Drive",
    category: "Cars",
    subcategory: "Automotive",
    image: img("photo-1503376780353-7e6692767b70"),
    description:
      "A premium automotive poster for modern car enthusiasts.",
    featured: true,
    tags: ["car", "porsche", "automotive", "luxury"],
    panelSupported: true,
    panelSizes: [
      { size: "A5", available: true },
      { size: "A4", available: true },
    ],
    rating: 4.8,
    reviews: 89,
    sizes: [
      { size: "A6", price: 199, offerPrice: 149, available: true },
      { size: "A5", price: 249, offerPrice: 179, available: true },
      { size: "A4", price: 399, offerPrice: 299, available: true },
      { size: "A3", price: 599, offerPrice: 449, available: true },
    ],
  },

  {
    id: "minimal-purple",
    title: "Purple Minimal",
    category: "Aesthetic",
    image: img("photo-1557683316-973673baf926"),
    description:
      "A minimal purple composition designed for clean contemporary interiors.",
    tags: ["aesthetic", "minimal", "purple", "design"],
    sizes: [
      { size: "A6", price: 199, offerPrice: 149, available: true },
      { size: "A5", price: 249, offerPrice: 179, available: true },
      { size: "A4", price: 399, offerPrice: 299, available: true },
      { size: "A3", price: 599, offerPrice: 449, available: true },
    ],
  },

  {
    id: "temple-gold",
    title: "Divine Gold",
    category: "Devotional",
    image: img("photo-1548013146-72479768bada"),
    description:
      "A serene devotional artwork with a warm premium presentation.",
    tags: ["devotional", "temple", "spiritual", "india"],
    sizes: [
      { size: "A6", price: 199, offerPrice: 149, available: true },
      { size: "A5", price: 249, offerPrice: 179, available: true },
      { size: "A4", price: 399, offerPrice: 299, available: true },
      { size: "A3", price: 599, offerPrice: 449, available: true },
    ],
  },
];

export function getProduct(productId: string) {
  return products.find((product) => product.id === productId);
}

export function getPrice(product: Product, size: PosterSize) {
  return product.sizes.find((item) => item.size === size);
}

export function getPanelPrice(
  product: Product,
  size: PanelSize,
) {
  const normal = getPrice(product, size);

  if (!normal) {
    return null;
  }

  return {
    originalPrice: normal.price * 3,
    offerPrice: normal.offerPrice * 3,
  };
}