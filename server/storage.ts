import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { pool as sharedPool } from "./db";

export interface User {
  id: string;
  username: string | null;
  email: string | null;
  password: string; // unified field (DB column: password_hash)
  role: string;
}

export interface InsertUser {
  username: string;
  email: string;
  password_hash: string; // already-hashed with scrypt
  role: string;
}

export class DatabaseStorage {
  private pool: Pool;
  private db: any;

  constructor(pool: Pool) {
    this.pool = pool;
    this.db = drizzle(pool, { schema });
  }

  // --- USERS ---
  async getUser(id: string): Promise<User | undefined> {
    const { rows } = await this.pool.query(
      `select id, username, email, password_hash as password, role
       from public.users
       where id = $1
       limit 1`,
      [id]
    );
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const { rows } = await this.pool.query(
      `select id, username, email, password_hash as password, role
       from public.users
       where username = $1
       limit 1`,
      [username]
    );
    return rows[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const { rows } = await this.pool.query(
      `insert into public.users (username, email, password_hash, role)
       values ($1, $2, $3, $4)
       returning id, username, email, password_hash as password, role`,
      [user.username, user.email, user.password_hash, user.role]
    );
    return rows[0];
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (updates.username !== undefined) {
      fields.push(`username = $${i++}`);
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${i++}`);
      values.push(updates.email);
    }
    if (updates.password_hash !== undefined) {
      fields.push(`password_hash = $${i++}`);
      values.push(updates.password_hash);
    }
    if (updates.role !== undefined) {
      fields.push(`role = $${i++}`);
      values.push(updates.role);
    }

    if (fields.length === 0) {
      return this.getUser(id); // nothing to update
    }

    values.push(id);

    const { rows } = await this.pool.query(
      `update public.users
       set ${fields.join(", ")}
       where id = $${i}
       returning id, username, email, password_hash as password, role`,
      values
    );
    return rows[0];
  }
}

// --- Singleton instance ---
export const storage = new DatabaseStorage(sharedPool);
