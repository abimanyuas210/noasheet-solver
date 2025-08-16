import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ProcessingQueueProps {
  screenshotId: string;
}

export default function ProcessingQueue({ screenshotId }: ProcessingQueueProps) {
  const { data: queueItems } = useQuery({
    queryKey: ["/api/queue"],
    refetchInterval: 2000,
  });

  const { data: queueStatus } = useQuery({
    queryKey: ["/api/queue/status"],
    refetchInterval: 2000,
  });

  const currentItem = queueItems?.find((item: any) => item.screenshotId === screenshotId);
  const position = currentItem ? parseInt(currentItem.position) : 0;
  const estimatedTime = currentItem?.estimatedTime || "2.0 min";
  
  // Calculate progress (mock progress based on position)
  const totalQueue = queueStatus?.queueCount || 1;
  const progress = Math.max(10, ((totalQueue - position + 1) / totalQueue) * 100);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-900">Processing your screenshot...</p>
          <p className="text-sm text-slate-500">
            Position in queue: <span data-testid="text-queue-position">{position}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Est. wait time</p>
          <p className="text-lg font-semibold text-slate-900">
            <span data-testid="text-estimated-time">{estimatedTime}</span>
          </p>
        </div>
      </div>
      <div className="mt-4">
        <div className="bg-slate-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progress}%` }}
            data-testid="progress-bar"
          ></div>
        </div>
      </div>
    </div>
  );
}
