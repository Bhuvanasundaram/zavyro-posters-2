// ============================================================
// ZAVYRO POSTERS 2.0
// PHYSICAL POSTER DISPLAY
// Normal poster + continuous 3-panel transformation
// ============================================================

import { useState } from "react";
import type { PanelSize, PosterSize } from "../services/shopContent";
import "./PosterDisplay.css";

export type PosterDisplayMode = "poster" | "panel";

interface PosterDisplayProps {
  image: string;
  title?: string;
  className?: string;
  priority?: boolean;
  interactive?: boolean;

  mode?: PosterDisplayMode;

  posterSize?: PosterSize;

  panelSize?: PanelSize;

  /**
   * Controls how the artwork is positioned inside the poster.
   * Useful later when the customer uploads/customizes images.
   */
  objectPosition?: string;
}

const panelClass = (index: number) => {
  if (index === 0) return "panel-piece panel-piece-left";
  if (index === 1) return "panel-piece panel-piece-center";
  return "panel-piece panel-piece-right";
};

export default function PosterDisplay({
  image,
  title = "Zavyro Poster",
  className = "",
  priority = false,
  interactive = true,
  mode = "poster",
  posterSize = "A4",
  panelSize = "A4",
  objectPosition = "50% 50%",
}: PosterDisplayProps) {
  const [hovered, setHovered] = useState(false);

  const isPanel = mode === "panel";

  return (
    <div
      className={[
        "poster-display",
        isPanel ? "poster-display-panel" : "poster-display-normal",
        `poster-size-${isPanel ? panelSize.toLowerCase() : posterSize.toLowerCase()}`,
        hovered ? "poster-display-hovered" : "",
        interactive ? "poster-display-interactive" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
    >
      <div className="poster-scene">
        <div className="poster-scene-glow" />

        <div className="poster-wall">
          <div className="poster-wall-texture" />

          {!isPanel ? (
            <div className="single-poster-wrap">
              <div className="single-poster-shadow" />

              <div className="single-poster">
                <div className="poster-paper-edge" />

                <div className="poster-art">
                  <img
                    src={image}
                    alt={title}
                    className="poster-art-image"
                    loading={priority ? "eager" : "lazy"}
                    draggable={false}
                    style={{ objectPosition }}
                  />
                </div>

                <div className="poster-highlight" />
              </div>
            </div>
          ) : (
            <div className="panel-stage">
              <div className="panel-shadow-layer" />

              <div className="panel-piece-wrap">
                <div className={panelClass(0)}>
                  <div className="panel-paper-edge" />
                  <div className="panel-art">
                    <img
                      src={image}
                      alt={`${title} panel 1`}
                      className="panel-art-image panel-art-image-left"
                      loading={priority ? "eager" : "lazy"}
                      draggable={false}
                      style={{ objectPosition }}
                    />
                  </div>
                  <div className="panel-highlight" />
                </div>

                <div className={panelClass(1)}>
                  <div className="panel-paper-edge" />
                  <div className="panel-art">
                    <img
                      src={image}
                      alt={`${title} panel 2`}
                      className="panel-art-image panel-art-image-center"
                      loading={priority ? "eager" : "lazy"}
                      draggable={false}
                      style={{ objectPosition }}
                    />
                  </div>
                  <div className="panel-highlight" />
                </div>

                <div className={panelClass(2)}>
                  <div className="panel-paper-edge" />
                  <div className="panel-art">
                    <img
                      src={image}
                      alt={`${title} panel 3`}
                      className="panel-art-image panel-art-image-right"
                      loading={priority ? "eager" : "lazy"}
                      draggable={false}
                      style={{ objectPosition }}
                    />
                  </div>
                  <div className="panel-highlight" />
                </div>
              </div>
            </div>
          )}

          <div className="poster-floor-shadow" />
        </div>

        <div className="poster-scene-vignette" />
      </div>
    </div>
  );
}