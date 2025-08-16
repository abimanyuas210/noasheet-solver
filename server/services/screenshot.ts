import puppeteer from 'puppeteer';
import { storage } from '../storage';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

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
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--window-size=1920,1080',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images=false',
          '--disable-javascript=false'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        }
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

      // Set user agent to look like a real browser
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

      // Navigate to the URL with extended timeout
      console.log(`Navigating to: ${screenshot.url}`);
      await page.goto(screenshot.url, { 
        waitUntil: 'networkidle2',
        timeout: 60000 
      });

      // Wait for initial page load
      await page.waitForTimeout(3000);

      // Get page title
      const title = await page.title();
      console.log(`Page title: ${title}`);

      // Inject jQuery if not available and execute worksheet code
      await page.evaluate(() => {
        return new Promise<void>((resolve) => {
          const runWorksheetCode = () => {
            try {
              // Check if jQuery is available
              if (typeof jQuery !== 'undefined' || typeof $ !== 'undefined') {
                const jq = typeof jQuery !== 'undefined' ? jQuery : $;
                console.log('jQuery found, looking for worksheet-preview...');
                
                // Try to find the worksheet preview element
                const worksheetPreview = jq("#worksheet-preview");
                console.log('Worksheet preview elements found:', worksheetPreview.length);
                
                if (worksheetPreview.length > 0) {
                  // Check if worksheetPreview function exists
                  if (typeof worksheetPreview.worksheetPreview === 'function') {
                    console.log('Calling worksheetPreview function...');
                    worksheetPreview.worksheetPreview("validation", {
                      clicked: false,
                      showAnswers: true,
                      showRightAnswers: true
                    });
                    console.log('WorksheetPreview function called successfully');
                  } else {
                    console.log('worksheetPreview function not available');
                  }
                } else {
                  console.log('No worksheet-preview elements found');
                }
              } else {
                console.log('jQuery not found, attempting to load it...');
                // Try to load jQuery if not available
                const script = document.createElement('script');
                script.src = 'https://code.jquery.com/jquery-3.6.0.min.js';
                script.onload = () => {
                  console.log('jQuery loaded successfully');
                  setTimeout(runWorksheetCode, 1000);
                };
                document.head.appendChild(script);
                return;
              }
            } catch (error) {
              console.error('Error in worksheet code:', error);
            }
            resolve();
          };

          // Run immediately and also after a delay
          runWorksheetCode();
        });
      });

      // Wait for the answers to be displayed
      console.log('Waiting for answers to be displayed...');
      await page.waitForTimeout(4000);

      // Try to scroll to make sure we get the full page
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1000);
      
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(1000);

      // Create screenshots directory if it doesn't exist
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      await fs.mkdir(screenshotsDir, { recursive: true });

      console.log('Taking full page screenshot...');
      // Take full page screenshot
      const screenshotBuffer = await page.screenshot({
        fullPage: true,
        type: 'png',
        quality: 90
      });

      // Save screenshot
      const imagePath = path.join(screenshotsDir, `${screenshotId}.png`);
      await fs.writeFile(imagePath, screenshotBuffer);
      console.log(`Screenshot saved to: ${imagePath}`);

      // Create thumbnail using Sharp
      const thumbnailBuffer = await sharp(screenshotBuffer)
        .resize(400, 300, { 
          fit: 'cover',
          position: 'top'
        })
        .png()
        .toBuffer();

      const thumbnailPath = path.join(screenshotsDir, `${screenshotId}_thumb.png`);
      await fs.writeFile(thumbnailPath, thumbnailBuffer);
      console.log(`Thumbnail saved to: ${thumbnailPath}`);

      // Update screenshot record
      await storage.updateScreenshot(screenshotId, {
        status: 'completed',
        title: title || 'LiveWorksheet Screenshot',
        imagePath: `/screenshots/${screenshotId}.png`,
        thumbnailPath: `/screenshots/${screenshotId}_thumb.png`
      });

      console.log('Screenshot processing completed successfully');

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