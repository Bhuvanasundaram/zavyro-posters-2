import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  PosterSize,
  Product,
} from "../services/shopContent";

export type CartFormat = "single" | "panel";

export interface CartItem {
  id: string;

  productId: string;

  title: string;

  image: string;

  category: string;

  subcategory?: string;

  format: CartFormat;

  size: PosterSize;

  unitPrice: number;

  originalUnitPrice: number;

  quantity: number;

  panelSize?: "A5" | "A4";

  /* -------------------------------------------------------
     OLD ZAVYRO CART COMPATIBILITY
  ------------------------------------------------------- */

  custom?: boolean;

  imageUrl?: string;

  customFileName?: string;

  image_path?: string;

  variant_image_path?: string;

  variant_image_version?: string;

  productData?: Product | Record<string, unknown>;

  type?: string;

  offerType?: string;

  offer_type?: string;

  offerTitle?: string;

  offer_label?: string;

  products?: Array<{
    id?: string;
    title?: string;
    image?: string;
    imageUrl?: string;
    price?: number;
    offerPrice?: number;
  }>;

  combo?: {
    price?: number;
    quantity?: number;
  };

  promo?: {
    buy?: number;
    get?: number;
  };

  promo_active?: boolean;

  promo_buy_qty?: number;

  promo_get_qty?: number;

  promo_label?: string;

  price?: number;

  offerPrice?: number;

  mrp?: number;

  total?: number;
}

interface AddToCartOptions {
  product: Product;
  size: PosterSize;
  format?: CartFormat;
  quantity?: number;
}

export interface AddComboToCartOptions {
  comboId: string;
  title: string;
  price: number;
  image: string;
  products: Array<{ id: string; title: string; image: string }>;
}

interface CartContextValue {
  items: CartItem[];

  itemCount: number;

  subtotal: number;

  addToCart: (
    options: AddToCartOptions,
  ) => void;

  addComboToCart: (
    options: AddComboToCartOptions,
  ) => void;

  removeFromCart: (
    id: string,
  ) => void;

  increaseQuantity: (
    id: string,
  ) => void;

  decreaseQuantity: (
    id: string,
  ) => void;

  updateQuantity: (
    id: string,
    quantity: number,
  ) => void;

  clearCart: () => void;

  isInCart: (
    productId: string,
    size: PosterSize,
    format?: CartFormat,
  ) => boolean;
}

/* =========================================================
   STORAGE

   Old Zavyro:
   zavyroCart

   New 2.0 previously:
   zavyro-cart

   We keep the OLD key as the primary key so existing
   Zavyro cart data remains compatible.
========================================================= */

const OLD_CART_STORAGE_KEY = "zavyroCart";

const NEW_CART_STORAGE_KEY = "zavyro-cart";

const CartContext =
  createContext<CartContextValue | undefined>(
    undefined,
  );

/* =========================================================
   LOAD CART
========================================================= */

function normalizeStoredItem(
  raw: any,
  index: number,
): CartItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const productId =
    raw.productId ||
    raw.product_id ||
    raw.productData?.id ||
    "";

  const size =
    String(raw.size || "A4").toUpperCase() as PosterSize;

  const format: CartFormat =
    raw.format === "panel"
      ? "panel"
      : "single";

  const quantity = Math.max(
    1,
    Number(raw.quantity || 1),
  );

  const unitPrice = Number(
    raw.unitPrice ??
      raw.offerPrice ??
      raw.price ??
      0,
  );

  const originalUnitPrice = Number(
    raw.originalUnitPrice ??
      raw.mrp ??
      unitPrice,
  );

  const id =
    raw.id ||
    [
      productId || `legacy-${index}`,
      format,
      size,
    ].join("-");

  return {
    ...raw,

    id,

    productId,

    title:
      raw.title ||
      "Poster",

    image:
      raw.image ||
      raw.imageUrl ||
      "",

    category:
      raw.category ||
      "",

    subcategory:
      raw.subcategory ||
      undefined,

    format,

    size,

    unitPrice,

    originalUnitPrice,

    quantity,
  };
}

function getStoredCart(): CartItem[] {
  try {
    const oldStored =
      localStorage.getItem(
        OLD_CART_STORAGE_KEY,
      );

    const newStored =
      localStorage.getItem(
        NEW_CART_STORAGE_KEY,
      );

    const source =
      oldStored || newStored;

    if (!source) {
      return [];
    }

    const parsed =
      JSON.parse(source);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(normalizeStoredItem)
      .filter(
        (
          item,
        ): item is CartItem =>
          item !== null,
      );
  } catch {
    return [];
  }
}

