import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CloudRain,
  Flame,
  Loader2,
  MapPin,
  ServerCrash,
  ShieldAlert,
  TrendingDown,
  Zap,
} from "lucide-react";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import {
  evaluateClaimEngine,
  getCityWeather,
  type CityWeather,
  type ClaimEvaluateResult,
} from "@/lib/api";
import { getCurrentUser } from "@/lib/session";

type DemoScenario =
  | "none"
  | "heavy_rain"
  | "extreme_heat"
  | "demand_collapse"
  | "zone_shutdown"
  | "platform_outage";

type ScenarioStatus = "pass" | "fail";

const scenarioButtons: Array<{
  key: DemoScenario;
  label: string;
  subtitle: string;
  icon: typeof CloudRain;
}> = [
  { key: "heavy_rain", label: "Heavy Monsoon Rain", subtitle: "62mm/hr vs 25 threshold", icon: CloudRain },
  { key: "extreme_heat", label: "Extreme Heatwave", subtitle: "46C vs 42 threshold", icon: Flame },
  { key: "demand_collapse", label: "Demand Collapse", subtitle: "82% below baseline", icon: TrendingDown },
  { key: "zone_shutdown", label: "Zone Shutdown", subtitle: "Government restriction active", icon: ShieldAlert },
  { key: "platform_outage", label: "Platform Outage", subtitle: "Status API degraded", icon: ServerCrash },
];

