import { useEffect, useState } from "react";
import { ArrowLeft, CloudRain, Sun, Cloud, AlertTriangle, Droplets, Wind, Thermometer, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";
import { getCurrentUser } from "@/lib/session";
import {
  getCityWeather,
  getCityZones,
  getIMDAlert,
  type CityWeather,
  type CityZone,
  type IMDAlert,
} from "@/lib/api";

const riskColors: Record<string, string> = {
  low: "text-accent-green",
  medium: "text-warning",
  high: "text-destructive",
};

const Weather = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const city = user?.city ?? "Bengaluru";
  const zoneName = user?.zoneArea ?? city;

  const [weather, setWeather] = useState<CityWeather | null>(null);
  const [zones, setZones] = useState<CityZone[]>([]);
  const [imdAlert, setImdAlert] = useState<IMDAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      getCityWeather(city).then((d) => { if (!cancelled) setWeather(d); }),
      getCityZones(city).then((d) => { if (!cancelled) setZones(d.zones); }),
      getIMDAlert(city).then((d) => { if (!cancelled) setImdAlert(d); }).catch(() => null),
    ])
      .then((results) => {
        if (!cancelled && results.every((r) => r.status === "rejected")) setError("No weather data yet");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [city]);

  const temp = weather?.temperature ?? 0;
  const humidity = weather?.humidity ?? 0;
  const windSpeed = weather?.wind_speed ?? 0;
  const rainfall = weather?.rainfall ?? 0;
  const riskScore = weather?.weather_risk_score ?? 0;
  const triggerProb = weather?.trigger_probability ?? 0;
  const triggerType = weather?.trigger_type ?? "none";

  const riskLevel = riskScore > 60 ? "high" : riskScore > 30 ? "medium" : "low";

  const WeatherIcon =
    rainfall > 5 ? CloudRain : riskScore > 60 ? AlertTriangle : temp > 35 ? Sun : Cloud;

  const conditionText =
    rainfall > 5
      ? "Rainy"
      : temp > 42
        ? "Extreme Heat"
        : temp > 35
          ? "Hot & Sunny"
          : "Partly Cloudy";

  const allZones = zones;

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
          <h1 className="text-lg font-extrabold text-foreground tracking-tight">
            Weather & Risk
          </h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-muted-foreground" size={32} />
          </div>
        ) : error ? (
          <p className="text-center text-muted-foreground py-12">{error}</p>
        ) : (
          <>
            {/* Current Weather — hero */}
            <div className="card-premium rounded-2xl p-6 mb-6 shadow-elevated">
              <p className="text-[11px] font-medium text-muted-foreground/60 tracking-wide mb-3">
                Current — {zoneName}
              </p>
              <div className="flex items-end justify-between mb-1">
                <p className="text-5xl font-extrabold text-foreground tracking-tighter leading-none">{Math.round(temp)}°</p>
                <WeatherIcon size={32} className="text-muted-foreground/60 mb-1" strokeWidth={1.5} />
              </div>
              <p className="text-sm text-muted-foreground mb-4">{conditionText}</p>
              <div className="flex gap-5 text-[11px] text-muted-foreground/70">
                <span className="flex items-center gap-1"><Thermometer size={11} strokeWidth={1.5} /> Feels {Math.round(temp + 2)}°</span>
                <span className="flex items-center gap-1"><Droplets size={11} strokeWidth={1.5} /> {Math.round(humidity)}%</span>
                <span className="flex items-center gap-1"><Wind size={11} strokeWidth={1.5} /> {Math.round(windSpeed)} km/h</span>
              </div>
            </div>

            {/* Risk Score — flattened */}
            <div className="card-premium rounded-2xl p-5 shadow-card mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-foreground">Risk Score</h3>
                <span className={`text-lg font-extrabold ${riskColors[riskLevel]}`}>{riskScore}<span className="text-xs font-medium text-muted-foreground">/100</span></span>
              </div>

              {/* Thin gauge */}
              <div className="mb-4">
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      riskLevel === "high" ? "bg-destructive" : riskLevel === "medium" ? "bg-warning" : "bg-accent-green"
                    }`}
                    style={{ width: `${Math.max(riskScore, 3)}%` }}
                  />
                </div>
              </div>

              {/* Flat rows */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <span className={`text-xs font-bold ${riskLevel === "high" ? "text-destructive" : "text-accent-green"}`}>
                    {riskLevel === "high" ? "Payout Ready" : riskLevel === "medium" ? "Watch" : "Clear"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Trigger probability</span>
                  <span className={`text-xs font-bold ${triggerProb > 0.6 ? "text-destructive" : triggerProb > 0.3 ? "text-warning" : "text-muted-foreground"}`}>
                    {Math.round(triggerProb * 100)}%
                  </span>
                </div>
                {triggerType !== "none" && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Trigger type</span>
                    <span className="text-xs font-bold text-foreground capitalize">{triggerType.replace(/_/g, " ")}</span>
                  </div>
                )}
              </div>
            </div>

            {imdAlert && (
              <div className="card-premium rounded-2xl p-5 shadow-card mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">IMD Alert</h3>
                  <span className={`text-xs font-bold uppercase ${imdAlert.alert_level === "red" ? "text-destructive" : imdAlert.alert_level === "orange" ? "text-warning" : "text-accent-green"}`}>
                    {imdAlert.alert_level}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 capitalize">Event: {imdAlert.event}</p>
                <p className="text-xs text-muted-foreground mt-1 uppercase">Source: {imdAlert.source}</p>
              </div>
            )}

            {/* Zone Comparison — with labels */}
            {allZones.length > 0 && (
              <div className="card-premium rounded-2xl p-5 shadow-card">
                <h3 className="text-sm font-bold text-foreground mb-4">Zone Safety</h3>
                <div className="space-y-3">
                  {allZones.map((zone) => {
                    const score = riskScore;
                    const level = score > 60 ? "High" : score > 30 ? "Medium" : "Low";
                    const levelColor = score > 60 ? "text-destructive" : score > 30 ? "text-warning" : "text-accent-green";
                    const barColor = score > 60 ? "bg-destructive" : score > 30 ? "bg-warning" : "bg-accent-green";
                    const isCurrentZone = zone.area === zoneName;
                    return (
                      <div key={zone.id} className="flex items-center gap-3">
                        <span className={`w-24 text-xs truncate ${isCurrentZone ? "font-bold text-foreground" : "font-medium text-muted-foreground"}`}>
                          {zone.area}
                        </span>
                        <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${Math.max(score, 3)}%` }}
                          />
                        </div>
                        <span className={`text-[11px] font-semibold w-12 text-right ${levelColor}`}>
                          {level}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav active="Weather" />
    </MobileShell>
  );
};

export default Weather;
