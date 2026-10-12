import { pool } from "./db.js";

export type HomepagePoster = {
  id: string;
  title: string;
  category: string;
  image: string;
  productId?: string;
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

export type HomepageCollection = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
};

export type HomepageDisplaySettings = {
  collections: { count: number; speed: number };
  offers: { count: number; speed: number };
  trending: { count: number; speed: number };
  reviews: { count: number; speed: number };
  fanMedia: { count: number; speed: number };
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

export type HomepageContent = {
  hero: {
    eyebrow: string;
    headingLineOne: string;
    headingLineTwo: string;
    description: string;
    primaryButton: string;
    secondaryButton: string;
    backgroundImage: string;
    posters: HomepagePoster[];
  };
  collections: HomepageCollection[];
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

export const defaultHomepageContent: HomepageContent = {
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
  offers: [
    {
      id: "offer-diwali",
      title: "DIWALI WALL SALE",
      tag: "DIWALI SALE",
      reason: "Festival offer",
      description: "Celebrate Diwali with premium wall art at a special price.",
      image: "https://images.unsplash.com/photo-1603905179139-db12ab5352d6?auto=format&fit=crop&w=1200&q=88",
      priceText: "SPECIAL PRICES",
      link: "/shop",
      kind: "standard",
      buyQuantity: 1,
      getQuantity: 1,
      visible: true,
    },
  ],
  combos: [
    {
      id: "combo-mix-3",
      title: "3 POSTER WALL COMBO",
      tag: "BUILD YOUR WALL",
      description: "Pick any 3 posters from the shop and create your own wall set.",
      mode: "choice",
      posterCount: 3,
      price: 799,
      category: "All",
      productIds: [],
      visible: true,
    },
  ],
  collections: [
    { id: "anime", title: "ANIME", subtitle: "ENTER ANOTHER WORLD", image: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1000&q=85", link: "/shop?category=anime" },
    { id: "movies", title: "MOVIES", subtitle: "ICONIC MOMENTS", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1000&q=85", link: "/shop?category=movies" },
    { id: "music", title: "MUSIC", subtitle: "FEEL THE SOUND", image: "https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=85", link: "/shop?category=music" },
    { id: "sports", title: "SPORTS", subtitle: "LEGENDS & MOMENTS", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1000&q=85", link: "/shop?category=sports" },
    { id: "cars", title: "CARS", subtitle: "SPEED & MACHINE", image: "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1000&q=85", link: "/shop?category=cars" },
    { id: "aesthetic", title: "AESTHETIC", subtitle: "MAKE IT YOUR SPACE", image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=85", link: "/shop?category=aesthetic" },
    { id: "devotional", title: "DEVOTIONAL", subtitle: "ART WITH MEANING", image: "https://images.unsplash.com/photo-1604608672516-f1b9e4f5f3e5?auto=format&fit=crop&w=1000&q=85", link: "/shop?category=devotional" },
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

let ensurePromise: Promise<void> | null = null;

export function ensureHomepageTable(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = pool
      .query(`
        CREATE TABLE IF NOT EXISTS homepage_content (
          id integer PRIMARY KEY,
          content jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `)
      .then(async () => {
        const existing = await pool.query(
          `SELECT id FROM homepage_content WHERE id = 1 LIMIT 1`,
        );

        if (existing.rows.length === 0) {
          await pool.query(
            `
            INSERT INTO homepage_content (id, content)
            VALUES (1, $1::jsonb)
            `,
            [JSON.stringify(defaultHomepageContent)],
          );
        }
      })
      .then(() => undefined);
  }

  return ensurePromise ?? Promise.resolve();
}

function cleanContent(input: any): HomepageContent {
  const source = input && typeof input === "object" ? input : {};

  const hero = source.hero && typeof source.hero === "object"
    ? source.hero
    : {};

  const sections = source.sections && typeof source.sections === "object"
    ? source.sections
    : {};

  const cleanPoster = (item: any, index: number): HomepagePoster | null => {
    if (!item || typeof item !== "object") return null;
    const image = String(item.image ?? "").trim();
    const title = String(item.title ?? "").trim();
    if (!image || !title) return null;

    return {
      id: String(item.id ?? `poster-${index}`),
      title,
      category: String(item.category ?? "").trim(),
      image,
      ...(item.productId ? { productId: String(item.productId) } : {}),
    };
  };

  const cleanCollection = (item: any, index: number): HomepageCollection | null => {
    if (!item || typeof item !== "object") return null;
    const title = String(item.title ?? "").trim();
    const image = String(item.image ?? "").trim();
    const link = String(item.link ?? "").trim();
    if (!title || !image || !link) return null;
    return {
      id: String(item.id ?? `collection-${index}`),
      title,
      subtitle: String(item.subtitle ?? "").trim(),
      image,
      link,
    };
  };

  const cleanReview = (item: any, index: number): HomepageReview | null => {
    if (!item || typeof item !== "object") return null;
    const name = String(item.name ?? "").trim();
    const text = String(item.text ?? "").trim();
    if (!name || !text) return null;

    const rating = Math.min(5, Math.max(1, Number(item.rating) || 5));

    return {
      id: String(item.id ?? `review-${index}`),
      name,
      rating,
      text,
      product: String(item.product ?? "Zavyro Poster").trim() || "Zavyro Poster",
      visible: item.visible !== false,
    };
  };

  const cleanFanMedia = (item: any, index: number): HomepageFanMedia | null => {
    if (!item || typeof item !== "object") return null;
    const src = String(item.src ?? "").trim();
    if (!src) return null;

    return {
      id: String(item.id ?? `media-${index}`),
      type: item.type === "video" ? "video" : "image",
      src,
      ...(item.poster ? { poster: String(item.poster) } : {}),
      label: String(item.label ?? "Customer Poster").trim() || "Customer Poster",
      visible: item.visible !== false,
    };
  };

  const cleanOffer = (item: any, index: number): HomepageOffer | null => {
    if (!item || typeof item !== "object") return null;
    const title = String(item.title ?? "").trim();
    const image = String(item.image ?? "").trim();
    if (!title || !image) return null;
    return {
      id: String(item.id ?? `offer-${index}`),
      title,
      tag: String(item.tag ?? "SPECIAL OFFER").trim() || "SPECIAL OFFER",
      reason: String(item.reason ?? "Limited-time offer").trim() || "Limited-time offer",
      description: String(item.description ?? "").trim(),
      image,
      priceText: String(item.priceText ?? "SHOP OFFER").trim() || "SHOP OFFER",
      link: String(item.link ?? "/shop").trim() || "/shop",
      kind: item.kind === "buyXGetY" ? "buyXGetY" : "standard",
      buyQuantity: Math.max(1, Number(item.buyQuantity) || 1),
      getQuantity: Math.max(1, Number(item.getQuantity) || 1),
      visible: item.visible !== false,
    };
  };

  const cleanCombo = (item: any, index: number): HomepageCombo | null => {
    if (!item || typeof item !== "object") return null;
    const title = String(item.title ?? "").trim();
    if (!title) return null;
    const posterCount = Math.min(12, Math.max(1, Number(item.posterCount) || 1));
    const price = Math.max(0, Number(item.price) || 0);
    const mode = item.mode === "fixed" ? "fixed" : "choice";
    return {
      id: String(item.id ?? `combo-${index}`),
      title,
      tag: String(item.tag ?? "COMBO").trim() || "COMBO",
      description: String(item.description ?? "").trim(),
      mode,
      posterCount,
      price,
      category: String(item.category ?? "All").trim() || "All",
      productIds: Array.isArray(item.productIds) ? item.productIds.map((id: any) => String(id)).filter(Boolean).slice(0, 30) : [],
      visible: item.visible !== false,
    };
  };

  const offers = Array.isArray(source.offers)
    ? source.offers.map(cleanOffer).filter(Boolean) as HomepageOffer[]
    : defaultHomepageContent.offers;

  const combos = Array.isArray(source.combos)
    ? source.combos.map(cleanCombo).filter(Boolean) as HomepageCombo[]
    : defaultHomepageContent.combos;

  const collections = Array.isArray(source.collections)
    ? source.collections.map(cleanCollection).filter(Boolean) as HomepageCollection[]
    : [];

  const trendingPosters = Array.isArray(source.trendingPosters)
    ? source.trendingPosters.map(cleanPoster).filter(Boolean) as HomepagePoster[]
    : [];

  const reviews = Array.isArray(source.reviews)
    ? source.reviews.map(cleanReview).filter(Boolean) as HomepageReview[]
    : [];

  const fanMedia = Array.isArray(source.fanMedia)
    ? source.fanMedia.map(cleanFanMedia).filter(Boolean) as HomepageFanMedia[]
    : [];

  const clampCount = (value: unknown, fallback: number, max: number) =>
    Math.min(max, Math.max(1, Number(value) || fallback));
  const clampSpeed = (value: unknown, fallback: number) =>
    Math.min(180, Math.max(8, Number(value) || fallback));

  const displaySource = source.display && typeof source.display === "object"
    ? source.display
    : {};

  return {
    hero: {
      eyebrow: String(hero.eyebrow ?? defaultHomepageContent.hero.eyebrow),
      headingLineOne: String(hero.headingLineOne ?? defaultHomepageContent.hero.headingLineOne),
      headingLineTwo: String(hero.headingLineTwo ?? defaultHomepageContent.hero.headingLineTwo),
      description: String(hero.description ?? defaultHomepageContent.hero.description),
      primaryButton: String(hero.primaryButton ?? defaultHomepageContent.hero.primaryButton),
      secondaryButton: String(hero.secondaryButton ?? defaultHomepageContent.hero.secondaryButton),
      backgroundImage: String(hero.backgroundImage ?? defaultHomepageContent.hero.backgroundImage).trim(),
      posters: [],
    },
    collections: collections.length > 0
      ? collections.slice(0, 30)
      : defaultHomepageContent.collections,
    offers: offers.slice(0, 30),
    combos: combos.slice(0, 30),
    trendingPosters: trendingPosters.slice(0, 30),
    reviews: reviews.slice(0, 30),
    fanMedia: fanMedia.slice(0, 30),
    display: {
      collections: {
        count: clampCount(displaySource.collections?.count, 7, 30),
        speed: clampSpeed(displaySource.collections?.speed, 38),
      },
      offers: {
        count: clampCount(displaySource.offers?.count, 4, 20),
        speed: clampSpeed(displaySource.offers?.speed, 25),
      },
      trending: {
        count: clampCount(displaySource.trending?.count, 12, 30),
        speed: clampSpeed(displaySource.trending?.speed, 32),
      },
      reviews: {
        count: clampCount(displaySource.reviews?.count, 6, 30),
        speed: clampSpeed(displaySource.reviews?.speed, 44),
      },
      fanMedia: {
        count: clampCount(displaySource.fanMedia?.count, 6, 30),
        speed: clampSpeed(displaySource.fanMedia?.speed, 45),
      },
    },
    sections: {
      collections: sections.collections !== false,
      offers: sections.offers !== false,
      trending: sections.trending !== false,
      reviews: sections.reviews !== false,
      fanMedia: sections.fanMedia !== false,
      customizeCta: sections.customizeCta !== false,
      finalCta: sections.finalCta !== false,
    },
  };
}

export async function getHomepageContent(): Promise<HomepageContent> {
  await ensureHomepageTable();

  const result = await pool.query(
    `SELECT content FROM homepage_content WHERE id = 1 LIMIT 1`,
  );

  if (!result.rows[0]?.content) {
    return defaultHomepageContent;
  }

  return cleanContent(result.rows[0].content);
}

export async function saveHomepageContent(input: unknown): Promise<HomepageContent> {
  await ensureHomepageTable();

  const content = cleanContent(input);

  await pool.query(
    `
    INSERT INTO homepage_content (id, content, updated_at)
    VALUES (1, $1::jsonb, now())
    ON CONFLICT (id)
    DO UPDATE SET
      content = EXCLUDED.content,
      updated_at = now()
    `,
    [JSON.stringify(content)],
  );

  return content;
}
