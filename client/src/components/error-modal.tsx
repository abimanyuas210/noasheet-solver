import { Button } from "@/components/ui/button";

interface ErrorModalProps {
  show: boolean;
  message: string;
  onClose: () => void;
  onRetry: () => void;
}

export default function ErrorModal({ show, message, onClose, onRetry }: ErrorModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" data-testid="modal-error">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-red-50 rounded-full p-2">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Screenshot Failed</h3>
        </div>
        <p className="text-slate-600 mb-6" data-testid="text-error-message">
          {message || "Unable to capture screenshot. The website may be blocking automated access or the URL is invalid."}
        </p>
        <div className="flex justify-end space-x-3">
          <Button 
            variant="ghost"
            onClick={onClose}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              onRetry();
              onClose();
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
            data-testid="button-retry"
          >
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
