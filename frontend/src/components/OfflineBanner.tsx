import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-offline";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div className="offline-banner flex items-center justify-center gap-2">
      <WifiOff size={14} />
      <span>You're offline — showing cached data</span>
    </div>
  );
}

export function StaleIndicator({ isStale }: { isStale: boolean }) {
  if (!isStale) return null;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-[10px] font-bold w-fit">
      <WifiOff size={10} />
      <span>Cached data</span>
    </div>
  );
}
