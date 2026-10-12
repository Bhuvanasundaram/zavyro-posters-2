/* =========================================================
   ZAVYRO POSTERS
   HOMEPAGE CONTENT

   These defaults are used immediately and also act as a safe
   fallback if the backend is unavailable.
========================================================= */

export type HeroPosterContent = {
  id: string;
  title: string;
  image: string;
  category: string;
  productId?: string;
};

export type HeroContent = {
  eyebrow: string;
  headingLineOne: string;
  headingLineTwo: string;
  description: string;
  primaryButton: string;
  secondaryButton: string;
  backgroundImage: string;
  posters: HeroPosterContent[];
};


export type HomepageOffer = {
  id: string;
  title: string;
  tag: string;
  reason: string;
  description: string;
  image: string;
  priceText: string;
  link: string;
  kind: "standard" | "buyXGetY";
  buyQuantity: number;
  getQuantity: number;
  visible: boolean;
};

export type HomepageCombo = {
  id: string;
  title: string;
  tag: string;
  description: string;
  mode: "choice" | "fixed";
  posterCount: number;
  price: number;
  category: string;
  productIds: string[];
  visible: boolean;
};

export type CollectionItem = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
};

export type HomepageReview = {
  id: string;
  name: string;
  rating: number;
  text: string;
  product: string;
  visible: boolean;
};

export type HomepageFanMedia = {
  id: string;
  type: "image" | "video";
  src: string;
  poster?: string;
  label: string;
  visible: boolean;
};

export type HomepagePoster = {
  id: string;
  title: string;
  category: string;
  image: string;
  productId?: string;
};

export type HomepageDisplaySettings = {
  collections: { count: number; speed: number };
  offers: { count: number; speed: number };
  trending: { count: number; speed: number };
  reviews: { count: number; speed: number };
  fanMedia: { count: number; speed: number };
};

export type HomepageSettings = {
  hero: HeroContent;
  collections: CollectionItem[];
  offers: HomepageOffer[];
  combos: HomepageCombo[];
  trendingPosters: HomepagePoster[];
  reviews: HomepageReview[];
  fanMedia: HomepageFanMedia[];
  display: HomepageDisplaySettings;
  sections: {
    collections: boolean;
    offers: boolean;
    trending: boolean;
    reviews: boolean;
    fanMedia: boolean;
    customizeCta: boolean;
    finalCta: boolean;
  };
};

export const collectionContent: CollectionItem[] = [
  {
    id: "anime",
    title: "ANIME",
    subtitle: "ENTER ANOTHER WORLD",
    image:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1000&q=85",
    link: "/shop?category=anime",
  },
  {
    id: "movies",
    title: "MOVIES",
    subtitle: "ICONIC MOMENTS",
    image:
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=85",
    link: "/shop?category=movies",
  },
  {
    id: "music",
    title: "MUSIC",
    subtitle: "FEEL THE SOUND",
    image:
      "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85",
    link: "/shop?category=music",
  },
  {
    id: "sports",
    title: "SPORTS",
    subtitle: "LEGENDS & MOMENTS",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1000&q=85",
    link: "/shop?category=sports",
  },
  {
    id: "cars",
    title: "CARS",
    subtitle: "SPEED & MACHINE",
    image:
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1000&q=85",
    link: "/shop?category=cars",
  },
  {
    id: "aesthetic",
    title: "AESTHETIC",
    subtitle: "MAKE IT YOUR SPACE",
    image:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=85",
    link: "/shop?category=aesthetic",
  },
  {
    id: "devotional",
    title: "DEVOTIONAL",
    subtitle: "ART WITH MEANING",
    image:
      "https://images.unsplash.com/photo-1604608672516-f1b9e4f5f3e5?auto=format&fit=crop&w=1000&q=85",
    link: "/shop?category=devotional",
  },
];

export const offerContent: string[] = [
  "FREE SHIPPING ON SELECTED ORDERS",
  "PREMIUM QUALITY PRINTS",
  "MULTIPLE SIZES AVAILABLE",
  "CUSTOMIZE YOUR OWN POSTER",
];

