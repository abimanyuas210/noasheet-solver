import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const screenshots = pgTable("screenshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  title: text("title"),
  imagePath: text("image_path"),
  thumbnailPath: text("thumbnail_path"),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  userId: text("user_id"), // for multi-user support
});

export const queueItems = pgTable("queue_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  screenshotId: varchar("screenshot_id").notNull(),
  position: text("position").notNull(),
  estimatedTime: text("estimated_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScreenshotSchema = createInsertSchema(screenshots).pick({
  url: true,
  userId: true,
});

export const insertQueueItemSchema = createInsertSchema(queueItems).pick({
  screenshotId: true,
  position: true,
  estimatedTime: true,
});

export type InsertScreenshot = z.infer<typeof insertScreenshotSchema>;
export type Screenshot = typeof screenshots.$inferSelect;
export type InsertQueueItem = z.infer<typeof insertQueueItemSchema>;
export type QueueItem = typeof queueItems.$inferSelect;
