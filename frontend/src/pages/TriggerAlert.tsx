import { AlertTriangle, Clock, IndianRupee, MapPin, CloudRain, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";

const TriggerAlert = () => {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div className="px-6 pt-10 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-card shadow-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Active Trigger</h1>
        </div>

        {/* Alert Banner */}
        <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-warning-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">⚠️ Trigger Active</h3>
            <p className="text-xs text-muted-foreground">Income disruption detected</p>
          </div>
        </div>

        {/* Event Card */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CloudRain size={24} className="text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Heavy Rainfall</h3>
              <p className="text-sm text-muted-foreground">Koramangala Zone</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={14} /> Started
              </span>
              <span className="text-sm font-semibold text-foreground">2:30 PM</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={14} /> Duration
              </span>
              <span className="text-sm font-semibold text-foreground">2 hours</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin size={14} /> Zone
              </span>
              <span className="text-sm font-semibold text-foreground">Koramangala</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <IndianRupee size={14} /> Estimated Payout
              </span>
              <span className="text-lg font-extrabold text-accent-green">₹270</span>
            </div>
          </div>
        </div>

        {/* Calculation */}
        <div className="bg-muted rounded-2xl p-4 mb-6">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Calculation</p>
          <p className="text-sm font-bold text-foreground">
            2.25 hrs × ₹100/hr × 1.2 multiplier = ₹270
          </p>
        </div>

        {/* Message */}
        <div className="bg-accent-green/10 rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm font-semibold text-accent-green">
            💰 Payout will be credited automatically
          </p>
        </div>

        <Button
          onClick={() => navigate("/payout-detail")}
          className="w-full h-14 text-base font-bold rounded-2xl gradient-primary border-0 text-primary-foreground"
        >
          View Details
        </Button>
      </div>
      <BottomNav active="Alerts" />
    </MobileShell>
  );
};

export default TriggerAlert;
