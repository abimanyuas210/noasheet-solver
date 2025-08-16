import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';
import { insertScreenshotSchema } from '../../shared/schema';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      const validatedData = insertScreenshotSchema.parse(req.body);
      
      // Create screenshot record
      const screenshot = await storage.createScreenshot(validatedData);
      
      // For Vercel, we'll use a different approach for processing
      // Since we can't run long-running processes, we'll mark as processing
      // and handle via webhook or separate function
      await storage.updateScreenshot(screenshot.id, { status: 'processing' });
      
      return res.json(screenshot);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Screenshot API error:', error);
    if (error instanceof Error && error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    return res.status(500).json({ error: 'Failed to create screenshot request' });
  }
}