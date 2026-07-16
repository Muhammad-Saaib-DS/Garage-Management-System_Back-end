import "reflect-metadata";
import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { AppDataSource } from "./data-source";

import ownersRouter from "./routes/owners";
import employeesRouter from "./routes/employees";
import vehiclesRouter from "./routes/vehicles";
import partsRouter from "./routes/parts";
import servicesRouter from "./routes/services";
import servicePartsRouter from "./routes/serviceParts";
import serviceRequestsRouter from "./routes/serviceRequests";
import authRouter from "./routes/auth";
import { requireAuth, requireRole } from "./middleware/requireAuth";
import statsRouter from "./routes/stats";
import analyticsRouter from "./routes/analytics";
import invoicesRouter from "./routes/invoices";

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

// Comma-separated list of allowed frontend origins (local dev, preview, and production Vercel URL)
const allowedOrigins = (process.env.FRONTEND_URLS || "http://localhost:5173")
  .split(",")
  .map((url) => url.trim());

// Secure HTTP headers (helmet sets sensible defaults: no-sniff, frameguard, etc.)
app.use(helmet());

// Gzip-compress responses — smaller payloads, faster API responses
app.use(compression());

// Request logging — verbose in dev, compact single-line in production
app.use(morgan(isProduction ? "combined" : "dev"));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json());

// Rate limiting on auth routes specifically — these are the most common abuse target
// (brute-forcing login, hammering refresh). 20 requests per 15 minutes per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// A gentler general limit across the whole API, to prevent overall abuse/scraping
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { message: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Health check
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Garage Management System API is running" });
});

// Public auth route — no token required to reach this one, but rate-limited more strictly
app.use("/api/auth", authLimiter, authRouter);

// Admin-only routes — these expose salary/revenue data:
app.use("/api/employees", requireAuth, requireRole("Admin"), employeesRouter);
app.use("/api/analytics", requireAuth, requireRole("Admin"), analyticsRouter);
app.use("/api/invoices", requireAuth, requireRole("Admin"), invoicesRouter);

// Everything else — both roles allowed, just needs to be logged in:
app.use("/api/owners", requireAuth, ownersRouter);
app.use("/api/vehicles", requireAuth, vehiclesRouter);
app.use("/api/parts", requireAuth, partsRouter);
app.use("/api/services", requireAuth, servicesRouter);
app.use("/api/service-parts", requireAuth, servicePartsRouter);
app.use("/api/service-requests", requireAuth, serviceRequestsRouter);
app.use("/api/stats", requireAuth, statsRouter);

// Catch-all 404
app.use((_req: Request, res: Response) => {
  res.status(404).json({ message: "Route not found" });
});

AppDataSource.initialize()
  .then(() => {
    console.log("Connected to PostgreSQL database (Neon)");
    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to the database:", err);
  });