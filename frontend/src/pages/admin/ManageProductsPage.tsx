import type { CSSProperties, FormEvent, ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import PosterAdjustmentModal from "../../components/admin/PosterAdjustmentModal";
import MockupStudio from "../../components/admin/MockupStudio";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type SizeCode =
  | "A3"
  | "A4"
  | "A5"
  | "A6"
  | "A5_PANEL"
  | "A4_PANEL";

type Category = {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
};

type Subcategory = {
  id: string;
  category_id?: string;
  name: string;
  slug: string;
  is_active?: boolean;
};

type ProductImage = {
  id?: string;
  image_url: string;
  alt_text?: string | null;
  image_type?: string;
  sort_order?: number;
  is_primary?: boolean;
};

type ApiSize = {
  id?: string;
  size_code?: SizeCode;
  sizeCode?: SizeCode;
  width_mm?: number;
  height_mm?: number;
  price?: number | string;
  original_price?: number | string;
  originalPrice?: number | string;
  offer_price?: number | string;
  offerPrice?: number | string;
  is_available?: boolean;
  isAvailable?: boolean;
};

type ApiProduct = {
  id: string;
  name: string;
  slug?: string;
  sku?: string | null;
  description?: string | null;
  category_id?: string;
  categoryId?: string;
  subcategory_id?: string | null;
  subcategoryId?: string | null;
  category_name?: string | null;
  subcategory_name?: string | null;
  search_keywords?: string | null;
  searchKeywords?: string | null;
  is_active?: boolean;
  isActive?: boolean;
  is_featured?: boolean;
  isFeatured?: boolean;
  stock_status?: string;
  panel_split_count?: number;
  panelSplitCount?: number;
  base_price?: number | string;
  basePrice?: number | string;
  sizes?: ApiSize[];
  images?: ProductImage[];
  main_image?: string | null;
  hover_image?: string | null;
  mockup_image?: string | null;
};

type SizeState = {
  originalPrice: string;
  offerPrice: string;
  isAvailable: boolean;
};

type FormState = {
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: string;
  subcategoryId: string;
  searchKeywords: string;
  panelSplitCount: number;
  panelEnabled: boolean;
  isActive: boolean;
  isFeatured: boolean;
  offerActive: boolean;
  discountPercent: string;
  mainImage: string;
  hoverImage: string;
  mockupImage: string;
  sizes: Record<SizeCode, SizeState>;
};

const DEFAULT_PRICES: Record<"A3" | "A4" | "A5" | "A6", number> = {
  A3: 79,
  A4: 49,
  A5: 39,
  A6: 29,
};

const DEFAULT_ORIGINAL_PRICES: Record<"A3" | "A4" | "A5" | "A6", number> = {
  A3: 149,
  A4: 99,
  A5: 79,
  A6: 59,
};

const SIZE_ORDER: SizeCode[] = [
  "A3",
  "A4",
  "A5",
  "A6",
  "A5_PANEL",
  "A4_PANEL",
];

const BASE_SIZE_ORDER: Array<"A3" | "A4" | "A5" | "A6"> = [
  "A3",
  "A4",
  "A5",
  "A6",
];

const SIZE_LABELS: Record<SizeCode, string> = {
  A3: "A3",
  A4: "A4",
  A5: "A5",
  A6: "A6",
  A5_PANEL: "A5 Panel",
  A4_PANEL: "A4 Panel",
};

function money(value: string | number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function moneyString(value: string | number | null | undefined): string {
  const n = money(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function panelPrice(base: number, splitCount: number): number {
  return Number((base * Math.max(2, splitCount)).toFixed(2));
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

function createDefaultSizes(splitCount = 3): Record<SizeCode, SizeState> {
  return {
    A3: {
      originalPrice: String(DEFAULT_ORIGINAL_PRICES.A3),
      offerPrice: String(DEFAULT_PRICES.A3),
      isAvailable: true,
    },
    A4: {
      originalPrice: String(DEFAULT_ORIGINAL_PRICES.A4),
      offerPrice: String(DEFAULT_PRICES.A4),
      isAvailable: true,
    },
    A5: {
      originalPrice: String(DEFAULT_ORIGINAL_PRICES.A5),
      offerPrice: String(DEFAULT_PRICES.A5),
      isAvailable: true,
    },
    A6: {
      originalPrice: String(DEFAULT_ORIGINAL_PRICES.A6),
      offerPrice: String(DEFAULT_PRICES.A6),
      isAvailable: true,
    },
    A5_PANEL: {
      originalPrice: String(panelPrice(DEFAULT_PRICES.A5, splitCount)),
      offerPrice: String(panelPrice(DEFAULT_PRICES.A5, splitCount)),
      isAvailable: true,
    },
    A4_PANEL: {
      originalPrice: String(panelPrice(DEFAULT_PRICES.A4, splitCount)),
      offerPrice: String(panelPrice(DEFAULT_PRICES.A4, splitCount)),
      isAvailable: true,
    },
  };
}

function normaliseSizes(
  sizes: ApiSize[] | undefined,
  splitCount: number,
): Record<SizeCode, SizeState> {
  const next = createDefaultSizes(splitCount);

  for (const item of sizes ?? []) {
    const code = (item.size_code ?? item.sizeCode) as SizeCode | undefined;
    if (!code || !(code in next)) continue;

    const original = item.original_price ?? item.originalPrice ?? item.price;
    const offer = item.offer_price ?? item.offerPrice ?? item.price ?? original;

    next[code] = {
      originalPrice: moneyString(original),
      offerPrice: moneyString(offer),
      isAvailable:
        item.is_available ??
        item.isAvailable ??
        true,
    };
  }

  // Panels are always derived from their corresponding physical size.
  next.A5_PANEL = {
    ...next.A5_PANEL,
    originalPrice: String(
      panelPrice(money(next.A5.originalPrice), splitCount),
    ),
    offerPrice: String(
      panelPrice(money(next.A5.offerPrice), splitCount),
    ),
    isAvailable: next.A5.isAvailable,
  };

  next.A4_PANEL = {
    ...next.A4_PANEL,
    originalPrice: String(
      panelPrice(money(next.A4.originalPrice), splitCount),
    ),
    offerPrice: String(
      panelPrice(money(next.A4.offerPrice), splitCount),
    ),
    isAvailable: next.A4.isAvailable,
  };

  return next;
}

function createEmptyForm(): FormState {
  const sizes = createDefaultSizes(3);

  return {
    name: "",
    slug: "",
    sku: "",
    description: "",
    categoryId: "",
    subcategoryId: "",
    searchKeywords: "",
    panelSplitCount: 3,
    panelEnabled: false,
    isActive: true,
    isFeatured: false,
    offerActive: false,
    discountPercent: "0",
    mainImage: "",
    hoverImage: "",
    mockupImage: "",
    sizes,
  };
}

function productToForm(product: ApiProduct): FormState {
  const rawSplitCount = Number(
    product.panel_split_count ?? product.panelSplitCount ?? 0,
  );
  const panelEnabled = Number.isInteger(rawSplitCount) && rawSplitCount >= 2;
  const splitCount = panelEnabled ? rawSplitCount : 3;

  const sizes = normaliseSizes(product.sizes, splitCount);

  const images = product.images ?? [];

  const mainImage =
    product.main_image ??
    images.find(
      (image) =>
        image.is_primary ||
        image.image_type === "product",
    )?.image_url ??
    "";

  const hoverImage =
    product.hover_image ??
    images.find(
      (image) => image.image_type === "shop_hover",
    )?.image_url ??
    "";
  const mockupImage =
    product.mockup_image ??
    images.find((image) => image.image_type === "shop_mockup")?.image_url ??
    "";

  const referenceCode: SizeCode = "A5";
  const original = money(sizes[referenceCode].originalPrice);
  const offer = money(sizes[referenceCode].offerPrice);

  const discount =
    original > 0 && offer < original
      ? Math.round(((original - offer) / original) * 100)
      : 0;

  return {
    name: product.name ?? "",
    slug: product.slug ?? "",
    sku: product.sku ?? "",
    description: product.description ?? "",
    categoryId: product.category_id ?? product.categoryId ?? "",
    subcategoryId:
      product.subcategory_id ??
      product.subcategoryId ??
      "",
    searchKeywords:
      product.search_keywords ??
      product.searchKeywords ??
      "",
    panelSplitCount: splitCount,
    panelEnabled,
    isActive:
      product.is_active ??
      product.isActive ??
      true,
    isFeatured:
      product.is_featured ??
      product.isFeatured ??
      false,
    offerActive: discount > 0,
    discountPercent: String(discount),
    mainImage,
    hoverImage,
    mockupImage,
    sizes,
  };
}

function isLandscapeImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const value = url.trim();
    if (!value) {
      resolve(false);
      return;
    }

    const image = new Image();
    image.onload = () =>
      resolve(image.naturalWidth > image.naturalHeight);
    image.onerror = () => resolve(false);

    image.src = /^https?:\/\//i.test(value)
      ? value
      : `${API_URL}${value.startsWith("/") ? "" : "/"}${value}`;
  });
}

function calculateDiscount(original: string, offer: string): number {
  const o = money(original);
  const p = money(offer);
  if (o <= 0 || p >= o) return 0;
  return Math.round(((o - p) / o) * 100);
}

function safeImage(url: string): string {
  return url.trim();
}

function getProductCardData(product: ApiProduct) {
  const mainImage =
    product.main_image ??
    product.images?.find(
      (image) => image.is_primary || image.image_type === "product",
    )?.image_url ??
    "";

  const hoverImage =
    product.hover_image ??
    product.images?.find(
      (image) => image.image_type === "shop_hover",
    )?.image_url ??
    product.images?.find(
      (image) => image.image_type === "hover",
    )?.image_url ??
    "";

  // Saved Mockup Studio render, kept separate from the original print artwork.
  const mockupImage =
    product.mockup_image ??
    product.images?.find(
      (image) => image.image_type === "shop_mockup",
    )?.image_url ??
    "";

  const availableSizes = (product.sizes ?? [])
    .map((size) => {
      const offer = money(
        size.offer_price ?? size.offerPrice ?? size.price,
      );
      const original = money(
        size.original_price ??
          size.originalPrice ??
          size.price ??
          offer,
      );

      return { offer, original };
    })
    .filter((size) => size.offer > 0);

  const lowest = availableSizes.length
    ? availableSizes.reduce((best, current) =>
        current.offer < best.offer ? current : best,
      )
    : {
        offer: money(product.base_price ?? product.basePrice),
        original: money(product.base_price ?? product.basePrice),
      };

  const discount =
    lowest.original > 0 && lowest.offer < lowest.original
      ? Math.round(
          ((lowest.original - lowest.offer) / lowest.original) * 100,
        )
      : 0;

  return {
    mainImage,
    hoverImage,
    mockupImage,
    offer: lowest.offer,
    original: lowest.original,
    discount,
  };
}

export default function ManageProductsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { productId } = useParams();

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [managerCategories, setManagerCategories] = useState<Category[]>([]);
  const [managerSubcategories, setManagerSubcategories] = useState<Subcategory[]>([]);
  const [managerCategoryId, setManagerCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [categoryManagerBusy, setCategoryManagerBusy] = useState(false);

  const [form, setForm] = useState<FormState>(createEmptyForm);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    productId ?? null,
  );

  const [loading, setLoading] = useState(true);
  const [loadingEditor, setLoadingEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [previewHover, setPreviewHover] = useState(false);
  const [previewTap, setPreviewTap] = useState(false);
  const [previewMode, setPreviewMode] = useState<"legacy" | "studio">("legacy");
  const [uploadingImage, setUploadingImage] = useState<"main" | "hover" | null>(null);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkNames, setBulkNames] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [selectedPreviewSize, setSelectedPreviewSize] =
    useState<"A3" | "A4" | "A5" | "A6">("A5");
  const [mainImageIsLandscape, setMainImageIsLandscape] = useState(false);

  const [activeTab, setActiveTab] = useState<"create" | "manage">(
    productId
      ? "manage"
      : searchParams.get("tab") === "manage"
        ? "manage"
        : "create",
  );
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<"main" | "hover">("main");

  const editing = Boolean(selectedProductId);

  const alternatePreviewRequested = previewHover || previewTap;
  const visiblePreviewImage = !alternatePreviewRequested
    ? form.mainImage
    : previewMode === "studio"
      ? (form.mockupImage || form.mainImage)
      : (form.hoverImage || form.mainImage);

  const selectedPreviewPrice = form.sizes[selectedPreviewSize];

  const selectedPreviewDiscount = calculateDiscount(
    selectedPreviewPrice.originalPrice,
    selectedPreviewPrice.offerPrice,
  );

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) => {
      const haystack = [
        product.name,
        product.slug,
        product.sku,
        product.category_name,
        product.subcategory_name,
        product.search_keywords,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [products, search]);

  const loadProducts = useCallback(async () => {
    const response = await fetch(
      `${API_URL}/api/admin/products`,
      {
        credentials: "include",
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to load products.",
      );
    }

    setProducts(result.products ?? []);
  }, []);

  const loadCategories = useCallback(async () => {
    const response = await fetch(
      `${API_URL}/api/admin/categories`,
      {
        credentials: "include",
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to load categories.",
      );
    }

    setCategories(result.categories ?? []);
  }, []);

  const loadSubcategories = useCallback(async (categoryId: string) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }

    const response = await fetch(
      `${API_URL}/api/admin/subcategories?categoryId=${encodeURIComponent(
        categoryId,
      )}`,
      {
        credentials: "include",
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to load subcategories.",
      );
    }

    setSubcategories(result.subcategories ?? []);
  }, []);

  const loadProduct = useCallback(async (id: string) => {
    setLoadingEditor(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/admin/products/${id}`,
        {
          credentials: "include",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load poster.",
        );
      }

      setForm(productToForm(result.product));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load poster.",
      );
    } finally {
      setLoadingEditor(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialLoad() {
      try {
        setLoading(true);
        setError("");

        await Promise.all([
          loadProducts(),
          loadCategories(),
        ]);
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load product manager.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void initialLoad();

    return () => {
      mounted = false;
    };
  }, [loadProducts, loadCategories]);

  useEffect(() => {
    if (!selectedProductId) {
      setForm(createEmptyForm());
      setPreviewTap(false);
      setPreviewHover(false);
      return;
    }

    void loadProduct(selectedProductId);
  }, [selectedProductId, loadProduct]);

  useEffect(() => {
    if (!form.categoryId) {
      setSubcategories([]);
      return;
    }

    void loadSubcategories(form.categoryId).catch((err) => {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load subcategories.",
      );
    });
  }, [form.categoryId, loadSubcategories]);

  useEffect(() => {
    if (!form.mainImage) {
      setMainImageIsLandscape(false);
      return;
    }

    let cancelled = false;
    void isLandscapeImage(form.mainImage).then((landscape) => {
      if (cancelled) return;
      setMainImageIsLandscape(landscape);
      if (!landscape) {
        setForm((current) => ({ ...current, panelEnabled: false }));
      }
    });
    return () => { cancelled = true; };
  }, [form.mainImage]);

  function updateForm<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateOriginalPrice(
    sizeCode: SizeCode,
    value: string,
  ) {
    setForm((current) => {
      const next = {
        ...current,
        sizes: {
          ...current.sizes,
          [sizeCode]: {
            ...current.sizes[sizeCode],
            originalPrice: value,
          },
        },
      };

      if (current.panelEnabled && sizeCode === "A5") {
        next.sizes.A5_PANEL = {
          ...next.sizes.A5_PANEL,
          originalPrice: String(
            panelPrice(
              money(value),
              current.panelSplitCount,
            ),
          ),
        };
      }

      if (current.panelEnabled && sizeCode === "A4") {
        next.sizes.A4_PANEL = {
          ...next.sizes.A4_PANEL,
          originalPrice: String(
            panelPrice(
              money(value),
              current.panelSplitCount,
            ),
          ),
        };
      }

      return next;
    });
  }

  function updateOfferPrice(
    sizeCode: SizeCode,
    value: string,
  ) {
    setForm((current) => {
      const next = {
        ...current,
        sizes: {
          ...current.sizes,
          [sizeCode]: {
            ...current.sizes[sizeCode],
            offerPrice: value,
          },
        },
      };

      if (current.panelEnabled && sizeCode === "A5") {
        next.sizes.A5_PANEL = {
          ...next.sizes.A5_PANEL,
          offerPrice: String(
            panelPrice(
              money(value),
              current.panelSplitCount,
            ),
          ),
        };
      }

      if (current.panelEnabled && sizeCode === "A4") {
        next.sizes.A4_PANEL = {
          ...next.sizes.A4_PANEL,
          offerPrice: String(
            panelPrice(
              money(value),
              current.panelSplitCount,
            ),
          ),
        };
      }

      return next;
    });
  }

  function updateAvailability(
    sizeCode: SizeCode,
    value: boolean,
  ) {
    setForm((current) => {
      const next = {
        ...current,
        sizes: {
          ...current.sizes,
          [sizeCode]: {
            ...current.sizes[sizeCode],
            isAvailable: value,
          },
        },
      };

      if (current.panelEnabled && sizeCode === "A5") {
        next.sizes.A5_PANEL = {
          ...next.sizes.A5_PANEL,
          isAvailable: value,
        };
      }

      if (current.panelEnabled && sizeCode === "A4") {
        next.sizes.A4_PANEL = {
          ...next.sizes.A4_PANEL,
          isAvailable: value,
        };
      }

      return next;
    });
  }

  function updatePanelSplitCount(value: string) {
    const parsed = Math.max(2, Math.min(20, Number(value) || 2));

    setForm((current) => {
      if (!current.panelEnabled) return current;

      return {
        ...current,
        panelSplitCount: parsed,
        sizes: {
          ...current.sizes,
          A5_PANEL: {
            ...current.sizes.A5_PANEL,
            originalPrice: String(
              panelPrice(money(current.sizes.A5.originalPrice) / Math.max(2, current.panelSplitCount), parsed),
            ),
            offerPrice: String(
              panelPrice(money(current.sizes.A5.offerPrice) / Math.max(2, current.panelSplitCount), parsed),
            ),
          },
          A4_PANEL: {
            ...current.sizes.A4_PANEL,
            originalPrice: String(
              panelPrice(money(current.sizes.A4.originalPrice) / Math.max(2, current.panelSplitCount), parsed),
            ),
            offerPrice: String(
              panelPrice(money(current.sizes.A4.offerPrice) / Math.max(2, current.panelSplitCount), parsed),
            ),
          },
        },
      };
    });
  }

  function applyDiscountPercent(value: string) {
    const numeric = Math.max(
      0,
      Math.min(99, Number(value) || 0),
    );

    setForm((current) => {
      const sizes = {
        ...current.sizes,
      };

      for (const code of BASE_SIZE_ORDER) {
        const original = money(sizes[code].originalPrice);
        const offer = original * (1 - numeric / 100);

        sizes[code] = {
          ...sizes[code],
          offerPrice: String(
            Number(offer.toFixed(2)),
          ),
        };
      }

      if (current.panelEnabled) sizes.A5_PANEL = {
        ...sizes.A5_PANEL,
        offerPrice: String(
          panelPrice(
            money(sizes.A5.offerPrice),
            current.panelSplitCount,
          ),
        ),
      };

      if (current.panelEnabled) sizes.A4_PANEL = {
        ...sizes.A4_PANEL,
        offerPrice: String(
          panelPrice(
            money(sizes.A4.offerPrice),
            current.panelSplitCount,
          ),
        ),
      };

      return {
        ...current,
        offerActive: numeric > 0,
        discountPercent: String(numeric),
        sizes,
      };
    });
  }

  async function handleImageUpload(
    file: File | undefined,
    type: "main" | "hover",
  ) {
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload JPG, PNG, WEBP or AVIF images only.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("Image must be 25 MB or smaller.");
      return;
    }

    setUploadingImage(type);
    setError("");
    setSuccess("");

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch(`${API_URL}/api/admin/uploads`, {
        method: "POST",
        credentials: "include",
        body,
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.url) {
        throw new Error(result.message || "Image upload failed.");
      }

      updateForm(type === "main" ? "mainImage" : "hoverImage", result.url);
      setSuccess(type === "main" ? "Main poster image uploaded." : "Hover image uploaded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setUploadingImage(null);
    }
  }

  function startNewProduct() {
    setActiveTab("create");
    setSelectedProductId(null);
    setForm(createEmptyForm());
    navigate("/admin/products", { replace: true });
    setSuccess("");
    setError("");
    setPreviewTap(false);
    setPreviewHover(false);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
    window.setTimeout(() => {
      const input = document.querySelector('input[placeholder="e.g. Luffy Gear 5"]') as HTMLInputElement | null;
      input?.focus();
    }, 250);
  }

  function editProduct(id: string) {
    setActiveTab("create");
    setSelectedProductId(id);
    setSuccess("");
    setError("");
    setPreviewTap(false);
    setPreviewHover(false);
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openAdjuster(target: "main" | "hover") {
    const url = target === "main" ? form.mainImage : form.hoverImage;
    if (!url) {
      setError(
        `Please choose or upload a ${target === "main" ? "main" : "hover"} image first before adjusting framing.`,
      );
      return;
    }
    setAdjustTarget(target);
    setAdjustModalOpen(true);
    setError("");
  }

  function handleAdjusterApply(newUrl: string) {
    updateForm(adjustTarget === "main" ? "mainImage" : "hoverImage", newUrl);
    setSuccess(
      `${adjustTarget === "main" ? "Main poster" : "Hover image"} framing saved and updated. Click "Save Poster" to commit changes.`,
    );
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!form.name.trim()) {
        throw new Error("Poster name is required.");
      }

      if (!form.categoryId) {
        throw new Error("Please select a category.");
      }

      for (const code of BASE_SIZE_ORDER) {
        const original = money(form.sizes[code].originalPrice);
        const offer = money(form.sizes[code].offerPrice);

        if (offer > original) {
          throw new Error(
            `${SIZE_LABELS[code]} offer price cannot be greater than original price.`,
          );
        }
      }

      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        sku: form.sku.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId || null,
        searchKeywords: form.searchKeywords.trim(),
        panelSplitCount: form.panelEnabled ? form.panelSplitCount : 0,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        basePrice: money(form.sizes.A6.offerPrice),
        offerActive: form.offerActive,
        offerPercent: Number(form.discountPercent) || 0,
        offerPrice: money(form.sizes.A5.offerPrice),
        sizes: (form.panelEnabled ? SIZE_ORDER : BASE_SIZE_ORDER).map((sizeCode) => ({
          sizeCode,
          price: money(form.sizes[sizeCode].offerPrice),
          originalPrice: money(
            form.sizes[sizeCode].originalPrice,
          ),
          offerPrice: money(
            form.sizes[sizeCode].offerPrice,
          ),
          isAvailable: form.sizes[sizeCode].isAvailable,
        })),
        images: [
          ...(safeImage(form.mainImage)
            ? [
                {
                  imageUrl: safeImage(form.mainImage),
                  altText: form.name.trim(),
                  imageType: "product",
                  sortOrder: 0,
                  isPrimary: true,
                },
              ]
            : []),
          ...(safeImage(form.hoverImage)
            ? [
                {
                  imageUrl: safeImage(form.hoverImage),
                  altText: `${form.name.trim()} hover`,
                  imageType: "shop_hover",
                  sortOrder: 1,
                  isPrimary: false,
                },
              ]
            : []),
          ...(safeImage(form.mockupImage)
            ? [{ imageUrl: safeImage(form.mockupImage), altText: `${form.name.trim()} room mockup`, imageType: "shop_mockup", sortOrder: 2, isPrimary: false }]
            : []),
        ],
      };

      const endpoint = selectedProductId
        ? `${API_URL}/api/admin/products/${selectedProductId}`
        : `${API_URL}/api/admin/products`;

      const response = await fetch(endpoint, {
        method: selectedProductId ? "PUT" : "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to save poster.",
        );
      }

      setSuccess(
        selectedProductId
          ? "Poster updated successfully."
          : "Poster created successfully.",
      );

      await loadProducts();

      if (!selectedProductId) {
        // After creating a new poster, stay on the CREATE POSTER page.
        // Reset the form so the admin can immediately upload the next poster.
        setSelectedProductId(null);
        setActiveTab("create");
        setForm(createEmptyForm());
        setPreviewTap(false);
        setPreviewHover(false);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save poster.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function loadCategoryManager(preferredCategoryId?: string) {
    const response = await fetch(`${API_URL}/api/admin/categories?includeInactive=true`, { credentials: "include" });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Could not load categories.");
    const all = (result.categories || []) as Category[];
    setManagerCategories(all);
    const selected = preferredCategoryId || managerCategoryId || all[0]?.id || "";
    setManagerCategoryId(selected);
    if (!selected) { setManagerSubcategories([]); return; }
    const subResponse = await fetch(`${API_URL}/api/admin/subcategories?categoryId=${encodeURIComponent(selected)}&includeInactive=true`, { credentials: "include" });
    const subResult = await subResponse.json();
    if (!subResponse.ok || !subResult.success) throw new Error(subResult.message || "Could not load subcategories.");
    setManagerSubcategories(subResult.subcategories || []);
  }

  async function createCategory() {
    const name = newCategoryName.trim();
    if (name.length < 2) { setError("Enter a category name with at least two characters."); return; }
    setCategoryManagerBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`${API_URL}/api/admin/categories`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not create category.");
      setNewCategoryName(""); await loadCategories(); await loadCategoryManager(result.category.id);
      setSuccess(`Category “${result.category.name}” created.`);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not create category."); }
    finally { setCategoryManagerBusy(false); }
  }

  async function editCategory(category: Category) {
    const name = window.prompt("Edit category name", category.name)?.trim();
    if (!name || name === category.name) return;
    setCategoryManagerBusy(true); setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/categories/${encodeURIComponent(category.id)}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || "Could not update category.");
      await loadCategories(); await loadCategoryManager(category.id); setSuccess("Category updated.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not update category."); }
    finally { setCategoryManagerBusy(false); }
  }

  async function toggleCategory(category: Category) {
    setCategoryManagerBusy(true); setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/categories/${encodeURIComponent(category.id)}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: category.is_active === false }) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || "Could not update category.");
      await loadCategories(); await loadCategoryManager(category.id); setSuccess(category.is_active === false ? "Category activated." : "Category deactivated; existing products were preserved.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not update category."); }
    finally { setCategoryManagerBusy(false); }
  }

  async function createSubcategory() {
    const name = newSubcategoryName.trim();
    if (!managerCategoryId || name.length < 2) { setError("Choose an active category and enter a subcategory name."); return; }
    setCategoryManagerBusy(true); setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/subcategories`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ categoryId: managerCategoryId, name }) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || "Could not create subcategory.");
      setNewSubcategoryName(""); await loadSubcategories(managerCategoryId); await loadCategoryManager(managerCategoryId); setSuccess("Subcategory created.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not create subcategory."); }
    finally { setCategoryManagerBusy(false); }
  }

  async function editSubcategory(subcategory: Subcategory) {
    const name = window.prompt("Edit subcategory name", subcategory.name)?.trim();
    if (!name || name === subcategory.name) return;
    setCategoryManagerBusy(true); setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/subcategories/${encodeURIComponent(subcategory.id)}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || "Could not update subcategory.");
      await loadSubcategories(managerCategoryId); await loadCategoryManager(managerCategoryId); setSuccess("Subcategory updated.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not update subcategory."); }
    finally { setCategoryManagerBusy(false); }
  }

  async function toggleSubcategory(subcategory: Subcategory) {
    setCategoryManagerBusy(true); setError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/subcategories/${encodeURIComponent(subcategory.id)}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: subcategory.is_active === false }) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || "Could not update subcategory.");
      await loadSubcategories(managerCategoryId); await loadCategoryManager(managerCategoryId); setSuccess(subcategory.is_active === false ? "Subcategory activated." : "Subcategory deactivated; existing products were preserved.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not update subcategory."); }
    finally { setCategoryManagerBusy(false); }
  }

  function chooseBulkFiles(fileList: FileList | null) {
    const selected = Array.from(fileList || []);
    if (selected.length > 20) {
      setError("Bulk upload is limited to 20 posters at a time.");
      return;
    }
    const allowed = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
    const invalid = selected.find(file => !allowed.has(file.type) || file.size > 25 * 1024 * 1024);
    if (invalid) {
      setError(!allowed.has(invalid.type) ? `${invalid.name}: use JPG, PNG, WEBP or AVIF.` : `${invalid.name}: image must be 25 MB or smaller.`);
      return;
    }
    setError("");
    setBulkFiles(selected);
    setBulkNames(selected.map(file => file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim()));
  }

  async function runBulkUpload() {
    if (!bulkFiles.length) { setError("Choose at least one image for bulk upload."); return; }
    if (!form.categoryId) { setError("Choose the shared category in the poster form first."); return; }
    if (editing) { setError("Finish editing the current poster before using bulk upload."); return; }
    setBulkProcessing(true); setError(""); setSuccess("");
    let succeeded = 0;
    const failures: string[] = [];
    try {
      // Sequential upload is deliberate: it limits CPU, memory and backend pressure.
      for (let index = 0; index < bulkFiles.length; index += 1) {
        const file = bulkFiles[index];
        const name = (bulkNames[index] || "").trim();
        if (!name) { failures.push(`${file.name}: poster name is required.`); continue; }
        try {
          const uploadBody = new FormData(); uploadBody.append("file", file);
          const uploadResponse = await fetch(`${API_URL}/api/admin/uploads`, { method: "POST", credentials: "include", body: uploadBody });
          const uploadResult = await uploadResponse.json();
          if (!uploadResponse.ok || !uploadResult.success || !uploadResult.url) throw new Error(uploadResult.message || "Image upload failed.");
          const imageUrl = String(uploadResult.url);
          const payload = {
            name, slug: `${slugify(name)}-${Date.now().toString(36)}-${index + 1}`,
            sku: "", description: form.description.trim(), categoryId: form.categoryId,
            subcategoryId: form.subcategoryId || null, searchKeywords: form.searchKeywords.trim(),
            panelSplitCount: form.panelEnabled ? form.panelSplitCount : 2,
            isActive: form.isActive, isFeatured: form.isFeatured,
            basePrice: money(form.sizes.A6.offerPrice), offerActive: form.offerActive,
            offerPercent: Number(form.discountPercent) || 0, offerPrice: money(form.sizes.A5.offerPrice),
            sizes: (form.panelEnabled ? SIZE_ORDER : BASE_SIZE_ORDER).map(sizeCode => ({
              sizeCode, price: money(form.sizes[sizeCode].offerPrice),
              originalPrice: money(form.sizes[sizeCode].originalPrice),
              offerPrice: money(form.sizes[sizeCode].offerPrice), isAvailable: form.sizes[sizeCode].isAvailable,
            })),
            images: [{ imageUrl, altText: name, imageType: "product", sortOrder: 0, isPrimary: true }],
          };
          const createResponse = await fetch(`${API_URL}/api/admin/products`, {
            method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
          });
          const createResult = await createResponse.json();
          if (!createResponse.ok || !createResult.success) throw new Error(createResult.message || "Product creation failed.");
          succeeded += 1;
        } catch (error) {
          failures.push(`${file.name}: ${error instanceof Error ? error.message : "Upload failed."}`);
        }
      }
      await loadProducts();
      setBulkFiles([]); setBulkNames([]);
      setSuccess(`Bulk upload finished: ${succeeded} poster(s) created${failures.length ? `; ${failures.length} failed` : "."}`);
      if (failures.length) setError(failures.slice(0, 5).join("\n") + (failures.length > 5 ? `\n…and ${failures.length - 5} more error(s).` : ""));
    } finally { setBulkProcessing(false); }
  }

  async function toggleProductVisibility(product: ApiProduct) {
    const active = product.is_active ?? product.isActive ?? true;
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`${API_URL}/api/admin/products/${encodeURIComponent(product.id)}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !active }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Could not update poster visibility.");
      setSuccess(active ? "Poster hidden from the shop." : "Poster is visible in the shop again.");
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update poster visibility.");
    }
  }

  async function deleteProduct(id: string) {
    const confirmed = window.confirm(
      "Delete this poster permanently?",
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/api/admin/products/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to delete poster.",
        );
      }

      if (selectedProductId === id) {
        setSelectedProductId(null);
        setForm(createEmptyForm());
        setActiveTab("manage");
        setPreviewTap(false);
        setPreviewHover(false);
        navigate("/admin/products", { replace: true });
      }

      await loadProducts();
      setSuccess("Poster deleted successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete poster.",
      );
    }
  }

  function handleCategoryChange(categoryId: string) {
    setForm((current) => ({
      ...current,
      categoryId,
      subcategoryId: "",
    }));
  }

  if (loading) {
    return (
      <main style={styles.page}>
<style>{`
  .zavyro-manage-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .zavyro-manage-card:hover .zavyro-manage-card-hover-image {
    opacity: 1 !important;
  }

  .zavyro-manage-card:hover {
    transform: translateY(-2px);
  }

  @media (min-width: 760px) {
    .zavyro-manage-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .zavyro-admin-price-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }
    .zavyro-admin-field-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    .zavyro-admin-field-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
    .zavyro-admin-visibility-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
    .zavyro-admin-offer-box {
      grid-template-columns: 180px minmax(0, 1fr) !important;
      align-items: center;
    }
  }

  @media (min-width: 1050px) {
    .zavyro-manage-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .zavyro-admin-layout {
      grid-template-columns: 300px minmax(0, 1fr) !important;
    }
  }

  @media (max-width: 759px) {
    .zavyro-admin-panel-controls {
      grid-template-columns: 1fr !important;
    }
  }
