import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

interface QueueItem {
  url: string;
  outputPath: string;
  resolve: (result: boolean) => void;
  reject: (error: Error) => void;
}

class OptimizedScreenshotService {
  private browser: Browser | null = null;
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private maxConcurrency = 3; // Limit concurrent pages
  private activePages = 0;
  private browserRestarts = 0;
  private maxBrowserRestarts = 3;

  // Mobile user agents
  private mobileUserAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  ];

  private getRandomMobileUserAgent(): string {
    return this.mobileUserAgents[Math.floor(Math.random() * this.mobileUserAgents.length)];
  }

  private async initBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    console.log('🚀 Launching optimized browser for Replit...');
    
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          // Security flags
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          
          // Performance flags
          '--disable-gpu',
          '--disable-audio-output',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI,VizDisplayCompositor',
          
          // Memory optimization
          '--memory-pressure-off',
          '--max_old_space_size=4096',
          
          // Disable heavy features
          '--disable-web-security',
          '--disable-features=AudioServiceOutOfProcess',
          '--disable-webgl',
          '--disable-webgl2',
          '--disable-3d-apis',
          '--disable-accelerated-2d-canvas',
          '--disable-accelerated-jpeg-decoding',
          '--disable-accelerated-mjpeg-decode',
          '--disable-accelerated-video-decode',
          '--disable-accelerated-video-encode',
          
          // Mobile optimization
          '--single-process',
          '--no-zygote',
          '--no-first-run',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-images',
          '--disable-javascript', // We'll enable only when needed
          
          // Reduce resource usage
          '--aggressive-cache-discard',
          '--enable-low-res-tiling'
        ],
        ignoreDefaultArgs: ['--disable-extensions', '--enable-automation'],
        timeout: 30000,
        defaultViewport: {
          width: 414,  // iPhone 14 Pro width
          height: 896, // iPhone 14 Pro height
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true
        }
      });

      this.browserRestarts = 0;
      console.log('✅ Browser launched successfully');
      
      // Auto-cleanup browser on process exit
      process.on('SIGTERM', () => this.cleanup());
      process.on('SIGINT', () => this.cleanup());
      
      return this.browser;
    } catch (error) {
      console.error('❌ Failed to launch browser:', error);
      throw error;
    }
  }

  private async handleBrowserCrash(): Promise<void> {
    console.log('⚠️ Browser crashed, attempting restart...');
    
    if (this.browserRestarts >= this.maxBrowserRestarts) {
      throw new Error(`Browser crashed ${this.maxBrowserRestarts} times, giving up`);
    }
    
    this.browserRestarts++;
    this.browser = null;
    
    // Wait a bit before restarting
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await this.initBrowser();
      console.log('✅ Browser restarted successfully');
    } catch (error) {
      console.error('❌ Failed to restart browser:', error);
      throw error;
    }
  }

  public async takeScreenshot(url: string, outputPath: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, outputPath, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && this.activePages < this.maxConcurrency) {
      const item = this.queue.shift()!;
      this.activePages++;
      
      // Process in background without blocking queue
      this.processScreenshot(item).finally(() => {
        this.activePages--;
        // Continue processing if queue has more items
        if (this.queue.length > 0) {
          this.processQueue();
        }
      });
    }

    this.isProcessing = false;
  }

  private async processScreenshot({ url, outputPath, resolve, reject }: QueueItem): Promise<void> {
    let page: Page | null = null;
    
    try {
      const browser = await this.initBrowser();
      page = await browser.newPage();
      
      // Set mobile user agent
      const userAgent = this.getRandomMobileUserAgent();
      await page.setUserAgent(userAgent);
      console.log(`📱 Using mobile UA: ${userAgent.split(')')[0]})`);
      
      // Enable JavaScript for this page
      await page.setJavaScriptEnabled(true);
      
      // Set mobile viewport
      await page.setViewport({
        width: 414,
        height: 896,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      });

      // Block unnecessary resources to save bandwidth
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['stylesheet', 'font', 'image', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      console.log(`📄 Navigating to: ${url}`);
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });

      // Wait for page to stabilize
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('📸 Taking mobile screenshot...');
      const screenshotBuffer = await page.screenshot({
        fullPage: true,
        type: 'png'
      });

      // Create output directory if it doesn't exist
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Compress screenshot using Sharp
      const compressedBuffer = await sharp(screenshotBuffer)
        .png({
          compressionLevel: 9,
          adaptiveFiltering: true,
          palette: true,
          quality: 80
        })
        .toBuffer();

      // Save compressed screenshot
      await fs.writeFile(outputPath, compressedBuffer);
      
      const originalSize = screenshotBuffer.length;
      const compressedSize = compressedBuffer.length;
      const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
      
      console.log(`✅ Screenshot saved: ${outputPath}`);
      console.log(`💾 Size: ${originalSize} → ${compressedSize} bytes (${compressionRatio}% smaller)`);
      
      resolve(true);
      
    } catch (error) {
      console.error(`❌ Screenshot failed for ${url}:`, error);
      
      // Handle browser crash
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Protocol error') || errorMessage.includes('Session closed')) {
        try {
          await this.handleBrowserCrash();
          // Retry once after restart
          return this.processScreenshot({ url, outputPath, resolve, reject });
        } catch (restartError) {
          reject(new Error(`Browser restart failed: ${restartError instanceof Error ? restartError.message : String(restartError)}`));
          return;
        }
      }
      
      reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (closeError) {
          console.error('Failed to close page:', closeError);
        }
      }
    }
  }

  public async getStatus() {
    return {
      queueLength: this.queue.length,
      activePages: this.activePages,
      maxConcurrency: this.maxConcurrency,
      browserConnected: this.browser?.connected || false,
      browserRestarts: this.browserRestarts
    };
  }

  public async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up screenshot service...');
    
    if (this.browser) {
      try {
        await this.browser.close();
        console.log('✅ Browser closed');
      } catch (error) {
        console.error('Error closing browser:', error);
      } finally {
        this.browser = null;
      }
    }
    
    // Clear queue
    this.queue.forEach(item => {
      item.reject(new Error('Service is shutting down'));
    });
    this.queue = [];
  }
}

// Export singleton instance
export const screenshotService = new OptimizedScreenshotService();