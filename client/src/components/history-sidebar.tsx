import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface HistorySidebarProps {
  screenshots: any[];
  stats: any;
  userId: string;
}

export default function HistorySidebar({ screenshots, stats, userId }: HistorySidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const clearHistoryMutation = useMutation({
    mutationFn: () => api.clearHistory(userId),
    onSuccess: () => {
      toast({
        title: "History cleared",
        description: "All screenshots have been removed from history.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/screenshots/recent"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear history. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleClearHistory = () => {
    clearHistoryMutation.mutate();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-emerald-600 bg-emerald-50";
      case "failed":
        return "text-red-600 bg-red-50";
      case "processing":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-slate-600 bg-slate-50";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Success";
      case "failed":
        return "Failed";
      case "processing":
        return "Processing";
      default:
        return "Pending";
    }
  };

  return (
    <>
      {/* History Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-slate-50 rounded-lg p-2">
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Recent Screenshots</h3>
            <p className="text-sm text-slate-500">Last 4 hours</p>
          </div>
        </div>

        <div className="space-y-4">
          {screenshots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">No screenshots yet</p>
              <p className="text-sm text-slate-400">Your recent screenshots will appear here</p>
            </div>
          ) : (
            screenshots.map((screenshot, index) => (
              <div 
                key={screenshot.id} 
                className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                data-testid={`card-screenshot-${index}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {screenshot.thumbnailPath && screenshot.status === "completed" ? (
                      <img 
                        src={screenshot.thumbnailPath} 
                        alt="Worksheet thumbnail" 
                        className="w-16 h-10 object-cover rounded border"
                        data-testid={`img-thumbnail-${index}`}
                      />
                    ) : (
                      <div className="w-16 h-10 bg-slate-100 rounded border flex items-center justify-center">
                        {screenshot.status === "failed" ? (
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
                          </svg>
                        ) : (
                          <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate" data-testid={`text-title-${index}`}>
                      {screenshot.title || "LiveWorksheet"}
                    </p>
                    <p className="text-xs text-slate-500 truncate" data-testid={`text-url-${index}`}>
                      {screenshot.url}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-slate-400" data-testid={`text-time-${index}`}>
                        {screenshot.createdAt ? new Date(screenshot.createdAt).toLocaleString() : ""}
                      </span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(screenshot.status)}`}>
                        {getStatusText(screenshot.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {screenshots.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <Button 
              variant="ghost" 
              onClick={handleClearHistory}
              disabled={clearHistoryMutation.isPending}
              className="w-full text-sm text-slate-500 hover:text-slate-700"
              data-testid="button-clear-history"
            >
              {clearHistoryMutation.isPending ? "Clearing..." : "Clear History"}
            </Button>
          </div>
        )}
      </div>

      {/* Statistics Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Statistics</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Total Screenshots</span>
            <span className="text-sm font-medium text-slate-900" data-testid="text-stats-total">
              {stats?.total || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Success Rate</span>
            <span className="text-sm font-medium text-emerald-600" data-testid="text-stats-success-rate">
              {stats?.successRate || 0}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Avg Processing</span>
            <span className="text-sm font-medium text-slate-900" data-testid="text-stats-avg-time">
              {stats?.avgTime || 0} min
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Active Users</span>
            <span className="text-sm font-medium text-slate-900" data-testid="text-stats-active-users">
              {stats?.activeUsers || 0}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
