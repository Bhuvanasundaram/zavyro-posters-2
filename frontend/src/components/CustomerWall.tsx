import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import "./CustomerWall.css";
import {
  defaultHomepageSettings,
  type HomepageFanMedia,
  type HomepageReview,
} from "../services/homepageContent";

type FanMedia = {
  id: number;
  type: "image" | "video";
  src: string;
  poster?: string;
  label: string;
};

type CustomerReview = {
  id: number;
  name: string;
  rating: number;
  text: string;
  product: string;
};

const fanMedia: FanMedia[] = defaultHomepageSettings.fanMedia.map((item, index) => ({
  id: Number(item.id.replace(/\\D/g, "")) || index + 1,
  type: item.type,
  src: item.src,
  poster: item.poster,
  label: item.label,
}));

const customerReviews: CustomerReview[] = defaultHomepageSettings.reviews.map((review, index) => ({
  id: Number(review.id.replace(/\\D/g, "")) || index + 1,
  name: review.name,
  rating: review.rating,
  text: review.text,
  product: review.product,
}));

function FanMediaCard({ item }: { item: FanMedia }) {
  return (
    <article className="fan-media-card">
      <div className="fan-media-inner">
        <img
          className="fan-media-content"
          src={item.src}
          alt={item.label}
          loading="lazy"
          draggable={false}
          onError={(event) => {
            const image = event.currentTarget;
            image.style.display = "none";

            const parent = image.parentElement;

            if (parent) {
              parent.classList.add("media-failed");
            }
          }}
        />

        <div className="fan-media-fallback">
          <div className="fan-fallback-logo">Z</div>
          <strong>ZAVYRO</strong>
          <span>{item.label}</span>
        </div>

        <div className="fan-media-gradient" />

        <div className="fan-media-label">
          CUSTOMER POSTER
        </div>
      </div>
    </article>
  );
}

function ReviewCard({ review }: { review: CustomerReview }) {
  return (
    <article className="customer-review-card">
      <div className="customer-review-top">
        <div className="customer-avatar">
          {review.name.charAt(0).toUpperCase()}
        </div>

        <div className="customer-info">
          <strong>{review.name}</strong>
          <span>{review.product}</span>
        </div>

        <div className="customer-rating">
          {"★".repeat(review.rating)}
        </div>
      </div>

      <p>“{review.text}”</p>
    </article>
  );
}

export default function CustomerWall({
  reviews: configuredReviews,
  fanMedia: configuredFanMedia,
  showReviews = true,
  showFanMedia = true,
  reviewCount = 6,
  reviewSpeed = 44,
  mediaCount = 6,
  mediaSpeed = 45,
}: {
  reviews?: HomepageReview[];
  fanMedia?: HomepageFanMedia[];
  showReviews?: boolean;
  showFanMedia?: boolean;
  reviewCount?: number;
  reviewSpeed?: number;
  mediaCount?: number;
  mediaSpeed?: number;
}) {
  const activeMedia = configuredFanMedia !== undefined
    ? configuredFanMedia.filter((item) => item.visible !== false).map((item, index) => ({
        id: Number(item.id.replace(/\\D/g, "")) || index + 1,
        type: item.type,
        src: item.src,
        poster: item.poster,
        label: item.label,
      }))
    : fanMedia;

  const activeReviews = configuredReviews !== undefined
    ? configuredReviews.filter((item) => item.visible !== false).map((item, index) => ({
        id: Number(item.id.replace(/\\D/g, "")) || index + 1,
        name: item.name,
        rating: item.rating,
        text: item.text,
        product: item.product,
      }))
    : customerReviews;

  const visibleMedia = activeMedia.slice(0, Math.max(1, mediaCount));
  const visibleReviews = activeReviews.slice(0, Math.max(1, reviewCount));

  return (
    <section className="customer-wall">
      <div className="z-container">
        <motion.div
          className="customer-wall-heading"
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
        >
          <span className="customer-wall-eyebrow">
            REAL ZAVYRO CUSTOMERS
          </span>

          <h2>
            FAN <span>REVIEWS.</span>
          </h2>

          <p>
            See how people are using Zavyro posters to transform their spaces.
          </p>
        </motion.div>
      </div>

      {/* =====================================================
          SINGLE FAN REVIEW MEDIA ROW
          ===================================================== */}

      {showFanMedia && activeMedia.length > 0 && (
        <div className="fan-media-gallery">
          <div
            className="fan-media-track"
            style={{ "--fan-media-speed": `${mediaSpeed}s` } as CSSProperties}
          >
            {[0, 1].map((group) => (
              <div
                className="fan-media-group"
                key={group}
                aria-hidden={group === 1}
              >
                {visibleMedia.map((item) => (
                  <FanMediaCard key={`${group}-${item.id}`} item={item} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================
          WRITTEN CUSTOMER REVIEWS
          ===================================================== */}

      {showReviews && activeReviews.length > 0 && (
        <>
          <div className="z-container customer-written-section">
            <motion.div
              className="customer-written-heading"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <span>WHAT THEY SAY</span>

              <h3>
                Loved by <em>Zavyro</em> customers.
              </h3>

              <div className="overall-rating">
                <strong>5.0</strong>

                <div>
                  <div className="overall-stars">
                    ★★★★★
                  </div>

                  <span>Customer reviews</span>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="customer-reviews-gallery">
            <div
              className="customer-reviews-track"
              style={{ "--customer-review-speed": `${reviewSpeed}s` } as CSSProperties}
            >
              {[0, 1].map((group) => (
                <div
                  className="customer-reviews-group"
                  key={group}
                  aria-hidden={group === 1}
                >
                  {visibleReviews.map((review) => (
                    <ReviewCard key={`${group}-${review.id}`} review={review} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