export const defaultHomepageSettings: HomepageSettings = {
  hero: {
    eyebrow: "PREMIUM WALL ART • ZAVYRO POSTERS",
    headingLineOne: "YOUR WALL.",
    headingLineTwo: "YOUR VIBE.",
    description:
      "Premium posters inspired by anime, cinema, music, sports, cars, culture and everything that makes your world yours.",
    primaryButton: "SHOP COLLECTION",
    secondaryButton: "CUSTOMIZE YOUR POSTER",
    backgroundImage:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=2400&q=85",
    posters: [],
  },
  collections: collectionContent,
  offers: [
    {
      id: "offer-diwali", title: "DIWALI WALL SALE", tag: "DIWALI SALE", reason: "Festival offer",
      description: "Celebrate Diwali with premium wall art at a special price.",
      image: "https://images.unsplash.com/photo-1603905179139-db12ab5352d6?auto=format&fit=crop&w=1200&q=88",
      priceText: "SPECIAL PRICES", link: "/shop", kind: "standard", buyQuantity: 1, getQuantity: 1, visible: true,
    },
  ],
  combos: [
    { id: "combo-mix-3", title: "3 POSTER WALL COMBO", tag: "BUILD YOUR WALL",
      description: "Pick any 3 posters from the shop and create your own wall set.",
      mode: "choice", posterCount: 3, price: 799, category: "All", productIds: [], visible: true },
  ],
  trendingPosters: [
    {
      id: "trend-1",
      title: "Anime",
      category: "ANIME",
      image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=700&q=90",
    },
    {
      id: "trend-2",
      title: "Cinema",
      category: "MOVIES",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=700&q=90",
    },
    {
      id: "trend-3",
      title: "Music",
      category: "MUSIC",
      image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=700&q=90",
    },
    {
      id: "trend-4",
      title: "Speed",
      category: "CARS",
      image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=700&q=90",
    },
    {
      id: "trend-5",
      title: "Sport",
      category: "SPORTS",
      image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=700&q=90",
    },
    {
      id: "trend-6",
      title: "Art",
      category: "AESTHETIC",
      image: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=700&q=90",
    },
    {
      id: "trend-7",
      title: "Culture",
      category: "DEVOTIONAL",
      image: "https://images.unsplash.com/photo-1561839561-b13bcfe95249?auto=format&fit=crop&w=700&q=90",
    },
  ],
  reviews: [
    {
      id: "review-1",
      name: "Arjun",
      rating: 5,
      text: "The poster quality is amazing. The print is sharp and the colours look great on the wall.",
      product: "Anime Poster",
      visible: true,
    },
    {
      id: "review-2",
      name: "Keerthana",
      rating: 5,
      text: "Loved the whole experience. The poster arrived safely and looks even better in person.",
      product: "Aesthetic Poster",
      visible: true,
    },
    {
      id: "review-3",
      name: "Vishnu",
      rating: 5,
      text: "Ordered a custom poster and the final result came out exactly how I wanted.",
      product: "Custom Poster",
      visible: true,
    },
    {
      id: "review-4",
      name: "Harish",
      rating: 5,
      text: "The print quality is really good for the price. Definitely ordering more for my room.",
      product: "Movie Poster",
      visible: true,
    },
    {
      id: "review-5",
      name: "Nandhini",
      rating: 5,
      text: "Packaging was neat and the poster reached me without any damage. Looks premium.",
      product: "Music Poster",
      visible: true,
    },
    {
      id: "review-6",
      name: "Sanjay",
      rating: 5,
      text: "My wall completely changed after putting these up. Really happy with the purchase.",
      product: "Sports Poster",
      visible: true,
    },
  ],
  fanMedia: [
    {
      id: "media-1",
      type: "image",
      src: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=900&q=90",
      label: "Wall Art",
      visible: true,
    },
    {
      id: "media-2",
      type: "image",
      src: "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=900&q=90",
      label: "Customer Poster",
      visible: true,
    },
    {
      id: "media-3",
      type: "image",
      src: "https://images.unsplash.com/photo-1561214115-9c0c0b9c7c8d?auto=format&fit=crop&w=900&q=90",
      label: "Customer Wall",
      visible: true,
    },
  ],
  display: {
    collections: { count: 7, speed: 38 },
    offers: { count: 4, speed: 25 },
    trending: { count: 12, speed: 32 },
    reviews: { count: 6, speed: 44 },
    fanMedia: { count: 6, speed: 45 },
  },
  sections: {
    collections: true,
    offers: true,
    trending: true,
    reviews: true,
    fanMedia: true,
    customizeCta: true,
    finalCta: true,
  },
};