/* =========================================================
   PRICE HELPERS
========================================================= */

function getNormalSizePrice(
  product: Product,
  size: PosterSize,
) {
  const sizeData =
    product.sizes.find(
      (item) =>
        item.size === size,
    );

  if (!sizeData) {
    return {
      price: 0,
      originalPrice: 0,
    };
  }

  return {
    price:
      sizeData.offerPrice,

    originalPrice:
      sizeData.price,
  };
}

function getPanelSizePrice(
  product: Product,
  size: "A5" | "A4",
) {
  const sizeData =
    product.sizes.find(
      (item) =>
        item.size === size,
    );

  if (!sizeData) {
    return {
      price: 0,
      originalPrice: 0,
    };
  }

  return {
    price:
      sizeData.offerPrice * 3,

    originalPrice:
      sizeData.price * 3,
  };
}

/* =========================================================
   PROVIDER
========================================================= */

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [
    items,
    setItems,
  ] = useState<CartItem[]>(
    getStoredCart,
  );

  /* -------------------------------------------------------
     SAVE TO OLD + NEW KEYS
  ------------------------------------------------------- */

  useEffect(() => {
    try {
      const serialized =
        JSON.stringify(items);

      localStorage.setItem(
        OLD_CART_STORAGE_KEY,
        serialized,
      );

      localStorage.setItem(
        NEW_CART_STORAGE_KEY,
        serialized,
      );
    } catch {
      /* Ignore storage failures. */
    }
  }, [items]);

  /* =======================================================
     ADD TO CART
  ======================================================= */

  const addToCart =
    useCallback(
      ({
        product,
        size,
        format = "single",
        quantity = 1,
      }: AddToCartOptions) => {
        const safeQuantity =
          Math.max(
            1,
            quantity,
          );

        const actualSize: PosterSize =
          format === "panel" &&
          size !== "A5" &&
          size !== "A4"
            ? "A4"
            : size;

        const priceData =
          format === "panel"
            ? getPanelSizePrice(
                product,
                actualSize as
                  | "A5"
                  | "A4",
              )
            : getNormalSizePrice(
                product,
                actualSize,
              );

        if (
          priceData.price <= 0
        ) {
          return;
        }

        const itemId = [
          product.id,
          format,
          actualSize,
        ].join("-");

        setItems(
          (
            currentItems,
          ) => {
            const existingIndex =
              currentItems.findIndex(
                (item) =>
                  item.id ===
                  itemId,
              );

            if (
              existingIndex ===
              -1
            ) {
              const newItem: CartItem =
                {
                  id: itemId,

                  productId:
                    product.id,

                  title:
                    product.title,

                  image:
                    product.image,

                  category:
                    product.category,

                  subcategory:
                    product.subcategory,

                  format,

                  size:
                    actualSize,

                  unitPrice:
                    priceData.price,

                  originalUnitPrice:
                    priceData.originalPrice,

                  quantity:
                    safeQuantity,

                  price:
                    priceData.price,

                  offerPrice:
                    priceData.price,

                  mrp:
                    priceData.originalPrice,

                  productData:
                    product,

                  ...(format ===
                  "panel"
                    ? {
                        panelSize:
                          actualSize as
                            | "A5"
                            | "A4",
                      }
                    : {}),
                };

              return [
                ...currentItems,
                newItem,
              ];
            }

            return currentItems.map(
              (
                item,
                index,
              ) =>
                index !==
                existingIndex
                  ? item
                  : {
                      ...item,

                      quantity:
                        item.quantity +
                        safeQuantity,
                    },
            );
          },
        );
      },
      [],
    );

  /* =======================================================
     ADD COMBO TO CART
  ======================================================= */

  const addComboToCart = useCallback(
    (options: AddComboToCartOptions) => {
      const safePrice = Math.max(0, Number(options.price) || 0);
      const safeProducts = Array.isArray(options.products) ? options.products : [];
      if (!options.comboId || !options.title || safePrice <= 0 || safeProducts.length === 0) return;

      setItems((currentItems) => {
        const itemId = `combo-${options.comboId}`;
        const existing = currentItems.find((item) => item.id === itemId);
        if (existing) {
          return currentItems.map((item) =>
            item.id === itemId ? { ...item, quantity: item.quantity + 1 } : item,
          );
        }

        const comboItem: CartItem = {
          id: itemId,
          productId: `combo:${options.comboId}`,
          title: options.title,
          image: options.image || safeProducts[0]?.image || "",
          category: "Combo",
          format: "single",
          size: "A4",
          unitPrice: safePrice,
          originalUnitPrice: safePrice,
          quantity: 1,
          type: "combo",
          offerType: "combo",
          offer_type: "combo",
          offerTitle: options.title,
          offer_label: "COMBO",
          products: safeProducts,
          combo: { price: safePrice, quantity: safeProducts.length },
          price: safePrice,
          offerPrice: safePrice,
          mrp: safePrice,
        };

        return [...currentItems, comboItem];
      });
    },
    [],
  );

  /* =======================================================
     REMOVE
  ======================================================= */

  const removeFromCart =
    useCallback(
      (id: string) => {
        setItems(
          (
            currentItems,
          ) =>
            currentItems.filter(
              (item) =>
                item.id !== id,
            ),
        );
      },
      [],
    );

  /* =======================================================
     INCREASE
  ======================================================= */

  const increaseQuantity =
    useCallback(
      (id: string) => {
        setItems(
          (
            currentItems,
          ) =>
            currentItems.map(
              (item) =>
                item.id === id
                  ? {
                      ...item,
                      quantity:
                        item.quantity +
                        1,
                    }
                  : item,
            ),
        );
      },
      [],
    );

  /* =======================================================
     DECREASE
  ======================================================= */

  const decreaseQuantity =
    useCallback(
      (id: string) => {
        setItems(
          (
            currentItems,
          ) =>
            currentItems
              .map(
                (item) =>
                  item.id === id
                    ? {
                        ...item,
                        quantity:
                          item.quantity -
                          1,
                      }
                    : item,
              )
              .filter(
                (item) =>
                  item.quantity >
                  0,
              ),
        );
      },
      [],
    );

  /* =======================================================
     UPDATE
  ======================================================= */

  const updateQuantity =
    useCallback(
      (
        id: string,
        quantity: number,
      ) => {
        const safeQuantity =
          Math.max(
            0,
            Math.floor(
              quantity,
            ),
          );

        setItems(
          (
            currentItems,
          ) =>
            currentItems
              .map(
                (item) =>
                  item.id === id
                    ? {
                        ...item,
                        quantity:
                          safeQuantity,
                      }
                    : item,
              )
              .filter(
                (item) =>
                  item.quantity >
                  0,
              ),
        );
      },
      [],
    );

  /* =======================================================
     CLEAR
  ======================================================= */

  const clearCart =
    useCallback(() => {
      setItems([]);
    }, []);

  /* =======================================================
     CHECK
  ======================================================= */

  const isInCart =
    useCallback(
      (
        productId: string,
        size: PosterSize,
        format: CartFormat =
          "single",
      ) =>
        items.some(
          (item) =>
            item.productId ===
              productId &&
            item.size === size &&
            item.format === format,
        ),
      [items],
    );

  /* =======================================================
     COUNT
  ======================================================= */

  const itemCount =
    useMemo(
      () =>
        items.reduce(
          (
            total,
            item,
          ) =>
            total +
            item.quantity,
          0,
        ),
      [items],
    );

  /* =======================================================
     SUBTOTAL
  ======================================================= */

  const subtotal =
    useMemo(
      () =>
        items.reduce(
          (
            total,
            item,
          ) =>
            total +
            Number(
              item.unitPrice ||
                item.offerPrice ||
                item.price ||
                0,
            ) *
              item.quantity,
          0,
        ),
      [items],
    );

  const value =
    useMemo<CartContextValue>(
      () => ({
        items,

        itemCount,

        subtotal,

        addToCart,
        addComboToCart,

        removeFromCart,

        increaseQuantity,

        decreaseQuantity,

        updateQuantity,

        clearCart,

        isInCart,
      }),
      [
        items,
        itemCount,
        subtotal,
        addToCart,
        addComboToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        updateQuantity,
        clearCart,
        isInCart,
      ],
    );

  return (
    <CartContext.Provider
      value={value}
    >
      {children}
    </CartContext.Provider>
  );
}

/* =========================================================
   HOOK
========================================================= */

export function useCart() {
  const context =
    useContext(
      CartContext,
    );

  if (!context) {
    throw new Error(
      "useCart must be used inside CartProvider",
    );
  }

  return context;
}