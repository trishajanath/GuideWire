import { getCurrentUser, updateCurrentUser } from "@/lib/session";

export type PolicyTier = "Basic" | "Standard" | "Premium";
export type PolicyStatus = "active" | "paused" | "cancelled";

export interface WorkerPolicy {
  worker_id: number;
  tier: PolicyTier;
  status: PolicyStatus;
  start_date: string;
  next_renewal_date: string;
  paused_until?: string;
  updated_at: string;
}

export interface PolicyHistoryEntry {
  id: string;
  worker_id: number;
  action: "created" | "pause" | "resume" | "upgrade" | "cancel";
  detail: string;
  timestamp: string;
}

const POLICY_KEY_PREFIX = "fairroute_policy_";
const POLICY_HISTORY_KEY_PREFIX = "fairroute_policy_history_";

const toIsoDate = (d: Date) => d.toISOString();

const addDays = (base: Date, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const parseTierFromUser = (selectedPlan?: string): PolicyTier => {
  const lower = (selectedPlan ?? "").toLowerCase();
  if (lower.includes("premium")) return "Premium";
  if (lower.includes("basic")) return "Basic";
  return "Standard";
};

const policyKey = (workerId: number) => `${POLICY_KEY_PREFIX}${workerId}`;
const historyKey = (workerId: number) => `${POLICY_HISTORY_KEY_PREFIX}${workerId}`;

export const loadLocalPolicy = (workerId: number): WorkerPolicy | null => {
  const raw = localStorage.getItem(policyKey(workerId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WorkerPolicy;
    if (parsed.status === "paused" && parsed.paused_until) {
      const now = new Date();
      const pausedUntil = new Date(parsed.paused_until);
      if (pausedUntil <= now) {
        const resumed: WorkerPolicy = {
          ...parsed,
          status: "active",
          paused_until: undefined,
          updated_at: toIsoDate(now),
        };
        localStorage.setItem(policyKey(workerId), JSON.stringify(resumed));
        appendPolicyHistory(workerId, "resume", "Auto-resumed after pause window ended");
        return resumed;
      }
    }
    return parsed;
  } catch {
    localStorage.removeItem(policyKey(workerId));
    return null;
  }
};

export const saveLocalPolicy = (policy: WorkerPolicy): void => {
  localStorage.setItem(policyKey(policy.worker_id), JSON.stringify(policy));
};

export const appendPolicyHistory = (
  workerId: number,
  action: PolicyHistoryEntry["action"],
  detail: string,
): void => {
  const list = loadPolicyHistory(workerId);
  const next: PolicyHistoryEntry = {
    id: `${action}_${Date.now()}`,
    worker_id: workerId,
    action,
    detail,
    timestamp: toIsoDate(new Date()),
  };
  const updated = [next, ...list].slice(0, 100);
  localStorage.setItem(historyKey(workerId), JSON.stringify(updated));
};

export const loadPolicyHistory = (workerId: number): PolicyHistoryEntry[] => {
  const raw = localStorage.getItem(historyKey(workerId));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PolicyHistoryEntry[];
  } catch {
    localStorage.removeItem(historyKey(workerId));
    return [];
  }
};

export const ensurePolicyForCurrentUser = (): WorkerPolicy | null => {
  const user = getCurrentUser();
  if (!user?.backendUserId) return null;

  const existing = loadLocalPolicy(user.backendUserId);
  if (existing) return existing;

  const now = new Date();
  const policy: WorkerPolicy = {
    worker_id: user.backendUserId,
    tier: parseTierFromUser(user.selectedPlan),
    status: "active",
    start_date: toIsoDate(now),
    next_renewal_date: toIsoDate(addDays(now, 7)),
    updated_at: toIsoDate(now),
  };
  saveLocalPolicy(policy);
  appendPolicyHistory(policy.worker_id, "created", `Policy created in ${policy.tier} tier`);
  return policy;
};

export const pausePolicyForWeek = (workerId: number): WorkerPolicy | null => {
  const current = loadLocalPolicy(workerId);
  if (!current) return null;
  const now = new Date();
  const pausedUntil = addDays(now, 7);
  const updated: WorkerPolicy = {
    ...current,
    status: "paused",
    paused_until: toIsoDate(pausedUntil),
    updated_at: toIsoDate(now),
  };
  saveLocalPolicy(updated);
  appendPolicyHistory(workerId, "pause", "Coverage paused for 7 days");
  return updated;
};

export const resumePolicy = (workerId: number): WorkerPolicy | null => {
  const current = loadLocalPolicy(workerId);
  if (!current) return null;
  const now = new Date();
  const updated: WorkerPolicy = {
    ...current,
    status: "active",
    paused_until: undefined,
    updated_at: toIsoDate(now),
  };
  saveLocalPolicy(updated);
  appendPolicyHistory(workerId, "resume", "Coverage resumed");
  return updated;
};

export const upgradePolicyTier = (workerId: number, nextTier: PolicyTier): WorkerPolicy | null => {
  const current = loadLocalPolicy(workerId);
  if (!current) return null;
  const now = new Date();
  const updated: WorkerPolicy = {
    ...current,
    tier: nextTier,
    status: "active",
    paused_until: undefined,
    updated_at: toIsoDate(now),
  };
  saveLocalPolicy(updated);
  appendPolicyHistory(workerId, "upgrade", `Upgraded policy to ${nextTier}`);

  const selectedPlan = `${nextTier} Shield`;
  updateCurrentUser({ selectedPlan });

  return updated;
};
