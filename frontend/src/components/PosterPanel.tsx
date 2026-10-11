import "./PosterPanel.css";

interface PosterPanelProps {
  image: string;
  title?: string;
  size?: "A5" | "A4";
  className?: string;
  priority?: boolean;
  compact?: boolean;
}

export default function PosterPanel({
  image,
  title = "Zavyro Panel",
  size = "A5",
  className = "",
  priority = false,
  compact = false,
}: PosterPanelProps) {
  return (
    <div
      className={[
        "poster-panel",
        `poster-panel-${size.toLowerCase()}`,
        compact ? "poster-panel-compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="poster-panel-wall">
        <div className="poster-panel-light" />

        <div className="poster-panel-stage">
          <img
            src={image}
            alt={title}
            className="poster-panel-artwork"
            loading={priority ? "eager" : "lazy"}
            draggable={false}
          />

          <div className="poster-panel-gap poster-panel-gap-one" />
          <div className="poster-panel-gap poster-panel-gap-two" />

          <div className="poster-panel-piece poster-panel-piece-one" />
          <div className="poster-panel-piece poster-panel-piece-two" />
          <div className="poster-panel-piece poster-panel-piece-three" />

          <div className="poster-panel-border poster-panel-border-one" />
          <div className="poster-panel-border poster-panel-border-two" />
          <div className="poster-panel-border poster-panel-border-three" />

          <div className="poster-panel-brand">
            <span>Z</span>
            <small>ZAVYRO</small>
          </div>
        </div>
      </div>
    </div>
  );
}