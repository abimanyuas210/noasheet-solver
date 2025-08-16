import { apiRequest } from "./queryClient";

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
