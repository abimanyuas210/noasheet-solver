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
    const queueItems = await storage.getQueueItems();
    const stats = await storage.getStats();
    
    const status = {
      queueCount: queueItems.length,
      avgWaitTime: stats.avgTime,
      activeUsers: stats.activeUsers
    };
    
    return res.json(status);
  } catch (error) {
    console.error('Queue status API error:', error);
    return res.status(500).json({ error: 'Failed to fetch queue status' });
  }
}