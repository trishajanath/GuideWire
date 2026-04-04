import { Shield, MapPin, BarChart3, Navigation, Brain, CheckCircle2, AlertTriangle, XCircle, Smartphone, Copy, Wifi } from "lucide-react";
import type { FraudSignal, FraudAssessment } from "@/lib/api";

const LAYER_META: Record<string, { label: string; icon: typeof Shield; description: string }> = {
  gps_in_registered_zone: {
    label: "GPS Verification",
    icon: MapPin,
    description: "Location matches registered work zone",
  },
  app_active_during_event: {
    label: "App Activity",
    icon: Smartphone,
    description: "App was open during the event",
  },
  zone_worker_ratio: {
    label: "Zone Activity",
    icon: BarChart3,
    description: "Worker density is within normal range",
  },
  no_duplicate_claim: {
    label: "Duplicate Check",
    icon: Copy,
    description: "No repeat claim on the same trigger",
  },
  claim_frequency_vs_zone_average: {
    label: "Claim Frequency",
    icon: Navigation,
    description: "Claiming rate vs zone average",
  },
  "vpn_/_proxy_detection": {
    label: "Network Check",
    icon: Wifi,
    description: "Residential IP, no VPN detected",
  },
  // Legacy keys
  gps_consistency: {
    label: "GPS Consistency",
    icon: MapPin,
    description: "Location matches claimed zone",
  },
  claim_frequency: {
    label: "Claim Frequency",
    icon: BarChart3,
    description: "Normal claiming patterns",
  },
  location_disruption: {
    label: "Zone Disruption Match",
    icon: Navigation,
    description: "Real disruption in claimed area",
  },
  velocity_check: {
    label: "Velocity / Spoofing",
    icon: Navigation,
    description: "No impossible travel detected",
  },
  behavioral: {
    label: "Behavioral Analysis",
    icon: Brain,
    description: "Normal worker activity patterns",
  },
};

function scoreColor(score: number): string {
  if (score < 0.3) return "text-accent-green";
  if (score < 0.6) return "text-warning";
  return "text-destructive";
}

function scoreBg(score: number): string {
  if (score < 0.3) return "bg-accent-green/15";
  if (score < 0.6) return "bg-warning/15";
  return "bg-destructive/15";
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          score < 0.3 ? "bg-accent-green" : score < 0.6 ? "bg-warning" : "bg-destructive"
        }`}
        style={{ width: `${Math.min(score * 100, 100)}%` }}
      />
    </div>
  );
}

function LayerCard({ signal }: { signal: FraudSignal }) {
  const meta = LAYER_META[signal.layer] || {
    label: signal.layer,
    icon: Shield,
    description: "",
  };
  const Icon = meta.icon;
  const StatusIcon = signal.score < 0.3 ? CheckCircle2 : signal.score < 0.6 ? AlertTriangle : XCircle;

  return (
    <div className="card-premium rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${scoreColor(signal.score)}`} strokeWidth={1.5} />
          <div>
            <p className="text-sm font-semibold text-foreground">{meta.label}</p>
            <p className="text-xs text-muted-foreground">{meta.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <StatusIcon className={`w-4 h-4 ${scoreColor(signal.score)}`} />
          <span className={`text-sm font-mono font-bold ${scoreColor(signal.score)}`}>
            {(signal.score * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <ScoreBar score={signal.score} />

      <p className="text-xs text-muted-foreground leading-relaxed">{signal.reason}</p>

      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
        <span>Confidence: {(signal.confidence * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

interface FraudBreakdownProps {
  assessment: FraudAssessment;
  compact?: boolean;
}

export default function FraudBreakdown({ assessment, compact = false }: FraudBreakdownProps) {
  const overallColor = scoreColor(assessment.overall_score);
  const overallBg = scoreBg(assessment.overall_score);
  const RiskIcon =
    assessment.risk_level === "LOW"
      ? CheckCircle2
      : assessment.risk_level === "MEDIUM"
        ? AlertTriangle
        : XCircle;

  if (compact) {
    return (
      <div className="card-premium flex items-center gap-3 p-3 rounded-xl">
        <Shield className={`w-5 h-5 ${overallColor}`} strokeWidth={1.5} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Fraud Score</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${overallBg} ${overallColor}`}
            >
              {assessment.risk_level}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">{assessment.explanation}</p>
        </div>
        <span className={`text-lg font-mono font-bold ${overallColor}`}>
          {(assessment.overall_score * 100).toFixed(0)}%
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Score Header */}
      <div className="card-premium rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Shield className={`w-5 h-5 ${overallColor}`} strokeWidth={1.5} />
            <div>
              <h3 className="text-base font-bold text-foreground">6-Layer Fraud Analysis</h3>
              <p className="text-xs text-muted-foreground">Real-time signal correlation</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5">
              <RiskIcon className={`w-5 h-5 ${overallColor}`} />
              <span className={`text-2xl font-mono font-bold ${overallColor}`}>
                {(assessment.overall_score * 100).toFixed(0)}%
              </span>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${overallBg} ${overallColor}`}
            >
              {assessment.risk_level} RISK
            </span>
          </div>
        </div>

        <ScoreBar score={assessment.overall_score} />

        <p className="text-sm text-muted-foreground mt-3">{assessment.explanation}</p>
      </div>

      {/* Per-Layer Breakdown */}
      <div className="space-y-2">
        {assessment.signals.map((signal) => (
          <LayerCard key={signal.layer} signal={signal} />
        ))}
      </div>
    </div>
  );
}
