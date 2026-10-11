import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

export type PosterSizeCode = "A3" | "A4" | "A5" | "A6";
export type PosterOrientation = "portrait" | "landscape" | "panel";

interface PosterAdjustmentModalProps {
  isOpen: boolean;
  imageUrl: string;
  imageTitle?: string;
  isPanelProduct?: boolean;
  apiUrl?: string;
  onClose: () => void;
  onApply: (newImageUrl: string) => void;
}

type Point = { x: number; y: number };

const SIZE_MM: Record<PosterSizeCode, { width: number; height: number }> = {
  A3: { width: 297, height: 420 },
  A4: { width: 210, height: 297 },
  A5: { width: 148, height: 210 },
  A6: { width: 105, height: 148 },
};

const EXPORT_PX: Record<PosterSizeCode, { width: number; height: number }> = {
  A3: { width: 3508, height: 4961 },
  A4: { width: 2480, height: 3508 },
  A5: { width: 1748, height: 2480 },
  A6: { width: 1240, height: 1748 },
};

const PANEL_EXPORT_PX: Record<PosterSizeCode, { width: number; height: number }> = {
  A3: { width: 10524, height: 4961 },
  A4: { width: 7440, height: 3508 },
  A5: { width: 5244, height: 2480 },
  A6: { width: 3720, height: 1748 },
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function getFrameRatio(
  size: PosterSizeCode,
  orientation: PosterOrientation,
): number {
  if (orientation === "panel") {
    const mm = SIZE_MM[size];
    return (mm.width * 3) / mm.height;
  }

  const mm = SIZE_MM[size];
  return orientation === "portrait"
    ? mm.width / mm.height
    : mm.height / mm.width;
}

function getExportSize(
  size: PosterSizeCode,
  orientation: PosterOrientation,
): { width: number; height: number } {
  if (orientation === "panel") {
    return PANEL_EXPORT_PX[size];
  }

  const base = EXPORT_PX[size];
  return orientation === "portrait"
    ? base
    : { width: base.height, height: base.width };
}

function getRotatedBounds(
  width: number,
  height: number,
  rotation: number,
): { width: number; height: number } {
  const radians = (rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(radians));
  const s = Math.abs(Math.sin(radians));
  return {
    width: width * c + height * s,
    height: width * s + height * c,
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => {
      const retry = new Image();
      retry.decoding = "async";
      retry.onload = () => resolve(retry);
      retry.onerror = () => reject(new Error("Unable to load the poster image."));
      retry.src = url;
    };
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

export default function PosterAdjustmentModal({
  isOpen,
  imageUrl,
  imageTitle = "Poster",
  isPanelProduct = false,
  apiUrl = "",
  onClose,
  onApply,
}: PosterAdjustmentModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [size, setSize] = useState<PosterSizeCode>("A5");
  const [orientation, setOrientation] =
    useState<PosterOrientation>("portrait");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [panelGuides, setPanelGuides] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadingError, setLoadingError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [frame, setFrame] = useState({ width: 360, height: 509 });

  const ratio = getFrameRatio(size, orientation);

  const minZoom = useMemo(() => {
    const image = imageRef.current;
    if (!image) return 1;

    // Exact cover scale for a rotated rectangle. Using only the rotated
    // bounding box can still leave triangular empty corners at 45/135deg.
    // This formula checks the viewport corners in the image's rotated frame.
    const radians = (rotation * Math.PI) / 180;
    const c = Math.abs(Math.cos(radians));
    const s = Math.abs(Math.sin(radians));

    const requiredWidthScale =
      (c * frame.width + s * frame.height) /
      image.naturalWidth;
    const requiredHeightScale =
      (s * frame.width + c * frame.height) /
      image.naturalHeight;

    const requiredScale = Math.max(
      requiredWidthScale,
      requiredHeightScale,
    );

    const baseScale = Math.max(
      frame.width / image.naturalWidth,
      frame.height / image.naturalHeight,
    );

    return Math.max(
      1,
      requiredScale / baseScale,
    );
  }, [frame, rotation]);

  const effectiveZoom = Math.max(zoom, minZoom);

  const geometry = useMemo(() => {
    const image = imageRef.current;
    if (!image) {
      return {
        frameWidth: frame.width,
        frameHeight: frame.height,
        scale: 1,
        drawWidth: 0,
        drawHeight: 0,
        rotatedWidth: 0,
        rotatedHeight: 0,
      };
    }

    const baseScale = Math.max(
      frame.width / image.naturalWidth,
      frame.height / image.naturalHeight,
    );

    const scale = baseScale * effectiveZoom;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const rotated = getRotatedBounds(
      drawWidth,
      drawHeight,
      rotation,
    );

    return {
      frameWidth: frame.width,
      frameHeight: frame.height,
      scale,
      drawWidth,
      drawHeight,
      rotatedWidth: rotated.width,
      rotatedHeight: rotated.height,
    };
  }, [effectiveZoom, frame, rotation]);

  const clampOffset = useCallback(
    (next: Point): Point => {
      // Keep all four viewport corners inside the rotated image rectangle.
      // Bounding-box clamping alone permits empty triangular corners after
      // rotation, so the limits below are calculated in the rotated frame.
      const radians = (rotation * Math.PI) / 180;
      const c = Math.abs(Math.cos(radians));
      const s = Math.abs(Math.sin(radians));

      const imageHalfWidth = geometry.drawWidth / 2;
      const imageHalfHeight = geometry.drawHeight / 2;
      const frameHalfWidth = geometry.frameWidth / 2;
      const frameHalfHeight = geometry.frameHeight / 2;

      const maxX = Math.max(
        0,
        imageHalfWidth -
          (c * frameHalfWidth + s * frameHalfHeight),
      );
      const maxY = Math.max(
        0,
        imageHalfHeight -
          (s * frameHalfWidth + c * frameHalfHeight),
      );

      return {
        x: clamp(next.x, -maxX, maxX),
        y: clamp(next.y, -maxY, maxY),
      };
    },
    [geometry, rotation],
  );

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setImageLoaded(false);
    setLoadingError("");
    setSaveError("");
    setUploading(false);

    loadImage(imageUrl)
      .then((image) => {
        if (cancelled) return;
        imageRef.current = image;
        setImageLoaded(true);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadingError(
          error instanceof Error
            ? error.message
            : "Unable to load the poster image.",
        );
      });

    return () => {
      cancelled = true;
      imageRef.current = null;
    };
  }, [imageUrl, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const updateFrame = () => {
      const node = previewWrapRef.current;
      if (!node) return;

      const width = Math.max(
        180,
        Math.min(520, node.clientWidth - 4),
      );
      const height = width / ratio;

      if (height <= 650) {
        setFrame({ width, height });
        return;
      }

      setFrame({
        width: Math.max(180, 650 * ratio),
        height: 650,
      });
    };

    updateFrame();

    const observer = new ResizeObserver(updateFrame);
    if (previewWrapRef.current) observer.observe(previewWrapRef.current);

    return () => observer.disconnect();
  }, [isOpen, ratio]);

  useEffect(() => {
    if (!imageLoaded) return;

    setZoom((value) => Math.max(value, minZoom));
    setOffset((value) => clampOffset(value));
  }, [imageLoaded, minZoom, clampOffset]);

  useEffect(() => {
    setOffset((value) => clampOffset(value));
  }, [effectiveZoom, rotation, clampOffset]);

  const drawCanvas = useCallback(
    (
      targetCanvas: HTMLCanvasElement,
      targetWidth: number,
      targetHeight: number,
      includeGuides: boolean,
    ) => {
      const image = imageRef.current;
      if (!image) return;

      const context = targetCanvas.getContext("2d");
      if (!context) return;

      targetCanvas.width = targetWidth;
      targetCanvas.height = targetHeight;

      context.clearRect(0, 0, targetWidth, targetHeight);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, targetWidth, targetHeight);

      const scaleRatio = targetWidth / geometry.frameWidth;
      const frameOffsetX =
        offset.x * scaleRatio;
      const frameOffsetY =
        offset.y * scaleRatio;

      const scale = geometry.scale * scaleRatio;
      const cx = targetWidth / 2 + frameOffsetX;
      const cy = targetHeight / 2 + frameOffsetY;

      context.save();
      context.translate(cx, cy);
      context.rotate((rotation * Math.PI) / 180);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        -image.naturalWidth * scale / 2,
        -image.naturalHeight * scale / 2,
        image.naturalWidth * scale,
        image.naturalHeight * scale,
      );
      context.restore();

      if (includeGuides && orientation === "panel" && panelGuides) {
        context.save();
        context.strokeStyle = "rgba(255,255,255,.65)";
        context.lineWidth = Math.max(1, targetWidth / 900);
        context.setLineDash([
          Math.max(3, targetWidth / 100),
          Math.max(3, targetWidth / 100),
        ]);

        for (const x of [
          targetWidth / 3,
          (targetWidth * 2) / 3,
        ]) {
          context.beginPath();
          context.moveTo(x, 0);
          context.lineTo(x, targetHeight);
          context.stroke();
        }

        context.restore();
      }
    },
    [
      geometry,
      offset,
      orientation,
      panelGuides,
      rotation,
    ],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    drawCanvas(
      canvas,
      Math.round(frame.width),
      Math.round(frame.height),
      true,
    );
  }, [drawCanvas, frame, imageLoaded]);

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (uploading || !imageLoaded) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = frame.width / rect.width;
    const scaleY = frame.height / rect.height;

    setOffset(
      clampOffset({
        x: drag.originX + (event.clientX - drag.startX) * scaleX,
        y: drag.originY + (event.clientY - drag.startY) * scaleY,
      }),
    );
  };

  const stopPointer = (
    event: ReactPointerEvent<HTMLCanvasElement>,
  ) => {
    if (
      dragRef.current &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
  };

  const handleWheel = (
    event: ReactWheelEvent<HTMLCanvasElement>,
  ) => {
    event.preventDefault();

    const factor = event.deltaY > 0 ? 0.94 : 1.06;

    setZoom((value) =>
      clamp(
        value * factor,
        minZoom,
        Math.max(minZoom, 4),
      ),
    );
  };

  const reset = () => {
    setRotation(0);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSaveError("");
  };

  const center = () => {
    setOffset({ x: 0, y: 0 });
  };

  const fit = () => {
    setZoom(minZoom);
    setOffset({ x: 0, y: 0 });
  };

  const apply = async () => {
    const image = imageRef.current;

    if (!image || !imageLoaded) {
      setSaveError("The poster image is not ready yet.");
      return;
    }

    setUploading(true);
    setSaveError("");

    try {
      const output = getExportSize(size, orientation);

      const exportCanvas = document.createElement("canvas");

      /*
       * The preview frame is the reference coordinate system.
       * drawCanvas applies the exact same transformation at export scale,
       * so the saved image matches what the admin sees.
       */
      drawCanvas(
        exportCanvas,
        output.width,
        output.height,
        false,
      );

      const blob = await new Promise<Blob>((resolve, reject) => {
        exportCanvas.toBlob(
          (value) => {
            if (!value) {
              reject(new Error("Could not create the final poster image."));
              return;
            }
            resolve(value);
          },
          "image/jpeg",
          0.94,
        );
      });

      const body = new FormData();
      body.append(
        "file",
        new File(
          [blob],
          `zavyro-adjusted-${Date.now()}.jpg`,
          { type: "image/jpeg" },
        ),
      );

      const response = await fetch(
        `${apiUrl || ""}/api/admin/uploads`,
        {
          method: "POST",
          credentials: "include",
          body,
        },
      );

      let result: { success?: boolean; url?: string; message?: string } = {};

      try {
        result = await response.json();
      } catch {
        throw new Error("The upload server returned an invalid response.");
      }

      if (!response.ok || !result.success || !result.url) {
        throw new Error(
          result.message || "Adjusted poster upload failed.",
        );
      }

      onApply(result.url);
      onClose();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Could not save the adjusted poster.",
      );
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const maxZoom = Math.max(4, minZoom);

  const modalStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background: "rgba(2, 2, 8, .82)",
    backdropFilter: "blur(12px)",
  };

  const panelStyle: CSSProperties = {
    width: "min(1100px, 100%)",
    maxHeight: "94vh",
    overflow: "auto",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 24,
    background: "#0c0c12",
    color: "#fff",
    boxShadow: "0 30px 100px rgba(0,0,0,.55)",
  };

  const buttonStyle: CSSProperties = {
    minHeight: 42,
    borderRadius: 10,
    padding: "9px 13px",
    border: "1px solid rgba(255,255,255,.12)",
    background: "#15151e",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  };

  return (
    <div
      style={modalStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="zavyro-adjustment-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !uploading) {
          onClose();
        }
      }}
    >
      <div style={panelStyle}>
        <div
          style={{
            padding: "18px 20px",
            borderBottom: "1px solid rgba(255,255,255,.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: ".18em",
                color: "#9b7bff",
                fontWeight: 900,
              }}
            >
              ZAVYRO POSTER EDITOR
            </div>
            <h2
              id="zavyro-adjustment-title"
              style={{
                margin: "4px 0 0",
                fontSize: 20,
              }}
            >
              Adjust {imageTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            style={{
              ...buttonStyle,
              width: 42,
              padding: 0,
              fontSize: 20,
            }}
            aria-label="Close poster adjustment"
          >
            ×
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.15fr) minmax(300px, .85fr)",
            gap: 20,
            padding: 20,
          }}
        >
          <div>
            <div
              ref={previewWrapRef}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 300,
              }}
            >
              <div
                style={{
                  width: "min(100%, 520px)",
                  aspectRatio: ratio,
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 16,
                  background: "#050507",
                  border: "1px solid rgba(255,255,255,.15)",
                  boxShadow: "0 18px 55px rgba(0,0,0,.4)",
                }}
              >
                <canvas
                  ref={canvasRef}
                  width={Math.round(frame.width)}
                  height={Math.round(frame.height)}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={stopPointer}
                  onPointerCancel={stopPointer}
                  onWheel={handleWheel}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    cursor: uploading
                      ? "wait"
                      : dragRef.current
                        ? "grabbing"
                        : "grab",
                    touchAction: "none",
                    userSelect: "none",
                  }}
                  aria-label="Poster framing preview. Drag to reposition and use the mouse wheel to zoom."
                />

                {!imageLoaded && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(5,5,7,.8)",
                      padding: 20,
                      textAlign: "center",
                    }}
                  >
                    {loadingError || "Loading poster..."}
                  </div>
                )}
              </div>
            </div>

            <p
              style={{
                margin: "12px 0 0",
                color: "#9ca3af",
                fontSize: 12,
                textAlign: "center",
              }}
            >
              Drag to position · mouse wheel/pinch to zoom · no empty gaps allowed
            </p>
          </div>

          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <section>
              <label style={labelStyle}>
                Poster Size
              </label>
              <div style={segmentedStyle}>
                {(["A3", "A4", "A5", "A6"] as PosterSizeCode[]).map(
                  (code) => (
                    <button
                      type="button"
                      key={code}
                      onClick={() => setSize(code)}
                      disabled={uploading}
                      style={{
                        ...segmentButtonStyle,
                        ...(size === code ? selectedSegmentStyle : {}),
                      }}
                    >
                      {code}
                    </button>
                  ),
                )}
              </div>
            </section>

            <section>
              <label style={labelStyle}>
                Orientation
              </label>
              <div style={segmentedStyle}>
                {(["portrait", "landscape"] as const).map(
                  (value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setOrientation(value)}
                      disabled={uploading}
                      style={{
                        ...segmentButtonStyle,
                        ...(orientation === value
                          ? selectedSegmentStyle
                          : {}),
                      }}
                    >
                      {value === "portrait"
                        ? "Portrait"
                        : "Landscape"}
                    </button>
                  ),
                )}

                {isPanelProduct && (
                  <button
                    type="button"
                    onClick={() => setOrientation("panel")}
                    disabled={uploading}
                    style={{
                      ...segmentButtonStyle,
                      ...(orientation === "panel"
                        ? selectedSegmentStyle
                        : {}),
                    }}
                  >
                    3 Panel
                  </button>
                )}
              </div>
            </section>

            {orientation === "panel" && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  fontSize: 13,
                  color: "#d1d5db",
                }}
              >
                <input
                  type="checkbox"
                  checked={panelGuides}
                  onChange={(event) =>
                    setPanelGuides(event.target.checked)
                  }
                />
                Show 3-panel guides
              </label>
            )}

            <section style={controlCardStyle}>
              <div style={controlHeaderStyle}>
                <strong>Zoom</strong>
                <span>{Math.round(effectiveZoom * 100)}%</span>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  style={buttonStyle}
                  disabled={uploading}
                  onClick={() =>
                    setZoom((value) =>
                      clamp(
                        value - 0.1,
                        minZoom,
                        maxZoom,
                      ),
                    )
                  }
                >
                  −
                </button>

                <input
                  type="range"
                  min={minZoom}
                  max={maxZoom}
                  step={0.01}
                  value={effectiveZoom}
                  disabled={uploading}
                  onChange={(event) =>
                    setZoom(Number(event.target.value))
                  }
                  style={{ flex: 1 }}
                  aria-label="Poster zoom"
                />

                <button
                  type="button"
                  style={buttonStyle}
                  disabled={uploading}
                  onClick={() =>
                    setZoom((value) =>
                      clamp(
                        value + 0.1,
                        minZoom,
                        maxZoom,
                      ),
                    )
                  }
                >
                  +
                </button>
              </div>

              <small style={helpStyle}>
                Minimum zoom automatically increases after rotation so the
                poster frame stays completely covered.
              </small>
            </section>

            <section style={controlCardStyle}>
              <div style={controlHeaderStyle}>
                <strong>Rotation</strong>
                <span>{Math.round(rotation)}°</span>
              </div>

              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={rotation}
                disabled={uploading}
                onChange={(event) =>
                  setRotation(Number(event.target.value))
                }
                style={{ width: "100%" }}
                aria-label="Poster rotation"
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 7,
                  marginTop: 9,
                }}
              >
                {[0, 90, 180, 270].map((value) => (
                  <button
                    type="button"
                    key={value}
                    disabled={uploading}
                    onClick={() => setRotation(value)}
                    style={{
                      ...buttonStyle,
                      padding: "8px 4px",
                      ...(rotation === value
                        ? selectedSegmentStyle
                        : {}),
                    }}
                  >
                    {value}°
                  </button>
                ))}
              </div>
            </section>

            {saveError && (
              <div
                role="alert"
                style={{
                  border: "1px solid rgba(239,68,68,.45)",
                  borderRadius: 12,
                  padding: 12,
                  color: "#fca5a5",
                  background: "rgba(127,29,29,.18)",
                  fontSize: 13,
                }}
              >
                {saveError}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 8,
              }}
            >
              <button
                type="button"
                style={buttonStyle}
                disabled={uploading}
                onClick={fit}
              >
                Fit
              </button>
              <button
                type="button"
                style={buttonStyle}
                disabled={uploading}
                onClick={center}
              >
                Center
              </button>
              <button
                type="button"
                style={buttonStyle}
                disabled={uploading}
                onClick={reset}
              >
                Reset
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: 9,
                justifyContent: "flex-end",
                marginTop: 4,
              }}
            >
              <button
                type="button"
                onClick={onClose}
                disabled={uploading}
                style={{
                  ...buttonStyle,
                  flex: 1,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void apply()}
                disabled={uploading || !imageLoaded}
                style={{
                  ...buttonStyle,
                  flex: 1.4,
                  borderColor: "#7c3aed",
                  background:
                    uploading || !imageLoaded
                      ? "#33245a"
                      : "#7c3aed",
                }}
              >
                {uploading ? "Uploading..." : "Apply & Save"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 820px) {
          .zavyro-adjust-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  color: "#d1d5db",
  marginBottom: 8,
  textTransform: "uppercase",
  letterSpacing: ".08em",
};

const segmentedStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 7,
};

const segmentButtonStyle: CSSProperties = {
  minHeight: 42,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,.10)",
  background: "#14141c",
  color: "#d1d5db",
  cursor: "pointer",
  fontWeight: 700,
  padding: "8px 6px",
};

const selectedSegmentStyle: CSSProperties = {
  borderColor: "#7c3aed",
  background: "rgba(124,58,237,.20)",
  color: "#fff",
};

const controlCardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 14,
  padding: 13,
  background: "#111119",
};

const controlHeaderStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
  fontSize: 13,
};

const helpStyle: CSSProperties = {
  display: "block",
  marginTop: 9,
  color: "#8b8f9b",
  fontSize: 11,
  lineHeight: 1.45,
};
