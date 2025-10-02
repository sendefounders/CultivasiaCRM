import type { Express, Request, Response, NextFunction } from "express";
import { setupAuth } from "./auth";
import { storage } from "./storage";

/**
 * TEMP SAFE MIDDLEWARES
 * - keep requests flowing so we can debug login without crashes
 * - later, replace with real checks once sessions/JWT are added
 */
function requireAuth(_req: Request, _res: Response, next: NextFunction) {
  // TODO: replace with real auth once sessions/JWT exist
  next();
}
function requireAdmin(_req: Request, _res: Response, next: NextFunction) {
  // TODO: check req.user.role === 'admin' once auth is wired
  next();
}

export function registerRoutes(app: Express) {
  // Auth endpoints (stateless, defined in auth.ts)
  setupAuth(app);

  // Health checks
  app.get("/api/health", (_req: Request, res: Response) => res.status(200).json({ ok: true }));
  app.get("/api/ping", (_req: Request, res: Response) => res.status(200).send("pong"));

  // Example: simple me endpoint (no sessions yet)
  app.get("/api/me", async (_req: Request, res: Response) => {
    // Without sessions/JWT, we don't know the current user.
    // Returning null keeps the frontend happy.
    res.status(200).json({ user: null });
  });

  // --- NOTE ---
  // This is a minimal, safe routes file to unblock login.
  // Re-add your existing resources (products, calls, transactions, etc.)
  // below, using requireAuth / requireAdmin as needed, e.g.:
  //
  // app.get("/api/products", requireAuth, async (_req, res) => {
  //   const products = await storage.getAllProducts();
  //   res.json(products);
  // });
  //
  // Keep adding endpoints as you verify each storage method exists.
}
