import jwt from "jsonwebtoken";

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export function verifyToken(authHeader: string | null | undefined): TokenPayload | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch {
    return null;
  }
}
