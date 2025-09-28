import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, decimal, boolean, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum('user_role', ['admin', 'agent']);
export const callStatusEnum = pgEnum('call_status', ['new', 'in_progress', 'called', 'unattended', 'completed']);
export const callTypeEnum = pgEnum('call_type', ['confirmation', 'promo']);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default('agent'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  units: integer("units").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const calls = pgTable("calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  awb: text("awb"),
  orderSku: text("order_sku").notNull(),
  quantity: integer("quantity").notNull().default(1),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull(),
  shippingFee: decimal("shipping_fee", { precision: 10, scale: 2 }),
  address: text("address"),
  status: callStatusEnum("status").notNull().default('new'),
  callType: callTypeEnum("call_type").notNull().default('confirmation'),
  agentId: varchar("agent_id").references(() => users.id),
  callStartedAt: timestamp("call_started_at"),
  callEndedAt: timestamp("call_ended_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // Original CSV data fields
  date: timestamp("date").notNull(),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  awb: text("awb"),
  orderSku: text("order_sku").notNull(),
  quantity: integer("quantity").notNull().default(1),
  currentPrice: decimal("current_price", { precision: 10, scale: 2 }).notNull(),
  shippingFee: decimal("shipping_fee", { precision: 10, scale: 2 }),
  address: text("address"),
  // Call management fields
  status: callStatusEnum("status").notNull().default('new'),
  callType: callTypeEnum("call_type").notNull().default('confirmation'),
  agentId: varchar("agent_id").references(() => users.id),
  callStartedAt: timestamp("call_started_at"),
  callEndedAt: timestamp("call_ended_at"),
  callRemarks: text("call_remarks"),
  // Upsell fields (nullable for original orders)
  originalOrderSku: text("original_order_sku"),
  originalPrice: decimal("original_price", { precision: 10, scale: 2 }),
  newOrderSku: text("new_order_sku"),
  newPrice: decimal("new_price", { precision: 10, scale: 2 }),
  revenue: decimal("revenue", { precision: 10, scale: 2 }),
  isUpsell: boolean("is_upsell").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const callHistory = pgTable("call_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: varchar("transaction_id").notNull().references(() => transactions.id),
  agentId: varchar("agent_id").notNull().references(() => users.id),
  action: text("action").notNull(), // 'started', 'ended', 'upsell_offered', 'upsell_accepted', 'upsell_declined'
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  calls: many(calls),
  transactions: many(transactions),
  callHistory: many(callHistory),
}));

export const callsRelations = relations(calls, ({ one, many }) => ({
  agent: one(users, {
    fields: [calls.agentId],
    references: [users.id],
  }),
  transactions: many(transactions),
  callHistory: many(callHistory),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  agent: one(users, {
    fields: [transactions.agentId],
    references: [users.id],
  }),
  callHistory: many(callHistory),
}));

export const callHistoryRelations = relations(callHistory, ({ one }) => ({
  transaction: one(transactions, {
    fields: [callHistory.transactionId],
    references: [transactions.id],
  }),
  agent: one(users, {
    fields: [callHistory.agentId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const updateUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  isActive: true,
}).partial();

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTransactionSchema = insertTransactionSchema.extend({
  callStartedAt: z.union([
    z.date(),
    z.string().datetime().transform(val => new Date(val))
  ]).optional(),
  callEndedAt: z.union([
    z.date(),
    z.string().datetime().transform(val => new Date(val))
  ]).optional(),
  date: z.union([
    z.date(),
    z.string().datetime().transform(val => new Date(val))
  ]).optional(),
}).partial();

export const insertCallHistorySchema = createInsertSchema(callHistory).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Call = typeof calls.$inferSelect;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type CallHistory = typeof callHistory.$inferSelect;
export type InsertCallHistory = z.infer<typeof insertCallHistorySchema>;
