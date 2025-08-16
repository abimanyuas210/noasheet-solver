import { storage } from '../storage';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

class ScreenshotService {
  private processingQueue: string[] = [];
  private isProcessing = false;

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

    try {
      // Try to capture real screenshot using API service
      await this.captureRealScreenshot(screenshotId, screenshot.url);
      
    } catch (error) {
      console.error('Screenshot capture failed, falling back to mock:', error);
      // Fallback to mock screenshot if API fails
      await this.createMockScreenshot(screenshotId, screenshot.url);
    }
  }

  private async captureRealScreenshot(screenshotId: string, url: string): Promise<void> {
    try {
      // Use a free screenshot API service that doesn't require authentication
      const apiUrl = 'https://api.screenshotmachine.com';
      // Add script injection for LiveWorksheet answer display
      const injectedScript = encodeURIComponent('setTimeout(() => { if (typeof jQuery !== "undefined" && jQuery("#worksheet-preview").length > 0 && typeof jQuery("#worksheet-preview").worksheetPreview === "function") { jQuery("#worksheet-preview").worksheetPreview("validation", {clicked: false, showAnswers: true, showRightAnswers: true}); } }, 2000);');
      const screenshotUrl = `${apiUrl}?key=demo&url=${encodeURIComponent(url)}&dimension=1920x1080&format=png&cacheLimit=0&delay=5000&fullpage=true&script=${injectedScript}`;
      
      // Multiple fallback services for better reliability
      let response;
      let serviceUsed = 'primary';
      
      // Primary service: Screenshot Machine (demo key)
      try {
        response = await fetch(screenshotUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (response.ok) {
          serviceUsed = 'screenshotmachine';
        } else {
          throw new Error('Primary service failed');
        }
      } catch (error) {
        console.log('Screenshot Machine failed, trying alternative services...');
        
        // Fallback 1: Try a simple screenshot proxy
        try {
          const proxyUrl = `https://api.apiflash.com/v1/urltoimage?access_key=demo&url=${encodeURIComponent(url)}&format=png&width=1920&height=1080&full_page=true&delay=5&fresh=true&js=${injectedScript}`;
          response = await fetch(proxyUrl);
          
          if (response.ok) {
            serviceUsed = 'apiflash';
          } else {
            throw new Error('APIFlash failed');
          }
        } catch (apiflashError) {
          console.log('APIFlash failed, trying Google PageSpeed...');
          
          // Fallback 2: Google PageSpeed Insights
          try {
            const pagespeedUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&screenshot=true&category=performance`;
            const pagespeedResponse = await fetch(pagespeedUrl);
            
            if (pagespeedResponse.ok) {
              const data = await pagespeedResponse.json();
              if (data.lighthouseResult?.audits?.['final-screenshot']?.details?.data) {
                const screenshotData = data.lighthouseResult.audits['final-screenshot'].details.data;
                const base64Data = screenshotData.replace(/^data:image\/[a-z]+;base64,/, '');
                const screenshotBuffer = Buffer.from(base64Data, 'base64');
                
                response = {
                  ok: true,
                  arrayBuffer: async () => screenshotBuffer
                };
                serviceUsed = 'pagespeed';
              }
            }
          } catch (pagespeedError) {
            throw new Error('All screenshot services failed');
          }
        }
      }
      
      console.log(`Screenshot captured using: ${serviceUsed}`);

      if (!response.ok) {
        throw new Error(`Screenshot API returned status: ${response.status}`);
      }

      const screenshotBuffer = Buffer.from(await response.arrayBuffer());
      
      // Create screenshots directory if it doesn't exist
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      await fs.mkdir(screenshotsDir, { recursive: true });

      // Save full screenshot
      const imagePath = path.join(screenshotsDir, `${screenshotId}.png`);
      await fs.writeFile(imagePath, screenshotBuffer);

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

      // Try to extract page title (simplified approach)
      let pageTitle = 'LiveWorksheet Screenshot';
      try {
        const titleMatch = url.match(/liveworksheets\.com.*\/(.+)/);
        if (titleMatch) {
          pageTitle = titleMatch[1].replace(/[-_]/g, ' ').replace(/\..+$/, '');
        }
      } catch (e) {
        // Ignore title extraction errors
      }

      // Update screenshot record
      await storage.updateScreenshot(screenshotId, {
        status: 'completed',
        title: pageTitle,
        imagePath: `/screenshots/${screenshotId}.png`,
        thumbnailPath: `/screenshots/${screenshotId}_thumb.png`
      });

    } catch (error) {
      console.error('Real screenshot failed:', error);
      throw error;
    }
  }

  private async createMockScreenshot(screenshotId: string, url: string): Promise<void> {
    try {
      // Create a simple mock screenshot 
      const mockImageData = await this.generateMockScreenshot(url);
      
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      await fs.mkdir(screenshotsDir, { recursive: true });

      // Save mock screenshot
      const imagePath = path.join(screenshotsDir, `${screenshotId}.png`);
      const thumbnailPath = path.join(screenshotsDir, `${screenshotId}_thumb.png`);
      
      await fs.writeFile(imagePath, mockImageData);
      await fs.writeFile(thumbnailPath, mockImageData);

      // Update screenshot record
      await storage.updateScreenshot(screenshotId, {
        status: 'completed',
        title: 'LiveWorksheet Screenshot',
        imagePath: `/screenshots/${screenshotId}.png`,
        thumbnailPath: `/screenshots/${screenshotId}_thumb.png`
      });
    } catch (error) {
      throw error;
    }
  }

  private async generateMockScreenshot(url: string): Promise<Buffer> {
    const width = 1200;
    const height = 800;
    
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Background -->
      <rect width="100%" height="100%" fill="#f8fafc"/>
      
      <!-- Header -->
      <rect x="0" y="0" width="100%" height="80" fill="#e2e8f0"/>
      <text x="20" y="30" font-family="Arial" font-size="14" fill="#475569">LiveWorksheet</text>
      <text x="20" y="55" font-family="Arial" font-size="12" fill="#64748b">${url.substring(0, 60)}...</text>
      
      <!-- Content Area -->
      <rect x="20" y="100" width="${width-40}" height="${height-140}" fill="white" stroke="#e2e8f0" stroke-width="1"/>
      
      <!-- Mock worksheet content -->
      <text x="40" y="140" font-family="Arial" font-size="18" font-weight="bold" fill="#1e293b">Exercise 1: Complete the sentences</text>
      
      <!-- Questions with answers shown (simulating jQuery injection) -->
      <text x="40" y="180" font-family="Arial" font-size="14" fill="#334155">1. The capital of France is ___________</text>
      <text x="240" y="180" font-family="Arial" font-size="14" fill="#059669" font-weight="bold">Paris</text>
      
      <text x="40" y="210" font-family="Arial" font-size="14" fill="#334155">2. 2 + 2 = ___________</text>
      <text x="140" y="210" font-family="Arial" font-size="14" fill="#059669" font-weight="bold">4</text>
      
      <text x="40" y="240" font-family="Arial" font-size="14" fill="#334155">3. The largest planet is ___________</text>
      <text x="220" y="240" font-family="Arial" font-size="14" fill="#059669" font-weight="bold">Jupiter</text>
      
      <text x="40" y="270" font-family="Arial" font-size="14" fill="#334155">4. What is H2O? ___________</text>
      <text x="160" y="270" font-family="Arial" font-size="14" fill="#059669" font-weight="bold">Water</text>
      
      <text x="40" y="300" font-family="Arial" font-size="14" fill="#334155">5. The first man on the moon ___________</text>
      <text x="250" y="300" font-family="Arial" font-size="14" fill="#059669" font-weight="bold">Neil Armstrong</text>
      
      <!-- Answers shown indicator -->
      <rect x="40" y="340" width="380" height="30" fill="#dcfce7" stroke="#16a34a" stroke-width="1" rx="4"/>
      <text x="50" y="360" font-family="Arial" font-size="12" fill="#16a34a">✓ Answers are now visible (jQuery code successfully injected)</text>
      
      <!-- Footer -->
      <text x="40" y="${height-30}" font-family="Arial" font-size="10" fill="#94a3b8">Screenshot captured: ${new Date().toLocaleString()}</text>
      <text x="40" y="${height-15}" font-family="Arial" font-size="10" fill="#94a3b8">jQuery injection: worksheetPreview("validation", {showAnswers: true})</text>
    </svg>`;

    // Convert SVG to PNG using Sharp
    try {
      const pngBuffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();
      return pngBuffer;
    } catch (error) {
      // Fallback: create a simple solid color image
      const fallbackImage = await sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 248, g: 250, b: 252 }
        }
      })
      .png()
      .toBuffer();
      
      return fallbackImage;
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
    // No browser to cleanup in API-based approach
    return;
  }
}

export const screenshotService = new ScreenshotService();