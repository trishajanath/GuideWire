import { ArrowLeft, CheckCircle2, Download, CloudRain, MapPin, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";

const PayoutDetail = () => {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div className="px-6 pt-10 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-card shadow-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Payout Details</h1>
        </div>

        {/* Status Card */}
        <div className="gradient-green rounded-2xl p-5 mb-6 text-center text-accent-foreground">
          <CheckCircle2 size={32} className="mx-auto mb-2" />
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
            Payout #FR-0892
          </p>
          <p className="text-3xl font-extrabold mb-1">₹720</p>
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-white/20">
            Completed
          </span>
        </div>

        {/* Breakdown */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Lost Hours</span>
              <span className="text-sm font-bold text-foreground">6 hours</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Hourly Rate</span>
              <span className="text-sm font-bold text-foreground">₹100</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Multiplier</span>
              <span className="text-sm font-bold text-foreground">1.2x</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-bold text-foreground">Total</span>
              <span className="text-base font-extrabold text-accent-green">₹720</span>
            </div>
          </div>
        </div>

        {/* Trigger Details */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-6">
          <h3 className="text-sm font-bold text-foreground mb-4">Trigger Details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CloudRain size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Event</span>
              <span className="text-sm font-semibold text-foreground ml-auto">Heavy Rainfall</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Zone</span>
              <span className="text-sm font-semibold text-foreground ml-auto">Koramangala</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Rainfall</span>
              <span className="text-sm font-semibold text-foreground ml-auto">52mm</span>
            </div>
          </div>
        </div>

        <Button className="w-full h-14 text-base font-bold rounded-2xl gradient-primary border-0 text-primary-foreground">
          <Download size={18} className="mr-2" /> Download Receipt
        </Button>
      </div>
      <BottomNav active="History" />
    </MobileShell>
  );
};

export default PayoutDetail;
