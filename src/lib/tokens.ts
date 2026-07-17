import { createHash, randomBytes } from "crypto";

export function generateAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateCartId(): string {
  return randomBytes(16).toString("hex");
}
