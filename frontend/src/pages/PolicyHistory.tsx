import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, History } from "lucide-react";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";
import { getPolicyHistoryApi, type PolicyHistoryRecord } from "@/lib/api";
import { getCurrentUser } from "@/lib/session";
import { loadPolicyHistory, type PolicyHistoryEntry } from "@/lib/policy";

const formatDateTime = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const PolicyHistory = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const workerId = user?.backendUserId ?? null;

  const [items, setItems] = useState<Array<PolicyHistoryEntry | PolicyHistoryRecord>>([]);

  useEffect(() => {
    if (!user || !workerId) {
      navigate("/login");
      return;
    }

    let active = true;

    const load = async () => {
      const local = loadPolicyHistory(workerId);
      if (active) setItems(local);

      try {
        const remote = await getPolicyHistoryApi(workerId);
        if (!active || !remote.history?.length) return;
        setItems(remote.history);
      } catch {
        // Keep local history when backend endpoint is unavailable.
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [navigate, user, workerId]);

  const rows = useMemo(() => {
    return [...items].sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
  }, [items]);

  return (
    <MobileShell>
      <div className="md:flex-1 md:overflow-y-auto px-4 pt-10 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-extrabold text-foreground tracking-tight">Policy History</h1>
        </div>

        <div className="rounded-2xl border border-border/60 p-4">
          <div className="flex items-center gap-2 mb-4">
            <History size={16} className="text-muted-foreground" />
            <p className="text-sm font-semibold text-foreground">Lifecycle Events</p>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No policy events yet.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.id} className="rounded-xl bg-secondary/50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground uppercase">{row.action}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDateTime(row.timestamp)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{row.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav active="Profile" />
    </MobileShell>
  );
};

export default PolicyHistory;
