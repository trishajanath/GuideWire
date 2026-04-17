import { useEffect, useMemo, useState } from "react";
import {
  CloudRain,
  Clock3,
  Flame,
  RadioTower,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TrendingDown,
  Wifi,
  Wind,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ZONES,
} from "@/lib/api";

interface TriggerLabProps {
  workerId: number;
  zoneId: string;
  city: string;
}

const TRIGGER_SCENARIOS_STORAGE_KEY = "guidewire.triggerlab.selectedScenarios";

type SimulationCategory = "weather" | "platform" | "external";

type SimulationScenario = {
  id:
    | "none"
    | "heavy_rain"
    | "extreme_heat"
    | "cyclone_alert"
    | "urban_flooding"
    | "poor_visibility"
    | "demand_collapse"
    | "order_pause"
    | "zone_shutdown"
    | "zone_restriction"
    | "platform_outage"
    | "curfew"
    | "public_health_emergency"
    | "civil_disturbance"
    | "infrastructure_failure";
  category: SimulationCategory;
  label: string;
  subtitle: string;
  icon: typeof CloudRain;
  badge: string;
};

const SIMULATION_GROUPS: Array<{ key: SimulationCategory; title: string; description: string; icon: typeof CloudRain }> = [
  { key: "weather", title: "Weather-Based Triggers", description: "IMD + OpenWeather conditions", icon: CloudRain },
  { key: "platform", title: "Platform-Based Triggers", description: "Demand and service disruption", icon: RadioTower },
  { key: "external", title: "External Event Triggers", description: "Government or civic restrictions", icon: Siren },
];

const SCENARIOS: SimulationScenario[] = [
  { id: "heavy_rain", category: "weather", label: "Heavy Rainfall", subtitle: ">30mm in 3 hours", icon: CloudRain, badge: "Automatic" },
  { id: "extreme_heat", category: "weather", label: "Extreme Heat", subtitle: ">42°C sustained", icon: Flame, badge: "Automatic" },
  { id: "cyclone_alert", category: "weather", label: "Cyclone Alert", subtitle: "IMD orange/red alert", icon: ShieldAlert, badge: "Automatic" },
  { id: "urban_flooding", category: "weather", label: "Urban Flooding", subtitle: "Road obstruction / route blockage", icon: Wind, badge: "Automatic" },
  { id: "poor_visibility", category: "weather", label: "Poor Visibility", subtitle: "<100m visibility", icon: Wind, badge: "Automatic" },
  { id: "demand_collapse", category: "platform", label: "Demand Drop", subtitle: ">40% below zone average", icon: TrendingDown, badge: "Automatic" },
  { id: "order_pause", category: "platform", label: "Order Allocation Pause", subtitle: "<2 orders in 3 hours", icon: Clock3, badge: "Automatic" },
  { id: "zone_shutdown", category: "platform", label: "Zone Restriction", subtitle: "Geographic delivery restriction", icon: ShieldAlert, badge: "Automatic" },
  { id: "platform_outage", category: "platform", label: "Platform Outage", subtitle: "System-wide service disruption", icon: Wifi, badge: "Automatic" },
  { id: "curfew", category: "external", label: "Government Curfew", subtitle: "Official curfew announcement", icon: ShieldAlert, badge: "Manual" },
  { id: "public_health_emergency", category: "external", label: "Public Health Emergency", subtitle: "Health-related restrictions", icon: ShieldAlert, badge: "Manual" },
  { id: "civil_disturbance", category: "external", label: "Civil Disturbance", subtitle: "Police / municipal advisory", icon: Siren, badge: "Manual" },
  { id: "infrastructure_failure", category: "external", label: "Infrastructure Failure", subtitle: "Road closures / utility outage", icon: RadioTower, badge: "Manual" },
];

const cityKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ").replace("bangalore", "bengaluru");

const cityGps: Record<string, { lat: number; lon: number }> = {
  bengaluru: { lat: 12.9716, lon: 77.5946 },
  coimbatore: { lat: 11.0168, lon: 76.9558 },
  mumbai: { lat: 19.076, lon: 72.8777 },
  chennai: { lat: 13.0827, lon: 80.2707 },
  kochi: { lat: 9.9312, lon: 76.2673 },
  kolkata: { lat: 22.5726, lon: 88.3639 },
  hyderabad: { lat: 17.385, lon: 78.4867 },
  delhi: { lat: 28.6139, lon: 77.209 },
};

