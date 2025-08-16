import { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs/promises';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { file } = req.query;
    
    if (typeof file !== 'string') {
      return res.status(400).json({ error: 'Invalid file parameter' });
    }

    // Security check - only allow PNG files and prevent directory traversal
    if (!file.endsWith('.png') || file.includes('..') || file.includes('/')) {
      return res.status(400).json({ error: 'Invalid file name' });
    }

    const filePath = path.join(process.cwd(), 'screenshots', file);
    
    try {
      const fileBuffer = await fs.readFile(filePath);
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      
      return res.send(fileBuffer);
    } catch (fileError) {
      return res.status(404).json({ error: 'Screenshot not found' });
    }
  } catch (error) {
    console.error('Serve screenshot error:', error);
    return res.status(500).json({ error: 'Failed to serve screenshot' });
  }
}