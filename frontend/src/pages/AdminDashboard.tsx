import { useState, useEffect } from "react";
import {
  Users, AlertTriangle, IndianRupee, TrendingUp, CloudRain, MapPin,
  Shield, Zap, Activity, Brain, CreditCard, ArrowLeft, ChevronRight,
  Play, CheckCircle2, Clock, XCircle, Eye, Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  createAdminIMDAlert,
  getAdminAnalytics,
  getPredictiveAnalytics,
  type AdminAnalytics,
  type PredictiveAnalytics,
} from "@/lib/api";

/* ─────────────────────────────────────────────────────────────────── */
/*  Helpers                                                           */
/* ─────────────────────────────────────────────────────────────────── */

const fmt = (n: number) => n.toLocaleString("en-IN");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const lrColor = (r: number) =>
  r > 0.8 ? "text-destructive" : r > 0.5 ? "text-warning" : "text-accent-green";
const lrBg = (r: number) =>
  r > 0.8 ? "bg-destructive" : r > 0.5 ? "bg-warning" : "bg-accent-green";

/* ─────────────────────────────────────────────────────────────────── */
/*  Stat pill                                                         */
/* ─────────────────────────────────────────────────────────────────── */

function Stat({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: typeof Users }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40 px-5 py-4">
      <div className="w-10 h-10 rounded-xl bg-foreground/[0.06] flex items-center justify-center shrink-0">
        <Icon className="w-[18px] h-[18px] text-foreground/50" strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground/70 font-medium tracking-wide uppercase">{label}</p>
        <p className="text-xl font-semibold text-foreground tracking-tight leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground/50 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Section wrapper                                                   */
/* ─────────────────────────────────────────────────────────────────── */

function Section({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h2 className="text-[13px] font-semibold text-muted-foreground/60 uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Main component                                                    */
/* ─────────────────────────────────────────────────────────────────── */

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "predictions">("overview");

  const [zone, setZone] = useState("chennai");
  const [alertLevel, setAlertLevel] = useState<"green" | "yellow" | "orange" | "red">("yellow");
  const [eventType, setEventType] = useState<"cyclone" | "rain" | "heatwave">("rain");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [predictions, setPredictions] = useState<PredictiveAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAdminAnalytics().catch(() => null),
      getPredictiveAnalytics().catch(() => null),
    ]).then(([a, p]) => {
      if (a) setAnalytics(a);
      if (p) setPredictions(p);
    }).finally(() => setLoading(false));
  }, []);

  const saveAlert = async () => {
    if (!zone.trim()) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const s = await createAdminIMDAlert({ zone: zone.trim(), alert_level: alertLevel, event_type: eventType });
      setSaveMsg(`${s.alert_level.toUpperCase()} ${s.event} alert saved for ${s.zone}`);
    } catch (err: any) {
      setSaveMsg(err?.message ?? "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top bar ───────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/30">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/dashboard")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-[18px] h-[18px]" />
            </button>
            <span className="text-sm font-semibold text-foreground tracking-tight">FairRoute Admin</span>
          </div>

          <div className="flex items-center bg-card/50 rounded-full p-0.5 border border-border/30">
            {(["overview", "predictions"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  tab === t
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "overview" ? "Overview" : "Predictions"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
            <span className="text-[11px] text-muted-foreground/60 font-medium">Live</span>
          </div>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-6 h-6 border-2 border-foreground/10 border-t-foreground/60 rounded-full animate-spin" />
          </div>
        ) : tab === "overview" ? (
          <OverviewTab analytics={analytics} zone={zone} setZone={setZone} alertLevel={alertLevel}
            setAlertLevel={setAlertLevel} eventType={eventType} setEventType={setEventType}
            saving={saving} saveMsg={saveMsg} saveAlert={saveAlert} navigate={navigate}
          />
        ) : (
          <PredictionsTab predictions={predictions} />
        )}
      </main>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  OVERVIEW TAB                                                      */
/* ═══════════════════════════════════════════════════════════════════ */

function OverviewTab({
  analytics, zone, setZone, alertLevel, setAlertLevel, eventType, setEventType, saving, saveMsg, saveAlert, navigate,
}: {
  analytics: AdminAnalytics | null;
  zone: string; setZone: (v: string) => void;
  alertLevel: "green" | "yellow" | "orange" | "red"; setAlertLevel: (v: any) => void;
  eventType: "cyclone" | "rain" | "heatwave"; setEventType: (v: any) => void;
  saving: boolean; saveMsg: string; saveAlert: () => void;
  navigate: (path: string) => void;
}) {
  const s = analytics?.summary;

  return (
    <>
      {/* ── Hero metrics ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Users}        label="Workers"  value={fmt(s?.total_workers ?? 0)} />
        <Stat icon={AlertTriangle} label="Claims"   value={fmt(s?.total_claims ?? 0)} />
        <Stat icon={IndianRupee}  label="Payouts"  value={`₹${fmt(s?.total_payouts ?? 0)}`} />
        <Stat icon={TrendingUp}   label="Revenue"  value={`₹${s?.weekly_premium_revenue ?? 0}/wk`} sub={`₹${s?.monthly_premium_revenue ?? 0}/mo`} />
      </div>

      {/* ── Two-col: Loss Ratios + Fraud ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Loss Ratios">
          <div className="rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 p-5 space-y-5">
            {(["weekly", "monthly", "overall"] as const).map((period) => {
              const v = analytics?.loss_ratios[period] ?? 0;
              return (
                <div key={period}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground/80 capitalize">{period}</span>
                    <span className={`text-sm font-semibold tabular-nums ${lrColor(v)}`}>{pct(v)}</span>
                  </div>
                  <div className="h-1 rounded-full bg-foreground/[0.06] overflow-hidden">
                    <div className={`h-full rounded-full ${lrBg(v)} transition-all`} style={{ width: `${Math.min(v * 100, 100)}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground/40 pt-1">Target &lt; 65%  •  BCR 0.65 stress-tested for 14-day monsoon</p>
          </div>
        </Section>

        <Section title="5-Layer Fraud Engine">
          <div className="rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-3.5 h-3.5 text-muted-foreground/40" strokeWidth={1.5} />
              <span className="text-[10px] text-muted-foreground/40">GPS · Activity · Cross-Worker · Duplicate · Behavioral</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {([
                { label: "Low", value: analytics?.fraud_stats.low_risk ?? 0, cls: "text-accent-green" },
                { label: "Medium", value: analytics?.fraud_stats.medium_risk ?? 0, cls: "text-warning" },
                { label: "High", value: analytics?.fraud_stats.high_risk ?? 0, cls: "text-destructive" },
              ] as const).map((tier) => (
                <div key={tier.label} className="text-center rounded-xl bg-foreground/[0.03] py-3">
                  <p className={`text-2xl font-semibold tabular-nums ${tier.cls}`}>{tier.value}</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-0.5">{tier.label} risk</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground/50 pt-1">
              <span>Avg score: <span className="text-foreground/70 font-medium tabular-nums">{pct(analytics?.fraud_stats.avg_score ?? 0)}</span></span>
              <span className="text-accent-green/80 font-medium">{analytics?.fraud_stats.low_risk ?? 0} auto-approved</span>
            </div>
          </div>
        </Section>
      </div>

      {/* ── Two-col: Workers + Payments ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Claim Resolution Tracks">
          <div className="rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 divide-y divide-border/20">
            {(() => {
              const sb = analytics?.status_breakdown ?? {};
              const tracks = [
                { key: "auto-approved", label: "Instant Approve", desc: "Score < 0.3 — full payout in 2 hrs", icon: CheckCircle2, cls: "text-accent-green" },
                { key: "approved-with-flag", label: "Approved + Flag", desc: "Score 0.3–0.7 — monitored", icon: Eye, cls: "text-warning" },
                { key: "hold-for-review", label: "Held for Review", desc: "Score > 0.7 — manual check", icon: Clock, cls: "text-orange-400" },
                { key: "auto-rejected", label: "Auto-Rejected", desc: "Score > 0.9 — blocked", icon: XCircle, cls: "text-destructive" },
              ];
              return tracks.map((t) => {
                const count = sb[t.key] ?? 0;
                return (
                  <div key={t.key} className="flex items-center gap-3 px-5 py-3.5">
                    <t.icon className={`w-4 h-4 ${t.cls} shrink-0`} strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground/90 font-medium">{t.label}</span>
                      <span className="text-[10px] text-muted-foreground/40 ml-2 hidden sm:inline">{t.desc}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-foreground/80">{count}</span>
                  </div>
                );
              });
            })()}
          </div>
        </Section>

        <Section title="Worker Trust Segments">
          <div className="rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 divide-y divide-border/20">
            {([
              { label: "Gold", desc: "Trust ≥ 80%", count: analytics?.worker_segments.gold ?? 0, dot: "bg-yellow-400" },
              { label: "Silver", desc: "Trust ≥ 60%", count: analytics?.worker_segments.silver ?? 0, dot: "bg-foreground/30" },
              { label: "Standard", desc: "Trust ≥ 40%", count: analytics?.worker_segments.standard ?? 0, dot: "bg-foreground/15" },
              { label: "Review", desc: "Under review", count: analytics?.worker_segments.review ?? 0, dot: "bg-destructive/60" },
            ]).map((seg) => {
              const total = (analytics?.summary.total_workers ?? 1) || 1;
              return (
                <div key={seg.label} className="flex items-center gap-3 px-5 py-3.5">
                  <span className={`w-2 h-2 rounded-full ${seg.dot} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-foreground/90 font-medium">{seg.label}</span>
                    <span className="text-[10px] text-muted-foreground/40 ml-2">{seg.desc}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground/80">{seg.count}</span>
                  <span className="text-[10px] text-muted-foreground/30 tabular-nums w-10 text-right">{((seg.count / total) * 100).toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Payment Gateways (Razorpay · UPI · Stripe)">
          <div className="rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 p-5">
            {analytics?.payout_gateway_stats && analytics.payout_gateway_stats.total_transactions > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-foreground/[0.03] p-4">
                    <p className="text-xl font-semibold text-foreground tabular-nums">{analytics.payout_gateway_stats.total_completed}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">Completed</p>
                  </div>
                  <div className="rounded-xl bg-foreground/[0.03] p-4">
                    <p className="text-xl font-semibold text-accent-green tabular-nums">₹{analytics.payout_gateway_stats.total_amount_disbursed}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">Disbursed</p>
                  </div>
                </div>
                {/* Per-gateway breakdown */}
                {analytics.payout_gateway_stats.by_gateway && Object.keys(analytics.payout_gateway_stats.by_gateway).length > 0 && (
                  <div className="space-y-2 pt-1">
                    {Object.entries(analytics.payout_gateway_stats.by_gateway).map(([gw, data]) => (
                      <div key={gw} className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground/50 w-20 shrink-0 capitalize">{gw.replace(/_/g, " ")}</span>
                        <div className="flex-1 h-1 rounded-full bg-foreground/[0.05] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-foreground/20"
                            style={{ width: `${(data.completed / Math.max(analytics.payout_gateway_stats.total_completed, 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] tabular-nums text-foreground/60 w-6 text-right">{data.completed}</span>
                        <span className="text-[10px] tabular-nums text-accent-green/60 w-14 text-right">₹{fmt(data.total_amount)}</span>
                        {data.failed > 0 && <span className="text-[9px] tabular-nums text-destructive/60">{data.failed} fail</span>}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground/40">Avg processing: {analytics.payout_gateway_stats.avg_processing_time_ms}ms</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground/40">
                <CreditCard className="w-5 h-5 shrink-0" strokeWidth={1.5} />
                <p className="text-sm">No transactions yet. Run a claim to generate data.</p>
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* ── Claims by trigger ────────────────────────────────────── */}
      {analytics && Object.keys(analytics.trigger_breakdown).length > 0 && (
        <Section title="Claims by Trigger">
          <div className="rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 divide-y divide-border/20">
            {Object.entries(analytics.trigger_breakdown)
              .sort(([, a], [, b]) => b.count - a.count)
              .map(([trigger, data]) => {
                const TriggerIcon = trigger.includes("rain") || trigger.includes("flood")
                  ? CloudRain : trigger.includes("zone") || trigger.includes("shutdown")
                    ? MapPin : Zap;
                return (
                  <div key={trigger} className="flex items-center gap-4 px-5 py-3.5">
                    <TriggerIcon className="w-4 h-4 text-muted-foreground/40 shrink-0" strokeWidth={1.5} />
                    <span className="flex-1 text-sm text-foreground/80 font-medium capitalize">{trigger.replace(/_/g, " ")}</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground/80">{data.count}</span>
                    <span className="text-[11px] text-muted-foreground/40 tabular-nums w-16 text-right">₹{fmt(Math.round(data.total_payout))}</span>
                  </div>
                );
              })}
          </div>
        </Section>
      )}

      {/* ── 7-day timeline ───────────────────────────────────────── */}
      {analytics && Object.keys(analytics.daily_timeline).length > 0 && (
        <Section title="7-Day Claims Timeline">
          <div className="rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 p-5 space-y-3">
            <div className="flex items-center gap-3 mb-1 text-[10px] text-muted-foreground/30 font-medium">
              <span className="w-14 shrink-0">Date</span>
              <span className="flex-1">Claims</span>
              <span className="w-6 text-right">#</span>
              <span className="w-14 text-right">Payouts</span>
              <span className="w-12 text-right">Fraud</span>
            </div>
            {Object.entries(analytics.daily_timeline)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([day, data]) => {
                const max = Math.max(...Object.values(analytics.daily_timeline).map(d => d.claims), 1);
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-muted-foreground/50 w-14 shrink-0">{day.slice(5)}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-foreground/[0.05] overflow-hidden">
                      <div className="h-full rounded-full bg-foreground/20" style={{ width: `${(data.claims / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium tabular-nums text-foreground/60 w-6 text-right">{data.claims}</span>
                    <span className="text-[10px] tabular-nums text-accent-green/50 w-14 text-right">₹{data.payouts}</span>
                    <span className={`text-[10px] tabular-nums w-12 text-right ${
                      data.avg_fraud > 0.7 ? "text-destructive/60" : data.avg_fraud > 0.3 ? "text-warning/60" : "text-accent-green/60"
                    }`}>{pct(data.avg_fraud)}</span>
                  </div>
                );
              })}
          </div>
        </Section>
      )}

      {/* ── IMD alert form ───────────────────────────────────────── */}
      <Section title="IMD Alert Management">
        <div className="rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Zone (e.g. chennai)"
              className="h-10 rounded-xl bg-foreground/[0.04] border border-border/30 px-3 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
            <select
              value={alertLevel}
              onChange={(e) => setAlertLevel(e.target.value as any)}
              className="h-10 rounded-xl bg-foreground/[0.04] border border-border/30 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            >
              <option value="green">Green</option>
              <option value="yellow">Yellow</option>
              <option value="orange">Orange</option>
              <option value="red">Red</option>
            </select>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as any)}
              className="h-10 rounded-xl bg-foreground/[0.04] border border-border/30 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
            >
              <option value="rain">Rain</option>
              <option value="cyclone">Cyclone</option>
              <option value="heatwave">Heatwave</option>
            </select>
            <button
              onClick={saveAlert}
              disabled={saving}
              className="h-10 rounded-xl bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save Alert"}
            </button>
          </div>
          {saveMsg && <p className="text-xs text-muted-foreground/60">{saveMsg}</p>}
          <button
            onClick={() => navigate("/admin/imd-alerts")}
            className="inline-flex items-center gap-1 text-xs text-foreground/50 hover:text-foreground transition-colors group"
          >
            View alert history
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </Section>

      {/* ── Demo Simulation ──────────────────────────────────────── */}
      <Section title="Demo Simulation">
        <div className="rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground/80 font-medium">End-to-End Disruption Pipeline</p>
              <p className="text-[11px] text-muted-foreground/40 mt-0.5">
                Create worker → trigger disruption → 5-layer fraud check → gateway payout — single click
              </p>
            </div>
            <button
              onClick={() => navigate("/demo")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/[0.06] border border-border/30 text-sm font-medium text-foreground hover:bg-foreground/10 transition-colors"
            >
              <Play className="w-3.5 h-3.5" strokeWidth={2} />
              Run Demo
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {["Rainstorm", "Cyclone", "Heatwave", "Flooding", "Demand Crash"].map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-full text-[9px] bg-foreground/[0.04] text-muted-foreground/50 font-medium">{s}</span>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  PREDICTIONS TAB                                                   */
/* ═══════════════════════════════════════════════════════════════════ */

function PredictionsTab({ predictions }: { predictions: PredictiveAnalytics | null }) {
  if (!predictions) {
    return <p className="text-sm text-muted-foreground/40 py-20 text-center">No prediction data available.</p>;
  }

  const o = predictions.overall;
  const riskColor = (r: number) =>
    r > 60 ? "text-destructive" : r > 35 ? "text-warning" : "text-accent-green";
  const riskBg = (r: number) =>
    r > 60 ? "bg-destructive" : r > 35 ? "bg-warning" : "bg-accent-green";
  const riskLabel = (r: number) =>
    r > 60 ? "High" : r > 35 ? "Moderate" : "Low";

  return (
    <>
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Activity} label="Predicted Claims" value={fmt(o.predicted_total_claims)} sub="Next 7 days" />
        <Stat icon={IndianRupee} label="Est. Payouts" value={`₹${fmt(Math.round(o.estimated_total_payout))}`} sub="Next 7 days" />
        <Stat icon={Shield} label="Recommended Reserve" value={`₹${fmt(Math.round(o.recommended_reserve))}`} sub="115% of estimate" />
        <Stat icon={AlertTriangle} label="High-Risk Cities" value={String(o.high_risk_cities.length)} sub={o.high_risk_cities.join(", ") || "None identified"} />
      </div>

      {/* City forecast grid */}
      <Section title="City-wise Forecast">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {predictions.city_forecasts
            .sort((a, b) => b.predicted_risk - a.predicted_risk)
            .map((city) => {
              const trend = city.predicted_risk - city.current_risk;
              const trendUp = trend > 0;
              return (
                <div key={city.city} className="rounded-2xl bg-card/50 backdrop-blur-sm border border-border/30 p-5 hover:border-border/50 transition-all">
                  {/* Header row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${riskBg(city.predicted_risk)}/10 flex items-center justify-center`}>
                        <MapPin className={`w-[18px] h-[18px] ${riskColor(city.predicted_risk)}`} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-[15px] font-semibold text-foreground tracking-tight">{city.city}</p>
                        <p className="text-[11px] text-muted-foreground/50 capitalize mt-0.5">
                          {city.current_trigger_type === "none" ? "No active triggers" : city.current_trigger_type.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    {/* Risk badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${riskBg(city.predicted_risk)}/10 ${riskColor(city.predicted_risk)} uppercase tracking-wide`}>
                      {riskLabel(city.predicted_risk)}
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-background/50 rounded-xl p-3">
                      <p className="text-[9px] text-muted-foreground/50 uppercase font-semibold tracking-wider">Claims</p>
                      <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">{city.predicted_claims}</p>
                    </div>
                    <div className="bg-background/50 rounded-xl p-3">
                      <p className="text-[9px] text-muted-foreground/50 uppercase font-semibold tracking-wider">Payout</p>
                      <p className="text-lg font-bold text-foreground tabular-nums mt-0.5">₹{fmt(Math.round(city.estimated_payout))}</p>
                    </div>
                    <div className="bg-background/50 rounded-xl p-3">
                      <p className="text-[9px] text-muted-foreground/50 uppercase font-semibold tracking-wider">Trend</p>
                      <p className={`text-lg font-bold tabular-nums mt-0.5 ${trendUp ? "text-destructive" : "text-accent-green"}`}>
                        {trendUp ? "↑" : "↓"}{Math.abs(trend)}
                      </p>
                    </div>
                  </div>

                  {/* Risk bars */}
                  <div className="space-y-2">
                    {([
                      { label: "Current", value: city.current_risk },
                      { label: "Predicted", value: city.predicted_risk },
                    ] as const).map((bar) => (
                      <div key={bar.label} className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground/50 w-16 shrink-0 font-medium">{bar.label}</span>
                        <div className="flex-1 h-2 rounded-full bg-foreground/[0.04] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${riskBg(bar.value)}/60`}
                            style={{ width: `${Math.max(bar.value, 3)}%` }}
                          />
                        </div>
                        <span className={`text-[11px] font-semibold tabular-nums w-8 text-right ${riskColor(bar.value)}`}>{bar.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Risk factors + confidence */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/20">
                    <div className="flex flex-wrap gap-1.5">
                      {city.risk_factors.length > 0 ? city.risk_factors.map((f) => (
                        <span key={f} className="px-2 py-0.5 rounded-full text-[9px] bg-foreground/[0.06] text-muted-foreground/60 font-medium">
                          {f}
                        </span>
                      )) : (
                        <span className="text-[9px] text-muted-foreground/30 italic">Stable conditions</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold tabular-nums ${
                      city.confidence > 0.8 ? "text-accent-green" : "text-muted-foreground/40"
                    }`}>
                      {(city.confidence * 100).toFixed(0)}% conf
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </Section>
    </>
  );
}

export default AdminDashboard;