import { useNavigate } from "react-router-dom";
import { Shield, Bike, ArrowRight } from "lucide-react";
import MobileShell from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import logo from "@/assets/fairroute-logo.png";

const RoleSelect = () => {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div className="flex flex-col min-h-screen px-4 pt-14 pb-8">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="FairRoute" className="w-16 h-16 mb-3" />
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">FairRoute</h1>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-[280px]">
            Choose how you want to continue.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate("/worker")}
            className="w-full rounded-2xl border border-border/50 bg-card/60 p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Bike size={18} className="text-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-foreground">I am a Worker</p>
                <p className="text-xs text-muted-foreground mt-0.5">Policy, claims, payouts</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground" />
            </div>
          </button>

          <button
            onClick={() => navigate("/admin/login")}
            className="w-full rounded-2xl border border-border/50 bg-card/60 p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <Shield size={18} className="text-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold text-foreground">I am an Admin</p>
                <p className="text-xs text-muted-foreground mt-0.5">Insurer analytics and controls</p>
              </div>
              <ArrowRight size={16} className="text-muted-foreground" />
            </div>
          </button>
        </div>

        <div className="flex-1" />

        <p className="text-[11px] text-muted-foreground/70 text-center">
          Worker and Admin sessions are separate.
        </p>
      </div>
    </MobileShell>
  );
};

export default RoleSelect;
