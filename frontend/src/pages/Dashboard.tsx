import { Shield, Activity, IndianRupee, Bell } from "lucide-react";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";

const Dashboard = () => {
  return (
    <MobileShell>
      <div className="px-6 pt-10 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Hi Ramesh 👋</h1>
            <p className="text-sm text-muted-foreground">Welcome back!</p>
          </div>
          <button className="w-10 h-10 rounded-full bg-card shadow-card flex items-center justify-center relative">
            <Bell size={20} className="text-foreground" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-accent-orange border-2 border-background" />
          </button>
        </div>

        {/* Coverage Card */}
        <div className="gradient-primary rounded-2xl p-5 mb-4 text-primary-foreground">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={18} />
            <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
              Your Coverage
            </span>
          </div>
          <h2 className="text-lg font-bold mb-1">Standard Shield</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-gentle" />
              <span className="text-sm font-medium opacity-90">Active</span>
            </div>
            <span className="text-xs opacity-70">Next premium: March 10</span>
          </div>
        </div>

        {/* Zone Status */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center">
              <Activity size={20} className="text-accent-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Zone Status</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-accent-green" />
                <span className="text-xs text-muted-foreground font-medium">
                  Normal — No active triggers
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* This Week Card */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-4">
          <h3 className="text-sm font-bold text-foreground mb-4">This Week</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-accent-orange/10 flex items-center justify-center mx-auto mb-2">
                <IndianRupee size={18} className="text-accent-orange" />
              </div>
              <p className="text-base font-bold text-foreground">₹69</p>
              <p className="text-[10px] text-muted-foreground font-medium">Premium</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center mx-auto mb-2">
                <IndianRupee size={18} className="text-accent-green" />
              </div>
              <p className="text-base font-bold text-foreground">₹0</p>
              <p className="text-[10px] text-muted-foreground font-medium">Payouts</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2">
                <Activity size={18} className="text-muted-foreground" />
              </div>
              <p className="text-base font-bold text-foreground">0</p>
              <p className="text-[10px] text-muted-foreground font-medium">Triggers</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-card rounded-2xl p-4 shadow-card text-left hover:shadow-card-hover transition-shadow">
            <span className="text-lg mb-1 block">🌦️</span>
            <span className="text-xs font-bold text-foreground">Weather</span>
            <p className="text-[10px] text-muted-foreground">Check predictions</p>
          </button>
          <button className="bg-card rounded-2xl p-4 shadow-card text-left hover:shadow-card-hover transition-shadow">
            <span className="text-lg mb-1 block">📋</span>
            <span className="text-xs font-bold text-foreground">My Plan</span>
            <p className="text-[10px] text-muted-foreground">View details</p>
          </button>
        </div>
      </div>
      <BottomNav active="Home" />
    </MobileShell>
  );
};

export default Dashboard;
