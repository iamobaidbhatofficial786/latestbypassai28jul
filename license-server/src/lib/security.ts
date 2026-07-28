import crypto from "crypto";
import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing in production.");
  }
  return secret || "dev-jwt-secret-key-only-for-local-testing";
}

function getAdminSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("CRITICAL SECURITY ERROR: ADMIN_SESSION_SECRET environment variable is missing in production.");
  }
  return secret || "dev-admin-session-secret-key-only-for-local-testing";
}

export function validateCorsOrigin(originHeader: string | null): boolean {
  const allowed = process.env.ALLOWED_EXTENSION_IDS;
  if (!allowed || !originHeader) return true; // Default allow in local dev if unconfigured
  const allowedList = allowed.split(",").map((s) => s.trim().toLowerCase());
  const originClean = originHeader.replace(/^chrome-extension:\/\//i, "").replace(/\/$/, "").toLowerCase();
  return allowedList.includes(originClean) || allowedList.includes("*");
}

/**
 * Format: XXXXX-XXXXX-XXXXX-XXXXX (20 chars hex/alphanumeric in 4 groups of 5)
 */
export function generateLicenseKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Base32 excluding confusing chars I, O, 0, 1
  let key = "";
  const randomBytes = crypto.randomBytes(20);
  for (let i = 0; i < 20; i++) {
    if (i > 0 && i % 5 === 0) {
      key += "-";
    }
    key += chars[randomBytes[i] % chars.length];
  }
  return key;
}

export interface LicenseTokenPayload {
  licenseId: string;
  key: string;
  deviceId: string;
  plan: string;
  expiresAt: string | null;
  type: "access_token";
}

/**
 * Issues short-lived access token (15 minute expiration)
 */
export function signLicenseToken(payload: Omit<LicenseTokenPayload, "type">): string {
  return jwt.sign({ ...payload, type: "access_token" }, getJwtSecret(), {
    expiresIn: "15m",
  });
}

export function verifyLicenseToken(token: string): LicenseTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as LicenseTokenPayload;
    if (decoded && decoded.type === "access_token") {
      return decoded;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  role: string;
}

export function signAdminSession(payload: AdminSessionPayload): string {
  return jwt.sign(payload, getAdminSessionSecret(), { expiresIn: "12h" });
}

export function verifyAdminSession(token: string): AdminSessionPayload | null {
  try {
    return jwt.verify(token, getAdminSessionSecret()) as AdminSessionPayload;
  } catch (e) {
    return null;
  }
}
