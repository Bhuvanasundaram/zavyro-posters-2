import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import shopRoutes from "./routes/shop.js";
import { testDatabaseConnection } from "./db.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import homepageRouter from "./routes/homepage.js";
import accountRouter from "./routes/account.js";
import { ensureOptionalTables } from "./schema.js";
import paymentsRouter from "./routes/payments.js";
import ordersRouter from "./routes/orders.js";
import { startEmailNotificationWorker } from "./services/orderNotifications.js";

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 5000);

const configuredOrigins = (process.env.FRONTEND_ORIGINS || "")
  .split(/[;,]/)
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  ...configuredOrigins,
]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin.replace(/\/$/, ""))) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS origin not allowed"),
      );
    },
    credentials: true,
  }),
);

app.use(express.json({
  limit: "10mb",
  verify: (req, _res, buffer) => {
    // Razorpay webhooks are signed over the exact raw request bytes.
    (req as unknown as { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  },
}));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

app.use(cookieParser());

app.get("/api/health", async (_req, res) => {
  try {
    const db = await testDatabaseConnection();

    res.json({
      success: true,
      message: "Zavyro backend is running",
      database: "connected",
      time: db.now,
    });
  } catch (error) {
    console.error(
      "Database health check failed:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "Backend is running but database connection failed",
    });
  }
});

app.use("/api/auth", authRouter);

app.use("/api/account", accountRouter);

app.use("/api/payments", paymentsRouter);

app.use("/api/orders", ordersRouter);

app.use("/api/admin", adminRouter);

app.use("/api/shop", shopRoutes);

app.use("/api/homepage", homepageRouter);

async function startServer() {
  try {
    await testDatabaseConnection();
    await ensureOptionalTables();
    startEmailNotificationWorker();

    app.listen(PORT, () => {
  console.log("");
  console.log("======================================");
  console.log("       ZAVYRO POSTERS BACKEND");
  console.log("======================================");
  console.log(`Server: http://localhost:${PORT}`);
  console.log(
    `Health: http://localhost:${PORT}/api/health`,
  );
  console.log(
    `Auth:   http://localhost:${PORT}/api/auth`,
  );
  console.log(
    `Admin:  http://localhost:${PORT}/api/admin`,
  );
  console.log("======================================");
  console.log("");
    });
  } catch (error) {
    console.error("Backend startup failed:", error);
    process.exit(1);
  }
}

void startServer();
