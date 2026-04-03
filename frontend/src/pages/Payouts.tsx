import { useEffect, useState } from "react";
import { ArrowLeft, IndianRupee, CloudRain, MapPin, TrendingDown, Thermometer, AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";
import { getCurrentUser } from "@/lib/session";
import { getUserClaims, type ClaimRecord } from "@/lib/api";

const TRIGGER_META: Record<string, { label: string; icon: typeof CloudRain }> = {
  rainfall: { label: "Heavy Rain", icon: CloudRain },
  temperature: { label: "Extreme Heat", icon: Thermometer },
  demand_drop: { label: "Demand Drop", icon: TrendingDown },
  order_pause: { label: "Order Pause", icon: AlertTriangle },
  zone_anomaly: { label: "Zone Anomaly", icon: MapPin },
};

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
};

const Payouts = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const backendUserId = user?.backendUserId;

  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (backendUserId == null) {
      setLoading(false);
      return;
    }
    getUserClaims(backendUserId)
      .then((r) => setClaims(r.claims))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [backendUserId]);

  const approved = claims.filter((c) => c.status === "approved");
  const totalAll = approved.reduce((s, c) => s + c.payout_amount, 0);
  const now = new Date();
  const totalMonth = approved
    .filter((c) => {
      const d = new Date(c.timestamp);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, c) => s + c.payout_amount, 0);

  return (
    <MobileShell>
      <div className="px-4 pt-10 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-extrabold text-foreground tracking-tight">Your Payouts</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8 px-2">
          <div className="text-center">
            <p className="text-2xl font-extrabold text-foreground">
              ₹{Math.round(totalMonth).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-extrabold text-accent-green">
              ₹{Math.round(totalAll).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </div>
        </div>

        {/* Payout List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={28} className="animate-spin text-muted-foreground" />
          </div>
        ) : claims.length === 0 ? (
          <div className="text-center py-12">
            <IndianRupee size={32} className="mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No payouts yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Claims are auto-processed when a trigger fires
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...claims].reverse().map((c) => {
              const meta = TRIGGER_META[c.trigger_type ?? ""] ?? { label: c.trigger_type ?? "Claim", icon: AlertTriangle };
              const Icon = meta.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => navigate("/payout-detail", { state: { claim: c } })}
                  className="w-full rounded-xl px-4 py-3.5 flex items-center gap-3 hover:bg-secondary/60 transition-colors text-left"
                >
                  <Icon size={18} className={c.status === "approved" ? "text-accent-green flex-shrink-0" : "text-muted-foreground flex-shrink-0"} strokeWidth={1.5} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground">{meta.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      {fmtDate(c.timestamp)}{" "}
                      <span className={`ml-1 ${c.status === "approved" ? "text-accent-green" : c.status === "under_review" ? "text-warning" : "text-muted-foreground"}`}>
                        • {c.status === "approved" ? "Paid" : c.status === "under_review" ? "Review" : c.status}
                      </span>
                    </p>
                  </div>
                  <span className={`text-base font-extrabold ${c.status === "approved" ? "text-accent-green" : "text-muted-foreground"}`}>
                    {c.status === "approved" ? "+" : ""}₹{Math.round(c.payout_amount)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav active="History" />
    </MobileShell>
  );
};

export default Payouts;
