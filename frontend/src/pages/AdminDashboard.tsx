import { useState, useEffect, useRef, useCallback } from "react";
import {
  Users, AlertTriangle, IndianRupee, TrendingUp, MapPin,
  Shield, Zap, Activity, CreditCard, ArrowLeft, ChevronRight,
  Play, CheckCircle2, Clock, XCircle, Eye, ChevronDown,
  BarChart3, FlaskConical, Radio, Crosshair, Bell, Plus,
  Trash2, Flame, CloudRain, Wind, Waves,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ScatterChart, Scatter, ZAxis,
} from "recharts";
import {
  createAdminIMDAlert,
  getAdminAnalytics,
  getAdminUsers,
  getPredictiveAnalytics,
  getMLStatus,
  getClaimClusters,
  getWorkerRiskProfiles,
  type AdminAnalytics,
  type AdminUserRow,
  type PredictiveAnalytics,
  type MLModelInfo,
  type MLStatusResponse,
  type ClaimClustersResponse,
  type WorkerRiskResponse,
  type WorkerRiskProfile,
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
    <div className="flex items-center gap-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/40 px-5 py-5">
      <div className="w-12 h-12 rounded-xl bg-foreground/[0.06] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-foreground/50" strokeWidth={1.5} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground/70 font-medium tracking-wide uppercase">{label}</p>
        <p className="text-2xl font-semibold text-foreground tracking-tight leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground/50 mt-0.5">{sub}</p>}
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
      <h2 className="text-base font-semibold text-muted-foreground/60 uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Collapsible section                                               */
