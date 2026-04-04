import { useEffect, useState } from "react";
import { ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getRecentIMDAlerts, type IMDAlert } from "@/lib/api";

const badgeClass = (level: IMDAlert["alert_level"]) => {
  if (level === "red") return "bg-destructive/15 text-destructive border-destructive/30";
  if (level === "orange") return "bg-warning/15 text-warning border-warning/30";
  if (level === "yellow") return "bg-yellow-500/15 text-yellow-300 border-yellow-400/30";
  return "bg-accent-green/15 text-accent-green border-accent-green/30";
};

const AdminIMDAlerts = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<IMDAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAlerts = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getRecentIMDAlerts(50);
      setAlerts(data.alerts);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load IMD alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/admin")}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-xl font-bold">IMD Alerts History</h1>
              <p className="text-xs text-muted-foreground">Recent admin and RSS alerts</p>
            </div>
          </div>
          <button
            onClick={loadAlerts}
            className="h-10 px-4 rounded-xl bg-card border border-border text-sm font-semibold hover:bg-muted transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw size={14} /> Refresh
            </span>
          </button>
        </div>

        {loading ? (
          <div className="bg-card rounded-2xl p-6 border border-border text-sm text-muted-foreground">Loading alerts...</div>
        ) : error ? (
          <div className="bg-destructive/10 text-destructive rounded-2xl p-6 border border-destructive/20 text-sm">{error}</div>
        ) : alerts.length === 0 ? (
          <div className="bg-card rounded-2xl p-6 border border-border text-sm text-muted-foreground">No alerts found.</div>
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="grid grid-cols-5 gap-2 px-4 py-3 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Zone</span>
              <span>Level</span>
              <span>Event</span>
              <span>Source</span>
              <span>Time</span>
            </div>
            <div className="divide-y divide-border">
              {alerts.map((alert, index) => (
                <div key={`${alert.zone}-${alert.timestamp}-${index}`} className="grid grid-cols-5 gap-2 px-4 py-3 text-sm">
                  <span className="font-semibold capitalize">{alert.zone}</span>
                  <span>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase ${badgeClass(alert.alert_level)}`}>
                      {alert.alert_level}
                    </span>
                  </span>
                  <span className="capitalize">{alert.event}</span>
                  <span className="uppercase text-xs text-muted-foreground">{alert.source}</span>
                  <span className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground inline-flex items-center gap-2">
          <AlertTriangle size={12} />
          RSS duplicates within the dedup time window are skipped automatically.
        </div>
      </div>
    </div>
  );
};

export default AdminIMDAlerts;
