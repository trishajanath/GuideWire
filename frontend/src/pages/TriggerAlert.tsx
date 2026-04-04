import { useEffect, useState } from "react";
import { AlertTriangle, IndianRupee, CloudRain, ArrowLeft, Loader2, CheckCircle2, Zap, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BottomNav from "@/components/BottomNav";
import FraudBreakdown from "@/components/FraudBreakdown";
import FraudDemo from "@/components/FraudDemo";
import TriggerLab from "@/components/TriggerLab";
import { getCurrentUser } from "@/lib/session";
import {
  getTriggerCheck,
  getWeatherRisk,
  getIMDAlert,
  evaluateClaimEngine,
  assessFraud,
  ZONES,
  type TriggerCheck as TriggerCheckT,
  type WeatherRisk,
  type ClaimEvaluateResult,
  type FraudAssessment,
  type IMDAlert,
} from "@/lib/api";

const CLAIM_ZONE_CENTERS: Record<string, { lat: number; lon: number }> = {
  koramangala_blr: { lat: 12.9352, lon: 77.6245 },
  indiranagar_blr: { lat: 12.9784, lon: 77.6408 },
  whitefield_blr: { lat: 12.9698, lon: 77.75 },
  hsr_layout_blr: { lat: 12.9116, lon: 77.6472 },
  electronic_city_blr: { lat: 12.8456, lon: 77.6603 },
  coimbatore_gandhipuram: { lat: 11.0168, lon: 76.9558 },
  coimbatore_rs_puram: { lat: 11.012, lon: 76.949 },
  coimbatore_peelamedu: { lat: 11.025, lon: 77.002 },
  coimbatore_saibaba_colony: { lat: 11.021, lon: 76.965 },
  coimbatore_race_course: { lat: 11.0008, lon: 76.962 },
};

const CITY_CENTER: Record<string, { lat: number; lon: number }> = {
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  coimbatore: { lat: 11.0168, lon: 76.9558 },
  mumbai: { lat: 19.076, lon: 72.8777 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kochi: { lat: 9.9312, lon: 76.2673 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  hyderabad: { lat: 17.385, lon: 78.4867 },
  delhi: { lat: 28.6139, lon: 77.209 },
};

const getClaimGps = (zoneId: string, city: string) => {
  const zone = CLAIM_ZONE_CENTERS[zoneId];
  if (zone) return zone;
  return CITY_CENTER[city.trim().toLowerCase()] ?? CITY_CENTER.bengaluru;
};

const TriggerAlert = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const zoneId = user?.zoneId ?? ZONES[0].id;
  const city = user?.city ?? "bengaluru";
  const zoneName = user?.zoneArea ?? ZONES.find((z) => z.id === zoneId)?.area ?? zoneId;

  const [trigger, setTrigger] = useState<TriggerCheckT | null>(null);
  const [risk, setRisk] = useState<WeatherRisk | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimEvaluateResult | null>(null);
  const [fraudData, setFraudData] = useState<FraudAssessment | null>(null);
  const [imdAlert, setImdAlert] = useState<IMDAlert | null>(null);
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

        try {
          const imd = await getIMDAlert(city);
          if (!cancelled) setImdAlert(imd);
        } catch {
          if (!cancelled) setImdAlert(null);
        }

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
            const gps = getClaimGps(zoneId, city);
            const claim = await evaluateClaimEngine({
              worker_id: userId,
              zone_id: zoneId,
              city,
              gps_lat: gps.lat,
              gps_lon: gps.lon,
              hours_lost: 2 + t.severity * 2,
              app_active: true,
            });
            if (!cancelled) {
              setClaimResult(claim);
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
      const gps = getClaimGps(zoneId, city);
      const claim = await evaluateClaimEngine({
        worker_id: userId,
        zone_id: zoneId,
        city,
        gps_lat: gps.lat,
        gps_lon: gps.lon,
        hours_lost: 2,
        app_active: true,
      });
      setClaimResult(claim);
    } catch {
      /* ignore */
    } finally {
      setClaiming(false);
    }
  };

  const imdRed = imdAlert?.alert_level === "red";
  const isActive = imdRed || trigger?.trigger === true;
  const triggerType = imdRed
    ? `imd ${imdAlert?.event ?? "alert"}`
    : trigger?.type?.replace(/_/g, " ") ?? "Unknown";
  const firstFired = claimResult?.trigger_list?.find((item) => item.fired);

  return (
    <div className="min-h-screen bg-neutral-950 flex items-start justify-center gap-6 p-0 md:p-6">
      {/* ─── Phone frame (left) ─── */}
      <div className="relative w-full max-w-md md:max-w-[390px] min-h-screen md:min-h-0 md:h-[844px] md:rounded-[3rem] md:border-[5px] md:border-neutral-800 md:shadow-[0_0_80px_rgba(0,0,0,0.8),inset_0_0_0_1px_rgba(255,255,255,0.04)] md:overflow-hidden flex-shrink-0">
        {/* Dynamic Island */}
        <div className="hidden md:flex absolute top-[10px] left-1/2 -translate-x-1/2 w-[126px] h-[36px] bg-black rounded-[20px] z-50 items-center justify-center">
          <div className="w-[10px] h-[10px] rounded-full bg-neutral-900 border border-neutral-800" />
        </div>
        {/* Home indicator */}
        <div className="hidden md:block absolute bottom-[8px] left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-neutral-700 rounded-full z-50" />
        {/* Content */}
        <div className="w-full min-h-screen md:min-h-0 md:h-full bg-background overflow-y-auto relative">
      <div className="md:flex-1 md:overflow-y-auto px-4 pt-10 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-extrabold text-foreground tracking-tight">Alerts</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : !isActive ? (
          <>
            {/* All clear — flat card */}
            <div className="card-premium rounded-2xl p-6 text-center mb-6">
              <CheckCircle2 size={32} className="text-accent-green mx-auto mb-3" strokeWidth={1.5} />
              <h3 className="text-base font-extrabold text-foreground mb-1">All Clear</h3>
              <p className="text-sm text-muted-foreground">No active triggers for {zoneName}</p>
            </div>
          </>
        ) : (
          <>
            {/* Status banner — minimal */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <p className="text-sm font-semibold text-foreground">Trigger active · income disruption detected</p>
            </div>

            {/* Event hero */}
            <div className="card-premium rounded-2xl p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-foreground capitalize">{triggerType}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{zoneName} Zone</p>
                </div>
                <CloudRain size={24} className="text-muted-foreground/40" strokeWidth={1.5} />
              </div>

              {/* Flat rows */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Severity</span>
                  <span className="text-xs font-bold text-foreground">
                    {((trigger?.severity ?? 0) * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Risk score</span>
                  <span className="text-xs font-bold text-foreground">
                    {risk?.weather_risk_score ?? "--"}/100
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                  <span className="text-xs text-muted-foreground">Estimated payout</span>
                  <span className="text-lg font-extrabold text-foreground">
                    ₹{claimResult?.payout_amount ?? "--"}
                  </span>
                </div>
              </div>
            </div>

            {/* Claim status */}
            {claiming ? (
              <div className="card-premium rounded-2xl p-5 mb-5 text-center">
                <Loader2 size={18} className="animate-spin text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Processing claim...</p>
              </div>
            ) : claimResult ? (
              <div className="card-premium rounded-2xl p-5 mb-5 text-center">
                {claimResult.claim_status === "auto-approve" || claimResult.claim_status === "approve-with-flag" ? (
                  <>
                    <CheckCircle2 size={24} className="text-accent-green mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-xl font-extrabold text-foreground mb-1">
                      ₹{claimResult.payout_amount}
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">Credited to your account</p>
                    {firstFired?.payout?.formula && (
                      <p className="text-[11px] text-muted-foreground/60">{firstFired.payout.formula}</p>
                    )}
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      <Zap size={11} className="text-accent-green" strokeWidth={1.5} />
                      <span className="text-[10px] font-semibold text-muted-foreground">Zero-touch · Auto-processed</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Shield size={24} className="text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm font-bold text-foreground mb-1">
                      {claimResult.claim_status === "hold-for-review" ? "Under Review" : "Processed"}
                    </p>
                    <p className="text-xs text-muted-foreground">{claimResult.explanation}</p>
                    {claimResult.fraud_score > 0 && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        Fraud score: {(claimResult.fraud_score * 100).toFixed(0)}%
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="card-premium rounded-2xl p-4 mb-5 text-center">
                <p className="text-xs font-medium text-muted-foreground">
                  Payout will be credited automatically
                </p>
              </div>
            )}

            {!claimResult && !claiming && userId && (
              <Button
                onClick={handleManualClaim}
                className="w-full h-14 text-base font-bold rounded-2xl bg-foreground border-0 text-background hover:bg-foreground/90 mb-5"
              >
                Claim Now
              </Button>
            )}

            {/* Fraud Analysis */}
            {fraudData && (
              <div className="mb-4">
                <FraudBreakdown assessment={fraudData} compact={!showFraudDetails} />
                <button
                  onClick={() => setShowFraudDetails((v) => !v)}
                  className="w-full mt-2 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showFraudDetails ? "Hide details" : "Show fraud analysis →"}
                </button>
              </div>
            )}

            <Button
              onClick={() => navigate("/payouts")}
              variant="outline"
              className="w-full h-12 text-sm font-semibold rounded-2xl border-border/40"
            >
              View Payout History
            </Button>
          </>
        )}
      </div>
      <BottomNav active="Alerts" />
        </div>
      </div>

      {/* ─── Claim Tester (outside the phone, right side on desktop) ─── */}
      {userId && (
        <div className="hidden md:block w-[420px] max-h-[844px] overflow-y-auto flex-shrink-0 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5">
          <Tabs defaultValue="trigger-lab" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-neutral-800/70">
              <TabsTrigger value="trigger-lab">Trigger Lab</TabsTrigger>
              <TabsTrigger value="spoof-sim">Fraud Spoof</TabsTrigger>
            </TabsList>
            <TabsContent value="trigger-lab" className="mt-4">
              <TriggerLab workerId={userId} zoneId={zoneId} city={city} />
            </TabsContent>
            <TabsContent value="spoof-sim" className="mt-4">
              <FraudDemo workerId={userId} zoneId={zoneId} city={city} />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default TriggerAlert;
