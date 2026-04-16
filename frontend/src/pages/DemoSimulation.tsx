import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CloudRain, Thermometer, Wind, Droplets, TrendingDown,
  Play, CheckCircle, Shield, IndianRupee, Zap, ArrowLeft,
  Clock, AlertTriangle, Brain,
} from "lucide-react";
import { simulateDisruption, type DemoSimulationResult } from "@/lib/api";

const scenarios = [
  { value: "rainstorm", label: "Heavy Rainstorm", icon: CloudRain, color: "bg-blue-500", desc: "150mm+ rainfall disrupts outdoor gig work" },
  { value: "heatwave", label: "Extreme Heatwave", icon: Thermometer, color: "bg-orange-500", desc: "45°C+ heat makes delivery unsafe" },
  { value: "cyclone", label: "Cyclone Warning", icon: Wind, color: "bg-purple-500", desc: "IMD Red Alert — all outdoor work halted" },
  { value: "flooding", label: "Urban Flooding", icon: Droplets, color: "bg-cyan-500", desc: "Waterlogged roads block all routes" },
  { value: "demand_crash", label: "Demand Crash", icon: TrendingDown, color: "bg-gray-500", desc: "Platform order volume drops 70%+" },
];

const cities = ["Chennai", "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Kolkata", "Pune", "Jaipur"];
const plans = ["Basic", "Standard", "Premium"];

const stepIcons: Record<string, any> = {
  disruption_detected: CloudRain,
  trigger_evaluation: Zap,
  fraud_check: Shield,
  claim_decision: Brain,
  payout_initiated: IndianRupee,
  payout_completed: CheckCircle,
};

