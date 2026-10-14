import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import "./BrandLoader.css";

export default function BrandLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, 1600);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="brand-loader"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.02,
          }}
          transition={{
            duration: 0.55,
            ease: "easeInOut",
          }}
        >
          <div className="brand-loader__content">

            {/* Logo */}
            <motion.div
              className="brand-loader__logo"
              initial={{
                opacity: 0,
                scale: 0.7,
                y: 14,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              transition={{
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <div className="brand-loader__ring" />
              <img className="brand-loader__symbol" src="/zavyro-symbol.png" alt="Zavyro Posters" />
            </motion.div>

            {/* Brand */}
            <motion.h1
              className="brand-loader__name"
              initial={{
                opacity: 0,
                y: 14,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.2,
                duration: 0.55,
              }}
            >
              <img className="brand-loader__wordmark" src="/zavyro-wordmark.png" alt="Zavyro" />
            </motion.h1>

            <motion.div
              className="brand-loader__subname"
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.3,
                duration: 0.5,
              }}
            >
              POSTERS
            </motion.div>

            <motion.div
              className="brand-loader__tagline"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              transition={{
                delay: 0.45,
                duration: 0.5,
              }}
            >
              ART • DESIGN • CULTURE
            </motion.div>

            {/* Loading line */}
            <motion.div
              className="brand-loader__progress"
              initial={{
                opacity: 0,
                width: 0,
              }}
              animate={{
                opacity: 1,
                width: 180,
              }}
              transition={{
                delay: 0.5,
                duration: 0.5,
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}