import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { AppDataSource } from "../data-source";
import { AdminUser } from "../entities/AdminUser";
import { Employee } from "../entities/Employee";
import { signAccessToken, signRefreshToken, verifyRefreshToken, JwtClaims } from "../utils/jwt";

const router = Router();
const adminRepo = () => AppDataSource.getRepository(AdminUser);
const employeeRepo = () => AppDataSource.getRepository(Employee);

const REFRESH_COOKIE_NAME = "gms_refresh";
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  // Check admins first
  const admin = await adminRepo().findOneBy({ username });
  if (admin) {
    const matches = await bcrypt.compare(password, admin.password_hash);
    if (!matches) return res.status(401).json({ message: "Invalid username or password" });

    const claims: JwtClaims = { id: admin.admin_id, username: admin.username, role: "Admin" };
    const accessToken = signAccessToken(claims);
    res.cookie(REFRESH_COOKIE_NAME, signRefreshToken(claims), REFRESH_COOKIE_OPTIONS);
    return res.json({ token: accessToken, username: admin.username, role: "Admin" });
  }

  // Then employees
  const employee = await employeeRepo().findOneBy({ username });
  if (employee && employee.password_hash) {
    const matches = await bcrypt.compare(password, employee.password_hash);
    if (!matches) return res.status(401).json({ message: "Invalid username or password" });

    const claims: JwtClaims = { id: employee.employee_id, username: employee.username!, role: "Employee" };
    const accessToken = signAccessToken(claims);
    res.cookie(REFRESH_COOKIE_NAME, signRefreshToken(claims), REFRESH_COOKIE_OPTIONS);
    return res.json({ token: accessToken, username: employee.username, role: "Employee" });
  }

  return res.status(401).json({ message: "Invalid username or password" });
});

router.post("/refresh", (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  console.log("Refresh cookie received:", token ? token.slice(0, 20) + "..." : "MISSING");

  if (!token) return res.status(401).json({ message: "No refresh token. Please log in." });

  try {
    const payload = verifyRefreshToken(token);
    const accessToken = signAccessToken(payload);
    res.json({ token: accessToken, username: payload.username, role: payload.role });
  } catch (err) {
    console.error("Refresh verify failed:", err);
    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
    res.status(401).json({ message: "Session expired. Please log in again." });
  }
});

router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
  res.status(204).send();
});

export default router;