/* ─────────────────────────────────────────────────────────────────── */

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: typeof Shield;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl bg-card/40 backdrop-blur-sm border border-border/30 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-foreground/[0.02] transition-colors"
      >
        <Icon className="w-5 h-5 text-muted-foreground/50 shrink-0" strokeWidth={1.5} />
        <span className="text-base font-semibold text-foreground/80 uppercase tracking-widest flex-1 text-left">{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
        />
      </button>
      {open && <div className="px-5 pb-5 space-y-4">{children}</div>}
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Styled dropdown (dark bg, white text)                             */
/* ─────────────────────────────────────────────────────────────────── */

const selectClasses =
  "h-11 rounded-xl bg-zinc-900 border border-border/40 px-3 text-base text-white focus:outline-none focus:ring-1 focus:ring-foreground/20 [&>option]:bg-zinc-900 [&>option]:text-white";

/* ─────────────────────────────────────────────────────────────────── */
/*  Main component                                                    */
/* ─────────────────────────────────────────────────────────────────── */

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"overview" | "predictions" | "whatif" | "intel" | "mllab">("overview");

  const [zone, setZone] = useState("chennai");
  const [alertLevel, setAlertLevel] = useState<"green" | "yellow" | "orange" | "red">("yellow");
  const [eventType, setEventType] = useState<"cyclone" | "rain" | "heatwave">("rain");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [predictions, setPredictions] = useState<PredictiveAnalytics | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAdminAnalytics().catch(() => null),
      getPredictiveAnalytics().catch(() => null),
      getAdminUsers().catch(() => null),
    ]).then(([a, p, u]) => {
      if (a) setAnalytics(a);
      if (p) setPredictions(p);
      if (u) setAdminUsers(u.users);
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
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-[18px] h-[18px]" />
            </button>
            <span className="text-lg font-semibold text-foreground tracking-tight">FairRoute Admin</span>
          </div>

          <div className="flex items-center bg-card/50 rounded-full p-0.5 border border-border/30">
            {(["overview", "predictions", "whatif", "intel", "mllab"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {{ overview: "Dashboard", predictions: "Forecasts", whatif: "Scenarios", intel: "Intelligence", mllab: "AI Models" }[t]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
            <span className="text-sm text-muted-foreground/60 font-medium">Live</span>
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
            saving={saving} saveMsg={saveMsg} saveAlert={saveAlert} navigate={navigate} adminUsers={adminUsers}
          />
        ) : tab === "predictions" ? (
          <PredictionsTab predictions={predictions} />
        ) : tab === "whatif" ? (
          <WhatIfTab analytics={analytics} predictions={predictions} />
        ) : tab === "mllab" ? (
          <MLLabTab />
        ) : (
          <IntelTab analytics={analytics} adminUsers={adminUsers} />
        )}
      </main>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  OVERVIEW TAB                                                      */
/* ═══════════════════════════════════════════════════════════════════ */

function OverviewTab({
  analytics, zone, setZone, alertLevel, setAlertLevel, eventType, setEventType, saving, saveMsg, saveAlert, navigate, adminUsers,
}: {
  analytics: AdminAnalytics | null;
  zone: string; setZone: (v: string) => void;
  alertLevel: "green" | "yellow" | "orange" | "red"; setAlertLevel: (v: any) => void;
  eventType: "cyclone" | "rain" | "heatwave"; setEventType: (v: any) => void;
  saving: boolean; saveMsg: string; saveAlert: () => void;
  navigate: (path: string) => void;
  adminUsers: AdminUserRow[];
}) {
  const s = analytics?.summary;

  /* ── Chart data ────────────────────────────────────────────────── */
  const timelineData = analytics
    ? Object.entries(analytics.daily_timeline)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, d]) => ({
          date: day.slice(5),
          Claims: d.claims,
          Payouts: d.payouts,
          "Fraud %": Math.round(d.avg_fraud * 100),
        }))
    : [];

  const fraudPieData = analytics
    ? [
        { name: "Low Risk", value: analytics.fraud_stats.low_risk, fill: "#22c55e" },
        { name: "Medium Risk", value: analytics.fraud_stats.medium_risk, fill: "#f59e0b" },
        { name: "High Risk", value: analytics.fraud_stats.high_risk, fill: "#ef4444" },
      ].filter((d) => d.value > 0)
    : [];

  const triggerBarData = analytics
    ? Object.entries(analytics.trigger_breakdown)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 8)
        .map(([trigger, data]) => ({
          trigger: trigger.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
          Claims: data.count,
          Payout: Math.round(data.total_payout),
        }))
    : [];

  const gatewayBarData = analytics?.payout_gateway_stats?.by_gateway
    ? Object.entries(analytics.payout_gateway_stats.by_gateway).map(([gw, data]) => ({
        gateway: gw.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
        Completed: data.completed,
        Failed: data.failed,
        Amount: Math.round(data.total_amount),
      }))
    : [];

  const statusPieData = analytics?.status_breakdown
    ? [
        { name: "Auto-approved", value: analytics.status_breakdown["auto-approve"] ?? 0, fill: "#22c55e" },
        { name: "Flagged", value: analytics.status_breakdown["approve-with-flag"] ?? 0, fill: "#f59e0b" },
        { name: "Held", value: analytics.status_breakdown["hold-for-review"] ?? 0, fill: "#f97316" },
        { name: "Rejected", value: analytics.status_breakdown["auto-reject"] ?? 0, fill: "#ef4444" },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <>
      {/* ── Hero metrics ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={Users}        label="Workers"  value={fmt(s?.total_workers ?? 0)} />
        <Stat icon={AlertTriangle} label="Claims"   value={fmt(s?.total_claims ?? 0)} />
        <Stat icon={IndianRupee}  label="Payouts"  value={`₹${fmt(s?.total_payouts ?? 0)}`} />
        <Stat icon={TrendingUp}   label="Revenue"  value={`₹${s?.weekly_premium_revenue ?? 0}/wk`} sub={`₹${s?.monthly_premium_revenue ?? 0}/mo`} />
      </div>

      {/* ── Claims Timeline Chart ─────────────────────────────────── */}
      {timelineData.length > 0 && (
        <CollapsibleSection title="7-Day Claims & Payouts" icon={BarChart3} defaultOpen>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="claimGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="payoutGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 13 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#888", fontSize: 13 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 12, color: "#fff", fontSize: 14 }}
                  labelStyle={{ color: "#aaa" }}
                />
                <Legend wrapperStyle={{ fontSize: 13, color: "#888" }} />
                <Area type="monotone" dataKey="Claims" stroke="#6366f1" fill="url(#claimGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="Payouts" stroke="#22c55e" fill="url(#payoutGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="h-48 mt-4">
            <p className="text-sm text-muted-foreground/50 mb-2 font-semibold uppercase tracking-wider">Avg Fraud Score (%)</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 13 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#888", fontSize: 13 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 12, color: "#fff", fontSize: 14 }}
                  labelStyle={{ color: "#aaa" }}
                />
                <Bar dataKey="Fraud %" radius={[6, 6, 0, 0]}>
                  {timelineData.map((entry, i) => (
                    <Cell key={i} fill={entry["Fraud %"] > 70 ? "#ef4444" : entry["Fraud %"] > 30 ? "#f59e0b" : "#22c55e"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>
      )}

      {/* ── Fraud & Status Charts ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {fraudPieData.length > 0 && (
          <CollapsibleSection title="Fraud Risk Distribution" icon={Shield} defaultOpen>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={fraudPieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {fraudPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 12, color: "#fff", fontSize: 14 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground/50 pt-1">
              <span>Avg score: <span className="text-foreground/70 font-medium tabular-nums">{pct(analytics?.fraud_stats.avg_score ?? 0)}</span></span>
              <span className="text-accent-green/80 font-medium">{analytics?.fraud_stats.low_risk ?? 0} auto-approved</span>
            </div>
          </CollapsibleSection>
        )}

        {statusPieData.length > 0 && (
          <CollapsibleSection title="Claim Resolution" icon={CheckCircle2} defaultOpen>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%" cy="50%"
                    innerRadius={50} outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 12, color: "#fff", fontSize: 14 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl bg-foreground/[0.03] divide-y divide-border/20">
              {([
                { key: "auto-approve", label: "Instant Approve", icon: CheckCircle2, cls: "text-accent-green" },
                { key: "approve-with-flag", label: "Approved + Flag", icon: Eye, cls: "text-warning" },
                { key: "hold-for-review", label: "Held for Review", icon: Clock, cls: "text-orange-400" },
                { key: "auto-reject", label: "Auto-Rejected", icon: XCircle, cls: "text-destructive" },
              ] as const).map((t) => {
                const count = analytics?.status_breakdown[t.key] ?? 0;
                return (
                  <div key={t.key} className="flex items-center gap-3 px-4 py-2.5">
                    <t.icon className={`w-4 h-4 ${t.cls} shrink-0`} strokeWidth={1.5} />
                    <span className="text-base text-foreground/80 font-medium flex-1">{t.label}</span>
                    <span className="text-base font-semibold tabular-nums text-foreground/70">{count}</span>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* ── Triggers Bar Chart ────────────────────────────────────── */}
      {triggerBarData.length > 0 && (
        <CollapsibleSection title="Claims by Trigger" icon={Zap} defaultOpen>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={triggerBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fill: "#888", fontSize: 13 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="trigger" tick={{ fill: "#ccc", fontSize: 13 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 12, color: "#fff", fontSize: 14 }}
                  labelStyle={{ color: "#aaa" }}
                />
                <Bar dataKey="Claims" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>
      )}

      {/* ── Two-col: Loss Ratios + Payment Gateways ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CollapsibleSection title="Loss Ratios" icon={TrendingUp} defaultOpen>
          {(["weekly", "monthly", "overall"] as const).map((period) => {
            const v = analytics?.loss_ratios[period] ?? 0;
            return (
              <div key={period}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base text-foreground/80 capitalize">{period}</span>
                  <span className={`text-base font-semibold tabular-nums ${lrColor(v)}`}>{pct(v)}</span>
                </div>
                <div className="h-1 rounded-full bg-foreground/[0.06] overflow-hidden">
                  <div className={`h-full rounded-full ${lrBg(v)} transition-all`} style={{ width: `${Math.min(v * 100, 100)}%` }} />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground/40 pt-1">Target &lt; 65%  •  BCR 0.65 stress-tested for 14-day monsoon</p>
        </CollapsibleSection>

        <CollapsibleSection title="Payment Gateways" icon={CreditCard}>
          {gatewayBarData.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-foreground/[0.03] p-4">
                  <p className="text-2xl font-semibold text-foreground tabular-nums">{analytics?.payout_gateway_stats.total_completed}</p>
                  <p className="text-sm text-muted-foreground/50 mt-0.5">Completed</p>
                </div>
                <div className="rounded-xl bg-foreground/[0.03] p-4">
                  <p className="text-2xl font-semibold text-accent-green tabular-nums">₹{analytics?.payout_gateway_stats.total_amount_disbursed}</p>
                  <p className="text-sm text-muted-foreground/50 mt-0.5">Disbursed</p>
                </div>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gatewayBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="gateway" tick={{ fill: "#ccc", fontSize: 13 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#888", fontSize: 13 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 12, color: "#fff", fontSize: 14 }}
                      labelStyle={{ color: "#aaa" }}
                    />
                    <Legend wrapperStyle={{ fontSize: 13, color: "#888" }} />
                    <Bar dataKey="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Failed" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-muted-foreground/40">Avg processing: {analytics?.payout_gateway_stats.avg_processing_time_ms}ms</p>
            </>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground/40">
              <CreditCard className="w-5 h-5 shrink-0" strokeWidth={1.5} />
              <p className="text-sm">No transactions yet. Run a claim to generate data.</p>
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* ── Workers & Trust (collapsed by default) ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CollapsibleSection title="Worker Trust Segments" icon={Users}>
          {([
            { label: "Gold", desc: "Trust ≥ 80%", count: analytics?.worker_segments.gold ?? 0, dot: "bg-yellow-400" },
            { label: "Silver", desc: "Trust ≥ 60%", count: analytics?.worker_segments.silver ?? 0, dot: "bg-foreground/30" },
            { label: "Standard", desc: "Trust ≥ 40%", count: analytics?.worker_segments.standard ?? 0, dot: "bg-foreground/15" },
            { label: "Review", desc: "Under review", count: analytics?.worker_segments.review ?? 0, dot: "bg-destructive/60" },
          ]).map((seg) => {
            const total = (analytics?.summary.total_workers ?? 1) || 1;
            return (
              <div key={seg.label} className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${seg.dot} shrink-0`} />
                <span className="text-base text-foreground/90 font-medium flex-1">{seg.label}</span>
                <span className="text-sm text-muted-foreground/40 mr-1">{seg.desc}</span>
                <span className="text-base font-semibold tabular-nums text-foreground/80">{seg.count}</span>
                <span className="text-sm text-muted-foreground/30 tabular-nums w-12 text-right">{((seg.count / total) * 100).toFixed(0)}%</span>
              </div>
            );
          })}
        </CollapsibleSection>

        <CollapsibleSection title="Registered Workers" icon={Users}>
          {adminUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground/40">No real users registered yet.</p>
          ) : (
            <div className="divide-y divide-border/20 max-h-72 overflow-y-auto">
              {adminUsers.slice(0, 12).map((u) => (
                <div key={u.user_id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-foreground truncate">{u.name || `User ${u.user_id}`}</p>
                    <p className="text-sm text-muted-foreground/60 truncate">
                      +91 {u.phone} • {u.city}{u.zone_area ? ` • ${u.zone_area}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-foreground/80">{u.selected_plan ?? "No plan"}</p>
                    <p className="text-sm text-accent-green">₹{fmt(Math.round(u.total_payout))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      </div>

      {/* ── IMD Alert Management ─────────────────────────────────── */}
      <CollapsibleSection title="IMD Alert Management" icon={AlertTriangle}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            placeholder="Zone (e.g. chennai)"
            className="h-11 rounded-xl bg-zinc-900 border border-border/40 px-3 text-base text-white placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
          <select
            value={alertLevel}
            onChange={(e) => setAlertLevel(e.target.value as any)}
            className={selectClasses}
          >
            <option value="green">Green</option>
            <option value="yellow">Yellow</option>
            <option value="orange">Orange</option>
            <option value="red">Red</option>
          </select>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as any)}
            className={selectClasses}
          >
            <option value="rain">Rain</option>
            <option value="cyclone">Cyclone</option>
            <option value="heatwave">Heatwave</option>
          </select>
          <button
            onClick={saveAlert}
            disabled={saving}
            className="h-11 rounded-xl bg-foreground text-background text-base font-semibold hover:bg-foreground/90 transition-colors disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save Alert"}
          </button>
        </div>
        {saveMsg && <p className="text-sm text-muted-foreground/60">{saveMsg}</p>}
        <button
          onClick={() => navigate("/admin/imd-alerts")}
          className="inline-flex items-center gap-1.5 text-sm text-foreground/50 hover:text-foreground transition-colors group"
        >
          View alert history
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </CollapsibleSection>

      {/* ── Demo Simulation ──────────────────────────────────────── */}
      <CollapsibleSection title="Demo Simulation" icon={Play}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base text-foreground/80 font-medium">End-to-End Disruption Pipeline</p>
            <p className="text-sm text-muted-foreground/40 mt-0.5">
              Create worker → trigger disruption → 5-layer fraud check → gateway payout — single click
            </p>
          </div>
          <button
            onClick={() => navigate("/demo")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-foreground/[0.06] border border-border/30 text-base font-medium text-foreground hover:bg-foreground/10 transition-colors"
          >
            <Play className="w-3.5 h-3.5" strokeWidth={2} />
            Run Demo
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {["Rainstorm", "Cyclone", "Heatwave", "Flooding", "Demand Crash"].map((s) => (
            <span key={s} className="px-2.5 py-1 rounded-full text-xs bg-foreground/[0.04] text-muted-foreground/50 font-medium">{s}</span>
          ))}
        </div>
      </CollapsibleSection>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  PREDICTIONS TAB                                                   */
/* ═══════════════════════════════════════════════════════════════════ */

function PredictionsTab({ predictions }: { predictions: PredictiveAnalytics | null }) {
  if (!predictions) {
    return <p className="text-base text-muted-foreground/40 py-20 text-center">No prediction data available.</p>;
  }

  const o = predictions.overall;
  const projectedLossRatio = o.predicted_loss_ratio ?? 0;
  const predictedWeeklyPremiumRevenue = o.predicted_weekly_premium_revenue ?? 0;

  const disruptionRows = Object.entries(predictions.disruption_breakdown ?? {})
    .map(([key, value]) => ({
      key,
      label: key
        .replace(/^weather_/, "Weather • ")
        .replace(/^platform_/, "Platform • ")
        .replace(/^external_/, "External • ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (m) => m.toUpperCase()),
      predicted_claims: value.predicted_claims,
      estimated_payout: value.estimated_payout,
    }))
    .filter((item) => item.predicted_claims > 0)
    .sort((a, b) => b.predicted_claims - a.predicted_claims);

  const disruptionBarData = disruptionRows.map((r) => ({
    name: r.label.length > 20 ? r.label.slice(0, 18) + "…" : r.label,
    Claims: r.predicted_claims,
    Payout: Math.round(r.estimated_payout),
  }));

  const cityBarData = predictions.city_forecasts
    .sort((a, b) => b.predicted_risk - a.predicted_risk)
    .map((c) => ({
      city: c.city,
      "Current Risk": c.current_risk,
      "Predicted Risk": c.predicted_risk,
    }));

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

      {/* ── Insurer Forecast Signals ─────────────────────────────── */}
      <CollapsibleSection title="Insurer Forecast Signals" icon={TrendingUp} defaultOpen>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-background/40 p-5">
            <p className="text-sm text-muted-foreground/50 uppercase font-semibold tracking-wider">Projected Loss Ratio (Next Week)</p>
            <p className={`text-3xl font-bold mt-1 ${lrColor(projectedLossRatio)}`}>{pct(projectedLossRatio)}</p>
            <div className="mt-3 h-2 rounded-full bg-foreground/[0.05] overflow-hidden">
              <div className={`h-full rounded-full ${lrBg(projectedLossRatio)}/70`} style={{ width: `${Math.min(projectedLossRatio * 100, 100)}%` }} />
            </div>
            <p className="text-sm text-muted-foreground/60 mt-3">
              Forecasted payout exposure versus projected premium revenue for the next 7 days.
            </p>
          </div>

          <div className="rounded-xl bg-background/40 p-5">
            <p className="text-sm text-muted-foreground/50 uppercase font-semibold tracking-wider">Projected Weekly Premium Revenue</p>
            <p className="text-3xl font-bold text-foreground mt-1">₹{fmt(Math.round(predictedWeeklyPremiumRevenue))}</p>
            <p className="text-sm text-muted-foreground/60 mt-3">
              Used as the denominator for projected loss ratio and reserve adequacy planning.
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* ── Disruption Breakdown Chart ────────────────────────────── */}
      {disruptionBarData.length > 0 && (
        <CollapsibleSection title="Predicted Disruption Breakdown" icon={Zap} defaultOpen>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={disruptionBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" tick={{ fill: "#888", fontSize: 13 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#ccc", fontSize: 13 }} axisLine={false} tickLine={false} width={140} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 12, color: "#fff", fontSize: 14 }}
                  labelStyle={{ color: "#aaa" }}
                  formatter={(value: number, name: string) => [name === "Payout" ? `₹${fmt(value)}` : value, name]}
                />
                <Legend wrapperStyle={{ fontSize: 13, color: "#888" }} />
                <Bar dataKey="Claims" fill="#6366f1" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Payout" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>
      )}

      {/* ── City Risk Comparison Chart ────────────────────────────── */}
      {cityBarData.length > 0 && (
        <CollapsibleSection title="City Risk Comparison" icon={MapPin} defaultOpen>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="city" tick={{ fill: "#ccc", fontSize: 13 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#888", fontSize: 13 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 12, color: "#fff", fontSize: 14 }}
                  labelStyle={{ color: "#aaa" }}
                />
                <Legend wrapperStyle={{ fontSize: 13, color: "#888" }} />
                <Bar dataKey="Current Risk" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Predicted Risk" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>
      )}

      {/* ── City forecast cards ───────────────────────────────────── */}
      <CollapsibleSection title="City-wise Forecast Details" icon={MapPin}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {predictions.city_forecasts
            .sort((a, b) => b.predicted_risk - a.predicted_risk)
            .map((city) => {
              const trend = city.predicted_risk - city.current_risk;
              const trendUp = trend > 0;
              return (
                <div key={city.city} className="rounded-xl bg-background/40 border border-border/20 p-4 hover:border-border/40 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${riskBg(city.predicted_risk)}/10 flex items-center justify-center`}>
                        <MapPin className={`w-4 h-4 ${riskColor(city.predicted_risk)}`} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-foreground">{city.city}</p>
                        <p className="text-sm text-muted-foreground/50 capitalize">
                          {city.current_trigger_type === "none" ? "No triggers" : city.current_trigger_type.replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${riskBg(city.predicted_risk)}/10 ${riskColor(city.predicted_risk)} uppercase`}>
                      {riskLabel(city.predicted_risk)}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-foreground/[0.03] rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-foreground tabular-nums">{city.predicted_claims}</p>
                      <p className="text-xs text-muted-foreground/50 uppercase">Claims</p>
                    </div>
                    <div className="bg-foreground/[0.03] rounded-lg p-3 text-center">
                      <p className="text-lg font-bold text-foreground tabular-nums">₹{fmt(Math.round(city.estimated_payout))}</p>
                      <p className="text-xs text-muted-foreground/50 uppercase">Payout</p>
                    </div>
                    <div className="bg-foreground/[0.03] rounded-lg p-3 text-center">
                      <p className={`text-lg font-bold tabular-nums ${trendUp ? "text-destructive" : "text-accent-green"}`}>
                        {trendUp ? "↑" : "↓"}{Math.abs(trend)}
                      </p>
                      <p className="text-xs text-muted-foreground/50 uppercase">Trend</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {([
                      { label: "Current", value: city.current_risk },
                      { label: "Predicted", value: city.predicted_risk },
                    ] as const).map((bar) => (
                      <div key={bar.label} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground/50 w-16 shrink-0">{bar.label}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-foreground/[0.04] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${riskBg(bar.value)}/60`}
                            style={{ width: `${Math.max(bar.value, 3)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-semibold tabular-nums w-8 text-right ${riskColor(bar.value)}`}>{bar.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                    <div className="flex flex-wrap gap-1">
                      {city.risk_factors.length > 0 ? city.risk_factors.map((f) => (
                        <span key={f} className="px-2 py-0.5 rounded text-xs bg-foreground/[0.06] text-muted-foreground/60 font-medium">{f}</span>
                      )) : (
                        <span className="text-xs text-muted-foreground/30 italic">Stable</span>
                      )}
                    </div>
                    <span className={`text-xs font-semibold tabular-nums ${city.confidence > 0.8 ? "text-accent-green" : "text-muted-foreground/40"}`}>
                      {(city.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </CollapsibleSection>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  CATASTROPHE WHAT-IF MODELER TAB                                   */
/* ═══════════════════════════════════════════════════════════════════ */

const CATASTROPHE_CITIES = ["Mumbai", "Chennai", "Bengaluru", "Kolkata", "Delhi", "Hyderabad", "Kochi", "Coimbatore"];
const CATASTROPHE_EVENTS = [
  { id: "cyclone", label: "Cyclone", icon: Wind },
  { id: "flood", label: "Mega Flood", icon: Waves },
  { id: "heatwave", label: "Extreme Heatwave", icon: Flame },
  { id: "rain", label: "Torrential Rain", icon: CloudRain },
] as const;

function WhatIfTab({
  analytics,
  predictions,
}: {
  analytics: AdminAnalytics | null;
  predictions: PredictiveAnalytics | null;
}) {
  const [selectedCity, setSelectedCity] = useState("Mumbai");
  const [selectedEvent, setSelectedEvent] = useState<(typeof CATASTROPHE_EVENTS)[number]["id"]>("cyclone");
  const [severity, setSeverity] = useState(70);
  const [durationDays, setDurationDays] = useState(3);
  const [workerExposure, setWorkerExposure] = useState(60);
  const [projection, setProjection] = useState<import("@/lib/api").WhatIfProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const event = CATASTROPHE_EVENTS.find((e) => e.id === selectedEvent) ?? CATASTROPHE_EVENTS[0];
  const EventIcon = event.icon;

  // Fetch real projection from backend on every slider/selector change
  const fetchProjection = useCallback(async () => {
    setLoading(true);
    try {
      const res = await import("@/lib/api").then((m) =>
        m.getWhatIfProjection({ city: selectedCity, event: selectedEvent, severity, duration_days: durationDays, worker_exposure: workerExposure })
      );
      setProjection(res);
    } catch {
      // keep last projection
    } finally {
      setLoading(false);
    }
  }, [selectedCity, selectedEvent, severity, durationDays, workerExposure]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchProjection, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [fetchProjection]);

  // Derived values from real API response
  const p = projection?.projections;
  const b = projection?.baselines;
  const projectedClaims = p?.claims ?? 0;
  const projectedPayout = p?.payout ?? 0;
  const projectedFraud = p?.fraud_rate ?? 0;
  const projectedLossRatio = p?.loss_ratio ?? 0;
  const reserveGap = p?.reserve_gap ?? 0;
  const dayTimeline = (projection?.daily_timeline ?? []).map((d) => ({ day: d.day, Claims: d.claims, Payout: d.payout }));
  const recommendations = projection?.recommendations ?? [];

  return (
    <>
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
          <FlaskConical className="w-6 h-6 text-warning" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Catastrophe What-If Modeler</h2>
          <p className="text-sm text-muted-foreground/60">Model financial impact of extreme weather events before they happen</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Controls ────────────────────────────────────────────── */}
        <div className="space-y-5">
          <CollapsibleSection title="Scenario Configuration" icon={FlaskConical} defaultOpen>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-foreground/70 mb-1 block">Target City</span>
                <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className={selectClasses + " w-full"}>
                  {CATASTROPHE_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <div>
                <span className="text-sm font-medium text-foreground/70 mb-2 block">Event Type</span>
                <div className="grid grid-cols-2 gap-2">
                  {CATASTROPHE_EVENTS.map((ev) => {
                    const Icon = ev.icon;
                    const active = selectedEvent === ev.id;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev.id)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          active ? "border-warning/50 bg-warning/[0.08]" : "border-border/40 bg-card/30 hover:bg-card/50"
                        }`}
                      >
                        <Icon className={`w-4 h-4 mb-1 ${active ? "text-warning" : "text-muted-foreground/50"}`} strokeWidth={1.5} />
                        <p className={`text-sm font-semibold ${active ? "text-foreground" : "text-foreground/60"}`}>{ev.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground/70">Severity</span>
                  <span className={`text-sm font-bold tabular-nums ${severity > 80 ? "text-destructive" : severity > 50 ? "text-warning" : "text-accent-green"}`}>{severity}%</span>
                </div>
                <input type="range" min={10} max={100} value={severity} onChange={(e) => setSeverity(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-foreground/10 accent-warning cursor-pointer" />
                <div className="flex justify-between text-xs text-muted-foreground/40 mt-1"><span>Moderate</span><span>Catastrophic</span></div>
              </label>

              <label className="block">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground/70">Duration</span>
                  <span className="text-sm font-bold tabular-nums text-foreground">{durationDays} day{durationDays > 1 ? "s" : ""}</span>
                </div>
                <input type="range" min={1} max={14} value={durationDays} onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-foreground/10 accent-primary cursor-pointer" />
              </label>

              <label className="block">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground/70">Worker Exposure</span>
                  <span className="text-sm font-bold tabular-nums text-foreground">{workerExposure}%</span>
                </div>
                <input type="range" min={10} max={100} value={workerExposure} onChange={(e) => setWorkerExposure(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none bg-foreground/10 accent-primary cursor-pointer" />
                <div className="flex justify-between text-xs text-muted-foreground/40 mt-1"><span>Localized</span><span>City-wide</span></div>
              </label>
            </div>
          </CollapsibleSection>

          {/* Real-data baselines */}
          {b && (
            <CollapsibleSection title="Real Data Baselines" icon={Activity} defaultOpen>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-card/40 p-2.5"><p className="text-xs text-muted-foreground/50">Total Workers</p><p className="text-lg font-bold text-foreground tabular-nums">{fmt(b.total_workers)}</p></div>
                <div className="rounded-xl bg-card/40 p-2.5"><p className="text-xs text-muted-foreground/50">{selectedCity} Workers</p><p className="text-lg font-bold text-foreground tabular-nums">{fmt(b.city_workers)}</p></div>
                <div className="rounded-xl bg-card/40 p-2.5"><p className="text-xs text-muted-foreground/50">Exposed Workers</p><p className="text-lg font-bold text-warning tabular-nums">{fmt(b.exposed_workers)}</p></div>
                <div className="rounded-xl bg-card/40 p-2.5"><p className="text-xs text-muted-foreground/50">Avg Payout/Claim</p><p className="text-lg font-bold text-foreground tabular-nums">₹{fmt(Math.round(b.historical_avg_payout))}</p></div>
                <div className="rounded-xl bg-card/40 p-2.5"><p className="text-xs text-muted-foreground/50">Avg Fraud Rate</p><p className="text-lg font-bold text-foreground tabular-nums">{pct(b.historical_avg_fraud)}</p></div>
                <div className="rounded-xl bg-card/40 p-2.5"><p className="text-xs text-muted-foreground/50">Claims/Worker/Wk</p><p className="text-lg font-bold text-foreground tabular-nums">{b.claims_per_worker_week.toFixed(1)}</p></div>
              </div>
            </CollapsibleSection>
          )}
        </div>

        {/* ── Financial Impact ────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Loading overlay */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground/60">
              <div className="w-4 h-4 border-2 border-foreground/10 border-t-foreground/60 rounded-full animate-spin" />
              Recalculating from real worker data…
            </div>
          )}

          {/* Impact KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl bg-card/60 border border-border/30 p-4">
              <EventIcon className="w-5 h-5 text-warning mb-2" strokeWidth={1.5} />
              <p className="text-2xl font-bold text-foreground tabular-nums">{fmt(projectedClaims)}</p>
              <p className="text-xs text-muted-foreground/50">Projected Claims</p>
            </div>
            <div className="rounded-2xl bg-card/60 border border-border/30 p-4">
              <IndianRupee className="w-5 h-5 text-destructive mb-2" strokeWidth={1.5} />
              <p className="text-2xl font-bold text-foreground tabular-nums">₹{fmt(projectedPayout)}</p>
              <p className="text-xs text-muted-foreground/50">Projected Payouts</p>
            </div>
            <div className="rounded-2xl bg-card/60 border border-border/30 p-4">
              <TrendingUp className="w-5 h-5 text-warning mb-2" strokeWidth={1.5} />
              <p className={`text-2xl font-bold tabular-nums ${lrColor(projectedLossRatio)}`}>{pct(projectedLossRatio)}</p>
              <p className="text-xs text-muted-foreground/50">Stress Loss Ratio</p>
            </div>
            <div className="rounded-2xl bg-card/60 border border-border/30 p-4">
              <Shield className="w-5 h-5 text-primary mb-2" strokeWidth={1.5} />
              <p className={`text-2xl font-bold tabular-nums ${reserveGap > 0 ? "text-destructive" : "text-accent-green"}`}>
                {reserveGap > 0 ? `−₹${fmt(Math.round(reserveGap))}` : `+₹${fmt(Math.abs(Math.round(reserveGap)))}`}
              </p>
              <p className="text-xs text-muted-foreground/50">Reserve Gap</p>
            </div>
          </div>

          {/* Scenario summary banner */}
          <div className={`rounded-2xl p-5 border ${projectedLossRatio > 0.8 ? "bg-destructive/[0.06] border-destructive/20" : projectedLossRatio > 0.5 ? "bg-warning/[0.06] border-warning/20" : "bg-accent-green/[0.06] border-accent-green/20"}`}>
            <div className="flex items-center gap-3 mb-2">
              <EventIcon className={`w-6 h-6 ${projectedLossRatio > 0.8 ? "text-destructive" : projectedLossRatio > 0.5 ? "text-warning" : "text-accent-green"}`} strokeWidth={1.5} />
              <h3 className="text-lg font-bold text-foreground">
                {event.label} in {selectedCity} — {severity}% severity × {durationDays}d
              </h3>
            </div>
            <p className="text-sm text-muted-foreground/70">
              {projectedLossRatio > 1.0
                ? `CRITICAL: Loss ratio exceeds 100%. Reserve shortfall of ₹${fmt(reserveGap)}. Recommend emergency reinsurance activation and claim throttling.`
                : projectedLossRatio > 0.65
                  ? `WARNING: Loss ratio above BCR threshold (65%). Consider activating dynamic premium surcharge and increasing fraud vigilance to ${Math.round(projectedFraud * 100)}% sensitivity.`
                  : `Scenario within acceptable parameters. Current reserves sufficient. Expected fraud uplift: ${Math.round(projectedFraud * 100)}%.`}
            </p>
          </div>

          {/* Day-by-day chart */}
          <CollapsibleSection title="Projected Daily Impact" icon={BarChart3} defaultOpen>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="day" tick={{ fill: "#888", fontSize: 13 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#888", fontSize: 13 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 12, color: "#fff", fontSize: 14 }} />
                  <Legend wrapperStyle={{ fontSize: 13, color: "#888" }} />
                  <Bar dataKey="Claims" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Payout" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CollapsibleSection>

          {/* Recommended actions from API */}
          <CollapsibleSection title="AI Recommended Actions" icon={Zap} defaultOpen>
            <div className="space-y-2">
              {recommendations.length === 0 ? (
                <p className="text-sm text-muted-foreground/40 py-4 text-center">Adjust scenario to generate recommendations</p>
              ) : recommendations.map((action, i) => {
                const sev = action.severity === "critical" ? "destructive" : action.severity === "warning" ? "warning" : "accent-green";
                return (
                  <div key={i} className={`flex items-start gap-3 rounded-xl p-3 bg-${sev}/[0.06] border border-${sev}/20`}>
                    <Zap className={`w-4 h-4 text-${sev} mt-0.5 shrink-0`} strokeWidth={1.5} />
                    <p className="text-sm text-foreground/80">{action.text}</p>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  INTELLIGENCE TAB (Anomaly Feed + Heatmap + Watchlist)             */
/* ═══════════════════════════════════════════════════════════════════ */

type AnomalyEvent = import("@/lib/api").AnomalyEvent;

type WatchlistEntry = {
  id: number;
  type: "worker" | "zone" | "pattern";
  label: string;
  reason: string;
  addedAt: string;
  hits: number;
};

const SEVERITY_COLORS: Record<AnomalyEvent["severity"], { dot: string; bg: string; text: string }> = {
  critical: { dot: "bg-destructive", bg: "bg-destructive/[0.06]", text: "text-destructive" },
  high: { dot: "bg-orange-500", bg: "bg-orange-500/[0.06]", text: "text-orange-400" },
  medium: { dot: "bg-warning", bg: "bg-warning/[0.06]", text: "text-warning" },
  low: { dot: "bg-accent-green", bg: "bg-accent-green/[0.06]", text: "text-accent-green" },
};

const TYPE_ICONS: Record<AnomalyEvent["type"], typeof Shield> = {
  fraud: Shield,
  cluster: Crosshair,
  velocity: Zap,
  geo: MapPin,
  pattern: Activity,
};

const WATCHLIST_KEY = "guidewire_watchlist";

function loadWatchlist(): WatchlistEntry[] {
  try {
    const raw = localStorage.getItem(WATCHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveWatchlist(entries: WatchlistEntry[]) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(entries));
}

function IntelTab({
  analytics,
  adminUsers,
}: {
  analytics: AdminAnalytics | null;
  adminUsers: AdminUserRow[];
}) {
  // ── Anomaly Feed (from REAL backend) ──
  const [anomalies, setAnomalies] = useState<AnomalyEvent[]>([]);
  const [anomalyStats, setAnomalyStats] = useState<import("@/lib/api").AnomalyResponse["stats"] | null>(null);
  const [feedPaused, setFeedPaused] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAnomalies = useCallback(async () => {
    setFeedLoading(true);
    try {
      const res = await import("@/lib/api").then((m) => m.getAnomalies());
      setAnomalies(res.anomalies);
      setAnomalyStats(res.stats);
    } catch { /* keep last */ }
    finally { setFeedLoading(false); }
  }, []);

  // Initial fetch
  useEffect(() => { fetchAnomalies(); }, [fetchAnomalies]);

  // Auto-refresh every 10s (unless paused)
  useEffect(() => {
    if (feedPaused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(fetchAnomalies, 10000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [feedPaused, fetchAnomalies]);

  // ── Heatmap (from REAL backend) ──
  const [heatmapData, setHeatmapData] = useState<import("@/lib/api").HeatmapCityData[]>([]);
  const [clusterData, setClusterData] = useState<import("@/lib/api").HeatmapCluster[]>([]);
  const [workerRisk, setWorkerRisk] = useState<import("@/lib/api").WorkerRisk[]>([]);
  const [heatmapSummary, setHeatmapSummary] = useState<import("@/lib/api").WorkerHeatmapResponse["summary"] | null>(null);

  useEffect(() => {
    import("@/lib/api").then((m) => m.getWorkerHeatmap()).then((res) => {
      setHeatmapData(res.city_data);
      setClusterData(res.cluster_data);
      setWorkerRisk(res.worker_risk);
      setHeatmapSummary(res.summary);
    }).catch(() => {});
  }, []);

  // ── Watchlist (localStorage persisted) ──
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(loadWatchlist);
  const [watchInput, setWatchInput] = useState("");
  const [watchType, setWatchType] = useState<"worker" | "zone" | "pattern">("worker");
  const [watchReason, setWatchReason] = useState("");

  // Persist on change
  useEffect(() => { saveWatchlist(watchlist); }, [watchlist]);

  // Count hits: how many anomalies match each watchlist entry
  const watchlistWithHits = watchlist.map((entry) => {
    const hits = anomalies.filter((a) => {
      if (entry.type === "worker" && a.worker_id) {
        return entry.label.toLowerCase().includes(String(a.worker_id));
      }
      if (entry.type === "zone") {
        return a.zone.replace(/_/g, " ").toLowerCase().includes(entry.label.toLowerCase());
      }
      if (entry.type === "pattern") {
        return a.title.toLowerCase().includes(entry.label.toLowerCase()) || a.detail.toLowerCase().includes(entry.label.toLowerCase());
      }
      return false;
    }).length;
    return { ...entry, hits };
  });

  const addToWatchlist = () => {
    if (!watchInput.trim() || !watchReason.trim()) return;
    setWatchlist((prev) => [
      { id: Date.now(), type: watchType, label: watchInput.trim(), reason: watchReason.trim(), addedAt: new Date().toISOString(), hits: 0 },
      ...prev,
    ]);
    setWatchInput("");
    setWatchReason("");
  };

  const removeFromWatchlist = (id: number) => {
    setWatchlist((prev) => prev.filter((w) => w.id !== id));
  };

  // ── Filter for anomaly feed ──
  const [severityFilter, setSeverityFilter] = useState<AnomalyEvent["severity"] | "all">("all");
  const filteredAnomalies = severityFilter === "all" ? anomalies : anomalies.filter((a) => a.severity === severityFilter);

  return (
    <>
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Radio className="w-6 h-6 text-primary" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Intelligence Center</h2>
          <p className="text-sm text-muted-foreground/60">Real-time anomaly detection, geographic analysis, and behavioral monitoring</p>
        </div>
      </div>

      {/* ── Live Anomaly Feed ─────────────────────────────────────── */}
      <CollapsibleSection title="Live Anomaly Feed" icon={Radio} defaultOpen>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${feedPaused ? "bg-muted-foreground/30" : "bg-destructive animate-pulse"}`} />
            <span className="text-sm font-medium text-foreground/70">
              {feedPaused ? "Paused" : feedLoading ? "Refreshing…" : "Live"} · {filteredAnomalies.length} events
              {anomalyStats && ` · ${anomalyStats.total_claims_analyzed} claims analyzed`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {anomalyStats && (
              <div className="flex items-center gap-1.5 mr-2">
                {anomalyStats.critical > 0 && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">{anomalyStats.critical} crit</span>}
                {anomalyStats.high > 0 && <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400">{anomalyStats.high} high</span>}
              </div>
            )}
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as any)} className={selectClasses + " h-8 text-xs px-2"}>
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button
              onClick={() => setFeedPaused((p) => !p)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-foreground/[0.06] border border-border/30 text-foreground hover:bg-foreground/10 transition-colors"
            >
              {feedPaused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={fetchAnomalies}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
          {filteredAnomalies.length === 0 ? (
            <p className="text-sm text-muted-foreground/40 py-8 text-center">
              {anomalyStats?.total_claims_analyzed === 0 ? "No claims data yet — register workers and file claims to see real anomalies" : "No anomalies detected — all claims look clean"}
            </p>
          ) : filteredAnomalies.map((evt) => {
            const colors = SEVERITY_COLORS[evt.severity];
            const Icon = TYPE_ICONS[evt.type];
            const ago = Math.round((Date.now() - new Date(evt.timestamp).getTime()) / 1000);
            const timeLabel = ago < 60 ? `${ago}s ago` : ago < 3600 ? `${Math.floor(ago / 60)}m ago` : ago < 86400 ? `${Math.floor(ago / 3600)}h ago` : `${Math.floor(ago / 86400)}d ago`;
            return (
              <div key={evt.id} className={`${colors.bg} rounded-xl p-3 border border-transparent hover:border-border/20 transition-all`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon className={`w-3.5 h-3.5 ${colors.text} shrink-0`} strokeWidth={1.5} />
                      <span className="text-sm font-semibold text-foreground truncate">{evt.title}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} uppercase shrink-0`}>{evt.severity}</span>
                    </div>
                    <p className="text-xs text-muted-foreground/70">{evt.detail}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-muted-foreground/40 flex items-center gap-1"><MapPin className="w-3 h-3" />{evt.zone.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground/40 flex items-center gap-1"><Clock className="w-3 h-3" />{timeLabel}</span>
                      {evt.worker_id && <span className="text-xs text-muted-foreground/40">Worker #{evt.worker_id}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (evt.worker_id) {
                        setWatchInput(`Worker #${evt.worker_id}`);
                        setWatchType("worker");
                        setWatchReason(evt.title);
                      } else {
                        setWatchInput(evt.zone.replace(/_/g, " "));
                        setWatchType("zone");
                        setWatchReason(evt.title);
                      }
                    }}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-foreground/10 transition-colors"
                    title="Add to watchlist"
                  >
                    <Eye className="w-3.5 h-3.5 text-muted-foreground/50" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>

      {/* ── Worker Behavior Heatmap ───────────────────────────────── */}
      <CollapsibleSection title="Worker Behavior Heatmap" icon={Crosshair} defaultOpen>
        {/* Summary stats from real data */}
        {heatmapSummary && (
          <div className="grid grid-cols-4 gap-2 mb-4">
            <div className="rounded-xl bg-card/40 p-2.5 text-center"><p className="text-xs text-muted-foreground/50">Workers</p><p className="text-lg font-bold text-foreground tabular-nums">{heatmapSummary.total_workers}</p></div>
            <div className="rounded-xl bg-card/40 p-2.5 text-center"><p className="text-xs text-muted-foreground/50">Claims</p><p className="text-lg font-bold text-foreground tabular-nums">{heatmapSummary.total_claims}</p></div>
            <div className="rounded-xl bg-card/40 p-2.5 text-center"><p className="text-xs text-muted-foreground/50">Cities</p><p className="text-lg font-bold text-foreground tabular-nums">{heatmapSummary.cities_covered}</p></div>
            <div className="rounded-xl bg-card/40 p-2.5 text-center"><p className="text-xs text-muted-foreground/50">Zones</p><p className="text-lg font-bold text-foreground tabular-nums">{heatmapSummary.zones_active}</p></div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* City risk heatmap grid — REAL DATA */}
          <div>
            <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-wider mb-3">City Risk Matrix (Live)</p>
            {heatmapData.length === 0 ? (
              <p className="text-sm text-muted-foreground/40 py-8 text-center">No worker data yet — register workers to see city metrics</p>
            ) : (
            <div className="grid grid-cols-2 gap-2">
              {[...heatmapData].sort((a, b) => b.avg_fraud - a.avg_fraud).map((city) => {
                const heatPct = Math.round(city.avg_fraud * 100);
                const heat = heatPct > 25 ? "destructive" : heatPct > 15 ? "warning" : "accent-green";
                return (
                  <div key={city.city} className={`rounded-xl bg-${heat}/[0.06] border border-${heat}/20 p-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-foreground">{city.city}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full bg-${heat}/15 text-${heat}`}>{heatPct}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <div><span className="text-xs text-muted-foreground/50">Claims</span><p className="text-sm font-semibold text-foreground tabular-nums">{city.claims}</p></div>
                      <div><span className="text-xs text-muted-foreground/50">₹ Payouts</span><p className="text-sm font-semibold text-foreground tabular-nums">₹{fmt(Math.round(city.payouts))}</p></div>
                      <div><span className="text-xs text-muted-foreground/50">Workers</span><p className="text-sm font-semibold text-foreground tabular-nums">{city.workers}</p></div>
                      <div><span className="text-xs text-muted-foreground/50">Plans</span><p className="text-xs font-semibold text-foreground">{Object.entries(city.plans).map(([p,c]) => `${p}:${c}`).join(" ")}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* Claim cluster scatter plot — REAL ZONE DATA */}
          <div>
            <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-wider mb-3">Zone Claim Clusters (Live)</p>
            {clusterData.length === 0 ? (
              <p className="text-sm text-muted-foreground/40 py-8 text-center">No zone claim data yet</p>
            ) : (
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis type="number" dataKey="lon" name="Longitude" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis type="number" dataKey="lat" name="Latitude" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <ZAxis type="number" dataKey="claims" range={[40, 400]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #333", borderRadius: 12, color: "#fff", fontSize: 13 }}
                    formatter={(value: number, name: string) => {
                      if (name === "Fraud") return [`${Math.round(value * 100)}%`, "Fraud Score"];
                      return [value, name];
                    }}
                    labelFormatter={() => ""}
                  />
                  <Scatter data={clusterData.filter((d) => d.fraud < 0.2)} fill="#22c55e" fillOpacity={0.6} name="Low Risk" />
                  <Scatter data={clusterData.filter((d) => d.fraud >= 0.2 && d.fraud < 0.35)} fill="#f59e0b" fillOpacity={0.6} name="Medium Risk" />
                  <Scatter data={clusterData.filter((d) => d.fraud >= 0.35)} fill="#ef4444" fillOpacity={0.7} name="High Risk" />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#888" }} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
            )}
          </div>
        </div>

        {/* Worker Risk Table — from real data */}
        {workerRisk.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-wider mb-3">Top Risk Workers (Live)</p>
            <div className="max-h-[250px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background/95">
                  <tr className="text-xs text-muted-foreground/50 uppercase">
                    <th className="text-left p-2">Worker</th>
                    <th className="text-left p-2">City</th>
                    <th className="text-right p-2">Claims</th>
                    <th className="text-right p-2">Fraud</th>
                    <th className="text-right p-2">Payouts</th>
                    <th className="text-center p-2">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {workerRisk.slice(0, 20).map((w) => {
                    const riskColor = w.risk_level === "critical" ? "text-destructive" : w.risk_level === "high" ? "text-orange-400" : w.risk_level === "medium" ? "text-warning" : "text-accent-green";
                    return (
                      <tr key={w.worker_id} className="border-t border-border/10 hover:bg-foreground/[0.02]">
                        <td className="p-2 font-semibold text-foreground">#{w.worker_id} {w.name}</td>
                        <td className="p-2 text-muted-foreground/70">{w.city}</td>
                        <td className="p-2 text-right tabular-nums text-foreground">{w.total_claims} <span className="text-muted-foreground/40">({w.week_claims}w)</span></td>
                        <td className={`p-2 text-right tabular-nums font-bold ${riskColor}`}>{pct(w.avg_fraud)}</td>
                        <td className="p-2 text-right tabular-nums text-foreground">₹{fmt(Math.round(w.total_payout))}</td>
                        <td className="p-2 text-center">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${riskColor} bg-current/10 uppercase`}>{w.risk_level}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* ── Smart Alerts / Watchlist ──────────────────────────────── */}
      <CollapsibleSection title="Smart Alerts / Watchlist" icon={Bell} defaultOpen>
        {/* Add to watchlist */}
        <div className="rounded-xl bg-foreground/[0.02] border border-border/20 p-4 space-y-3">
          <p className="text-xs font-bold text-muted-foreground/50 uppercase tracking-wider">Add to Watchlist</p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select value={watchType} onChange={(e) => setWatchType(e.target.value as any)} className={selectClasses + " h-9 text-sm"}>
              <option value="worker">Worker</option>
              <option value="zone">Zone</option>
              <option value="pattern">Pattern</option>
            </select>
            <input
              value={watchInput}
              onChange={(e) => setWatchInput(e.target.value)}
              placeholder={watchType === "worker" ? "Worker #ID or name" : watchType === "zone" ? "Zone name" : "Pattern description"}
              className="h-9 rounded-xl bg-zinc-900 border border-border/40 px-3 text-sm text-white placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
            <input
              value={watchReason}
              onChange={(e) => setWatchReason(e.target.value)}
              placeholder="Reason for monitoring"
              className="h-9 rounded-xl bg-zinc-900 border border-border/40 px-3 text-sm text-white placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-foreground/20"
            />
            <button
              onClick={addToWatchlist}
              disabled={!watchInput.trim() || !watchReason.trim()}
              className="h-9 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
        </div>

        {/* Watchlist entries */}
        <div className="space-y-2">
          {watchlistWithHits.length === 0 ? (
            <p className="text-sm text-muted-foreground/40 py-4 text-center">Watchlist is empty — click the eye icon on any anomaly to add it</p>
          ) : watchlistWithHits.map((entry) => {
            const typeColor = entry.type === "worker" ? "text-primary" : entry.type === "zone" ? "text-warning" : "text-accent-green";
            const typeBg = entry.type === "worker" ? "bg-primary/10" : entry.type === "zone" ? "bg-warning/10" : "bg-accent-green/10";
            const hoursAgo = Math.round((Date.now() - new Date(entry.addedAt).getTime()) / 3600000);
            return (
              <div key={entry.id} className="flex items-center gap-3 rounded-xl bg-card/40 border border-border/20 p-3 hover:border-border/40 transition-all">
                <div className={`w-9 h-9 rounded-lg ${typeBg} flex items-center justify-center shrink-0`}>
                  {entry.type === "worker" ? <Users className={`w-4 h-4 ${typeColor}`} strokeWidth={1.5} /> :
                   entry.type === "zone" ? <MapPin className={`w-4 h-4 ${typeColor}`} strokeWidth={1.5} /> :
                   <Activity className={`w-4 h-4 ${typeColor}`} strokeWidth={1.5} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{entry.label}</span>
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${typeBg} ${typeColor} uppercase`}>{entry.type}</span>
                    {entry.hits > 0 && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">{entry.hits} hits</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/60 truncate">{entry.reason}</p>
                </div>
                <div className="text-right shrink-0 mr-1">
                  <p className="text-xs text-muted-foreground/40">
                    {hoursAgo < 1 ? "just now" : `${hoursAgo}h ago`}
                  </p>
                </div>
                <button
                  onClick={() => removeFromWatchlist(entry.id)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-destructive" strokeWidth={1.5} />
                </button>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  ML LAB TAB                                                        */
/* ═══════════════════════════════════════════════════════════════════ */

function MLLabTab() {
  const [mlStatus, setMlStatus] = useState<MLStatusResponse | null>(null);
  const [clusters, setClusters] = useState<ClaimClustersResponse | null>(null);
  const [workerRisk, setWorkerRisk] = useState<WorkerRiskResponse | null>(null);
  const [loadingML, setLoadingML] = useState(true);

  const refresh = useCallback(() => {
    setLoadingML(true);
    Promise.allSettled([getMLStatus(), getClaimClusters(), getWorkerRiskProfiles()])
      .then(([ml, cl, wr]) => {
        if (ml.status === "fulfilled") setMlStatus(ml.value);
        if (cl.status === "fulfilled") setClusters(cl.value);
        if (wr.status === "fulfilled") setWorkerRisk(wr.value);
      })
      .finally(() => setLoadingML(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (loadingML) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-foreground/10 border-t-foreground/60 rounded-full animate-spin" />
      </div>
    );
  }

  const statusColor = (s: string) =>
    s === "loaded" ? "text-accent-green" : s === "not_loaded" ? "text-warning" : "text-destructive";
  const statusDot = (s: string) =>
    s === "loaded" ? "bg-accent-green" : s === "not_loaded" ? "bg-warning" : "bg-destructive";
  const catColor = (c: string) =>
    c === "trusted" ? "text-accent-green" : c === "normal" ? "text-foreground/70" :
    c === "watch" ? "text-warning" : c === "flagged" ? "text-orange-400" : "text-destructive";
  const catBg = (c: string) =>
    c === "trusted" ? "bg-accent-green/10" : c === "normal" ? "bg-foreground/5" :
    c === "watch" ? "bg-warning/10" : c === "flagged" ? "bg-orange-400/10" : "bg-destructive/10";

  return (
    <>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground/90">ML Model Lab</h2>
          <p className="text-sm text-muted-foreground/50 mt-0.5">Live model status, fraud clusters, and worker risk intelligence</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground/[0.06] hover:bg-foreground/10 text-sm font-medium transition-colors"
        >
          <Activity className="w-4 h-4" strokeWidth={1.5} /> Refresh
        </button>
      </div>

      {/* ── Model Status Grid ── */}
      <CollapsibleSection title="Model Observatory" icon={Zap} defaultOpen>
        {mlStatus && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-foreground/[0.04] border border-border/30 p-4 text-center">
                <p className="text-2xl font-bold text-foreground/90">{mlStatus.loaded_models}/{mlStatus.total_models}</p>
                <p className="text-xs text-muted-foreground/50 mt-1">Models Loaded</p>
              </div>
              <div className="rounded-xl bg-foreground/[0.04] border border-border/30 p-4 text-center">
                <p className={`text-2xl font-bold ${mlStatus.system_health === "healthy" ? "text-accent-green" : "text-warning"}`}>
                  {mlStatus.system_health === "healthy" ? "Healthy" : "Degraded"}
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">System Health</p>
              </div>
              <div className="rounded-xl bg-foreground/[0.04] border border-border/30 p-4 text-center">
                <p className="text-2xl font-bold text-foreground/90">
                  {mlStatus.models.reduce((s, m) => s + (m.file_size_kb ?? 0), 0).toFixed(0)} KB
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">Total Model Size</p>
              </div>
            </div>

            <div className="space-y-2">
              {mlStatus.models.map((m) => (
                <div key={m.name} className="flex items-center gap-3 rounded-xl bg-foreground/[0.03] border border-border/20 px-4 py-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(m.status)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground/80 truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground/40">{m.algorithm} · {m.features} features</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium uppercase ${statusColor(m.status)}`}>{m.status.replace("_", " ")}</p>
                    {m.file_size_kb != null && (
                      <p className="text-[11px] text-muted-foreground/30">{m.file_size_kb.toFixed(1)} KB</p>
                    )}
                  </div>
                  {Object.keys(m.metrics ?? {}).length > 0 && (
                    <div className="flex gap-2 ml-2">
                      {Object.entries(m.metrics ?? {}).slice(0, 3).map(([k, v]) => (
                        <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-foreground/[0.05] text-muted-foreground/60">
                          {k}: {typeof v === "number" ? v.toFixed(3) : v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
        {!mlStatus && <p className="text-sm text-muted-foreground/40">Could not load model status.</p>}
      </CollapsibleSection>

      {/* ── Fraud Clusters ── */}
      <CollapsibleSection title="Fraud Ring Detector (DBSCAN)" icon={Crosshair} defaultOpen>
        {clusters ? (
          <>
            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="rounded-xl bg-foreground/[0.04] border border-border/30 p-3 text-center">
                <p className="text-lg font-bold text-foreground/90">{clusters.summary.total_claims_analyzed}</p>
                <p className="text-[11px] text-muted-foreground/50">Claims Analyzed</p>
              </div>
              <div className="rounded-xl bg-foreground/[0.04] border border-border/30 p-3 text-center">
                <p className="text-lg font-bold text-foreground/90">{clusters.summary.clusters_found}</p>
                <p className="text-[11px] text-muted-foreground/50">Clusters Found</p>
              </div>
              <div className="rounded-xl bg-foreground/[0.04] border border-border/30 p-3 text-center">
                <p className="text-lg font-bold text-destructive">{clusters.summary.suspicious_clusters}</p>
                <p className="text-[11px] text-muted-foreground/50">Suspicious</p>
              </div>
              <div className="rounded-xl bg-foreground/[0.04] border border-border/30 p-3 text-center">
                <p className="text-lg font-bold text-warning">{(clusters.summary.highest_suspicion * 100).toFixed(0)}%</p>
                <p className="text-[11px] text-muted-foreground/50">Peak Suspicion</p>
              </div>
            </div>

            {clusters.clusters.length === 0 ? (
              <p className="text-sm text-muted-foreground/40">No clusters detected — not enough claims yet.</p>
            ) : (
              <div className="space-y-3">
                {clusters.clusters
                  .sort((a, b) => b.suspicion_score - a.suspicion_score)
                  .map((cl) => (
                    <div
                      key={cl.cluster_id}
                      className={`rounded-xl border px-4 py-3 ${
                        cl.suspicion_score > 0.7
                          ? "border-destructive/30 bg-destructive/5"
                          : cl.suspicion_score > 0.4
                          ? "border-warning/30 bg-warning/5"
                          : "border-border/30 bg-foreground/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground/80">Cluster #{cl.cluster_id}</span>
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                              cl.suspicion_score > 0.7
                                ? "bg-destructive/10 text-destructive"
                                : cl.suspicion_score > 0.4
                                ? "bg-warning/10 text-warning"
                                : "bg-accent-green/10 text-accent-green"
                            }`}
                          >
                            {(cl.suspicion_score * 100).toFixed(0)}% suspicious
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground/40">{cl.size} claims · {cl.unique_workers} workers</span>
                      </div>
                      <p className="text-xs text-muted-foreground/60 mb-2">{cl.reason}</p>
                      <div className="flex gap-4 text-[11px] text-muted-foreground/40">
                        <span>Avg fraud: {(cl.avg_fraud_score * 100).toFixed(0)}%</span>
                        <span>Payout: ₹{cl.total_payout.toLocaleString("en-IN")}</span>
                        <span>Spread: {cl.geographic_spread_km.toFixed(1)} km</span>
                        <span>Span: {cl.time_span_hours.toFixed(1)}h</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground/40">Could not load cluster data.</p>
        )}
      </CollapsibleSection>

      {/* ── Worker Risk Profiler ── */}
      <CollapsibleSection title="Dynamic Worker Risk Profiler (EMA)" icon={Shield} defaultOpen>
        {workerRisk ? (
          <>
            {/* Distribution */}
            <div className="flex gap-3 mb-4">
              {Object.entries((workerRisk.distribution as any)?.distribution ?? workerRisk.distribution ?? {})
                .filter(([, v]) => typeof v === "number")
                .map(([cat, count]) => (
                <div key={cat} className={`flex-1 rounded-xl ${catBg(cat)} border border-border/20 p-3 text-center`}>
                  <p className={`text-lg font-bold ${catColor(cat)}`}>{count as number}</p>
                  <p className="text-[11px] text-muted-foreground/50 capitalize">{cat}</p>
                </div>
              ))}
            </div>

            {/* Flagged workers */}
            {(workerRisk.flagged_workers ?? []).length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-destructive uppercase tracking-widest mb-2">Flagged / Blocked Workers</h4>
                <div className="space-y-2">
                  {(workerRisk.flagged_workers ?? []).map((w) => (
                    <div key={w.worker_id} className="flex items-center gap-3 rounded-xl bg-destructive/5 border border-destructive/20 px-4 py-3">
                      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground/80">Worker {w.worker_id}</p>
                        <p className="text-xs text-muted-foreground/40">
                          EMA Risk: {(w.ema_risk * 100).toFixed(0)}% · Trust: {(w.trust_score * 100).toFixed(0)}% · {w.claim_count} claims · Momentum: {w.momentum > 0 ? "↑" : "↓"}{Math.abs(w.momentum).toFixed(2)}
                        </p>
                      </div>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${catBg(w.category)} ${catColor(w.category)} capitalize`}>
                        {w.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trusted workers */}
            {(workerRisk.trusted_workers ?? []).length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-accent-green uppercase tracking-widest mb-2">Trusted Workers</h4>
                <div className="space-y-2">
                  {(workerRisk.trusted_workers ?? []).slice(0, 5).map((w) => (
                    <div key={w.worker_id} className="flex items-center gap-3 rounded-xl bg-accent-green/5 border border-accent-green/20 px-4 py-3">
                      <CheckCircle2 className="w-4 h-4 text-accent-green shrink-0" strokeWidth={1.5} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground/80">Worker {w.worker_id}</p>
                        <p className="text-xs text-muted-foreground/40">
                          Trust: {(w.trust_score * 100).toFixed(0)}% · {w.clean_streak} clean streak · {w.claim_count} claims
                        </p>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-accent-green/10 text-accent-green">trusted</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {workerRisk.total_workers === 0 && (
              <p className="text-sm text-muted-foreground/40">No worker risk profiles yet — profiles are built as claims are processed.</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground/40">Could not load worker risk profiles.</p>
        )}
      </CollapsibleSection>

      {/* ── Model Performance Chart ── */}
      {mlStatus && mlStatus.models.filter((m) => Object.keys(m.metrics ?? {}).length > 0).length > 0 && (
        <CollapsibleSection title="Model Performance Comparison" icon={BarChart3}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={mlStatus.models
                .filter((m) => Object.keys(m.metrics ?? {}).length > 0)
                .map((m) => ({
                  name: m.name.replace(/ (Model|Classifier|Regressor|Forest|Ensemble|Recommender|Detector)/gi, ""),
                  ...m.metrics,
                }))}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} domain={[0, 1]} />
              <Tooltip
                contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "rgba(255,255,255,0.7)" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {["f1", "auc", "accuracy", "r2"].map((metric, i) => {
                const colors = ["#818cf8", "#34d399", "#fbbf24", "#f87171"];
                const present = mlStatus.models.some((m) => metric in (m.metrics ?? {}));
                return present ? <Bar key={metric} dataKey={metric} fill={colors[i]} radius={[4, 4, 0, 0]} /> : null;
              })}
            </BarChart>
          </ResponsiveContainer>
        </CollapsibleSection>
      )}
    </>
  );
}

export default AdminDashboard;
