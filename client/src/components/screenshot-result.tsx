import { Button } from "@/components/ui/button";

interface ScreenshotResultProps {
  screenshot: any;
}

export default function ScreenshotResult({ screenshot }: ScreenshotResultProps) {
  const handleDownload = () => {
    if (screenshot?.imagePath) {
      const link = document.createElement('a');
      link.href = screenshot.imagePath;
      link.download = `screenshot-${screenshot.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShare = () => {
    if (screenshot?.imagePath) {
      navigator.clipboard.writeText(window.location.origin + screenshot.imagePath);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Latest Screenshot</h3>
        {screenshot?.status === "completed" && (
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleDownload}
              data-testid="button-download"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleShare}
              data-testid="button-share"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
              </svg>
            </Button>
          </div>
        )}
      </div>
      
      {screenshot?.status === "completed" ? (
        <div>
          <img 
            src={screenshot.imagePath} 
            alt="LiveWorksheet Screenshot" 
            className="w-full border rounded-lg shadow-sm"
            data-testid="img-screenshot"
          />
          <div className="mt-3 text-sm text-slate-500">
            <span data-testid="text-timestamp">
              {screenshot.createdAt ? new Date(screenshot.createdAt).toLocaleString() : ""}
            </span> • 
            <span data-testid="text-url" className="truncate">
              {screenshot.url}
            </span>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
          <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          <p className="text-slate-500">No screenshot yet</p>
          <p className="text-sm text-slate-400">Enter a LiveWorksheet URL above to get started</p>
        </div>
      )}
    </div>
  );
}