const DemoSimulation = () => {
  const navigate = useNavigate();
  const [scenario, setScenario] = useState("rainstorm");
  const [city, setCity] = useState("Chennai");
  const [plan, setPlan] = useState("Standard");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DemoSimulationResult | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);

  const runSimulation = async () => {
    setRunning(true);
    setResult(null);
    setVisibleSteps(0);
    try {
      const res = await simulateDisruption({ scenario, city, worker_plan: plan });
      setResult(res);
      // Animate timeline steps one by one
      for (let i = 1; i <= res.timeline.length; i++) {
        await new Promise((r) => setTimeout(r, 600));
        setVisibleSteps(i);
      }
    } catch (err) {
      console.error("Simulation failed:", err);
    } finally {
      setRunning(false);
    }
  };

  const selectedScenario = scenarios.find((s) => s.value === scenario)!;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-card flex items-center justify-center">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-base font-bold text-foreground">Live Demo Simulation</h1>
            <p className="text-[10px] text-muted-foreground">End-to-end disruption → claim → payout pipeline</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Scenario Selector */}
        <div className="bg-card rounded-2xl p-5 shadow-card">
          <h2 className="text-sm font-bold text-foreground mb-3">Select Disruption Scenario</h2>
          <div className="space-y-2">
            {scenarios.map((s) => (
              <button
                key={s.value}
                onClick={() => { setScenario(s.value); setResult(null); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  scenario === s.value
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${scenario === s.value ? "bg-background/20" : s.color + "/10"} flex items-center justify-center flex-shrink-0`}>
                  <s.icon size={16} className={scenario === s.value ? "text-background" : ""} />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold">{s.label}</p>
                  <p className={`text-[10px] ${scenario === s.value ? "opacity-70" : "text-muted-foreground"}`}>{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* City + Plan */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-2 block">City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full h-10 rounded-xl bg-background border border-border px-3 text-sm text-foreground"
            >
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-card">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-2 block">Worker Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full h-10 rounded-xl bg-background border border-border px-3 text-sm text-foreground capitalize"
            >
              {plans.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
          </div>
        </div>

        {/* Run Button */}
        <button
          onClick={runSimulation}
          disabled={running}
          className="w-full h-14 rounded-2xl bg-foreground text-background text-base font-bold flex items-center justify-center gap-3 hover:bg-foreground/90 disabled:opacity-50 transition-all"
        >
          {running ? (
            <>
              <div className="animate-spin w-5 h-5 border-2 border-background/30 border-t-background rounded-full" />
              Running Pipeline...
            </>
          ) : (
            <>
              <Play size={18} />
              Simulate {selectedScenario.label}
            </>
          )}
        </button>

        {/* Results */}
        {result && (
          <>
            {/* Summary Card */}
            {(() => {
              const approved = result.claim_result?.claim_status === "auto-approve" || result.claim_result?.claim_status === "approve-with-flag";
              const fraudScore = result.claim_result?.fraud_score ?? 0;
              const payoutAmt = result.claim_result?.payout_amount ?? 0;
              const gateway = result.payout?.gateway ?? "N/A";
              const triggersFired = (result.claim_result?.trigger_list ?? []).filter((t: any) => t.fired).map((t: any) => t.name ?? t.trigger);
              const fraudSignals = result.claim_result?.fraud_signals ?? [];
              return (
                <>
                  <div className={`rounded-2xl p-5 shadow-card ${approved ? "bg-accent-green/10 border border-accent-green/20" : "bg-destructive/10 border border-destructive/20"}`}>
                    <div className="flex items-center gap-2 mb-3">
                      {approved ? (
                        <CheckCircle size={18} className="text-accent-green" />
                      ) : (
                        <AlertTriangle size={18} className="text-destructive" />
                      )}
                      <h3 className="text-base font-bold text-foreground">
                        {approved ? "Claim Approved & Paid" : "Claim Rejected"}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Payout Amount</p>
                        <p className="text-xl font-extrabold text-foreground">₹{payoutAmt.toFixed(0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Fraud Score</p>
                        <p className={`text-xl font-extrabold ${fraudScore < 0.3 ? "text-accent-green" : fraudScore < 0.6 ? "text-warning" : "text-destructive"}`}>
                          {(fraudScore * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Gateway</p>
                        <p className="text-sm font-bold text-foreground capitalize">{gateway}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Total Time</p>
                        <p className="text-sm font-bold text-foreground">{result.total_duration_ms}ms</p>
                      </div>
                    </div>
                    {triggersFired.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {triggersFired.filter(Boolean).map((t: string) => (
                          <span key={t} className="px-2 py-0.5 rounded-full text-[9px] bg-foreground/10 text-foreground font-semibold capitalize">
                            {t.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Animated Timeline */}
                  <div className="bg-card rounded-2xl p-5 shadow-card">
                    <h3 className="text-sm font-bold text-foreground mb-4">Pipeline Timeline</h3>
                    <div className="space-y-0">
                      {result.timeline.map((step, idx) => {
                        const visible = idx < visibleSteps;
                        const Icon = stepIcons[step.event] || Zap;
                        const isLast = idx === result.timeline.length - 1;
                        return (
                          <div
                            key={step.event + idx}
                            className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                          >
                            <div className="flex gap-3">
                              {/* Timeline line */}
                              <div className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  visible ? "bg-accent-green/10" : "bg-muted"
                                }`}>
                                  <Icon size={14} className={visible ? "text-accent-green" : "text-muted-foreground"} />
                                </div>
                                {!isLast && <div className={`w-px h-8 ${visible ? "bg-foreground/15" : "bg-muted"}`} />}
                              </div>
                              {/* Content */}
                              <div className="flex-1 pb-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-foreground">
                                    {step.title}
                                  </p>
                                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <Clock size={10} />
                                    {step.duration_ms}ms
                                  </div>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{step.detail}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Fraud Breakdown */}
                  {fraudSignals.length > 0 && (
                    <div className="bg-card rounded-2xl p-5 shadow-card">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield size={14} className="text-foreground/70" />
                        <h3 className="text-sm font-bold text-foreground">Fraud Layer Analysis</h3>
                      </div>
                      <div className="space-y-2">
                        {fraudSignals.map((signal: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 p-2 bg-background rounded-xl">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              signal.score < 0.3 ? "bg-accent-green/10 text-accent-green" : signal.score < 0.6 ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"
                            }`}>
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{signal.layer}</p>
                            </div>
                            <span className={`text-xs font-bold ${signal.score < 0.3 ? "text-accent-green" : signal.score < 0.6 ? "text-warning" : "text-destructive"}`}>
                              {(signal.score * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};

export default DemoSimulation;
