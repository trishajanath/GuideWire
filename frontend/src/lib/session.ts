export type FairRouteUser = {
  name: string;
  phone: string;
  city: string;
  platform: string;
  selectedPlan?: string;
  upiId?: string;
  aadhaarVerified?: boolean;
};

const USER_STORAGE_KEY = "fairroute_user";

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

export const formatIndianPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) {
    return phone;
  }

  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
};
