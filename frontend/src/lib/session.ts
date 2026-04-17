export type FairRouteUser = {
  name: string;
  phone: string;
  city: string;
  zoneArea?: string;
  platform: string;
  selectedPlan?: string;
  upiId?: string;
  aadhaarVerified?: boolean;
  backendUserId?: number;
  zoneId?: string;
};

export type AdminSession = {
  username: string;
  loggedInAt: string;
};

const USER_STORAGE_KEY = "fairroute_user";
const ADMIN_SESSION_KEY = "fairroute_admin_session";

export const getCurrentUser = (): FairRouteUser | null => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as FairRouteUser;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const saveCurrentUser = (user: FairRouteUser): void => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
};

export const updateCurrentUser = (patch: Partial<FairRouteUser>): FairRouteUser | null => {
  const current = getCurrentUser();
  if (!current) {
    return null;
  }

  const updated = { ...current, ...patch };
  saveCurrentUser(updated);
  return updated;
};

export const clearCurrentUser = (): void => {
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const getAdminSession = (): AdminSession | null => {
  const raw = localStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AdminSession;
  } catch {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
};

export const saveAdminSession = (session: AdminSession): void => {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
};

export const clearAdminSession = (): void => {
  localStorage.removeItem(ADMIN_SESSION_KEY);
};

export const formatIndianPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) {
    return phone;
  }

  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
};
