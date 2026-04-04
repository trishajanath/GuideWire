import { useState } from "react";
import { ArrowLeft, CheckCircle2, Download, CloudRain, MapPin, Clock, Thermometer, TrendingDown, AlertTriangle, ShieldAlert } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";
import FraudBreakdown from "@/components/FraudBreakdown";
import { ZONES, type ClaimRecord } from "@/lib/api";

const TRIGGER_META: Record<string, { label: string; icon: typeof CloudRain }> = {
  rainfall: { label: "Heavy Rainfall", icon: CloudRain },
  temperature: { label: "Extreme Heat", icon: Thermometer },
  demand_drop: { label: "Demand Drop", icon: TrendingDown },
  order_pause: { label: "Order Pause", icon: AlertTriangle },
  zone_anomaly: { label: "Zone Anomaly", icon: MapPin },
};

const PayoutDetail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const claim = (location.state as { claim?: ClaimRecord })?.claim;
  const [showFraudDetails, setShowFraudDetails] = useState(false);

  if (!claim) {
    return (
      <MobileShell>
        <div className="md:flex-1 md:overflow-y-auto px-6 pt-10 pb-24 text-center">
          <p className="text-muted-foreground mt-20">No payout data available</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/payouts")}>
            Go to Payouts
          </Button>
        </div>
        <BottomNav active="History" />
      </MobileShell>
    );
  }

  const meta = TRIGGER_META[claim.trigger_type ?? ""] ?? { label: claim.trigger_type ?? "Claim", icon: AlertTriangle };
  const TriggerIcon = meta.icon;
  const zoneName = ZONES.find((z) => z.id === claim.zone_id)?.area ?? claim.zone_id ?? "Unknown";
  const isApproved = claim.status === "approved";
  const isReview = claim.status === "under_review";
  const total = Math.round(claim.payout_amount);
  const ts = new Date(claim.timestamp);
  const dateStr = ts.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
  const timeStr = ts.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  return (
    <MobileShell>
      <div className="md:flex-1 md:overflow-y-auto px-6 pt-10 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-extrabold text-foreground tracking-tight">Payout Details</h1>
        </div>

        {/* Status Card */}
        <div className={`${isApproved ? "gradient-green" : isReview ? "bg-warning/20" : "bg-muted"} rounded-2xl p-5 mb-6 text-center ${isApproved ? "text-accent-foreground" : "text-foreground"}`}>
          {isApproved ? (
            <CheckCircle2 size={32} className="mx-auto mb-2" />
          ) : isReview ? (
            <ShieldAlert size={32} className="mx-auto mb-2 text-warning" />
          ) : (
            <Clock size={32} className="mx-auto mb-2 text-muted-foreground" />
          )}
          <p className="text-xs font-semibold tracking-wide opacity-80 mb-1">
            Claim #{String(claim.id).padStart(4, "0")}
          </p>
          <p className="text-3xl font-extrabold mb-1">₹{total}</p>
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
            isApproved ? "bg-white/20" : isReview ? "bg-warning/30 text-warning" : "bg-muted text-muted-foreground"
          }`}>
            {isApproved ? "Completed" : isReview ? "Under Review" : claim.status}
          </span>
        </div>

        {/* Breakdown */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/40 mb-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Lost Hours</span>
              <span className="text-sm font-bold text-foreground">{claim.hours_lost} hours</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Hourly Rate</span>
              <span className="text-sm font-bold text-foreground">₹{claim.hourly_rate}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Multiplier</span>
              <span className="text-sm font-bold text-foreground">{claim.multiplier}x</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Fraud Score</span>
              <span className={`text-sm font-bold ${
                (claim.fraud_score ?? 0) > 0.6 ? "text-destructive" :
                (claim.fraud_score ?? 0) > 0.3 ? "text-warning" : "text-accent-green"
              }`}>
                {((claim.fraud_score ?? 0) * 100).toFixed(0)}%
                {claim.fraud_details && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    ({claim.fraud_details.risk_level})
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm font-bold text-foreground">Total Payout</span>
              <span className="text-base font-extrabold text-accent-green">₹{total}</span>
            </div>
          </div>
        </div>

        {/* Trigger Details */}
        <div className="bg-card rounded-xl p-5 shadow-card border border-border/40 mb-4">
          <h3 className="text-sm font-bold text-foreground mb-4">Trigger Details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <TriggerIcon size={16} className="text-muted-foreground" strokeWidth={1.5} />
              <span className="text-sm text-muted-foreground">Event</span>
              <span className="text-sm font-semibold text-foreground ml-auto">{meta.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={16} className="text-muted-foreground" strokeWidth={1.5} />
              <span className="text-sm text-muted-foreground">Zone</span>
              <span className="text-sm font-semibold text-foreground ml-auto">{zoneName}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-muted-foreground" strokeWidth={1.5} />
              <span className="text-sm text-muted-foreground">Time</span>
              <span className="text-sm font-semibold text-foreground ml-auto">{dateStr}, {timeStr}</span>
            </div>
          </div>
        </div>

        {/* 5-Layer Fraud Analysis */}
        {claim.fraud_details && (
          <div className="mb-6">
            <FraudBreakdown assessment={claim.fraud_details} compact={!showFraudDetails} />
            <button
              onClick={() => setShowFraudDetails((v) => !v)}
              className="w-full mt-2 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-xl bg-secondary/50 active:bg-secondary"
            >
              {showFraudDetails ? "Hide fraud details" : "Show 5-layer fraud analysis →"}
            </button>
          </div>
        )}

        <Button
          className="w-full h-14 text-base font-bold rounded-2xl bg-foreground border-0 text-background hover:bg-foreground/90"
          onClick={() => navigate("/payouts")}
        >
          <Download size={18} className="mr-2" /> Back to Payouts
        </Button>
      </div>
      <BottomNav active="History" />
    </MobileShell>
  );
};

export default PayoutDetail;
