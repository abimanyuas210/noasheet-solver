import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;
    
    if (userId) {
      const userScreenshots = await storage.getScreenshotsByUserId(userId);
      for (const screenshot of userScreenshots) {
        await storage.deleteScreenshot(screenshot.id);
      }
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Clear history API error:', error);
    return res.status(500).json({ error: 'Failed to clear history' });
  }
}