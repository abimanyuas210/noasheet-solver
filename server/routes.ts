import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { screenshotService } from "./services/screenshot";
import { insertScreenshotSchema } from "@shared/schema";
import path from "path";
import express from "express";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static screenshot files
  app.use('/screenshots', express.static(path.join(process.cwd(), 'screenshots')));

  // Get recent screenshots (4 hour history)
  app.get("/api/screenshots/recent", async (req, res) => {
    try {
      const screenshots = await storage.getRecentScreenshots(4);
      res.json(screenshots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch screenshots" });
    }
  });

  // Get screenshots by user
  app.get("/api/screenshots/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const screenshots = await storage.getScreenshotsByUserId(userId);
      res.json(screenshots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user screenshots" });
    }
  });

  // Create new screenshot request
  app.post("/api/screenshots", async (req, res) => {
    try {
      const validatedData = insertScreenshotSchema.parse(req.body);
      
      // Create screenshot record
      const screenshot = await storage.createScreenshot(validatedData);
      
      // Add to processing queue
      await screenshotService.addToQueue(screenshot.id);
      
      res.json(screenshot);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(400).json({ error: "Invalid request data" });
      } else {
        res.status(500).json({ error: "Failed to create screenshot request" });
      }
    }
  });

  // Get screenshot by ID
  app.get("/api/screenshots/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const screenshot = await storage.getScreenshot(id);
      
      if (!screenshot) {
        return res.status(404).json({ error: "Screenshot not found" });
      }
      
      res.json(screenshot);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch screenshot" });
    }
  });

  // Get queue status
  app.get("/api/queue/status", async (req, res) => {
    try {
      const status = await screenshotService.getQueueStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch queue status" });
    }
  });

  // Get queue items
  app.get("/api/queue", async (req, res) => {
    try {
      const queueItems = await storage.getQueueItems();
      res.json(queueItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch queue items" });
    }
  });

  // Get statistics
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch statistics" });
    }
  });

  // Clear history
  app.delete("/api/screenshots/history", async (req, res) => {
    try {
      const { userId } = req.body;
      if (userId) {
        const userScreenshots = await storage.getScreenshotsByUserId(userId);
        for (const screenshot of userScreenshots) {
          await storage.deleteScreenshot(screenshot.id);
        }
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
