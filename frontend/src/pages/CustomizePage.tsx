import { useEffect, useMemo, useRef, useState, type PointerEvent, type ChangeEvent, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import type { PosterSize, Product } from "../services/shopContent";
import "./CustomizePage.css";

const API_URL = import.meta.env.VITE_API_URL || "https://zavyro-posters-api.onrender.com";
const MAX_CUSTOM_UPLOAD_BYTES = 50 * 1024 * 1024;

const NORMAL_PRICES: Record<PosterSize, number> = {
  A3: 79,
  A4: 49,
  A5: 39,
  A6: 29,
};

const SIZE_RATIOS: Record<PosterSize, number> = {
  A3: 297 / 420,
  A4: 210 / 297,
  A5: 148 / 210,
  A6: 105 / 148,
};

const SIZE_LABELS: PosterSize[] = ["A3", "A4", "A5", "A6"];

const EXPORT_PX: Record<PosterSize, { width: number; height: number }> = {
  A3: { width: 3508, height: 4961 },
  A4: { width: 2480, height: 3508 },
  A5: { width: 1748, height: 2480 },
  A6: { width: 1240, height: 1748 },
};

const PANEL_EXPORT_PX: Record<"A4" | "A5", { width: number; height: number }> = {
  A4: { width: 7440, height: 3508 },
  A5: { width: 5244, height: 2480 },
};

type ImageMode = "fill" | "fit";
type CustomFormat = "single" | "panel";

type CustomItem = {
  id: string;
  fileName: string;
  sourceUrl: string;
  previewUrl: string;
  size: PosterSize;
  quantity: number;
  mode: ImageMode;
  rotation: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
  format: CustomFormat;
  panelSize: "A5" | "A4";
  naturalWidth: number;
  naturalHeight: number;
  uploading: boolean;
  uploadError?: string;
};

function money(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function panelPrice(size: "A5" | "A4") {
  return NORMAL_PRICES[size] * 3;
}

function makeId() {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function resolveUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

async function uploadFile(file: File) {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch(`${API_URL}/api/shop/custom-uploads`, {
    method: "POST",
    body,
  });
  const result = await response.json();

  if (!response.ok || !result.success || !result.url) {
    throw new Error(result.message || "Image upload failed.");
  }

  return resolveUrl(result.url);
}

function createCustomProduct(item: CustomItem, finalImage: string): Product {
  return {
    id: item.id,
    title: `Custom Poster — ${item.fileName}`,
    category: "Aesthetic",
    subcategory: "Custom",
    image: finalImage,
    description: "Customer customized poster.",
    tags: ["custom", "personalized"],
    sizes: (Object.keys(NORMAL_PRICES) as PosterSize[]).map((size) => ({
      size,
      price: NORMAL_PRICES[size],
      offerPrice: NORMAL_PRICES[size],
      available: true,
    })),
    panelSupported: true,
    panelSizes: [
      { size: "A5", available: true },
      { size: "A4", available: true },
    ],
    // These fields intentionally live on the product object so the existing
    // cart/order JSON keeps the final customer artwork without requiring a
    // separate database table. Admin orders support both top-level and nested
    // custom metadata.
    custom: true,
    customStoragePath: finalImage,
    customSourcePath: item.sourceUrl,
    customFormat: item.format,
    customSize: item.format === "panel" ? item.panelSize : item.size,
  } as Product & {
    custom: true;
    customStoragePath: string;
    customSourcePath: string;
    customFormat: CustomFormat;
    customSize: string;
  };
}

function getFrameRatio(item: CustomItem) {
  if (item.format === "panel") {
    return item.panelSize === "A4"
      ? (210 * 3) / 297
      : (148 * 3) / 210;
  }
  return SIZE_RATIOS[item.size];
}

function getMinimumCoverZoom(
  item: CustomItem,
  frameWidth: number,
  frameHeight: number,
) {
  if (!item.naturalWidth || !item.naturalHeight || !frameWidth || !frameHeight) {
    return 1;
  }

  const radians = (item.rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(radians));
  const s = Math.abs(Math.sin(radians));

  const requiredWidthScale =
    (c * frameWidth + s * frameHeight) / item.naturalWidth;
  const requiredHeightScale =
    (s * frameWidth + c * frameHeight) / item.naturalHeight;

  const requiredScale = Math.max(
    requiredWidthScale,
    requiredHeightScale,
  );

  const baseScale = Math.max(
    frameWidth / item.naturalWidth,
    frameHeight / item.naturalHeight,
  );

  return Math.max(1, requiredScale / baseScale);
}

function getSafeOffsets(
  item: CustomItem,
  nextX: number,
  nextY: number,
  frameWidth: number,
  frameHeight: number,
): { x: number; y: number } {
  if (!item.naturalWidth || !item.naturalHeight || !frameWidth || !frameHeight) {
    return { x: 0, y: 0 };
  }

  const effectiveZoom = Math.max(
    item.zoom,
    getMinimumCoverZoom(item, frameWidth, frameHeight),
  );

  const baseScale = Math.max(
    frameWidth / item.naturalWidth,
    frameHeight / item.naturalHeight,
  );

  const drawWidth = item.naturalWidth * baseScale * effectiveZoom;
  const drawHeight = item.naturalHeight * baseScale * effectiveZoom;

  const radians = (item.rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(radians));
  const s = Math.abs(Math.sin(radians));

  const imageHalfWidth = drawWidth / 2;
  const imageHalfHeight = drawHeight / 2;
  const frameHalfWidth = frameWidth / 2;
  const frameHalfHeight = frameHeight / 2;

  // Conservative corner-safe limits. This prevents the user from ever
  // dragging the rotated image far enough to expose a triangular gap.
  const maxX = Math.max(
    0,
    imageHalfWidth - (c * frameHalfWidth + s * frameHalfHeight),
  );
  const maxY = Math.max(
    0,
    imageHalfHeight - (s * frameHalfWidth + c * frameHalfHeight),
  );

  return {
    x: Math.min(maxX, Math.max(-maxX, nextX)),
    y: Math.min(maxY, Math.max(-maxY, nextY)),
  };
}

export default function CustomizePage() {
  const { addToCart } = useCart();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const [items, setItems] = useState<CustomItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sameSize, setSameSize] = useState<PosterSize>("A4");
  const [message, setMessage] = useState("");
  const [savingCart, setSavingCart] = useState(false);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? items[0],
    [items, selectedId],
  );

  const total = items.reduce((sum, item) => {
    const price = item.format === "panel" ? panelPrice(item.panelSize) : NORMAL_PRICES[item.size];
    return sum + price * item.quantity;
  }, 0);

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (!selectedId && items[0]) setSelectedId(items[0].id);
    if (selectedId && !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0]?.id ?? null);
    }
  }, [items, selectedId]);

  function updateSelected(patch: Partial<CustomItem>) {
    if (!selected) return;

    setItems((current) =>
      current.map((item) => {
        if (item.id !== selected.id) return item;

        const next = { ...item, ...patch };
        const frame = frameRef.current;

        if (frame && next.naturalWidth && next.naturalHeight) {
          const safe = getSafeOffsets(
            next,
            next.offsetX,
            next.offsetY,
            frame.clientWidth,
            frame.clientHeight,
          );
          next.offsetX = safe.x;
          next.offsetY = safe.y;
          next.zoom = Math.max(
            next.zoom,
            getMinimumCoverZoom(next, frame.clientWidth, frame.clientHeight),
          );
        }

        return next;
      }),
    );
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    setMessage("");

    const accepted = files.filter((file) => {
      const okType = ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type);
      const okSize = file.size <= MAX_CUSTOM_UPLOAD_BYTES;
      return okType && okSize;
    });

    if (accepted.length !== files.length) {
      setMessage("Only JPG, PNG, WEBP or AVIF images up to 50 MB are allowed.");
    }

    for (const file of accepted) {
      const id = makeId();
      const localUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = localUrl;

      const baseItem: CustomItem = {
        id,
        fileName: file.name,
        sourceUrl: localUrl,
        previewUrl: localUrl,
        size: sameSize,
        quantity: 1,
        mode: "fill",
        rotation: 0,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        format: "single",
        panelSize: "A4",
        naturalWidth: 0,
        naturalHeight: 0,
        uploading: true,
      };

      setItems((current) => [...current, baseItem]);
      setSelectedId(id);

      image.onload = async () => {
        try {
          const uploaded = await uploadFile(file);
          setItems((current) =>
            current.map((item) =>
              item.id === id
                ? {
                    ...item,
                    sourceUrl: uploaded,
                    previewUrl: uploaded,
                    naturalWidth: image.naturalWidth,
                    naturalHeight: image.naturalHeight,
                    uploading: false,
                  }
                : item,
            ),
          );
        } catch (error) {
          setItems((current) =>
            current.map((item) =>
              item.id === id
                ? {
                    ...item,
                    naturalWidth: image.naturalWidth,
                    naturalHeight: image.naturalHeight,
                    uploading: false,
                    uploadError: error instanceof Error ? error.message : "Upload failed.",
                  }
                : item,
            ),
          );
        }
      };
    }
  }

  function applySameSize(size: PosterSize) {
    setSameSize(size);
    setItems((current) => current.map((item) => ({ ...item, size })));
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function changeQuantity(delta: number) {
    if (!selected) return;
    updateSelected({ quantity: Math.max(1, selected.quantity + delta) });
  }

  function setFormat(format: CustomFormat) {
    if (!selected) return;
    if (format === "panel" && selected.naturalWidth <= selected.naturalHeight) {
      return;
    }
    updateSelected({ format });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!selected || selected.uploading || selected.uploadError) return;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: selected.offsetX,
      originY: selected.offsetY,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active || !selected) return;
    const frame = frameRef.current;
    if (!frame) return;

    const safe = getSafeOffsets(
      selected,
      dragRef.current.originX + (event.clientX - dragRef.current.startX),
      dragRef.current.originY + (event.clientY - dragRef.current.startY),
      frame.clientWidth,
      frame.clientHeight,
    );

    updateSelected({
      offsetX: safe.x,
      offsetY: safe.y,
    });
  }

  function handlePointerUp() {
    dragRef.current.active = false;
  }

  async function renderFinalImage(item: CustomItem) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = item.sourceUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to load custom image."));
    });

    const exportSize =
      item.format === "panel"
        ? PANEL_EXPORT_PX[item.panelSize]
        : EXPORT_PX[item.size];

    const outputWidth = exportSize.width;
    const outputHeight = exportSize.height;
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported on this device.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, outputWidth, outputHeight);

    const fit = Math.max(
      outputWidth / image.naturalWidth,
      outputHeight / image.naturalHeight,
    );

    const previewFrame = frameRef.current;
    const safe = getSafeOffsets(
      item,
      item.offsetX,
      item.offsetY,
      previewFrame?.clientWidth || outputWidth,
      previewFrame?.clientHeight || outputHeight,
    );

    const minimumZoom = getMinimumCoverZoom(
      item,
      previewFrame?.clientWidth || outputWidth,
      previewFrame?.clientHeight || outputHeight,
    );
    const effectiveZoom = Math.max(item.zoom, minimumZoom);

    const imageWidth = image.naturalWidth * fit * effectiveZoom;
    const imageHeight = image.naturalHeight * fit * effectiveZoom;
    const scaleForOffset =
      outputWidth / Math.max(1, previewFrame?.clientWidth ?? outputWidth);
    const x = outputWidth / 2 + safe.x * scaleForOffset;
    const y = outputHeight / 2 + safe.y * scaleForOffset;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((item.rotation * Math.PI) / 180);
    ctx.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
    ctx.restore();

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Unable to prepare poster."))), "image/jpeg", 0.95),
    );

    const rendered = new File([blob], `zavyro-${item.id}.jpg`, { type: "image/jpeg" });
    return uploadFile(rendered);
  }

  async function addAllToCart() {
    if (!items.length || savingCart) return;
    setSavingCart(true);
    setMessage("");

    try {
      for (const item of items) {
        if (item.uploading || item.uploadError) {
          throw new Error(`Please wait for ${item.fileName} to finish uploading.`);
        }

        const finalImage = await renderFinalImage(item);
        const product = createCustomProduct(item, finalImage);

        addToCart({
          product,
          size: item.format === "panel" ? item.panelSize : item.size,
          format: item.format,
          quantity: item.quantity,
        });
      }

      setMessage("All customized posters were added to your cart.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to add customized posters.");
    } finally {
      setSavingCart(false);
    }
  }

  const panelEligible = Boolean(
    selected && selected.naturalWidth > selected.naturalHeight,
  );

  return (
    <section className="customize-page">
      <div className="customize-shell">
        <header className="customize-heading">
          <span className="customize-kicker">ZAVYRO CUSTOM STUDIO</span>
          <h1>Customize Your Poster</h1>
          <p>Upload your photos, choose the size, adjust the image and create your own wall poster.</p>
        </header>

        <section className="customize-upload-card">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            hidden
            onChange={handleFiles}
          />
          <button type="button" className="customize-upload-button" onClick={() => inputRef.current?.click()}>
            + Upload Photos
          </button>
          <p>You can upload multiple photos. Each photo can have its own size and quantity.</p>
          <span>{items.length} {items.length === 1 ? "photo" : "photos"} selected</span>
        </section>

        <section className="customize-size-all">
          <div>
            <h2>Apply Same Size to All</h2>
            <p>Choose size and apply it to every uploaded photo.</p>
          </div>
          <div className="customize-size-buttons">
            {SIZE_LABELS.map((size) => (
              <button
                type="button"
                key={size}
                className={sameSize === size ? "active" : ""}
                onClick={() => applySameSize(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </section>

        <div className="customize-workspace">
          <section className="customize-photos-card">
            <h2>Your Photos</h2>
            {items.length === 0 ? (
              <div className="customize-empty">Your uploaded photos will appear here.</div>
            ) : (
              <div className="customize-photo-list">
                {items.map((item) => {
                  const price = item.format === "panel" ? panelPrice(item.panelSize) : NORMAL_PRICES[item.size];
                  return (
                    <button
                      type="button"
                      key={item.id}
                      className={`customize-photo-item ${selected?.id === item.id ? "active" : ""}`}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <img src={item.previewUrl} alt="" />
                      <span className="customize-photo-copy">
                        <strong>{item.fileName}</strong>
                        <small>{item.format === "panel" ? `${item.panelSize} Panel` : item.size} · Qty {item.quantity}</small>
                      </span>
                      <b>{money(price * item.quantity)}</b>
                      <span
                        className="customize-photo-remove"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeItem(item.id);
                        }}
                        aria-label={`Remove ${item.fileName}`}
                      >
                        ×
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="customize-preview-card">
            <h2>Live Preview</h2>
            {selected ? (
              <>
                <div
                  ref={previewRef}
                  className={`customize-preview-stage ${selected.format === "panel" ? "is-panel" : ""}`}
                  style={{ "--frame-ratio": String(getFrameRatio(selected)) } as CSSProperties}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <div ref={frameRef} className="customize-frame">
                    <img
                      src={selected.previewUrl}
                      alt={selected.fileName}
                      draggable={false}
                      style={{
                        objectFit: "cover",
                        transform: `translate(calc(-50% + ${selected.offsetX}px), calc(-50% + ${selected.offsetY}px)) scale(${selected.zoom}) rotate(${selected.rotation}deg)`,
                      }}
                    />
                    {selected.format === "panel" && (
                      <div className="customize-panel-guides" aria-hidden="true">
                        <i /><i />
                      </div>
                    )}
                  </div>
                  {selected.uploading && <span className="customize-preview-status">Uploading…</span>}
                  {selected.uploadError && <span className="customize-preview-error">{selected.uploadError}</span>}
                </div>

                <p className="customize-file-caption">{selected.fileName} · {selected.format === "panel" ? `${selected.panelSize} 3-Piece Panel` : selected.size}</p>

                <div className="customize-controls">
                  <div className="customize-control-section">
                    <span>Poster Size</span>
                    <div className="customize-control-buttons four">
                      {SIZE_LABELS.map((size) => (
                        <button
                          type="button"
                          key={size}
                          className={selected.size === size ? "active" : ""}
                          onClick={() => updateSelected({ size })}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {panelEligible && (
                    <div className="customize-control-section">
                      <span>Format</span>
                      <div className="customize-control-buttons two">
                        <button type="button" className={selected.format === "single" ? "active" : ""} onClick={() => setFormat("single")}>Single Poster</button>
                        <button type="button" className={selected.format === "panel" ? "active" : ""} onClick={() => setFormat("panel")}>3-Piece Panel</button>
                      </div>
                    </div>
                  )}

                  {selected.format === "panel" && (
                    <div className="customize-control-section">
                      <span>Panel Size</span>
                      <div className="customize-control-buttons two">
                        {(["A4", "A5"] as const).map((size) => (
                          <button type="button" key={size} className={selected.panelSize === size ? "active" : ""} onClick={() => updateSelected({ panelSize: size })}>
                            {size} · {money(panelPrice(size))}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="customize-control-section">
                    <span>Image Mode</span>
                    <div className="customize-control-buttons two">
                      {(["fill", "fit"] as const).map((mode) => (
                        <button type="button" key={mode} className={selected.mode === mode ? "active" : ""} onClick={() => updateSelected({ mode })}>
                          {mode === "fill" ? "Fill" : "Fit"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="customize-control-section">
                    <span>Rotate</span>
                    <div className="customize-control-buttons three">
                      <button type="button" onClick={() => updateSelected({ rotation: selected.rotation - 90 })}>↶ Rotate Left</button>
                      <button type="button" onClick={() => updateSelected({ rotation: selected.rotation + 90 })}>↷ Rotate Right</button>
                      <button type="button" onClick={() => updateSelected({ rotation: 0, zoom: 1, offsetX: 0, offsetY: 0, mode: "fill" })}>Reset</button>
                    </div>
                  </div>

                  <div className="customize-control-section">
                    <div className="customize-slider-heading"><span>Zoom / Crop</span><strong>{Math.round(selected.zoom * 100)}%</strong></div>
                    <input
                      type="range"
                      min={String(
                        frameRef.current && selected.naturalWidth && selected.naturalHeight
                          ? getMinimumCoverZoom(
                              selected,
                              frameRef.current.clientWidth,
                              frameRef.current.clientHeight,
                            )
                          : 1,
                      )}
                      max="3"
                      step="0.01"
                      value={selected.zoom}
                      onChange={(event) => updateSelected({ zoom: Number(event.target.value) })}
                    />
                  </div>

                  <div className="customize-control-section">
                    <span>Quantity</span>
                    <div className="customize-quantity">
                      <button type="button" onClick={() => changeQuantity(-1)}>−</button>
                      <strong>{selected.quantity}</strong>
                      <button type="button" onClick={() => changeQuantity(1)}>+</button>
                    </div>
                  </div>
                </div>

                <p className="customize-drag-help">Drag the image directly inside the poster to adjust its position.</p>
              </>
            ) : (
              <div className="customize-preview-empty">Upload a photo to see the live preview.</div>
            )}
          </section>
        </div>

        {message && <div className="customize-message" role="status">{message}</div>}

        <section className="customize-total-bar">
          <div>
            <span>Total</span>
            <strong>{money(total)}</strong>
            <small>{totalQuantity} customized {totalQuantity === 1 ? "poster" : "posters"}</small>
          </div>
          <div className="customize-total-actions">
            <Link to="/shop">Continue Shopping</Link>
            <button type="button" disabled={!items.length || savingCart} onClick={addAllToCart}>
              {savingCart ? "ADDING…" : "ADD ALL TO CART"}
              <span>→</span>
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}
