import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PauseCircle, PlayCircle, Shield, ArrowUpCircle, History } from "lucide-react";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";
import {
  getPolicy,
  pausePolicy,
  resumePolicyApi,
  selectPlan,
  upgradePolicyApi,
  type PolicyRecord,
} from "@/lib/api";
import {
  ensurePolicyForCurrentUser,
  pausePolicyForWeek,
  resumePolicy,
  saveLocalPolicy,
  upgradePolicyTier,
  type PolicyTier,
  type WorkerPolicy,
} from "@/lib/policy";
import { getCurrentUser, updateCurrentUser } from "@/lib/session";

const tierFeatures: Record<PolicyTier, { weeklyPremium: number; maxPayout: number; triggers: string[] }> = {
  Basic: {
    weeklyPremium: 49,
    maxPayout: 1200,
    triggers: ["Heavy rain", "Heatwave", "City disruption"],
  },
  Standard: {
    weeklyPremium: 69,
    maxPayout: 2000,
    triggers: ["Heavy rain", "Heatwave", "Cyclone alert", "Low-order shock"],
  },
  Premium: {
    weeklyPremium: 99,
    maxPayout: 3200,
    triggers: ["Heavy rain", "Heatwave", "Cyclone alert", "Flood risk", "Low-order shock"],
  },
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const Policy = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const workerId = user?.backendUserId ?? null;

  const [policy, setPolicy] = useState<WorkerPolicy | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !workerId) {
      navigate("/login");
      return;
    }

    let active = true;

    const bootstrap = async () => {
      const base = ensurePolicyForCurrentUser();
      if (active) setPolicy(base);

      try {
        const remote = await getPolicy(workerId);
        if (!active) return;
        const mapped: WorkerPolicy = remote;
        saveLocalPolicy(mapped);
        setPolicy(mapped);
      } catch {
        // Backend policy endpoints may not be available yet; local policy stays source of truth.
      }
    };

    bootstrap();

    return () => {
      active = false;
    };
  }, [navigate, user, workerId]);

  const details = useMemo(() => {
    if (!policy) return tierFeatures.Standard;
    return tierFeatures[policy.tier];
  }, [policy]);

  const doPause = async () => {
    if (!policy || !workerId || policy.status === "paused") return;
    setIsBusy(true);
    setError(null);
    try {
      const remote = await pausePolicy(workerId);
      const mapped: WorkerPolicy = remote;
      saveLocalPolicy(mapped);
      setPolicy(mapped);
    } catch {
      const fallback = pausePolicyForWeek(workerId);
      if (!fallback) setError("Could not pause policy right now.");
      setPolicy(fallback);
    } finally {
      setIsBusy(false);
    }
  };

  const doResume = async () => {
    if (!policy || !workerId || policy.status !== "paused") return;
    setIsBusy(true);
    setError(null);
    try {
      const remote = await resumePolicyApi(workerId);
      const mapped: WorkerPolicy = remote;
      saveLocalPolicy(mapped);
      setPolicy(mapped);
    } catch {
      const fallback = resumePolicy(workerId);
      if (!fallback) setError("Could not resume policy right now.");
      setPolicy(fallback);
    } finally {
      setIsBusy(false);
    }
  };

  const doUpgrade = async (nextTier: PolicyTier) => {
    if (!policy || !workerId || policy.tier === nextTier) return;
    setIsBusy(true);
    setError(null);

    const selectedPlan = `${nextTier} Shield`;

    try {
      await selectPlan(workerId, selectedPlan);
      updateCurrentUser({ selectedPlan });
    } catch {
      // Ignore quote failure; keep local state functional.
    }

    try {
      const remote = await upgradePolicyApi(workerId, nextTier);
      const mapped: WorkerPolicy = remote;
      saveLocalPolicy(mapped);
      setPolicy(mapped);
    } catch {
      const fallback = upgradePolicyTier(workerId, nextTier);
      if (!fallback) setError("Could not upgrade policy right now.");
      setPolicy(fallback);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <MobileShell>
      <div className="px-4 pt-10 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-extrabold text-foreground tracking-tight">My Policy</h1>
        </div>

        {policy && (
          <div className="card-premium rounded-2xl p-6 mb-5 shadow-elevated">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-muted-foreground" strokeWidth={1.5} />
                <span className="text-xs text-muted-foreground">Worker Protection Card</span>
              </div>
              <span className={`text-xs font-semibold ${policy.status === "active" ? "text-accent-green" : "text-warning"}`}>
                {policy.status.toUpperCase()}
              </span>
            </div>

            <h2 className="text-xl font-extrabold text-foreground">{policy.tier} Shield</h2>
            <p className="text-sm text-muted-foreground mt-1">₹{details.weeklyPremium}/week premium</p>

            <div className="grid grid-cols-2 gap-3 mt-5 text-xs">
              <div className="rounded-xl bg-secondary/50 p-3">
                <p className="text-muted-foreground">Start Date</p>
                <p className="font-semibold text-foreground mt-1">{formatDate(policy.start_date)}</p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-3">
                <p className="text-muted-foreground">Next Renewal</p>
                <p className="font-semibold text-foreground mt-1">{formatDate(policy.next_renewal_date)}</p>
              </div>
              <div className="rounded-xl bg-secondary/50 p-3 col-span-2">
                <p className="text-muted-foreground">Weekly Max Payout</p>
                <p className="font-semibold text-foreground mt-1">₹{details.maxPayout}</p>
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs text-muted-foreground mb-2">Covered Trigger Types</p>
              <div className="flex flex-wrap gap-2">
                {details.triggers.map((t) => (
                  <span key={t} className="text-[11px] px-2.5 py-1 rounded-full bg-secondary text-foreground">
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {policy.status === "paused" && policy.paused_until && (
              <p className="text-xs text-warning mt-4">Paused until {formatDate(policy.paused_until)}</p>
            )}
          </div>
        )}

        {error && <p className="text-xs text-destructive mb-4">{error}</p>}

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={doPause}
            disabled={!policy || isBusy || policy.status === "paused"}
            className="rounded-xl px-4 py-3 bg-secondary text-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <PauseCircle size={16} /> Pause 1 Week
          </button>
          <button
            onClick={doResume}
            disabled={!policy || isBusy || policy.status !== "paused"}
            className="rounded-xl px-4 py-3 bg-secondary text-foreground text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <PlayCircle size={16} /> Resume
          </button>
        </div>

        <div className="rounded-2xl border border-border/60 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpCircle size={16} className="text-muted-foreground" />
            <h3 className="text-sm font-bold text-foreground">Upgrade Coverage</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Switch tier any time. New premium applies immediately for future payouts.
          </p>

          <div className="space-y-2">
            {(["Basic", "Standard", "Premium"] as PolicyTier[]).map((tier) => {
              const isCurrent = policy?.tier === tier;
              return (
                <button
                  key={tier}
                  disabled={isBusy || isCurrent || !policy}
                  onClick={() => doUpgrade(tier)}
                  className="w-full rounded-xl px-3 py-3 bg-secondary/60 flex items-center justify-between disabled:opacity-50"
                >
                  <span className="text-sm font-semibold text-foreground">{tier} Shield</span>
                  <span className="text-xs text-muted-foreground">
                    {isCurrent ? "Current" : `₹${tierFeatures[tier].weeklyPremium}/wk`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => navigate("/policy/history")}
          className="w-full rounded-xl px-4 py-3 bg-secondary text-foreground text-sm font-semibold flex items-center justify-center gap-2"
        >
          <History size={16} /> View Policy History
        </button>
      </div>

      <BottomNav active="Profile" />
    </MobileShell>
  );
};

export default Policy;