`}</style>

        <div style={styles.loadingCard}>
          <div style={styles.zMark}>Z</div>
          <p>Loading product manager...</p>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <style>{`
        .zavyro-manage-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .zavyro-manage-card:hover .zavyro-manage-card-hover-image {
          opacity: 1 !important;
        }

        .zavyro-manage-card:hover {
          transform: translateY(-2px);
        }

        @media (min-width: 760px) {
          .zavyro-manage-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (min-width: 1050px) {
          .zavyro-manage-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }
      `}</style>
      <div style={styles.container}>
        <header style={{ ...styles.header, alignItems: "flex-start" }}>
          <div>
            <div style={styles.eyebrow}>ZAVYRO POSTERS</div>
            <h1 style={styles.title}>Manage Posters</h1>
            <p style={styles.subtitle}>
              Create, edit and control every poster in your store.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin")}
            style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 14px", background: "var(--color-surface)", color: "var(--color-text)", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            ← Admin Dashboard
          </button>
        </header>

        {(error || success) && (
          <div
            role="status"
            style={{
              ...styles.notice,
              borderColor: error
                ? "var(--color-danger, #ef4444)"
                : "var(--color-success, #22c55e)",
              color: error
                ? "var(--color-danger, #ef4444)"
                : "var(--color-success, #22c55e)",
            }}
          >
            {error || success}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 18,
            padding: 6,
            border: "1px solid var(--color-border)",
            borderRadius: 14,
            background: "var(--color-surface)",
            width: "fit-content",
            maxWidth: "100%",
            overflowX: "auto",
          }}
          role="tablist"
          aria-label="Poster management sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "create"}
            onClick={startNewProduct}
            style={{
              border: "0",
              borderRadius: 10,
              padding: "11px 18px",
              fontWeight: 800,
              letterSpacing: ".04em",
              whiteSpace: "nowrap",
              cursor: "pointer",
              color:
                activeTab === "create"
                  ? "#fff"
                  : "var(--color-text)",
              background:
                activeTab === "create"
                  ? "var(--color-primary, #7c3aed)"
                  : "transparent",
              boxShadow:
                activeTab === "create"
                  ? "0 0 22px rgba(124,58,237,.28)"
                  : "none",
            }}
          >
            CREATE POSTER
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "manage"}
            onClick={() => {
              setActiveTab("manage");
              setError("");
              setSuccess("");
            }}
            style={{
              border: "0",
              borderRadius: 10,
              padding: "11px 18px",
              fontWeight: 800,
              letterSpacing: ".04em",
              whiteSpace: "nowrap",
              cursor: "pointer",
              color:
                activeTab === "manage"
                  ? "#fff"
                  : "var(--color-text)",
              background:
                activeTab === "manage"
                  ? "var(--color-primary, #7c3aed)"
                  : "transparent",
              boxShadow:
                activeTab === "manage"
                  ? "0 0 22px rgba(124,58,237,.28)"
                  : "none",
            }}
          >
            MANAGE EXISTING
          </button>
        </div>

        {activeTab === "manage" ? (
          <section style={styles.manageSection}>
            <div style={styles.manageToolbar}>
              <div>
                <strong style={styles.manageToolbarTitle}>
                  Existing Posters
                </strong>
                <span style={styles.countBadge}>
                  {filteredProducts.length}
                </span>
              </div>

              <div style={styles.manageToolbarSearch}>
                <span aria-hidden="true">⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search posters..."
                  style={styles.manageSearchInput}
                  aria-label="Search existing posters"
                />
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div style={styles.manageEmpty}>
                <strong>No posters found.</strong>
                <span>Try another search term.</span>
              </div>
            ) : (
              <div style={styles.manageGrid} className="zavyro-manage-grid">
                {filteredProducts.map((product) => {
                  const card = getProductCardData(product);
                  const active =
                    product.is_active ?? product.isActive ?? true;

                  return (
                    <article key={product.id} style={styles.manageCard} className="zavyro-manage-card">
                      <div style={styles.manageCardImageWrap}>
                        {card.mainImage ? (
                          <img
                            src={card.mainImage}
                            alt={product.name}
                            style={styles.manageCardImage}
                          />
                        ) : (
                          <div style={styles.manageCardPlaceholder}>Z</div>
                        )}

                        {(card.mockupImage || card.hoverImage) && (
                          <img
                            src={card.mockupImage || card.hoverImage}
                            alt=""
                            aria-hidden="true"
                            className="zavyro-manage-card-hover-image"
                            data-fallback-image={card.hoverImage || ""}
                            onError={(event) => {
                              // Use the legacy hover image if the saved Studio render cannot load.
                              const image = event.currentTarget;
                              const fallback = image.dataset.fallbackImage;
                              if (fallback && image.dataset.usedFallback !== "true") {
                                image.dataset.usedFallback = "true";
                                image.src = fallback;
                              } else {
                                image.style.display = "none";
                              }
                            }}
                            style={{
                              ...styles.manageCardImage,
                              ...styles.manageCardHoverImage,
                            }}
                          />
                        )}

                        {card.discount > 0 && (
                          <span style={styles.manageSaleBadge}>
                            -{card.discount}%
                          </span>
                        )}

                        <span
                          style={{
                            ...styles.manageStatusBadge,
                            color: active
                              ? "var(--color-success, #16a34a)"
                              : "var(--color-danger, #ef4444)",
                            background: active
                              ? "rgba(34,197,94,.12)"
                              : "rgba(239,68,68,.12)",
                          }}
                        >
                          {active ? "LIVE" : "HIDDEN"}
                        </span>
                      </div>

                      <div style={styles.manageCardBody}>
                        <div style={styles.manageCardCategory}>
                          {product.category_name || "Uncategorized"}
                          {product.subcategory_name
                            ? ` · ${product.subcategory_name}`
                            : ""}
                        </div>

                        <h2 style={styles.manageCardTitle}>
                          {product.name}
                        </h2>

                        <div style={styles.manageCardPriceRow}>
                          {card.discount > 0 && card.original > card.offer && (
                            <span style={styles.manageOriginalPrice}>
                              ₹{card.original.toLocaleString("en-IN")}
                            </span>
                          )}
                          <strong style={styles.manageOfferPrice}>
                            {card.offer > 0
                              ? `₹${card.offer.toLocaleString("en-IN")}`
                              : "Price not set"}
                          </strong>
                          {card.discount > 0 && (
                            <em style={styles.manageDiscount}>
                              -{card.discount}%
                            </em>
                          )}
                        </div>

                        <div style={styles.manageCardActions}>
                          <button
                            type="button"
                            style={styles.manageEditButton}
                            onClick={() => editProduct(product.id)}
                          >
                            Edit Poster
                          </button>
                          <button
                            type="button"
                            style={styles.manageEditButton}
                            onClick={() => void toggleProductVisibility(product)}
                          >
                            {active ? "Hide" : "Unhide"}
                          </button>
                          <button
                            type="button"
                            style={styles.manageDeleteButton}
                            onClick={() => void deleteProduct(product.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <div
            style={{
              ...styles.layout,
              gridTemplateColumns: "minmax(0, 1fr)",
            }}
            className="zavyro-admin-layout"
          >
            <section style={styles.editor}>

            {!editing && (
              <details onToggle={event => { if (event.currentTarget.open) void loadCategoryManager().catch(error => setError(error instanceof Error ? error.message : "Could not load categories.")); }} style={{ border: "1px solid var(--color-border)", borderRadius: 14, padding: 14, marginBottom: 16, background: "var(--color-surface)" }}>
                <summary style={{ cursor: "pointer", fontWeight: 850, color: "var(--color-text)" }}>CATEGORY MANAGER · Create / edit / activate</summary>
                <p style={{ color: "var(--color-text-secondary)", fontSize: 13, lineHeight: 1.5 }}>Deactivation hides a category from new selection without deleting it or breaking products already linked to it.</p>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, marginBottom: 12 }}><input value={newCategoryName} disabled={categoryManagerBusy} onChange={event => setNewCategoryName(event.target.value)} placeholder="New category name" style={styles.input} /><button type="button" disabled={categoryManagerBusy} onClick={() => void createCategory()} style={styles.primaryButton}>Add category</button></div>
                <div style={{ display: "grid", gap: 8 }}>
                  {managerCategories.map(category => <div key={category.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 7, alignItems: "center", border: "1px solid var(--color-border)", borderRadius: 10, padding: 8 }}><span style={{ color: "var(--color-text)", fontSize: 13 }}>{category.name} <small style={{ color: "var(--color-text-secondary)" }}>{category.is_active === false ? "· inactive" : "· active"}</small></span><button type="button" disabled={categoryManagerBusy} onClick={() => void editCategory(category)} style={styles.manageEditButton}>Edit</button><button type="button" disabled={categoryManagerBusy} onClick={() => void toggleCategory(category)} style={styles.manageEditButton}>{category.is_active === false ? "Activate" : "Deactivate"}</button></div>)}
                </div>
                <hr style={{ border: 0, borderTop: "1px solid var(--color-border)", margin: "16px 0" }} />
                <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>Manage subcategories for
                  <select value={managerCategoryId} disabled={categoryManagerBusy} onChange={event => { setManagerCategoryId(event.target.value); void loadCategoryManager(event.target.value).catch(error => setError(error instanceof Error ? error.message : "Could not load subcategories.")); }} style={styles.input}>{managerCategories.map(category => <option key={category.id} value={category.id}>{category.name}{category.is_active === false ? " (inactive)" : ""}</option>)}</select>
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, margin: "10px 0" }}><input value={newSubcategoryName} disabled={categoryManagerBusy || managerCategories.find(category => category.id === managerCategoryId)?.is_active === false} onChange={event => setNewSubcategoryName(event.target.value)} placeholder="New subcategory name" style={styles.input} /><button type="button" disabled={categoryManagerBusy || managerCategories.find(category => category.id === managerCategoryId)?.is_active === false} onClick={() => void createSubcategory()} style={styles.primaryButton}>Add subcategory</button></div>
                <div style={{ display: "grid", gap: 8 }}>{managerSubcategories.map(subcategory => <div key={subcategory.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 7, alignItems: "center", border: "1px solid var(--color-border)", borderRadius: 10, padding: 8 }}><span style={{ color: "var(--color-text)", fontSize: 13 }}>{subcategory.name} <small style={{ color: "var(--color-text-secondary)" }}>{subcategory.is_active === false ? "· inactive" : "· active"}</small></span><button type="button" disabled={categoryManagerBusy} onClick={() => void editSubcategory(subcategory)} style={styles.manageEditButton}>Edit</button><button type="button" disabled={categoryManagerBusy} onClick={() => void toggleSubcategory(subcategory)} style={styles.manageEditButton}>{subcategory.is_active === false ? "Activate" : "Deactivate"}</button></div>)}</div>
              </details>
            )}

            {!editing && (
              <details style={{ border: "1px solid var(--color-border)", borderRadius: 14, padding: 14, marginBottom: 16, background: "var(--color-surface)" }}>
                <summary style={{ cursor: "pointer", fontWeight: 850, color: "var(--color-text)" }}>BULK UPLOAD · Up to 20 posters</summary>
                <p style={{ color: "var(--color-text-secondary)", fontSize: 13, lineHeight: 1.5 }}>Choose several image files. Each file becomes a separate product. Category, subcategory, prices, availability and other settings come from the poster form below. Files process one at a time to reduce crash risk; successful products are kept if another file fails.</p>
                <label style={{ display: "grid", gap: 8, fontSize: 13, color: "var(--color-text)" }}>Poster image files (JPG / PNG / WEBP / AVIF, max 25 MB each)
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif" disabled={bulkProcessing} onChange={event => chooseBulkFiles(event.target.files)} />
                </label>
                {bulkFiles.length > 0 && <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                  <strong style={{ fontSize: 13, color: "var(--color-text)" }}>{bulkFiles.length} file(s) selected — edit each product name</strong>
                  {bulkFiles.map((file, index) => <label key={`${file.name}-${file.lastModified}-${index}`} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 8, alignItems: "center", fontSize: 12, color: "var(--color-text-secondary)" }}><input aria-label={`Product name for ${file.name}`} value={bulkNames[index] || ""} disabled={bulkProcessing} onChange={event => setBulkNames(names => names.map((name, i) => i === index ? event.target.value : name))} style={{ ...styles.input, minWidth: 0 }} /><span>{(file.size / (1024 * 1024)).toFixed(1)} MB</span></label>)}
                  <button type="button" disabled={bulkProcessing} onClick={() => void runBulkUpload()} style={{ ...styles.primaryButton, opacity: bulkProcessing ? .7 : 1 }}>{bulkProcessing ? "Uploading one by one…" : `Create ${bulkFiles.length} separate product(s)`}</button>
                </div>}
              </details>
            )}

            {loadingEditor ? (
              <div style={styles.loadingCard}>
                <div style={styles.zMark}>Z</div>
                <p>Loading poster...</p>
              </div>
            ) : (
              <form onSubmit={saveProduct}>
                <Section
                  number="01"
                  title="POSTER INFORMATION"
                >
                  <div style={styles.fieldGrid} className="zavyro-admin-field-grid">
                    <Field
                      label="Poster Name"
                      value={form.name}
                      onChange={(value) =>
                        updateForm("name", value)
                      }
                      placeholder="e.g. Luffy Gear 5"
                      required
                    />

                    <Field
                      label="Slug"
                      value={form.slug}
                      onChange={(value) =>
                        updateForm("slug", value)
                      }
                      placeholder="luffy-gear-5"
                    />

                    <Field
                      label="SKU"
                      value={form.sku}
                      onChange={(value) =>
                        updateForm("sku", value)
                      }
                      placeholder="ZAV-LUF-001"
                    />
                  </div>

                  <label style={styles.fieldLabel}>
                    Description
                    <textarea
                      value={form.description}
                      onChange={(event) =>
                        updateForm(
                          "description",
                          event.target.value,
                        )
                      }
                      rows={4}
                      placeholder="Describe the poster..."
                      style={styles.textarea}
                    />
                  </label>

                  <label style={styles.fieldLabel}>
                    Search Keywords
                    <input
                      value={form.searchKeywords}
                      onChange={(event) =>
                        updateForm(
                          "searchKeywords",
                          event.target.value,
                        )
                      }
                      placeholder="Luffy, One Piece, anime, Gear 5"
                      style={styles.input}
                    />
                  </label>
                </Section>

                <Section
                  number="02"
                  title="CATEGORY"
                >
                  <div style={styles.fieldGrid} className="zavyro-admin-field-grid">
                    <label style={styles.fieldLabel}>
                      Category
                      <select
                        value={form.categoryId}
                        onChange={(event) =>
                          handleCategoryChange(
                            event.target.value,
                          )
                        }
                        style={styles.input}
                        required
                      >
                        <option value="">
                          Select category
                        </option>
                        {categories.map((category) => (
                          <option
                            key={category.id}
                            value={category.id}
                          >
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={styles.fieldLabel}>
                      Subcategory
                      <select
                        value={form.subcategoryId}
                        onChange={(event) =>
                          updateForm(
                            "subcategoryId",
                            event.target.value,
                          )
                        }
                        style={{
                          ...styles.input,
                          cursor: form.categoryId ? "pointer" : "not-allowed",
                          opacity: form.categoryId ? 1 : 0.65,
                        }}
                      >
                        <option value="">
                          {!form.categoryId
                            ? "Select category first"
                            : subcategories.length
                              ? "Select subcategory"
                              : "No subcategories found — add them in database"}
                        </option>
                        {subcategories.map(
                          (subcategory) => (
                            <option
                              key={subcategory.id}
                              value={subcategory.id}
                            >
                              {subcategory.name}
                            </option>
                          ),
                        )}
                      </select>
                      {form.categoryId && subcategories.length === 0 && (
                        <span style={{ color: "var(--color-muted, #64748b)", fontSize: 12, lineHeight: 1.4 }}>
                          This category currently has no subcategories in PostgreSQL.
                        </span>
                      )}
                    </label>
                  </div>
                </Section>

                <Section
                  number="03"
                  title="PRICING"
                  description="Every size has its own original and offer price."
                >
                  <div style={styles.priceGrid} className="zavyro-admin-price-grid">
                    {BASE_SIZE_ORDER.map((code) => (
                      <PriceCard
                        key={code}
                        code={code}
                        size={form.sizes[code]}
                        onOriginalChange={
                          updateOriginalPrice
                        }
                        onOfferChange={
                          updateOfferPrice
                        }
                        onAvailabilityChange={
                          updateAvailability
                        }
                      />
                    ))}
                  </div>
                </Section>

                <Section
                  number="04"
                  title="PANEL POSTERS"
                  description="Enable panels only for horizontal artwork. Each enabled poster can be sold as a continuous 3-piece panel."
                >
                  <label style={styles.switchRow}>
                    <input
                      type="checkbox"
                      checked={form.panelEnabled}
                      disabled={!mainImageIsLandscape}
                      onChange={(event) => {
                        const enabled = event.target.checked;
                        setForm((current) => {
                          if (!enabled) {
                            return { ...current, panelEnabled: false };
                          }
                          const split = Math.max(2, current.panelSplitCount || 3);
                          return {
                            ...current,
                            panelEnabled: true,
                            panelSplitCount: split,
                            sizes: {
                              ...current.sizes,
                              A5_PANEL: {
                                ...current.sizes.A5_PANEL,
                                originalPrice: String(panelPrice(money(current.sizes.A5.originalPrice), split)),
                                offerPrice: String(panelPrice(money(current.sizes.A5.offerPrice), split)),
                                isAvailable: current.sizes.A5.isAvailable,
                              },
                              A4_PANEL: {
                                ...current.sizes.A4_PANEL,
                                originalPrice: String(panelPrice(money(current.sizes.A4.originalPrice), split)),
                                offerPrice: String(panelPrice(money(current.sizes.A4.offerPrice), split)),
                                isAvailable: current.sizes.A4.isAvailable,
                              },
                            },
                          };
                        });
                      }}
                    />
                    <span>{mainImageIsLandscape ? "Enable 3-Piece Panel" : "Upload a horizontal poster to enable panels"}</span>
                  </label>

                  {form.panelEnabled && (
                    <>
                  <div style={styles.panelControls} className="zavyro-admin-panel-controls">
                    <label style={styles.fieldLabel}>
                      Panel Pieces
                      <input
                        type="number"
                        min={2}
                        max={20}
                        value={form.panelSplitCount}
                        onChange={(event) =>
                          updatePanelSplitCount(
                            event.target.value,
                          )
                        }
                        style={styles.input}
                      />
                    </label>

                    <div style={styles.panelInfo}>
                      <strong>
                        Panel prices are automatic
                      </strong>
                      <span>
                        A5 Panel = A5 ×{" "}
                        {form.panelSplitCount}
                      </span>
                      <span>
                        A4 Panel = A4 ×{" "}
                        {form.panelSplitCount}
                      </span>
                    </div>
                  </div>

                  <div style={styles.priceGrid} className="zavyro-admin-price-grid">
                    {(
                      [
                        "A5_PANEL",
                        "A4_PANEL",
                      ] as const
                    ).map((code) => (
                      <PanelCard
                        key={code}
                        code={code}
                        size={form.sizes[code]}
                      />
                    ))}
                  </div>
                    </>
                  )}
                </Section>

                <Section
                  number="05"
                  title="OFFER"
                  description="Apply one discount to all physical sizes. Individual offer prices remain editable."
                >
                  <label style={styles.switchRow}>
                    <input
                      type="checkbox"
                      checked={form.offerActive}
                      onChange={(event) => {
                        const enabled =
                          event.target.checked;

                        if (!enabled) {
                          updateForm(
                            "offerActive",
                            false,
                          );
                          return;
                        }

                        applyDiscountPercent(
                          form.discountPercent ===
                            "0"
                            ? "10"
                            : form.discountPercent,
                        );
                      }}
                    />
                    <span>
                      Enable Offer
                    </span>
                  </label>

                  {form.offerActive && (
                    <div style={styles.offerBox} className="zavyro-admin-offer-box">
                      <label
                        style={styles.fieldLabel}
                      >
                        Discount
                        <div
                          style={
                            styles.percentInput
                          }
                        >
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={
                              form.discountPercent
                            }
                            onChange={(event) =>
                              applyDiscountPercent(
                                event.target.value,
                              )
                            }
                            style={{
                              ...styles.input,
                              border: 0,
                              background:
                                "transparent",
                            }}
                          />
                          <span>% OFF</span>
                        </div>
                      </label>

                      <div style={styles.offerSummary}>
                        <strong>
                          Discount is calculated from
                          Original → Offer.
                        </strong>
                        <span>
                          You can still fine-tune each
                          size above.
                        </span>
                      </div>
                    </div>
                  )}
                </Section>

                <Section
                  number="06"
                  title="IMAGES"
                  description="Main image appears normally. Hover image appears on desktop hover and mobile tap."
                >
                  <div style={styles.imageUploadGrid} className="zavyro-admin-field-grid">
                    <ImageUploadCard
                      title="Main Shop Image"
                      description="The normal product image shown in the shop."
                      value={form.mainImage}
                      uploading={uploadingImage === "main"}
                      onFile={(file) => void handleImageUpload(file, "main")}
                      onUrlChange={(value) => updateForm("mainImage", value)}
                      onAdjust={() => openAdjuster("main")}
                    />

                    <ImageUploadCard
                      title="Shop Hover Image"
                      description="Alternate image for desktop hover and mobile tap."
                      value={form.hoverImage}
                      uploading={uploadingImage === "hover"}
                      onFile={(file) => void handleImageUpload(file, "hover")}
                      onUrlChange={(value) => updateForm("hoverImage", value)}
                      onAdjust={() => openAdjuster("hover")}
                    />
                  </div>
                  <MockupStudio artworkUrl={form.mainImage} mockupUrl={form.mockupImage} onSaved={(url) => updateForm("mockupImage", url)} />
                </Section>

                <Section
                  number="07"
                  title="VISIBILITY"
                >
                  <div style={styles.visibilityGrid} className="zavyro-admin-visibility-grid">
                    <label style={styles.switchRow}>
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={(event) =>
                          updateForm(
                            "isActive",
                            event.target.checked,
                          )
                        }
                      />
                      <span>
                        Published
                      </span>
                    </label>

                    <label style={styles.switchRow}>
                      <input
                        type="checkbox"
                        checked={form.isFeatured}
                        onChange={(event) =>
                          updateForm(
                            "isFeatured",
                            event.target.checked,
                          )
                        }
                      />
                      <span>
                        Featured
                      </span>
                    </label>
                  </div>
                </Section>

                <Section
                  number="08"
                  title="LIVE SHOP PREVIEW"
                  description="Desktop hover and mobile tap preview."
                >
                  <div style={styles.previewShell}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Alternate preview source</span>
                      <div role="group" aria-label="Choose product hover preview" style={{ display: "inline-flex", flexWrap: "wrap", gap: 6 }}>
                        <button type="button" aria-pressed={previewMode === "legacy"} onClick={() => { setPreviewMode("legacy"); setPreviewHover(false); setPreviewTap(false); }} style={{ ...styles.previewSizeButton, borderColor: previewMode === "legacy" ? "var(--color-accent)" : undefined, background: previewMode === "legacy" ? "var(--color-accent-bg)" : undefined }}>Old hover image</button>
                        <button type="button" aria-pressed={previewMode === "studio"} onClick={() => { setPreviewMode("studio"); setPreviewHover(false); setPreviewTap(false); }} style={{ ...styles.previewSizeButton, borderColor: previewMode === "studio" ? "var(--color-accent)" : undefined, background: previewMode === "studio" ? "var(--color-accent-bg)" : undefined }}>Mockup Studio</button>
                      </div>
                    </div>
                    <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--color-text-secondary)" }}>
                      The original poster appears first. Hover over the preview (or tap it) to test the selected alternate image.
                      {previewMode === "studio" && !form.mockupImage ? " Save a Mockup Studio render first to preview it here." : ""}
                      {previewMode === "legacy" && !form.hoverImage ? " No old hover image is saved; the original poster will remain visible." : ""}
                    </p>
                    <div
                      style={styles.previewCard}
                      onMouseEnter={() =>
                        setPreviewHover(true)
                      }
                      onMouseLeave={() =>
                        setPreviewHover(false)
                      }
                      onClick={() =>
                        setPreviewTap(
                          (current) => !current,
                        )
                      }
                    >
                      <div
                        style={styles.previewImageWrap}
                      >
                        {visiblePreviewImage ? (
                          <img
                            src={visiblePreviewImage}
                            alt={form.name}
                            style={{
                              ...styles.previewImage,
                              opacity:
                                visiblePreviewImage
                                  ? 1
                                  : 0,
                            }}
                          />
                        ) : (
                          <div
                            style={
                              styles.previewPlaceholder
                            }
                          >
                            ZAVYRO
                          </div>
                        )}

                        {selectedPreviewDiscount >
                          0 && (
                          <span
                            style={styles.saleBadge}
                          >
                            -
                            {
                              selectedPreviewDiscount
                            }
                            %
                          </span>
                        )}

                        {form.hoverImage && (
                          <span
                            style={
                              styles.tapHint
                            }
                          >
                            Tap to preview
                          </span>
                        )}
                      </div>

                      <div
                        style={styles.previewContent}
                      >
                        <strong
                          style={
                            styles.previewName
                          }
                        >
                          {form.name ||
                            "Poster Name"}
                        </strong>

                        <div
                          style={
                            styles.previewPriceRow
                          }
                        >
                          {selectedPreviewDiscount >
                            0 && (
                            <span
                              style={
                                styles.strikePrice
                              }
                            >
                              ₹
                              {
                                selectedPreviewPrice
                                  .originalPrice
                              }
                            </span>
                          )}

                          <strong
                            style={
                              styles.offerPrice
                            }
                          >
                            ₹
                            {
                              selectedPreviewPrice
                                .offerPrice
                            }
                          </strong>
                        </div>

                        <div
                          style={
                            styles.previewSizes
                          }
                        >
                          {BASE_SIZE_ORDER.map(
                            (code) => (
                              <button
                                type="button"
                                key={code}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedPreviewSize(
                                    code,
                                  );
                                }}
                                style={{
                                  ...styles.previewSizeButton,
                                  borderColor:
                                    selectedPreviewSize ===
                                    code
                                      ? "var(--color-primary, #7c3aed)"
                                      : "var(--color-border)",
                                  background:
                                    selectedPreviewSize ===
                                    code
                                      ? "var(--color-primary-soft, rgba(124,58,237,.12))"
                                      : "transparent",
                                }}
                              >
                                {code}
                              </button>
                            ),
                          )}
                        </div>

                        <button
                          type="button"
                          style={
                            styles.quickAddButton
                          }
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          Quick Add
                        </button>
                      </div>
                    </div>
                  </div>
                </Section>

                <div style={styles.desktopSaveRow}>
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() =>
                      selectedProductId
                        ? void loadProduct(
                            selectedProductId,
                          )
                        : startNewProduct()
                    }
                  >
                    Reset
                  </button>

                  {selectedProductId && (
                    <button
                      type="button"
                      style={styles.dangerButton}
                      onClick={() =>
                        void deleteProduct(
                          selectedProductId,
                        )
                      }
                    >
                      Delete Poster
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      ...styles.saveButton,
                      opacity: saving ? 0.65 : 1,
                    }}
                  >
                    {saving
                      ? "Saving..."
                      : editing
                        ? "Save Poster Changes"
                        : "Create Poster"}
                  </button>
                </div>

                <div style={styles.mobileSaveBar}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{
                      ...styles.saveButton,
                      width: "100%",
                      opacity: saving ? 0.65 : 1,
                    }}
                  >
                    {saving
                      ? "Saving..."
                      : editing
                        ? "Save Changes"
                        : "Create Poster"}
                  </button>
                </div>
              </form>
            )}
          </section>
          </div>
        )}
      </div>

      <PosterAdjustmentModal
        isOpen={adjustModalOpen}
        imageUrl={
          adjustTarget === "main"
            ? form.mainImage
            : form.hoverImage
        }
        imageTitle={
          adjustTarget === "main"
            ? form.name || "Main Poster"
            : `${form.name || "Poster"} Hover Image`
        }
        isPanelProduct={form.panelEnabled}
        apiUrl={API_URL}
        onClose={() => setAdjustModalOpen(false)}
        onApply={handleAdjusterApply}
      />
    </main>
  );
}

function Section({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHeading}>
        <div style={styles.sectionNumber}>
          {number}
        </div>

        <div>
          <h2 style={styles.sectionTitle}>
            {title}
          </h2>

          {description && (
            <p style={styles.sectionDescription}>
              {description}
            </p>
          )}
        </div>
      </div>

      <div style={styles.sectionBody}>
        {children}
      </div>
    </section>
  );
}

function ImageUploadCard({
  title,
  description,
  value,
  uploading,
  onFile,
  onUrlChange,
  onAdjust,
}: {
  title: string;
  description: string;
  value: string;
  uploading: boolean;
  onFile: (file: File | undefined) => void;
  onUrlChange: (value: string) => void;
  onAdjust: () => void;
}) {
  return (
    <div style={styles.imageUploadCard}>
      <div style={styles.imageUploadHeader}>
        <div>
          <strong style={styles.imageUploadTitle}>{title}</strong>
          <span style={styles.imageUploadDescription}>{description}</span>
        </div>
        <span style={styles.imageUploadBadge}>{uploading ? "UPLOADING" : value ? "READY" : "EMPTY"}</span>
      </div>

      <div style={styles.imageUploadBody}>
        <div style={styles.imageUploadPreview}>
          {value ? (
            <img src={value} alt="" style={styles.imageUploadPreviewImage} />
          ) : (
            <span style={styles.imageUploadPlaceholder}>Z</span>
          )}
        </div>

        <div style={styles.imageUploadControls}>
          <label style={styles.uploadButton}>
            {uploading ? "Uploading..." : "Choose image"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                onFile(file);
                event.currentTarget.value = "";
              }}
              style={styles.hiddenFileInput}
            />
          </label>

          <input
            value={value}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="Or paste a public image URL"
            style={styles.input}
            aria-label={`${title} URL`}
          />

          {value && (
            <button
              type="button"
              style={styles.adjustButton}
              onClick={onAdjust}
            >
              Adjust framing
            </button>
          )}

          <span style={styles.uploadHelp}>
            JPG, PNG, WEBP or AVIF · max 25 MB · uploaded automatically to your Zavyro backend.
          </span>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label style={styles.fieldLabel}>
      {label}
      <input
        value={value}
        required={required}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        style={styles.input}
      />
    </label>
  );
}

function PriceCard({
  code,
  size,
  onOriginalChange,
  onOfferChange,
  onAvailabilityChange,
}: {
  code: "A3" | "A4" | "A5" | "A6";
  size: SizeState;
  onOriginalChange: (
    code: SizeCode,
    value: string,
  ) => void;
  onOfferChange: (
    code: SizeCode,
    value: string,
  ) => void;
  onAvailabilityChange: (
    code: SizeCode,
    value: boolean,
  ) => void;
}) {
  const discount = calculateDiscount(
    size.originalPrice,
    size.offerPrice,
  );

  return (
    <div style={styles.priceCard}>
      <div style={styles.priceCardHeader}>
        <strong>{code}</strong>

        {discount > 0 && (
          <span style={styles.discountPill}>
            {discount}% OFF
          </span>
        )}
      </div>

      <label style={styles.smallField}>
        Original Price
        <div style={styles.currencyInput}>
          <span>₹</span>
          <input
            type="number"
            min={0}
            value={size.originalPrice}
            onChange={(event) =>
              onOriginalChange(
                code,
                event.target.value,
              )
            }
            style={styles.currencyInputField}
          />
        </div>
      </label>

      <label style={styles.smallField}>
        Offer Price
        <div style={styles.currencyInput}>
          <span>₹</span>
          <input
            type="number"
            min={0}
            max={money(size.originalPrice)}
            value={size.offerPrice}
            onChange={(event) =>
              onOfferChange(
                code,
                event.target.value,
              )
            }
            style={styles.currencyInputField}
          />
        </div>
      </label>

      <label style={styles.switchRow}>
        <input
          type="checkbox"
          checked={size.isAvailable}
          onChange={(event) =>
            onAvailabilityChange(
              code,
              event.target.checked,
            )
          }
        />
        <span>Available</span>
      </label>
    </div>
  );
}

function PanelCard({
  code,
  size,
}: {
  code: "A5_PANEL" | "A4_PANEL";
  size: SizeState;
}) {
  const discount = calculateDiscount(
    size.originalPrice,
    size.offerPrice,
  );

  return (
    <div style={styles.priceCard}>
      <div style={styles.priceCardHeader}>
        <strong>{SIZE_LABELS[code]}</strong>

        <span style={styles.panelAuto}>
          AUTO
        </span>
      </div>

      <div style={styles.panelPriceLine}>
        <span>Original</span>
        <strong>
          ₹{size.originalPrice}
        </strong>
      </div>

      <div style={styles.panelPriceLine}>
        <span>Offer</span>
        <strong>
          ₹{size.offerPrice}
        </strong>
      </div>

      <div style={styles.panelNote}>
        {discount > 0
          ? `${discount}% discount inherited from base size`
          : "Price follows base size automatically"}
      </div>

      <div style={styles.availabilityText}>
        {size.isAvailable
          ? "Available"
          : "Unavailable"}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100%",
    background: "var(--color-background)",
    color: "var(--color-text-primary)",
    padding: "18px 12px 110px",
    overflowX: "hidden",
  },

  container: {
    width: "100%",
    maxWidth: 1280,
    margin: "0 auto",
  },

  header: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    marginBottom: 18,
  },

  eyebrow: {
    color: "var(--color-primary, #7c3aed)",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.18em",
    marginBottom: 5,
  },

  title: {
    margin: 0,
    fontSize: "clamp(25px, 7vw, 42px)",
    lineHeight: 1.05,
    letterSpacing: "-0.04em",
  },

  subtitle: {
    margin: "8px 0 0",
    color: "var(--color-text-secondary)",
    fontSize: 13,
    lineHeight: 1.5,
  },

  primaryButton: {
    minHeight: 46,
    padding: "0 18px",
    position: "relative",
    zIndex: 20,
    pointerEvents: "auto",
    borderRadius: 12,
    border: "1px solid var(--color-primary, #7c3aed)",
    background: "var(--color-primary, #7c3aed)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },

  notice: {
    marginBottom: 14,
    padding: "11px 13px",
    border: "1px solid",
    borderRadius: 11,
    background: "var(--color-surface)",
    fontSize: 13,
    fontWeight: 700,
  },

  manageSection: {
    minWidth: 0,
    border: "1px solid var(--color-border)",
    borderRadius: 18,
    background: "var(--color-surface)",
    overflow: "hidden",
  },

  manageToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: 14,
    borderBottom: "1px solid var(--color-border)",
    flexWrap: "wrap",
  },

  manageToolbarTitle: {
    fontSize: 14,
    fontWeight: 900,
  },

  manageToolbarSearch: {
    minWidth: 220,
    flex: "1 1 280px",
    maxWidth: 420,
    display: "flex",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    padding: "0 12px",
    border: "1px solid var(--color-border)",
    borderRadius: 11,
    background: "var(--color-background)",
    color: "var(--color-text-muted)",
  },

  manageSearchInput: {
    width: "100%",
    minWidth: 0,
    border: 0,
    outline: "none",
    background: "transparent",
    color: "var(--color-text-primary)",
    fontSize: 14,
  },

  manageGrid: {
    display: "grid",
    gap: 14,
    padding: 14,
  },

  manageCard: {
    minWidth: 0,
    overflow: "hidden",
    border: "1px solid var(--color-border)",
    borderRadius: 15,
    background: "var(--color-background)",
    transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
  },

  manageCardImageWrap: {
    position: "relative",
    aspectRatio: "3 / 4",
    overflow: "hidden",
    background: "var(--color-surface)",
  },

  manageCardImage: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "opacity .2s ease, transform .25s ease",
  },

  manageCardHoverImage: {
    opacity: 0,
  },

  manageCardPlaceholder: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    color: "var(--color-primary, #7c3aed)",
    fontSize: 38,
    fontWeight: 950,
  },

  manageSaleBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    padding: "5px 8px",
    borderRadius: 999,
    background: "var(--color-primary, #7c3aed)",
    color: "#fff",
    fontSize: 10,
    fontWeight: 900,
  },

  manageStatusBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: "5px 8px",
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: ".06em",
  },

  manageCardBody: {
    padding: 13,
  },

  manageCardCategory: {
    color: "var(--color-text-muted)",
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: ".07em",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  manageCardTitle: {
    margin: "5px 0 9px",
    fontSize: 15,
    lineHeight: 1.25,
    fontWeight: 850,
    color: "var(--color-text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  manageCardPriceRow: {
    display: "flex",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 7,
    minHeight: 25,
  },

  manageOriginalPrice: {
    color: "#ef4444",
    textDecoration: "line-through",
    textDecorationThickness: 2,
    fontSize: 12,
    fontWeight: 700,
  },

  manageOfferPrice: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: 900,
  },

  manageDiscount: {
    color: "#a78bfa",
    fontStyle: "normal",
    fontSize: 11,
    fontWeight: 900,
  },

  manageCardActions: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 8,
    marginTop: 12,
  },

  manageEditButton: {
    minHeight: 40,
    border: "1px solid var(--color-primary, #7c3aed)",
    borderRadius: 10,
    background: "var(--color-primary, #7c3aed)",
    color: "#fff",
    fontWeight: 850,
    cursor: "pointer",
    padding: "0 12px",
  },

  manageDeleteButton: {
    minHeight: 40,
    border: "1px solid var(--color-border)",
    borderRadius: 10,
    background: "transparent",
    color: "var(--color-danger, #ef4444)",
    fontWeight: 800,
    cursor: "pointer",
    padding: "0 12px",
  },

  manageEmpty: {
    minHeight: 260,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 6,
    padding: 24,
    color: "var(--color-text-muted)",
    textAlign: "center",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 16,
    alignItems: "start",
  },

  sidebar: {
    border: "1px solid var(--color-border)",
    borderRadius: 16,
    background: "var(--color-surface)",
    overflow: "hidden",
  },

  sidebarHeader: {
    padding: "14px 14px 10px",
    borderBottom: "1px solid var(--color-border)",
  },

  countBadge: {
    display: "inline-flex",
    marginLeft: 7,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    padding: "0 6px",
    borderRadius: 999,
    background:
      "var(--color-primary-soft, rgba(124,58,237,.12))",
    color: "var(--color-primary, #7c3aed)",
    fontSize: 11,
    fontWeight: 800,
  },

  searchInput: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 44,
    border: 0,
    borderBottom: "1px solid var(--color-border)",
    outline: "none",
    background: "transparent",
    color: "var(--color-text-primary)",
    padding: "0 14px",
    fontSize: 16,
  },

  productList: {
    display: "flex",
    flexDirection: "column",
    maxHeight: 420,
    overflowY: "auto",
  },

  productRow: {
    display: "grid",
    gridTemplateColumns: "48px minmax(0, 1fr) 8px",
    gap: 10,
    alignItems: "center",
    width: "100%",
    minHeight: 66,
    padding: "8px 10px",
    border: 0,
    borderBottom: "1px solid var(--color-border)",
    borderLeft: "2px solid transparent",
    color: "var(--color-text-primary)",
    textAlign: "left",
    cursor: "pointer",
  },

  thumb: {
    width: 48,
    height: 48,
    borderRadius: 9,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    background: "var(--color-background)",
    color: "var(--color-primary, #7c3aed)",
    fontWeight: 900,
    fontSize: 17,
  },

  thumbImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  productRowInfo: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },

  productRowInfoStrong: {},

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
  },

  emptyList: {
    padding: 24,
    color: "var(--color-text-muted)",
    fontSize: 13,
    textAlign: "center",
  },

  editor: {
    minWidth: 0,
  },

  section: {
    marginBottom: 12,
    border: "1px solid var(--color-border)",
    borderRadius: 16,
    background: "var(--color-surface)",
    overflow: "hidden",
  },

  sectionHeading: {
    display: "flex",
    gap: 11,
    alignItems: "flex-start",
    padding: "15px 14px 12px",
    borderBottom: "1px solid var(--color-border)",
  },

  sectionNumber: {
    color: "var(--color-primary, #7c3aed)",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    paddingTop: 2,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: "0.11em",
  },

  sectionDescription: {
    margin: "4px 0 0",
    color: "var(--color-text-muted)",
    fontSize: 11,
    lineHeight: 1.5,
  },

  sectionBody: {
    padding: 14,
  },

  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },

  fieldLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    color: "var(--color-text-secondary)",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.04em",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: 44,
    borderRadius: 10,
    border: "1px solid var(--color-border)",
    background: "var(--color-background)",
    color: "var(--color-text-primary)",
    outline: "none",
    padding: "0 12px",
    fontSize: 16,
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 10,
    border: "1px solid var(--color-border)",
    background: "var(--color-background)",
    color: "var(--color-text-primary)",
    outline: "none",
    padding: 12,
    fontSize: 16,
    lineHeight: 1.5,
    resize: "vertical",
  },

  imageUploadGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },

  imageUploadCard: {
    minWidth: 0,
    padding: 12,
    border: "1px solid var(--color-border)",
    borderRadius: 13,
    background: "var(--color-background)",
  },

  imageUploadHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },

  imageUploadTitle: {
    display: "block",
    color: "var(--color-text-primary)",
    fontSize: 13,
    fontWeight: 900,
  },

  imageUploadDescription: {
    display: "block",
    marginTop: 3,
    color: "var(--color-text-muted)",
    fontSize: 10,
    lineHeight: 1.4,
  },

  imageUploadBadge: {
    flexShrink: 0,
    padding: "4px 7px",
    borderRadius: 999,
    background: "var(--color-primary-soft, rgba(124,58,237,.10))",
    color: "var(--color-primary, #7c3aed)",
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: ".08em",
  },

  imageUploadBody: {
    display: "grid",
    gridTemplateColumns: "86px minmax(0, 1fr)",
    gap: 10,
    alignItems: "start",
  },

  imageUploadPreview: {
    width: 86,
    aspectRatio: "3 / 4",
    borderRadius: 10,
    overflow: "hidden",
    display: "grid",
    placeItems: "center",
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
  },

  imageUploadPreviewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  imageUploadPlaceholder: {
    color: "var(--color-primary, #7c3aed)",
    fontSize: 25,
    fontWeight: 950,
  },

  imageUploadControls: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    minWidth: 0,
  },

  uploadButton: {
    minHeight: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid var(--color-primary, #7c3aed)",
    background: "var(--color-primary-soft, rgba(124,58,237,.10))",
    color: "var(--color-primary, #7c3aed)",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  },

  adjustButton: {
    width: "100%",
    minHeight: 44,
    marginTop: 2,
    borderRadius: 12,
    border: "1px solid var(--color-primary, #7c3aed)",
    background: "rgba(124, 58, 237, 0.10)",
    color: "var(--color-primary, #7c3aed)",
    fontWeight: 800,
    cursor: "pointer",
    padding: "10px 14px",
  },
  hiddenFileInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
    pointerEvents: "none",
  },

  uploadHelp: {
    color: "var(--color-text-muted)",
    fontSize: 9,
    lineHeight: 1.4,
  },

  priceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 9,
  },

  priceCard: {
    padding: 10,
    borderRadius: 12,
    border: "1px solid var(--color-border)",
    background:
      "linear-gradient(145deg, var(--color-background), var(--color-surface))",
    minWidth: 0,
  },

  priceCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 8,
    paddingBottom: 7,
    borderBottom: "1px solid var(--color-border)",
  },

  discountPill: {
    borderRadius: 999,
    padding: "4px 7px",
    background:
      "var(--color-primary-soft, rgba(124,58,237,.12))",
    color: "var(--color-primary, #7c3aed)",
    fontSize: 9,
    fontWeight: 900,
  },

  smallField: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 7,
    color: "var(--color-text-muted)",
    fontSize: 9,
    fontWeight: 800,
  },

  currencyInput: {
    display: "flex",
    alignItems: "center",
    minHeight: 36,
    borderRadius: 8,
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    overflow: "hidden",
  },

  currencyInputField: {
    width: "100%",
    minWidth: 0,
    border: 0,
    outline: "none",
    background: "transparent",
    color: "var(--color-text-primary)",
    padding: "0 7px",
    fontSize: 15,
    fontWeight: 700,
  },

  switchRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    minHeight: 34,
    color: "var(--color-text-primary)",
    fontSize: 11,
    fontWeight: 700,
    cursor: "pointer",
  },

  panelControls: {
    display: "grid",
    gridTemplateColumns: "minmax(110px, 150px) minmax(0, 1fr)",
    gap: 10,
    marginBottom: 10,
    alignItems: "stretch",
  },

  panelInfo: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 4,
    padding: 10,
    borderRadius: 12,
    background:
      "var(--color-primary-soft, rgba(124,58,237,.08))",
    color: "var(--color-text-secondary)",
    fontSize: 11,
  },

  panelAuto: {
    fontSize: 9,
    fontWeight: 900,
    color: "var(--color-primary, #7c3aed)",
  },

  panelPriceLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    padding: "6px 0",
    borderBottom: "1px solid var(--color-border)",
    color: "var(--color-text-secondary)",
    fontSize: 12,
  },

  panelNote: {
    marginTop: 7,
    color: "var(--color-text-muted)",
    fontSize: 10,
    lineHeight: 1.45,
  },

  availabilityText: {
    marginTop: 8,
    color: "var(--color-success, #22c55e)",
    fontSize: 10,
    fontWeight: 800,
  },

  offerBox: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    border:
      "1px solid var(--color-primary, #7c3aed)",
    background:
      "var(--color-primary-soft, rgba(124,58,237,.07))",
  },

  percentInput: {
    display: "flex",
    alignItems: "center",
    minHeight: 44,
    borderRadius: 10,
    border: "1px solid var(--color-border)",
    background: "var(--color-background)",
    overflow: "hidden",
  },

  offerSummary: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 5,
    color: "var(--color-text-secondary)",
    fontSize: 11,
    lineHeight: 1.5,
  },

  visibilityGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 6,
  },

  previewShell: {
    display: "flex",
    justifyContent: "center",
    padding: "4px 0 2px",
  },

  previewCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    border: "1px solid var(--color-border)",
    background: "var(--color-background)",
    overflow: "hidden",
    cursor: "pointer",
  },

  previewImageWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "4 / 5",
    overflow: "hidden",
    background: "var(--color-surface)",
  },

  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    transition: "opacity .22s ease",
  },

  previewPlaceholder: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    color: "var(--color-primary, #7c3aed)",
    fontSize: 28,
    fontWeight: 900,
    letterSpacing: "0.12em",
  },

  saleBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    borderRadius: 999,
    padding: "6px 8px",
    background: "var(--color-primary, #7c3aed)",
    color: "#fff",
    fontSize: 10,
    fontWeight: 900,
  },

  tapHint: {
    position: "absolute",
    right: 10,
    bottom: 10,
    borderRadius: 999,
    padding: "6px 8px",
    background: "rgba(0,0,0,.65)",
    color: "#fff",
    fontSize: 9,
    fontWeight: 800,
  },

  previewContent: {
    padding: 13,
  },

  previewName: {
    display: "block",
    marginBottom: 7,
    fontSize: 15,
  },

  previewPriceRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 10,
  },

  strikePrice: {
    color: "var(--color-text-muted)",
    textDecoration: "line-through",
    fontSize: 11,
  },

  offerPrice: {
    color: "var(--color-primary, #7c3aed)",
    fontSize: 18,
  },

  previewSizes: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 6,
    marginBottom: 10,
  },

  previewSizeButton: {
    minHeight: 38,
    border: "1px solid",
    borderRadius: 8,
    background: "transparent",
    color: "var(--color-text-primary)",
    fontWeight: 800,
    cursor: "pointer",
  },

  quickAddButton: {
    width: "100%",
    minHeight: 43,
    border: 0,
    borderRadius: 9,
    background: "var(--color-primary, #7c3aed)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  desktopSaveRow: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 9,
    padding: "4px 0 30px",
  },

  secondaryButton: {
    minHeight: 46,
    padding: "0 16px",
    borderRadius: 11,
    border: "1px solid var(--color-border)",
    background: "var(--color-surface)",
    color: "var(--color-text-primary)",
    fontWeight: 800,
    cursor: "pointer",
  },

  dangerButton: {
    minHeight: 46,
    padding: "0 16px",
    borderRadius: 11,
    border: "1px solid var(--color-danger, #ef4444)",
    background: "transparent",
    color: "var(--color-danger, #ef4444)",
    fontWeight: 800,
    cursor: "pointer",
  },

  saveButton: {
    minHeight: 46,
    padding: "0 20px",
    borderRadius: 11,
    border: "1px solid var(--color-primary, #7c3aed)",
    background: "var(--color-primary, #7c3aed)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },

  mobileSaveBar: {
    position: "sticky",
    bottom: 0,
    zIndex: 20,
    padding: "10px 0 4px",
    background:
      "linear-gradient(to bottom, transparent, var(--color-background) 24%)",
  },

  loadingCard: {
    minHeight: 180,
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: 10,
    border: "1px solid var(--color-border)",
    borderRadius: 16,
    background: "var(--color-surface)",
    color: "var(--color-text-secondary)",
  },

  zMark: {
    width: 46,
    height: 46,
    display: "grid",
    placeItems: "center",
    borderRadius: 12,
    background:
      "var(--color-primary-soft, rgba(124,58,237,.12))",
    color: "var(--color-primary, #7c3aed)",
    fontSize: 24,
    fontWeight: 950,
  },
};

if (typeof window !== "undefined") {
  const styleId = "zavyro-manage-products-responsive";

  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media (min-width: 700px) {
        .zavyro-placeholder {}
      }

      @media (min-width: 900px) {
        .zavyro-placeholder {}
      }
    `;
    document.head.appendChild(style);
  }
}
