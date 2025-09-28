import { 
  users, calls, products, transactions, callHistory,
  type User, type InsertUser, type Call, type InsertCall,
  type Product, type InsertProduct, type Transaction, type InsertTransaction,
  type CallHistory, type InsertCallHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, gte, lte, sql, count, sum } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  getAllAgents(): Promise<User[]>;

  // Products
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined>;

  // Calls
  getAllCalls(filters?: CallFilters): Promise<Call[]>;
  getCall(id: string): Promise<Call | undefined>;
  createCall(call: InsertCall): Promise<Call>;
  updateCall(id: string, updates: Partial<InsertCall>): Promise<Call | undefined>;
  assignCallToAgent(callId: string, agentId: string): Promise<Call | undefined>;
  getCallsByAgent(agentId: string): Promise<Call[]>;
  checkDuplicateCall(phone: string, date: Date): Promise<Call | undefined>;

  // Transactions
  getAllTransactions(): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByCall(callId: string): Promise<Transaction[]>;
  getTransactionsByAgent(agentId: string): Promise<Transaction[]>;

  // Call History
  getCallHistory(callId: string): Promise<CallHistory[]>;
  addCallHistory(history: InsertCallHistory): Promise<CallHistory>;

  // Analytics
  getDashboardStats(agentId?: string): Promise<DashboardStats>;
  getAgentPerformance(): Promise<AgentPerformance[]>;

  sessionStore: any;
}

export interface CallFilters {
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  agentId?: string;
  callType?: string;
  search?: string;
}

export interface DashboardStats {
  totalCallsToday: number;
  successfulUpsells: number;
  revenueToday: number;
  conversionRate: number;
  callsByStatus: { status: string; count: number }[];
  revenueByDay: { date: string; revenue: number }[];
}

