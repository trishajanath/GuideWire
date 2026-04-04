import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Activity, IndianRupee, Bell, CloudRain, ChevronRight } from "lucide-react";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";
import { StaleIndicator } from "@/components/OfflineBanner";
import { getCurrentUser } from "@/lib/session";
import { useOfflineCache, useRainMode } from "@/hooks/use-offline";
import {
  getDashboard,
  getCityWeather,
  type CityWeather,
} from "@/lib/api";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const selectedPlan = user?.selectedPlan ?? "Standard Shield";
  const city = user?.city ?? "Bengaluru";
  const zoneName = user?.zoneArea ?? city;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [weather, setWeather] = useState<CityWeather | null>(null);
  const [totalPayouts, setTotalPayouts] = useState(0);
  const [claimsCount, setClaimsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);

  const backendUserId = user?.backendUserId;

  // Offline-first: weather cache
  const weatherCache = useOfflineCache<CityWeather>(
    `weather_${city}`,
    () => getCityWeather(city),
  );

  // Rain mode: activate when weather risk is elevated
  const rainActive = useRainMode(weatherCache.data?.weather_risk_score ?? null);

  useEffect(() => {
    if (weatherCache.data) setWeather(weatherCache.data);
    if (weatherCache.isStale) setIsStale(true);
  }, [weatherCache.data, weatherCache.isStale]);

  // Toggle rain mode class on body
  useEffect(() => {
    if (rainActive) {
      document.documentElement.classList.add("rain-mode");
    } else {
      document.documentElement.classList.remove("rain-mode");
    }
    return () => document.documentElement.classList.remove("rain-mode");
  }, [rainActive]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (backendUserId != null) {
      getDashboard(backendUserId).then((d) => {
        setTotalPayouts(d.total_payouts ?? 0);
        setClaimsCount(d.recent_claims?.length ?? 0);
      }).catch(() => {}).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, backendUserId]);

  const premiumMap: Record<string, number> = {
    "Basic Shield": 49,
    "Standard Shield": 69,
    "Premium Shield": 99,
  };
  const weeklyPremium = premiumMap[selectedPlan] ?? 69;

  const riskLabel =
    (weather?.weather_risk_score ?? 0) > 60
      ? "High"
      : (weather?.weather_risk_score ?? 0) > 30
        ? "Medium"
        : "Low";
  const riskColor =
    riskLabel === "High"
      ? "text-destructive"
      : riskLabel === "Medium"
        ? "text-warning"
        : "text-accent-green";
  const zoneStatus = (weather?.weather_risk_score ?? 0) > 60 ? "disruption" : "normal";
  const triggerActive = (weather?.weather_risk_score ?? 0) > 60;

  return (
    <MobileShell>
      <div className={`px-4 pt-10 pb-24 ${rainActive ? "rain-overlay" : ""}`}>
        {/* Stale data indicator */}
        {isStale && (
          <div className="mb-3">
            <StaleIndicator isStale />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
              {greeting}, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{zoneName} zone</p>
          </div>
          <button
            onClick={() => navigate("/trigger")}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center relative"
          >
            <Bell size={18} className="text-muted-foreground" strokeWidth={1.5} />
            {triggerActive && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-background" />
            )}
          </button>
        </div>

        {/* Coverage Card — premium dark, with zone+risk merged */}
        <div className="card-premium rounded-2xl p-6 mb-6 shadow-elevated">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-muted-foreground" strokeWidth={1.5} />
              <span className="text-xs font-medium text-muted-foreground tracking-wide">
                Your Coverage
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              <span className="text-xs font-medium text-accent-green">Active</span>
            </div>
          </div>
          <h2 className="text-xl font-extrabold text-foreground mb-1 tracking-tight">{selectedPlan}</h2>
          <p className="text-sm text-muted-foreground mb-4">₹{weeklyPremium}/week</p>
          <div className="h-px bg-border/60 mb-4" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={14} className={zoneStatus === "disruption" ? "text-warning" : "text-muted-foreground"} strokeWidth={1.5} />
              <span className="text-xs text-muted-foreground">
                {zoneName}
                {loading ? "" : zoneStatus === "disruption" ? " · Disruption" : " · All clear"}
              </span>
            </div>
            {weather && (
              <span className={`text-xs font-semibold ${riskColor}`}>
                {riskLabel} risk
              </span>
            )}
          </div>
        </div>

        {/* Stats — transparent grid, no borders */}
        <div className="grid grid-cols-3 gap-4 mb-8 px-2">
          <div className="text-center">
            <p className="text-lg font-extrabold text-foreground">₹{weeklyPremium}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Premium</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-extrabold text-accent-green">₹{totalPayouts}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {claimsCount > 0 ? `${claimsCount} claim${claimsCount > 1 ? "s" : ""}` : "Payouts"}
            </p>
          </div>
          <div className="text-center">
            <p className={`text-lg font-extrabold ${riskColor}`}>
              {weather?.weather_risk_score ?? "–"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">Risk</p>
          </div>
        </div>

        {/* Navigation rows — no icon bg circles */}
        <div className="space-y-2">
          <button
            onClick={() => navigate("/weather")}
            className="w-full rounded-xl px-4 py-4 flex items-center gap-3 text-left hover:bg-secondary/60 transition-colors touch-target active:bg-secondary"
          >
            <CloudRain size={18} className="text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Weather</h3>
              <p className="text-xs text-muted-foreground">
                {weather
                  ? `${weather.trigger_type === "none" ? "Clear" : weather.trigger_type} · ${weather.weather_risk_score}/100`
                  : "Loading..."}
              </p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground/50 flex-shrink-0" />
          </button>

          <button
            onClick={() => navigate("/trigger")}
            className="w-full rounded-xl px-4 py-4 flex items-center gap-3 text-left hover:bg-secondary/60 transition-colors touch-target active:bg-secondary"
          >
            <Bell size={18} className={triggerActive ? "text-destructive flex-shrink-0" : "text-muted-foreground flex-shrink-0"} strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Alerts</h3>
              <p className="text-xs text-muted-foreground">
                {triggerActive ? "Active trigger detected" : "All clear"}
              </p>
            </div>
            {triggerActive && (
              <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />
            )}
            <ChevronRight size={16} className="text-muted-foreground/50 flex-shrink-0" />
          </button>

          <div className="h-px bg-border/40 mx-4 my-2" />

          <button
            onClick={() => navigate("/policy")}
            className="w-full rounded-xl px-4 py-4 flex items-center gap-3 text-left hover:bg-secondary/60 transition-colors touch-target active:bg-secondary"
          >
            <Shield size={18} className="text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">My Plan</h3>
              <p className="text-xs text-muted-foreground">{selectedPlan} · ₹{weeklyPremium}/wk</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground/50 flex-shrink-0" />
          </button>

          <button
            onClick={() => navigate("/payouts")}
            className="w-full rounded-xl px-4 py-4 flex items-center gap-3 text-left hover:bg-secondary/60 transition-colors touch-target active:bg-secondary"
          >
            <IndianRupee size={18} className="text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Payouts</h3>
              <p className="text-xs text-muted-foreground">
                {totalPayouts > 0 ? `₹${totalPayouts} received` : "No payouts yet"}
              </p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground/50 flex-shrink-0" />
          </button>
        </div>
      </div>
      <BottomNav active="Home" />
    </MobileShell>
  );
};

export default Dashboard;
