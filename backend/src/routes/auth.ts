import { Router, Request, Response } from "express";
import crypto from "node:crypto";

import { pool } from "../db.js";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  hashSessionToken,
} from "../utils/auth.js";

const router = Router();

const COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || "zavyro_session";

const SESSION_DAYS = Number(
  process.env.SESSION_DAYS || 7,
);

function getClientIp(req: Request): string | null {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }

  return req.socket.remoteAddress || null;
}

/*
  CREATE FIRST OWNER
  This endpoint is intended only for initial setup.
*/
router.post(
  "/setup-owner",
  async (req: Request, res: Response) => {
    try {
      const { fullName, email, password } = req.body;

      if (!fullName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Full name, email and password are required.",
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: "Password must contain at least 8 characters.",
        });
      }

      const existingUsers = await pool.query(
        "SELECT COUNT(*)::int AS count FROM users",
      );

      if (existingUsers.rows[0].count > 0) {
        return res.status(403).json({
          success: false,
          message: "Owner setup has already been completed.",
        });
      }

      const normalizedEmail = String(email)
        .trim()
        .toLowerCase();

      const passwordHash = await hashPassword(password);

      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const userResult = await client.query(
          `
          INSERT INTO users
            (full_name, email, password_hash, email_verified, status)
          VALUES
            ($1, $2, $3, true, 'active')
          RETURNING id, full_name, email, status
          `,
          [
            String(fullName).trim(),
            normalizedEmail,
            passwordHash,
          ],
        );

        const user = userResult.rows[0];

        await client.query(
          `
          INSERT INTO admin_roles
            (user_id, role)
          VALUES
            ($1, 'owner')
          `,
          [user.id],
        );

        await client.query("COMMIT");

        return res.status(201).json({
          success: true,
          message: "Owner account created successfully.",
          user,
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Owner setup error:", error);

      return res.status(500).json({
        success: false,
        message: "Could not create owner account.",
      });
    }
  },
);

/*
  CUSTOMER REGISTRATION
*/
router.post(
  "/register",
  async (req: Request, res: Response) => {
    try {
      const { fullName, phone, email, password } = req.body;
      if (!fullName || !email || !password) return res.status(400).json({ success: false, message: "Full name, email and password are required." });
      if (String(password).length < 8) return res.status(400).json({ success: false, message: "Password must contain at least 8 characters." });
      const normalizedEmail = String(email).trim().toLowerCase();
      const exists = await pool.query("SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1", [normalizedEmail]);
      if (exists.rows.length) return res.status(409).json({ success: false, message: "An account with this email already exists." });
      const passwordHash = await hashPassword(String(password));
      const result = await pool.query(`INSERT INTO users (full_name, email, phone, password_hash, email_verified, status) VALUES ($1,$2,$3,$4,false,'active') RETURNING id, full_name, email, status`, [String(fullName).trim(), normalizedEmail, phone ? String(phone).trim() : null, passwordHash]);
      const user = result.rows[0];
      const sessionToken = createSessionToken();
      const tokenHash = hashSessionToken(sessionToken);
      const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
      await pool.query(`INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent, last_used_at) VALUES ($1,$2,$3,$4,$5,NOW())`, [user.id, tokenHash, expiresAt, getClientIp(req), req.headers["user-agent"] || null]);
      res.cookie(COOKIE_NAME, sessionToken, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000, path: "/" });
      return res.status(201).json({ success: true, message: "Account created successfully.", user: { id: user.id, fullName: user.full_name, email: user.email, role: "customer" } });
    } catch (error) {
      console.error("Customer registration error:", error);
      return res.status(500).json({ success: false, message: "Could not create account." });
    }
  },
);

/*
  LOGIN
*/
router.post(
  "/login",
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required.",
        });
      }

      const normalizedEmail = String(email)
        .trim()
        .toLowerCase();

      const result = await pool.query(
        `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.password_hash,
          u.status,
          COALESCE(ar.role, 'customer') AS role
        FROM users u
        LEFT JOIN admin_roles ar
          ON ar.user_id = u.id
        WHERE LOWER(u.email) = $1
        LIMIT 1
        `,
        [normalizedEmail],
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      const account = result.rows[0];

      if (account.status !== "active") {
        return res.status(403).json({
          success: false,
          message: "This account is not active.",
        });
      }

      const validPassword = await verifyPassword(
        String(password),
        account.password_hash,
      );

      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password.",
        });
      }

      const sessionToken = createSessionToken();
      const tokenHash = hashSessionToken(sessionToken);

      const expiresAt = new Date(
        Date.now() +
          SESSION_DAYS * 24 * 60 * 60 * 1000,
      );

      await pool.query(
        `
        INSERT INTO sessions
          (user_id, token_hash, expires_at, ip_address, user_agent, last_used_at)
        VALUES
          ($1, $2, $3, $4, $5, NOW())
        `,
        [
          account.id,
          tokenHash,
          expiresAt,
          getClientIp(req),
          req.headers["user-agent"] || null,
        ],
      );

      await pool.query(
        `
        UPDATE users
        SET last_login_at = NOW()
        WHERE id = $1
        `,
        [account.id],
      );

      res.cookie(COOKIE_NAME, sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite:
          process.env.NODE_ENV === "production"
            ? "none"
            : "lax",
        maxAge:
          SESSION_DAYS * 24 * 60 * 60 * 1000,
        path: "/",
      });

      return res.json({
        success: true,
        message: "Login successful.",
        user: {
          id: account.id,
          fullName: account.full_name,
          email: account.email,
          role: account.role || "customer",
        },
      });
    } catch (error) {
      console.error("Login error:", error);

      return res.status(500).json({
        success: false,
        message: "Login failed.",
      });
    }
  },
);

/*
  LOGOUT
*/
router.post(
  "/logout",
  async (req: Request, res: Response) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];

      if (token) {
        const tokenHash = hashSessionToken(token);

        await pool.query(
          `
          DELETE FROM sessions
          WHERE token_hash = $1
          `,
          [tokenHash],
        );
      }

      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite:
          process.env.NODE_ENV === "production"
            ? "none"
            : "lax",
        path: "/",
      });

      return res.json({
        success: true,
        message: "Logged out successfully.",
      });
    } catch (error) {
      console.error("Logout error:", error);

      return res.status(500).json({
        success: false,
        message: "Logout failed.",
      });
    }
  },
);

router.get(
  "/me",
  async (req: Request, res: Response) => {
    try {
      const token = req.cookies?.[COOKIE_NAME];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated.",
        });
      }

      const tokenHash = hashSessionToken(token);

      const result = await pool.query(
        `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.status,
          COALESCE(ar.role, 'customer') AS role
        FROM sessions s
        INNER JOIN users u
          ON u.id = s.user_id
        LEFT JOIN admin_roles ar
          ON ar.user_id = u.id
        WHERE s.token_hash = $1
          AND s.expires_at > NOW()
          AND u.status = 'active'
        LIMIT 1
        `,
        [tokenHash],
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Session expired.",
        });
      }

      const user = result.rows[0];

      return res.json({
        success: true,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          role: user.role || "customer",
        },
      });
    } catch (error) {
      console.error("Auth /me error:", error);

      return res.status(500).json({
        success: false,
        message: "Could not verify session.",
      });
    }
  },
);

export default router;