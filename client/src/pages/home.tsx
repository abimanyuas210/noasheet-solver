import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import ScreenshotForm from "@/components/screenshot-form";
import ProcessingQueue from "@/components/processing-queue";
import ScreenshotResult from "@/components/screenshot-result";
import HistorySidebar from "@/components/history-sidebar";
import ErrorModal from "@/components/error-modal";
import { api } from "@/lib/api";

export default function Home() {
  const [userId] = useState(() => `user_${Math.random().toString(36).substr(2, 9)}`);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentScreenshotId, setCurrentScreenshotId] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Query for queue status
  const { data: queueStatus, refetch: refetchQueueStatus } = useQuery({
    queryKey: ["/api/queue/status"],
    refetchInterval: 3000, // Poll every 3 seconds
  });

  // Query for recent screenshots
  const { data: recentScreenshots, refetch: refetchScreenshots } = useQuery({
    queryKey: ["/api/screenshots/recent"],
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Query for statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 10000, // Poll every 10 seconds
  });

  // Query for current screenshot if processing
  const { data: currentScreenshot } = useQuery({
    queryKey: ["/api/screenshots", currentScreenshotId],
    enabled: !!currentScreenshotId && isProcessing,
    refetchInterval: 2000, // Poll every 2 seconds while processing
  });

  // Check if current screenshot is completed
  useEffect(() => {
    if (currentScreenshot && currentScreenshot.status === "completed") {
      setIsProcessing(false);
      setCurrentScreenshotId(null);
      refetchScreenshots();
    } else if (currentScreenshot && currentScreenshot.status === "failed") {
      setIsProcessing(false);
      setCurrentScreenshotId(null);
      setErrorMessage(currentScreenshot.errorMessage || "Screenshot failed");
      setShowErrorModal(true);
    }
  }, [currentScreenshot, refetchScreenshots]);

  const handleScreenshotStart = (screenshotId: string) => {
    setCurrentScreenshotId(screenshotId);
    setIsProcessing(true);
    refetchQueueStatus();
  };

  const handleRetryScreenshot = () => {
    setShowErrorModal(false);
    // The form component will handle retry logic
  };

  const latestScreenshot = recentScreenshots?.[0];

  return (
    <div className="bg-slate-50 min-h-screen font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-500 rounded-lg p-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">LiveWorksheet Screenshot</h1>
                <p className="text-sm text-slate-500">Capture full-page screenshots with answer injection</p>
              </div>
            </div>
            
            {/* User Queue Status */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-slate-600">
                  Queue: <span data-testid="queue-count">{queueStatus?.queueCount || 0}</span> users
                </span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span className="text-slate-600">
                  Avg wait: <span data-testid="avg-wait-time">{queueStatus?.avgWaitTime || 0}</span>min
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <ScreenshotForm 
              userId={userId} 
              onScreenshotStart={handleScreenshotStart}
              disabled={isProcessing}
            />
            
            {isProcessing && currentScreenshotId && (
              <ProcessingQueue screenshotId={currentScreenshotId} />
            )}
            
            <ScreenshotResult screenshot={latestScreenshot} />
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <HistorySidebar 
              screenshots={recentScreenshots || []} 
              stats={stats}
              userId={userId}
            />
          </div>
        </div>
      </div>

      {/* Error Modal */}
      <ErrorModal
        show={showErrorModal}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
        onRetry={handleRetryScreenshot}
      />
    </div>
  );
}
