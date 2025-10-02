import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

// Basic logger
function log(msg: string) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[express] ${msg}`);
}

const app = express();

// Core middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: "http://localhost:5173", credentials: true }));

// Register API routes
registerRoutes(app);

// Start server (no Vite integration here; frontend runs on :5173 separately)
const port = Number(process.env.PORT) || 5000;
const host = "127.0.0.1";

app.listen(port, host, () => {
  log(`serving on http://${host}:${port}`);
});
