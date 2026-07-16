import jwt from "jsonwebtoken";

export type Role = "Admin" | "Employee";

export interface JwtClaims {
  id: number;
  username: string;
  role: Role;
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-me";
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

export function signAccessToken(claims: JwtClaims): string {
  return jwt.sign(claims, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function signRefreshToken(claims: JwtClaims): string {
  return jwt.sign(claims, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyAccessToken(token: string): JwtClaims {
  return jwt.verify(token, ACCESS_SECRET) as JwtClaims;
}

export function verifyRefreshToken(token: string): JwtClaims {
  return jwt.verify(token, REFRESH_SECRET) as JwtClaims;
}