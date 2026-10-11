import { NextFunction, Request, Response } from "express";

import { pool } from "../db.js";
import {
  hashSessionToken,
} from "../utils/auth.js";

const COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || "zavyro_session";

export interface AuthenticatedRequest
  extends Request {
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: "owner" | "admin" | "staff" | "customer";
  };
  sessionId?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const tokenHash = hashSessionToken(token);

    const result = await pool.query(
      `
      SELECT
        s.id AS session_id,
        s.expires_at,
        u.id AS user_id,
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
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite:
          process.env.NODE_ENV === "production"
            ? "none"
            : "lax",
        path: "/",
      });

      return res.status(401).json({
        success: false,
        message: "Session expired or invalid.",
      });
    }

    const account = result.rows[0];

    await pool.query(
      `
      UPDATE sessions
      SET last_used_at = NOW()
      WHERE id = $1
      `,
      [account.session_id],
    );

    req.user = {
      id: account.user_id,
      fullName: account.full_name,
      email: account.email,
      role: account.role,
    };

    req.sessionId = account.session_id;

    next();
  } catch (error) {
    console.error(
      "Authentication middleware error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Authentication check failed.",
    });
  }
}

export function requireRoles(
  ...allowedRoles: Array<
    "owner" | "admin" | "staff"
  >
) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (req.user.role === "customer" || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission.",
      });
    }

    next();
  };
}