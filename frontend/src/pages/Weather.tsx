import { ArrowLeft, CloudRain, Sun, Cloud, AlertTriangle, Droplets, Wind, Thermometer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";

const forecast = [
  { day: "Mon", icon: Sun, temp: 32, risk: "low" },
  { day: "Tue", icon: CloudRain, temp: 26, risk: "high" },
  { day: "Wed", icon: CloudRain, temp: 24, risk: "high" },
  { day: "Thu", icon: Cloud, temp: 28, risk: "medium" },
  { day: "Fri", icon: Sun, temp: 31, risk: "low" },
  { day: "Sat", icon: Sun, temp: 33, risk: "low" },
  { day: "Sun", icon: Cloud, temp: 29, risk: "medium" },
];

const riskColors: Record<string, string> = {
  low: "text-accent-green",
  medium: "text-warning",
  high: "text-destructive",
};

const Weather = () => {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div className="px-6 pt-10 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-card shadow-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Weather & Predictions</h1>
        </div>

        {/* Current Weather */}
        <div className="gradient-primary rounded-2xl p-5 mb-4 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-2">
            Current Weather
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-4xl font-extrabold">28°C</p>
              <p className="text-sm font-medium opacity-80">Partly Cloudy</p>
            </div>
            <Cloud size={48} className="opacity-80" />
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center gap-1.5 text-xs font-medium opacity-80">
              <Droplets size={14} /> 45%
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium opacity-80">
              <Wind size={14} /> 12 km/h
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium opacity-80">
              <Thermometer size={14} /> Feels 31°
            </div>
          </div>
        </div>

        {/* AI Prediction */}
        <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} className="text-warning-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">AI Prediction</h3>
              <p className="text-xs text-muted-foreground">
                ⚠️ <strong>68% chance</strong> of heavy rain tomorrow.
                Potential trigger event.
              </p>
            </div>
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <h3 className="text-sm font-bold text-foreground mb-4">7-Day Forecast</h3>
          <div className="space-y-3">
            {forecast.map((d) => (
              <div key={d.day} className="flex items-center gap-4 py-2">
                <span className="w-10 text-sm font-bold text-foreground">{d.day}</span>
                <d.icon size={20} className="text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground flex-1">{d.temp}°C</span>
                <span className={`text-xs font-bold uppercase ${riskColors[d.risk]}`}>
                  {d.risk}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <BottomNav active="Home" />
    </MobileShell>
  );
};

export default Weather;
