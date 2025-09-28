import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertCallSchema, insertProductSchema, insertTransactionSchema, insertUserSchema, updateUserSchema } from "@shared/schema";
import multer from "multer";
import Papa from "papaparse";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated() || req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  };

  // Products API
  app.get("/api/products", requireAuth, async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", requireAdmin, async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, updates);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // Calls API
  app.get("/api/calls", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        status: req.query.status as string,
        agentId: req.query.agentId as string,
        callType: req.query.callType as string,
        search: req.query.search as string,
      };

      // Filter out undefined values
      Object.keys(filters).forEach(key => 
        filters[key as keyof typeof filters] === undefined && delete filters[key as keyof typeof filters]
      );

      const calls = await storage.getAllCalls(filters);
      res.json(calls);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch calls" });
    }
  });

  app.post("/api/calls", requireAuth, async (req, res) => {
    try {
      const callData = insertCallSchema.parse(req.body);
      
      // Check for duplicates
      const duplicate = await storage.checkDuplicateCall(callData.phone, callData.date);
      if (duplicate) {
        return res.status(409).json({ message: "Duplicate call found for this phone number and date" });
      }

      const call = await storage.createCall(callData);
      res.status(201).json(call);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid call data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create call" });
    }
  });

  app.put("/api/calls/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertCallSchema.partial().parse(req.body);
      const call = await storage.updateCall(id, updates);
      
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }
      
      res.json(call);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid call data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update call" });
    }
  });

  app.post("/api/calls/:id/assign", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { agentId } = req.body;
      
      const call = await storage.assignCallToAgent(id, agentId);
      if (!call) {
        return res.status(404).json({ message: "Call not found" });
      }
      
      res.json(call);
    } catch (error) {
      res.status(500).json({ message: "Failed to assign call" });
    }
  });

  // CSV Import
  app.post("/api/calls/import", requireAdmin, upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file provided" });
      }

      const csvText = req.file.buffer.toString('utf8');
      const parsed = Papa.parse(csvText, { 
        header: true, 
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase()
      });

      if (parsed.errors.length > 0) {
        return res.status(400).json({ 
          message: "CSV parsing errors", 
          errors: parsed.errors 
        });
      }

      const results = {
        success: 0,
        errors: [] as any[],
        duplicates: 0
      };

      // Get active agents for round-robin assignment
      const agents = await storage.getAllAgents();
      let agentIndex = 0;

      for (let i = 0; i < parsed.data.length; i++) {
        try {
          const row = parsed.data[i] as any;
          
          // Map CSV columns to call data
          const callData = {
            date: new Date(row.date || row.DATE),
            customerName: row.name || row.NAME || '',
            phone: row.phone || row.PHONE || '',
            awb: row.awb || row.AWB || '',
            orderSku: row.order || row.ORDER || '',
            quantity: parseInt(row.qty || row.QTY || '1'),
            currentPrice: String(parseFloat(row.price || row.PRICE || '0')),
            shippingFee: String(parseFloat(row.sf || row.SF || '0')),
            address: row.address || row.ADDRESS || '',
            callType: 'confirmation' as const,
            agentId: agents.length > 0 ? agents[agentIndex % agents.length].id : null,
          };

          // Validate required fields
          if (!callData.customerName || !callData.phone || !callData.orderSku) {
            results.errors.push({
              row: i + 1,
              message: "Missing required fields (name, phone, order)",
              data: row
            });
            continue;
          }

          // Check for duplicates
          const duplicate = await storage.checkDuplicateCall(callData.phone, callData.date);
          if (duplicate) {
            results.duplicates++;
            continue;
          }

          await storage.createCall(callData);
          results.success++;
          agentIndex++;

        } catch (error) {
          results.errors.push({
            row: i + 1,
            message: error instanceof Error ? error.message : "Unknown error",
            data: parsed.data[i]
          });
        }
      }

      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Failed to import CSV" });
    }
  });

  // Transactions API
  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", requireAuth, async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(transactionData);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  // Call History API
  app.get("/api/calls/:id/history", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const history = await storage.getCallHistory(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch call history" });
    }
  });

  // Dashboard Analytics
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const agentId = req.user?.role === 'agent' ? req.user.id : req.query.agentId as string;
      const stats = await storage.getDashboardStats(agentId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/agent-performance", requireAuth, async (req, res) => {
    try {
      const performance = await storage.getAgentPerformance();
      res.json(performance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agent performance" });
    }
  });

  // Agents API (Admin only)
  app.get("/api/agents", requireAdmin, async (req, res) => {
    try {
      const agents = await storage.getAllAgents();
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  app.post("/api/agents", requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse({ ...req.body, role: 'agent' });
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create agent" });
    }
  });

  app.put("/api/agents/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(id, updates);
      
      if (!user) {
        return res.status(404).json({ message: "Agent not found" });
      }
      
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update agent" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
