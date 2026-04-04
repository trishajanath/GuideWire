import { useEffect, useState } from "react";
import { AlertTriangle, Clock, IndianRupee, MapPin, CloudRain, ArrowLeft, Loader2, CheckCircle2, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";
import FraudBreakdown from "@/components/FraudBreakdown";
import { getCurrentUser } from "@/lib/session";
import {
  getTriggerCheck,
  getWeatherRisk,
  autoClaim,
  assessFraud,
  ZONES,
  type TriggerCheck as TriggerCheckT,
  type WeatherRisk,
  type AutoClaimResult,
  type FraudAssessment,
} from "@/lib/api";

const TriggerAlert = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const zoneId = user?.zoneId ?? ZONES[0].id;
  const zoneName = ZONES.find((z) => z.id === zoneId)?.area ?? zoneId;

  const [trigger, setTrigger] = useState<TriggerCheckT | null>(null);
  const [risk, setRisk] = useState<WeatherRisk | null>(null);
  const [claimResult, setClaimResult] = useState<AutoClaimResult | null>(null);
  const [fraudData, setFraudData] = useState<FraudAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [autoClaimed, setAutoClaimed] = useState(false);
  const [showFraudDetails, setShowFraudDetails] = useState(false);

  const selectedPlan = user?.selectedPlan;
  const userId = user?.backendUserId;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [t, r] = await Promise.all([
          getTriggerCheck(zoneId),
          getWeatherRisk(zoneId),
        ]);
        if (cancelled) return;
        setTrigger(t);
        setRisk(r);

        // Fetch real-time fraud assessment
        if (userId) {
          try {
            const fraud = await assessFraud(userId, zoneId);
            if (!cancelled) setFraudData(fraud);
          } catch { /* non-blocking */ }
        }

        // Zero-touch auto-claim: if trigger is active, automatically file claim
        if (t.trigger && userId) {
          setAutoClaimed(true);
          setClaiming(true);
          try {
            const claim = await autoClaim(userId, 2 + t.severity * 2);
            if (!cancelled) {
              setClaimResult(claim);
              // Use fraud details from claim result if available
              if (claim.fraud_details) setFraudData(claim.fraud_details);
            }
          } catch {
            // Claim failed silently — user can retry
          } finally {
            if (!cancelled) setClaiming(false);
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, userId]);

  const handleManualClaim = async () => {
    if (!userId) return;
    setClaiming(true);
    try {
      const claim = await autoClaim(userId, 2);
      setClaimResult(claim);
      if (claim.fraud_details) setFraudData(claim.fraud_details);
    } catch {
      /* ignore */
    } finally {
      setClaiming(false);
    }
  };

  const isActive = trigger?.trigger === true;
  const triggerType = trigger?.type?.replace(/_/g, " ") ?? "Unknown";

  return (
    <MobileShell>
      <div className="px-4 pt-10 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-extrabold text-foreground tracking-tight">Active Trigger</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : !isActive ? (
          <div className="bg-accent-green/10 border border-accent-green/20 rounded-2xl p-6 text-center">
            <CheckCircle2 size={40} className="text-accent-green mx-auto mb-3" strokeWidth={1.5} />
            <h3 className="text-lg font-extrabold text-foreground mb-1">All Clear</h3>
            <p className="text-sm text-muted-foreground">No active triggers for {zoneName}</p>
          </div>
        ) : (
          <>
            {/* Alert Banner */}
            <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
              <AlertTriangle size={20} className="text-warning flex-shrink-0" strokeWidth={1.5} />
              <div>
                <h3 className="text-sm font-bold text-foreground">Trigger Active</h3>
                <p className="text-xs text-muted-foreground">Income disruption detected</p>
              </div>
            </div>

            {/* Event Card */}
            <div className="bg-card rounded-xl p-5 shadow-card border border-border/40 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <CloudRain size={20} className="text-muted-foreground" strokeWidth={1.5} />
                <div>
                  <h3 className="text-base font-bold text-foreground capitalize">{triggerType}</h3>
                  <p className="text-sm text-muted-foreground">{zoneName} Zone</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock size={14} /> Severity
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {((trigger?.severity ?? 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin size={14} /> Zone
                  </span>
                  <span className="text-sm font-semibold text-foreground">{zoneName}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle size={14} /> Risk Score
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {risk?.weather_risk_score ?? "--"}/100
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IndianRupee size={14} /> Estimated Payout
                  </span>
                  <span className="text-lg font-extrabold text-accent-green">
                    ₹{claimResult?.payout_amount ?? "--"}
                  </span>
                </div>
              </div>
            </div>

            {/* Auto-payout result */}
            {claiming ? (
              <div className="bg-foreground/5 rounded-2xl p-4 mb-6 text-center">
                <Loader2 size={20} className="animate-spin text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  Processing zero-touch claim...
                </p>
              </div>
            ) : claimResult ? (
              <div className={`rounded-2xl p-4 mb-6 text-center ${
                claimResult.status === "approved"
                  ? "bg-accent-green/10 border border-accent-green/30"
                  : "bg-warning/10 border border-warning/30"
              }`}>
                {claimResult.status === "approved" ? (
                  <>
                    <CheckCircle2 size={28} className="text-accent-green mx-auto mb-2" />
                    <p className="text-lg font-extrabold text-accent-green mb-1">
                      ₹{claimResult.payout_amount} Credited
                    </p>
                    <p className="text-xs text-muted-foreground">{claimResult.message}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <Zap size={12} className="text-accent-green" strokeWidth={1.5} />
                      <span className="text-[10px] font-bold text-accent-green">Zero-touch · Auto-processed</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Shield size={28} className="text-warning mx-auto mb-2" />
                    <p className="text-sm font-bold text-foreground mb-1">
                      Claim {claimResult.status === "under review" ? "Under Review" : "Processed"}
                    </p>
                    <p className="text-xs text-muted-foreground">{claimResult.message}</p>
                    {claimResult.fraud_score > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Fraud score: {(claimResult.fraud_score * 100).toFixed(0)}%
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="bg-accent-green/10 rounded-2xl p-4 mb-6 text-center">
                <p className="text-sm font-semibold text-accent-green">
                  Payout will be credited automatically
                </p>
              </div>
            )}

            {!claimResult && !claiming && userId && (
              <Button
                onClick={handleManualClaim}
                className="w-full h-14 text-base font-bold rounded-2xl bg-foreground border-0 text-background hover:bg-foreground/90 mb-4"
              >
                Claim Now
              </Button>
            )}

            {/* Fraud Analysis Section */}
            {fraudData && (
              <div className="mb-4">
                <FraudBreakdown assessment={fraudData} compact={!showFraudDetails} />
                <button
                  onClick={() => setShowFraudDetails((v) => !v)}
                  className="w-full mt-2 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-xl bg-white/5 active:bg-white/10"
                >
                  {showFraudDetails ? "Hide fraud details" : "Show 5-layer fraud analysis →"}
                </button>
              </div>
            )}

            <Button
              onClick={() => navigate("/payouts")}
              variant="outline"
              className="w-full h-14 text-base font-bold rounded-2xl"
            >
              View Payout History
            </Button>
          </>
        )}
      </div>
      <BottomNav active="Alerts" />
    </MobileShell>
  );
};

export default TriggerAlert;
