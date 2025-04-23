import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { registerReportRoutes } from "./routes/reports";
import { registerKnowledgeRoutes } from "./routes/knowledge";
import assistantRoutes from "./routes/assistant";
// Import agent debug routes directly
import agentDebugRoutes from "./routes/agent-debug-routes";
// Import goal tracking routes
import goalTrackingRoutes from "./routes/goal-tracking-routes";
import testGoalTrackingRoutes from "./routes/test-goal-tracking";
// Create debug-routes.ts file if it doesn't exist
import * as fs from 'fs';
import * as path from 'path';

// Debug routes will be registered dynamically if the file exists

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log("SERVER STARTUP: Beginning application initialization");
  
  console.log("STEP 1: Registering knowledge API routes");
  registerKnowledgeRoutes(app);
  
  console.log("STEP 2: Registering report API routes");
  registerReportRoutes(app);
  
  console.log("STEP 2.5: Registering assistant API routes");
  app.use('/api/assistant', assistantRoutes);
  
  console.log("STEP 3: Registering main API routes");
  const server = await registerRoutes(app);
  
  console.log("STEP 3.5: Registering debug API routes");
  
  // Direct registration of agent debug routes (imported at top)
  app.use('/api/debug/agent', agentDebugRoutes);
  console.log("Agent debug routes registered directly");
  
  // Register goal tracking routes
  app.use('/', goalTrackingRoutes);
  console.log("Goal tracking routes registered");
  
  // Register test goal tracking routes
  app.use('/api/debug', testGoalTrackingRoutes);
  console.log("Test goal tracking routes registered");
  
  try {
    // Import debug routes directly
    import('./routes/debug-routes.js').then(({ default: debugRouter }) => {
      app.use(debugRouter);
      console.log("Debug routes registered successfully");
    }).catch(err => {
      console.error("Error importing debug routes:", err);
    });
    
    // Import assistant debug routes
    import('./routes/debugAssistantRoutes.js').then(({ default: debugAssistantRouter }) => {
      app.use(debugAssistantRouter);
      console.log("Debug assistant routes registered successfully");
    }).catch(err => {
      console.error("Error importing debug assistant routes:", err);
    });
    
    // Import debug-assistant.ts router which contains the test-agent-query endpoint
    import('./routes/debug-assistant.js').then(({ default: debugAssistantRouter }) => {
      app.use('/api/debug/assistant', debugAssistantRouter);
      console.log("Debug assistant routes registered successfully");
    }).catch(err => {
      console.error("Error importing debug-assistant routes:", err);
    });
    
    // Register new structured debug routes
    import('./routes/debugRoutes.js').then(({ registerDebugAssistantRoutes }) => {
      registerDebugAssistantRoutes(app);
      console.log("Debug assistant routes registered successfully");
    }).catch(err => {
      console.error("Error importing debug routes:", err);
    });
  } catch (error) {
    console.error("Error registering debug routes:", error);
  }
  
  console.log("STEP 4: All routes registered successfully");

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Server error:", err);
    res.status(status).json({ message });
    // Don't throw the error again as it causes uncaught exceptions
    // throw err;
  });

  // Add a specific API prefix-checking middleware to ensure API routes are never 
  // handled by the catch-all route in vite.ts
  app.use((req, res, next) => {
    // If this is an API request that reached this middleware, it means
    // it wasn't handled by any of our API routes - return 404
    if (req.path.startsWith('/api/')) {
      console.error(`API route not found: ${req.method} ${req.path}`);
      return res.status(404).json({ 
        error: `API endpoint not found: ${req.path}`,
        message: "The requested API endpoint does not exist"
      });
    }
    // Otherwise continue to the catch-all route for client-side routing
    next();
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Try to serve the app on port 5000, which is what Replit workflow expects
  console.log("STEP 5: Starting server on port 5000");
  
  // Use a more direct approach to find an available port - try once for port 5000
  server.listen({
    port: 5000,
    host: "0.0.0.0"
  }, () => {
    console.log(`SUCCESS: Server is now listening on port 5000`);
    log(`serving on port 5000`);
  }).on('error', (err: any) => {
    console.error('CRITICAL ERROR: Server startup failed:', err);
    process.exit(1);
  });
})();