export const heroContent = defaultHomepageSettings.hero;

const API_URL =
  (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");

/** Resolve backend-upload paths so homepage images load in local and deployed builds. */
export function resolveHomepageImageUrl(image?: string | null): string {
  const value = (image || "").trim();
  if (!value) return "";
  if (/^(https?:)?\/\//i.test(value) || /^(data:|blob:)/i.test(value)) return value;
  if (value.startsWith("/")) return `${API_URL}${value}`;
  if (/^(uploads|images|assets)\//i.test(value)) return `${API_URL}/${value}`;
  return value;
}

export async function loadHomepageSettings(): Promise<HomepageSettings> {
  try {
    const response = await fetch(`${API_URL}/api/homepage`);

    if (!response.ok) {
      throw new Error("Homepage request failed.");
    }

    const payload = await response.json();

    if (!payload?.success || !payload?.content) {
      throw new Error("Invalid homepage response.");
    }

    return mergeHomepageSettings(payload.content);
  } catch (error) {
    console.warn("Using default homepage content:", error);
    return defaultHomepageSettings;
  }
}

export function mergeHomepageSettings(input: any): HomepageSettings {
  const source =
    input && typeof input === "object"
      ? input
      : {};

  const hero =
    source.hero && typeof source.hero === "object"
      ? source.hero
      : {};

  const sections =
    source.sections && typeof source.sections === "object"
      ? source.sections
      : {};

  return {
    hero: {
      ...defaultHomepageSettings.hero,
      ...hero,
      posters: [],
    },
    collections: Array.isArray(source.collections)
      ? source.collections
      : defaultHomepageSettings.collections,
    offers: Array.isArray(source.offers)
      ? source.offers.map((offer: any, index: number) => ({
          ...defaultHomepageSettings.offers[0],
          ...offer,
          id: String(offer?.id ?? `offer-${index}`),
          kind: offer?.kind === "buyXGetY" ? "buyXGetY" : "standard",
          buyQuantity: Math.max(1, Number(offer?.buyQuantity) || 1),
          getQuantity: Math.max(1, Number(offer?.getQuantity) || 1),
          visible: offer?.visible !== false,
        }))
      : defaultHomepageSettings.offers,
    combos: Array.isArray(source.combos) ? source.combos : defaultHomepageSettings.combos,
    trendingPosters: Array.isArray(source.trendingPosters)
      ? source.trendingPosters
      : [],
    reviews: Array.isArray(source.reviews)
      ? source.reviews
      : [],
    fanMedia: Array.isArray(source.fanMedia)
      ? source.fanMedia
      : [],
    display: {
      collections: {
        ...defaultHomepageSettings.display.collections,
        ...(source.display?.collections || {}),
      },
      offers: {
        ...defaultHomepageSettings.display.offers,
        ...(source.display?.offers || {}),
      },
      trending: {
        ...defaultHomepageSettings.display.trending,
        ...(source.display?.trending || {}),
      },
      reviews: {
        ...defaultHomepageSettings.display.reviews,
        ...(source.display?.reviews || {}),
      },
      fanMedia: {
        ...defaultHomepageSettings.display.fanMedia,
        ...(source.display?.fanMedia || {}),
      },
    },
    sections: {
      ...defaultHomepageSettings.sections,
      ...sections,
    },
  };
}
