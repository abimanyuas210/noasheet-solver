import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../../server/storage';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;
    
    if (typeof userId !== 'string') {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const screenshots = await storage.getScreenshotsByUserId(userId);
    return res.json(screenshots);
  } catch (error) {
    console.error('User screenshots API error:', error);
    return res.status(500).json({ error: 'Failed to fetch user screenshots' });
  }
}