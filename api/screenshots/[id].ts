import { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../../server/storage';

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
    const { id } = req.query;
    
    if (typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid screenshot ID' });
    }

    const screenshot = await storage.getScreenshot(id);
    
    if (!screenshot) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }
    
    return res.json(screenshot);
  } catch (error) {
    console.error('Screenshot by ID API error:', error);
    return res.status(500).json({ error: 'Failed to fetch screenshot' });
  }
}