export default function TriggerLab({ workerId, zoneId, city }: TriggerLabProps) {
  const [selectedZone, setSelectedZone] = useState(zoneId);
  const [selectedScenarios, setSelectedScenarios] = useState<Set<SimulationScenario["id"]>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = window.sessionStorage.getItem(TRIGGER_SCENARIOS_STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      const valid = parsed.filter((item): item is SimulationScenario["id"] => typeof item === "string" && item !== "none");
      return new Set(valid);
    } catch {
      return new Set();
    }
  });
  const [hoursLost, setHoursLost] = useState(0);

  const normalizedCity = cityKey(city);
  const cityZones = useMemo(() => ZONES.filter((zone) => cityKey(zone.city) === normalizedCity), [normalizedCity]);
  const gps = useMemo(() => cityGps[normalizedCity] ?? cityGps.bengaluru, [normalizedCity]);

  useEffect(() => {
    if (!selectedZone && cityZones.length > 0) {
      setSelectedZone(cityZones[0].id);
    }
  }, [cityZones, selectedZone]);

  useEffect(() => {
    setSelectedScenarios((current) => {
      const next = new Set([...current].filter((scenarioId) => SCENARIOS.some((item) => item.id === scenarioId)));
      return next;
    });
  }, [city]);

  const scenariosByCategory = useMemo(() => {
    return SIMULATION_GROUPS.map((group) => ({
      ...group,
      scenarios: SCENARIOS.filter((item) => item.category === group.key),
    }));
  }, []);

  const selectedScenarioList = useMemo(() => [...selectedScenarios], [selectedScenarios]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(TRIGGER_SCENARIOS_STORAGE_KEY, JSON.stringify(selectedScenarioList));
  }, [selectedScenarioList]);

  const toggleScenario = (scenarioId: SimulationScenario["id"]) => {
    setSelectedScenarios((current) => {
      const next = new Set(current);
      if (next.has(scenarioId)) {
        next.delete(scenarioId);
      } else {
        next.add(scenarioId);
      }
      return next;
    });
  };

  const clearScenarios = () => {
    setSelectedScenarios(new Set());
  };

  const selectGroup = (category: SimulationCategory) => {
    setSelectedScenarios((current) => {
      const next = new Set(current);
      SCENARIOS.filter((item) => item.category === category).forEach((item) => next.add(item.id));
      return next;
    });
  };

  const selectedScenarioCount = selectedScenarioList.length;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-[18px] h-[18px] text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Claim Simulator</h3>
          <p className="text-[11px] text-muted-foreground">Desktop-side category simulator, separate from the phone</p>
        </div>
      </div>

      <div className="card-premium rounded-2xl p-4 space-y-3">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Simulation setup</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Worker zone</span>
            <input
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              list="worker-zone-suggestions"
              placeholder="Type zone id or area"
              className="w-full bg-secondary/60 border border-border/30 rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
            </input>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Lost hours</span>
            <input
              type="number"
              min={0}
              max={12}
              value={hoursLost}
              onChange={(e) => setHoursLost(Number(e.target.value || 0))}
              className="w-full bg-secondary/60 border border-border/30 rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </label>
        </div>
        <datalist id="worker-zone-suggestions">
          {cityZones.map((zone) => (
            <option key={zone.id} value={zone.id} />
          ))}
        </datalist>
      </div>

      <div className="space-y-3">
        {scenariosByCategory.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                    <Icon className="w-3 h-3" />
                    {group.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{group.description}</p>
                </div>
                <button
                  onClick={() => selectGroup(group.key)}
                  className="text-[10px] font-medium text-primary hover:underline"
                >
                  Select all
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {group.scenarios.map((item) => {
                  const ItemIcon = item.icon;
                  const active = selectedScenarios.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleScenario(item.id)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        active
                          ? "border-primary/40 bg-primary/[0.08]"
                          : "border-border/60 bg-secondary/50 hover:bg-secondary/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${active ? "bg-primary/15" : "bg-background/40"}`}>
                            <ItemIcon className={`w-4 h-4 ${active ? "text-primary" : "text-muted-foreground"}`} strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{item.label}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${active ? "bg-primary/15 text-primary" : "bg-foreground/5 text-muted-foreground"}`}>
                          {item.badge}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={clearScenarios}
        className="w-full rounded-xl border border-border/60 bg-secondary/40 px-4 py-3 text-sm font-semibold text-foreground"
      >
        Clear Simulation
      </button>

      <div className="rounded-xl border border-border/30 bg-secondary/30 px-3 py-2 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Trigger selections are saved automatically. Run the end-to-end simulation from the <span className="text-foreground font-semibold">Fraud Spoof</span> tab.
        </p>
      </div>
    </div>
  );
}
