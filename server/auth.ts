import { randomBytes, scrypt } from "crypto";
import { promisify } from "util";
import type { Express, Request, Response } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { pool } from "./db";
import type { User } from "@shared/schema";

const scryptAsync = promisify(scrypt);

// --- Password helpers (scrypt) ---
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [hashed, salt] = storedHash.split(".");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return buf.toString("hex") === hashed;
}

// --- Passport Local Strategy (NO session) ---
passport.use(
  new LocalStrategy(
    { usernameField: "username", passwordField: "password", session: false },
    async (username, password, done) => {
      try {
        const { rows } = await pool.query(
          "select id, username, email, password_hash, role from public.users where username = $1 limit 1",
          [username]
        );
        const user = rows[0] as (User & { password_hash: string }) | undefined;

        if (!user) return done(null, false, { message: "Incorrect username" });

        const ok = await verifyPassword(password, user.password_hash);
        if (!ok) return done(null, false, { message: "Incorrect password" });

        const safeUser = { id: user.id, username: user.username, email: user.email, role: user.role };
        return done(null, safeUser);
      } catch (err) {
        return done(err as Error);
      }
    }
  )
);

// --- Exported setup function expected by routes.ts ---
export function setupAuth(app: Express) {
  // Initialize passport (no sessions)
  app.use(passport.initialize());

  // POST /api/login  (stateless)
  app.post("/api/login", (req: Request, res: Response, next) => {
    passport.authenticate("local", { session: false }, (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Unauthorized" });
      return res.status(200).json({ user });
    })(req, res, next);
  });

  // POST /api/register
  app.post("/api/register", async (req: Request, res: Response) => {
    try {
      const { username, email, password, role } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({ message: "username and password are required" });
      }
      const hashed = await hashPassword(password);
      // Write directly via SQL to avoid storage import cycle; matches storage.ts behavior
      const { rows } = await pool.query(
        `insert into public.users (username, email, password_hash, role)
         values ($1, $2, $3, $4)
         on conflict (username) do nothing
         returning id, username, email, role`,
        [username, email ?? null, hashed, role ?? "user"]
      );
      if (!rows[0]) {
        return res.status(409).json({ message: "username already exists" });
      }
      return res.status(201).json({ user: rows[0] });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Failed to register" });
    }
  });

  // GET /api/user  (return JSON instead of 204)
  app.get("/api/user", (_req: Request, res: Response) => {
    return res.status(200).json({ user: null });
  });

  // POST /api/logout  (no sessions to clear, just return ok)
  app.post("/api/logout", (_req: Request, res: Response) => {
    return res.status(200).json({ ok: true });
  });
}
