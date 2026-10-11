import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import "./TrendingPosters.css";
import { defaultHomepageSettings, type HomepagePoster } from "../services/homepageContent";

type Poster = {
  id: string;
  title: string;
  category: string;
  image: string;
};

const fallbackPosters: Poster[] = defaultHomepageSettings.trendingPosters.map(
  (poster, index) => ({
    id: String(index + 1),
    title: poster.title,
    category: poster.category || poster.title,
    image: poster.image,
  }),
);

function PosterCard({ poster }: { poster: Poster }) {
  return (
    <article className="trending-poster-card">
      <div className="trending-poster-image">
        <img
          src={poster.image}
          alt={`${poster.category} ${poster.title} poster`}
          loading="lazy"
          draggable={false}
        />
        <div className="trending-poster-overlay" />
        <div className="trending-poster-info">
          <span>{poster.category}</span>
          <strong>{poster.title}</strong>
        </div>
      </div>
    </article>
  );
}

function PosterRow({
  direction,
  speed,
  posters,
}: {
  direction: "left" | "right";
  speed: string;
  posters: Poster[];
}) {
  const visible = posters.length ? posters : fallbackPosters;

  return (
    <div
      className={`trending-row trending-row-${direction}`}
      style={{ "--trending-speed": speed } as CSSProperties}
    >
      <div className="trending-track">
        {[0, 1].map((group) => (
          <div
            className="trending-group"
            key={group}
            aria-hidden={group === 1}
          >
            {visible.map((poster) => (
              <PosterCard
                key={`${group}-${poster.id}`}
                poster={poster}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrendingPosters({
  posters: configuredPosters,
  count = 12,
  speed = 32,
}: {
  posters?: HomepagePoster[];
  count?: number;
  speed?: number;
}) {
  const source = (configuredPosters?.length
    ? configuredPosters
    : defaultHomepageSettings.trendingPosters
  )
    .slice(0, Math.max(1, count))
    .map((poster, index) => ({
      id: poster.id || String(index),
      title: poster.title,
      category: poster.category || poster.title,
      image: poster.image,
    }));

  return (
    <section className="trending-posters">
      <div className="z-container trending-heading">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6 }}
        >
          <span>THE ZAVYRO EDIT</span>
          <h2>
            TRENDING
            <strong>POSTERS.</strong>
          </h2>
          <p>Posters people are putting on their walls right now.</p>
        </motion.div>
      </div>

      <div className="trending-gallery">
        <PosterRow direction="left" speed={`${speed}s`} posters={source} />
        <PosterRow direction="right" speed={`${Math.max(10, Math.round(speed * 1.2))}s`} posters={source} />
      </div>
    </section>
  );
}