export interface AgentPerformance {
  agent: User;
  callsHandled: number;
  upsellsClosed: number;
  conversionRate: number;
  revenue: number;
  averageHandlingTime: number;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getAllAgents(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'agent')).orderBy(asc(users.username));
  }

  // Products
  async getAllProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(asc(products.sku));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    return product || undefined;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return product || undefined;
  }

  // Calls
  async getAllCalls(filters?: CallFilters): Promise<Call[]> {
    let query = db.select().from(calls);
    
    const conditions = [];
    
    if (filters?.dateFrom) {
      conditions.push(gte(calls.date, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(calls.date, filters.dateTo));
    }
    if (filters?.status) {
      conditions.push(eq(calls.status, filters.status as any));
    }
    if (filters?.agentId) {
      conditions.push(eq(calls.agentId, filters.agentId));
    }
    if (filters?.callType) {
      conditions.push(eq(calls.callType, filters.callType as any));
    }
    if (filters?.search) {
      conditions.push(sql`${calls.customerName} ILIKE ${`%${filters.search}%`} OR ${calls.phone} ILIKE ${`%${filters.search}%`}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(calls.date));
  }

  async getCall(id: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call || undefined;
  }

  async createCall(call: InsertCall): Promise<Call> {
    const [newCall] = await db.insert(calls).values(call).returning();
    return newCall;
  }

  async updateCall(id: string, updates: Partial<InsertCall>): Promise<Call | undefined> {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };
    const [call] = await db.update(calls).set(updateData).where(eq(calls.id, id)).returning();
    return call || undefined;
  }

  async assignCallToAgent(callId: string, agentId: string): Promise<Call | undefined> {
    return await this.updateCall(callId, { agentId });
  }

  async getCallsByAgent(agentId: string): Promise<Call[]> {
    return await db.select().from(calls).where(eq(calls.agentId, agentId)).orderBy(desc(calls.date));
  }

  async checkDuplicateCall(phone: string, date: Date): Promise<Call | undefined> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [call] = await db.select().from(calls)
      .where(and(
        eq(calls.phone, phone),
        gte(calls.date, dayStart),
        lte(calls.date, dayEnd)
      ));
    return call || undefined;
  }

  // Transactions
  async getAllTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(desc(transactions.createdAt));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getTransactionsByCall(callId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.callId, callId));
  }

  async getTransactionsByAgent(agentId: string): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.agentId, agentId)).orderBy(desc(transactions.createdAt));
  }

  // Call History
  async getCallHistory(callId: string): Promise<CallHistory[]> {
    return await db.select().from(callHistory).where(eq(callHistory.callId, callId)).orderBy(desc(callHistory.createdAt));
  }

  async addCallHistory(history: InsertCallHistory): Promise<CallHistory> {
    const [newHistory] = await db.insert(callHistory).values(history).returning();
    return newHistory;
  }

  // Analytics
  async getDashboardStats(agentId?: string): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Base conditions
    const baseConditions = [
      gte(calls.date, today),
      lte(calls.date, tomorrow)
    ];

    if (agentId) {
      baseConditions.push(eq(calls.agentId, agentId));
    }

    // Total calls today
    const [callsResult] = await db.select({ count: count() })
      .from(calls)
      .where(and(...baseConditions));

    // Successful upsells today
    const [upsellsResult] = await db.select({ count: count() })
      .from(transactions)
      .leftJoin(calls, eq(transactions.callId, calls.id))
      .where(and(
        gte(transactions.createdAt, today),
        lte(transactions.createdAt, tomorrow),
        eq(transactions.isUpsell, true),
        ...(agentId ? [eq(transactions.agentId, agentId)] : [])
      ));

    // Revenue today
    const [revenueResult] = await db.select({ 
      total: sum(transactions.revenue) 
    })
      .from(transactions)
      .leftJoin(calls, eq(transactions.callId, calls.id))
      .where(and(
        gte(transactions.createdAt, today),
        lte(transactions.createdAt, tomorrow),
        ...(agentId ? [eq(transactions.agentId, agentId)] : [])
      ));

    // Calls by status
    const statusResults = await db.select({
      status: calls.status,
      count: count()
    })
      .from(calls)
      .where(and(...baseConditions))
      .groupBy(calls.status);

    // Revenue by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const revenueByDay = await db.select({
      date: sql<string>`DATE(${transactions.createdAt})`,
      revenue: sum(transactions.revenue)
    })
      .from(transactions)
      .where(and(
        gte(transactions.createdAt, sevenDaysAgo),
        ...(agentId ? [eq(transactions.agentId, agentId)] : [])
      ))
      .groupBy(sql`DATE(${transactions.createdAt})`)
      .orderBy(sql`DATE(${transactions.createdAt})`);

    const totalCallsToday = callsResult.count || 0;
    const successfulUpsells = upsellsResult.count || 0;
    const conversionRate = totalCallsToday > 0 ? (successfulUpsells / totalCallsToday) * 100 : 0;

    return {
      totalCallsToday,
      successfulUpsells,
      revenueToday: Number(revenueResult.total) || 0,
      conversionRate: Math.round(conversionRate * 100) / 100,
      callsByStatus: statusResults.map(r => ({ status: r.status, count: r.count })),
      revenueByDay: revenueByDay.map(r => ({ 
        date: r.date, 
        revenue: Number(r.revenue) || 0 
      }))
    };
  }

  async getAgentPerformance(): Promise<AgentPerformance[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const agentStats = await db.select({
      agentId: users.id,
      username: users.username,
      role: users.role,
      callsHandled: count(calls.id),
      upsellsClosed: sql<number>`COUNT(CASE WHEN ${transactions.isUpsell} = true THEN 1 END)`,
      revenue: sum(transactions.revenue),
      avgHandlingTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${calls.callEndedAt} - ${calls.callStartedAt})) / 60)`,
    })
      .from(users)
      .leftJoin(calls, eq(users.id, calls.agentId))
      .leftJoin(transactions, eq(calls.id, transactions.callId))
      .where(and(
        eq(users.role, 'agent'),
        eq(users.isActive, true)
      ))
      .groupBy(users.id, users.username, users.role)
      .orderBy(desc(sql`COUNT(${transactions.id})`));

    return agentStats.map(stat => ({
      agent: {
        id: stat.agentId,
        username: stat.username,
        role: stat.role,
      } as User,
      callsHandled: stat.callsHandled || 0,
      upsellsClosed: Number(stat.upsellsClosed) || 0,
      conversionRate: stat.callsHandled > 0 ? 
        Math.round((Number(stat.upsellsClosed) / stat.callsHandled) * 10000) / 100 : 0,
      revenue: Number(stat.revenue) || 0,
      averageHandlingTime: Math.round((Number(stat.avgHandlingTime) || 0) * 100) / 100,
    }));
  }
}

export const storage = new DatabaseStorage();
