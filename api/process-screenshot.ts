import { VercelRequest, VercelResponse } from '@vercel/node';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { storage } from '../server/storage';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

// Configure chromium for Vercel
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { screenshotId } = req.body;
  
  if (!screenshotId) {
    return res.status(400).json({ error: 'Screenshot ID is required' });
  }

  let browser = null;

  try {
    const screenshot = await storage.getScreenshot(screenshotId);
    if (!screenshot) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }

    // Update status to processing
    await storage.updateScreenshot(screenshotId, { status: 'processing' });

    // Launch browser with Vercel-optimized settings
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--hide-scrollbars',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
      ],
      defaultViewport: {
        width: 414,
        height: 896,
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Set mobile user agent
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );

    // Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['stylesheet', 'font', 'image', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log(`Navigating to: ${screenshot.url}`);
    await page.goto(screenshot.url, {
      waitUntil: 'domcontentloaded',
      timeout: 25000
    });

    // Wait for page to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get page title
    const title = await page.title();

    // Take screenshot
    const screenshotBuffer = await page.screenshot({
      fullPage: true,
      type: 'png'
    });

    // For Vercel, we'll store screenshots in a temporary location
    // In production, you'd want to use cloud storage like AWS S3, Cloudinary, etc.
    const screenshotsDir = '/tmp/screenshots';
    await fs.mkdir(screenshotsDir, { recursive: true });

    // Compress screenshot
    const compressedBuffer = await sharp(screenshotBuffer)
      .png({
        compressionLevel: 9,
        adaptiveFiltering: true,
        palette: true,
        quality: 80
      })
      .toBuffer();

    // Create thumbnail
    const thumbnailBuffer = await sharp(screenshotBuffer)
      .resize(400, 300, { 
        fit: 'cover',
        position: 'top'
      })
      .png()
      .toBuffer();

    // Save files temporarily (in production, upload to cloud storage)
    const imagePath = path.join(screenshotsDir, `${screenshotId}.png`);
    const thumbnailPath = path.join(screenshotsDir, `${screenshotId}_thumb.png`);
    
    await fs.writeFile(imagePath, compressedBuffer);
    await fs.writeFile(thumbnailPath, thumbnailBuffer);

    // Update screenshot record
    await storage.updateScreenshot(screenshotId, {
      status: 'completed',
      title: title || 'LiveWorksheet Screenshot',
      imagePath: `/screenshots/${screenshotId}.png`,
      thumbnailPath: `/screenshots/${screenshotId}_thumb.png`
    });

    return res.json({ 
      success: true, 
      screenshotId,
      message: 'Screenshot processed successfully'
    });

  } catch (error) {
    console.error('Screenshot processing error:', error);
    
    await storage.updateScreenshot(screenshotId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
    });

    return res.status(500).json({ 
      error: 'Screenshot processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}