const triggerLabel = (name: string) => {
  const normalized = name.replace(/_/g, " ");
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const cityGps: Record<string, { lat: number; lon: number }> = {
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  bangalore: { lat: 12.9716, lon: 77.5946 },
  mumbai: { lat: 19.076, lon: 72.8777 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kochi: { lat: 9.9312, lon: 76.2673 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  hyderabad: { lat: 17.385, lon: 78.4867 },
  delhi: { lat: 28.6139, lon: 77.209 },
};

const TriggerDemo = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const [city, setCity] = useState((user?.city ?? "Bengaluru").trim());
  const [hoursLost, setHoursLost] = useState(4);
  const [weather, setWeather] = useState<CityWeather | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimEvaluateResult | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [runningScenario, setRunningScenario] = useState<DemoScenario>("none");
  const [feed, setFeed] = useState<string[]>([]);
  const [error, setError] = useState<string>("");
  const [scenarioResults, setScenarioResults] = useState<Partial<Record<DemoScenario, ScenarioStatus>>>({});

  const workerId = user?.backendUserId ?? 1;
  const zoneId = user?.zoneId ?? city.trim().toLowerCase();

  const gps = useMemo(() => {
    return cityGps[city.trim().toLowerCase()] ?? cityGps.bengaluru;
  }, [city]);

  const pushFeed = (line: string) => {
    setFeed((prev) => [line, ...prev].slice(0, 12));
  };

  const runEvaluation = async (scenario: DemoScenario) => {
    setRunningScenario(scenario);
    setError("");
    try {
      const result = await evaluateClaimEngine({
        worker_id: workerId,
        zone_id: zoneId,
        city,
        gps_lat: gps.lat,
        gps_lon: gps.lon,
        hours_lost: Math.max(1, hoursLost),
        app_active: true,
        demo_mode: scenario !== "none",
        demo_scenario: scenario,
      });
      setClaimResult(result);

      const fired = result.trigger_list.filter((item) => item.fired);
      if (scenario === "none") {
        pushFeed(`Live evaluation: ${fired.length} trigger(s) fired in ${city}`);
      } else {
        const scenarioTrigger = result.trigger_list.find((item) => item.name === scenario);
        const scenarioPassed = Boolean(scenarioTrigger?.fired);
        setScenarioResults((prev) => ({
          ...prev,
          [scenario]: scenarioPassed ? "pass" : "fail",
        }));
        pushFeed(
          `Scenario ${scenario.replace(/_/g, " ")} ${scenarioPassed ? "PASS" : "FAIL"} with ${fired.length} fired trigger(s)`
        );
      }

      if (result.payout_amount > 0) {
        pushFeed(`UPI transfer initiated for INR ${result.payout_amount}`);
      } else {
        pushFeed(`Claim status: ${result.claim_status}`);
      }
    } catch (err: any) {
      setError(err?.message ?? "Could not evaluate claim");
    } finally {
      setRunningScenario("none");
    }
  };

  const fetchLive = async () => {
    setLoadingLive(true);
    setError("");
    try {
      const w = await getCityWeather(city);
      setWeather(w);
      pushFeed(`Fetched live weather for ${w.city}: ${Math.round(w.temperature)}C, rain ${w.rainfall} mm`);
      await runEvaluation("none");
    } catch (err: any) {
      setError(err?.message ?? "Could not fetch live weather");
    } finally {
      setLoadingLive(false);
    }
  };

  return (
    <MobileShell>
      <div className="md:flex-1 md:overflow-y-auto px-4 pt-10 pb-24">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" strokeWidth={1.5} />
          </button>
          <div>
            <h1 className="text-lg font-extrabold text-foreground tracking-tight">Trigger Demo Dashboard</h1>
            <p className="text-xs text-muted-foreground">Live OpenWeather baseline + scenario injection</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 p-4 mb-4">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground">City</label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-1 w-full h-11 rounded-xl bg-secondary/60 border border-border px-3 text-sm text-foreground"
                placeholder="Enter city"
              />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Lost hours</label>
              <input
                value={hoursLost}
                onChange={(e) => setHoursLost(Number(e.target.value || 0))}
                type="number"
                min={1}
                max={12}
                className="mt-1 w-full h-11 rounded-xl bg-secondary/60 border border-border px-3 text-sm text-foreground"
              />
            </div>
          </div>
          <Button onClick={fetchLive} className="w-full mt-3 h-11 rounded-xl">
            {loadingLive ? <Loader2 size={16} className="animate-spin mr-2" /> : <MapPin size={16} className="mr-2" />}
            Fetch Live Data
          </Button>
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </div>

        <div className="grid grid-cols-1 gap-2 mb-4">
          {scenarioButtons.map((scenario) => {
            const Icon = scenario.icon;
            const status = scenarioResults[scenario.key];
            return (
              <button
                key={scenario.key}
                onClick={() => runEvaluation(scenario.key)}
                disabled={runningScenario !== "none" || loadingLive}
                className="rounded-xl border border-border/60 bg-secondary/50 p-3 text-left disabled:opacity-60"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Icon size={15} className="text-warning" />
                    <p className="text-sm font-semibold text-foreground">{scenario.label}</p>
                  </div>
                  {status && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        status === "pass"
                          ? "bg-accent-green/15 text-accent-green"
                          : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{scenario.subtitle}</p>
              </button>
            );
          })}
        </div>

        {weather && (
          <div className="rounded-2xl border border-border/60 p-4 mb-4">
            <p className="text-sm font-bold text-foreground">Live Weather Baseline</p>
            <p className="text-xs text-muted-foreground mt-1">
              {weather.city} · {Math.round(weather.temperature)}C · Rain {weather.rainfall} mm · Risk {weather.weather_risk_score}/100
            </p>
          </div>
        )}

        {claimResult && (
          <div className="rounded-2xl border border-border/60 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-foreground">Trigger Evaluation</p>
              <span className="text-xs font-semibold text-foreground">{claimResult.claim_status}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2">{claimResult.explanation}</p>
            <p className="text-lg font-extrabold text-accent-green mb-3">INR {claimResult.payout_amount}</p>

            <div className="space-y-2">
              {claimResult.trigger_list.map((item) => (
                <div key={item.name} className="rounded-xl bg-secondary/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{triggerLabel(item.name)}</p>
                    <span className={`text-xs font-semibold ${item.fired ? "text-warning" : "text-muted-foreground"}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Source: {item.source} · Value {item.value ?? 0} vs threshold {item.threshold ?? 0}
                  </p>
                  {item.payout && Math.abs(item.payout.coverage_hour_adjustment) > 0.01 && (
                    <p className="text-[11px] text-warning mt-1">
                      Coverage hours adjusted: {item.payout.hours_lost}h {"->"} {item.payout.adjusted_hours}h ({item.payout.coverage_hour_adjustment > 0 ? "+" : ""}
                      {item.payout.coverage_hour_adjustment}h)
                    </p>
                  )}
                  {item.payout?.formula && (
                    <p className="text-[11px] text-muted-foreground mt-1">{item.payout.formula}</p>
                  )}
                  {item.payout?.adjustment_reason && (
                    <p className="text-[11px] text-muted-foreground/80 mt-1">{item.payout.adjustment_reason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-warning" />
            <p className="text-sm font-bold text-foreground">Animated Trigger Feed</p>
          </div>
          {feed.length === 0 ? (
            <p className="text-xs text-muted-foreground">No events yet. Run live fetch or a scenario.</p>
          ) : (
            <div className="space-y-2">
              {feed.map((line, index) => (
                <div key={`${line}_${index}`} className="rounded-lg bg-secondary/40 px-3 py-2 text-xs text-foreground animate-pulse">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomNav active="Alerts" />
    </MobileShell>
  );
};

export default TriggerDemo;
