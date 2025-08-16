import puppeteer from 'puppeteer';
import { storage } from '../storage';
import path from 'path';
import fs from 'fs/promises';

class ScreenshotService {
  private browser: any = null;
  private processingQueue: string[] = [];
  private isProcessing = false;

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920,1080'
        ]
      });
    }
    return this.browser;
  }

  async addToQueue(screenshotId: string): Promise<void> {
    this.processingQueue.push(screenshotId);
    
    // Create queue item
    await storage.createQueueItem({
      screenshotId,
      position: this.processingQueue.length.toString(),
      estimatedTime: (this.processingQueue.length * 2.5).toFixed(1) + ' min'
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const screenshotId = this.processingQueue.shift()!;

    try {
      await this.takeScreenshot(screenshotId);
    } catch (error) {
      console.error('Screenshot processing failed:', error);
      await storage.updateScreenshot(screenshotId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }

    // Remove from queue and continue processing
    const queueItems = await storage.getQueueItems();
    const queueItem = queueItems.find(item => item.screenshotId === screenshotId);
    if (queueItem) {
      await storage.removeQueueItem(queueItem.id);
    }

    // Process next item
    setTimeout(() => this.processQueue(), 1000);
  }

  private async takeScreenshot(screenshotId: string): Promise<void> {
    const screenshot = await storage.getScreenshot(screenshotId);
    if (!screenshot) {
      throw new Error('Screenshot not found');
    }

    // Update status to processing
    await storage.updateScreenshot(screenshotId, { status: 'processing' });

    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      // Set viewport for consistent screenshots
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate to the URL
      await page.goto(screenshot.url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // Wait a bit for dynamic content to load
      await page.waitForTimeout(2000);

      // Inject the jQuery code to show answers
      await page.evaluate(() => {
        // First check if jQuery is available
        if (typeof jQuery !== 'undefined' || typeof $ !== 'undefined') {
          const jq = typeof jQuery !== 'undefined' ? jQuery : $;
          
          // Try to find the worksheet preview element
          const worksheetPreview = jq("#worksheet-preview");
          if (worksheetPreview.length > 0 && typeof worksheetPreview.worksheetPreview === 'function') {
            worksheetPreview.worksheetPreview("validation", {
              clicked: false,
              showAnswers: true,
              showRightAnswers: true
            });
          }
        }
      });

      // Wait for the answers to be displayed
      await page.waitForTimeout(3000);

      // Get page title
      const title = await page.title();

      // Take full page screenshot
      const screenshotBuffer = await page.screenshot({
        fullPage: true,
        type: 'png'
      });

      // Create screenshots directory if it doesn't exist
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      await fs.mkdir(screenshotsDir, { recursive: true });

      // Save screenshot
      const imagePath = path.join(screenshotsDir, `${screenshotId}.png`);
      await fs.writeFile(imagePath, screenshotBuffer);

      // Create thumbnail
      const thumbnailBuffer = await page.screenshot({
        fullPage: false,
        type: 'png',
        clip: { x: 0, y: 0, width: 400, height: 300 }
      });

      const thumbnailPath = path.join(screenshotsDir, `${screenshotId}_thumb.png`);
      await fs.writeFile(thumbnailPath, thumbnailBuffer);

      // Update screenshot record
      await storage.updateScreenshot(screenshotId, {
        status: 'completed',
        title,
        imagePath: `/screenshots/${screenshotId}.png`,
        thumbnailPath: `/screenshots/${screenshotId}_thumb.png`
      });

    } catch (error) {
      console.error('Screenshot capture failed:', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  async getQueueStatus() {
    const queueItems = await storage.getQueueItems();
    const stats = await storage.getStats();
    
    return {
      queueCount: queueItems.length,
      avgWaitTime: stats.avgTime,
      activeUsers: stats.activeUsers
    };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const screenshotService = new ScreenshotService();
