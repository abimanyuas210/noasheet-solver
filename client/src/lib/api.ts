import { apiRequest } from "./queryClient";

// Get base URL for API calls
const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5000';
};

export const api = {
  // Screenshots
  createScreenshot: (data: { url: string; userId: string }) =>
    apiRequest("POST", "/api/screenshots", data),
    
  getRecentScreenshots: () =>
    apiRequest("GET", "/api/screenshots/recent"),
    
  getUserScreenshots: (userId: string) =>
    apiRequest("GET", `/api/screenshots/user/${userId}`),
    
  getScreenshot: (id: string) =>
    apiRequest("GET", `/api/screenshots/${id}`),
    
  // Queue
  getQueueStatus: () =>
    apiRequest("GET", "/api/queue/status"),
    
  getQueue: () =>
    apiRequest("GET", "/api/queue"),
    
  // Stats
  getStats: () =>
    apiRequest("GET", "/api/stats"),
    
  // Clear history
  clearHistory: (userId?: string) =>
    apiRequest("DELETE", "/api/screenshots/history", { userId }),
};
