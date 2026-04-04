import { Shield, MapPin, BarChart3, Navigation, Brain, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { FraudSignal, FraudAssessment } from "@/lib/api";

const LAYER_META: Record<string, { label: string; icon: typeof Shield; description: string }> = {
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
  if (score < 0.3) return "text-emerald-400";
  if (score < 0.6) return "text-amber-400";
  return "text-red-400";
}

function scoreBg(score: number): string {
  if (score < 0.3) return "bg-emerald-400/20";
  if (score < 0.6) return "bg-amber-400/20";
  return "bg-red-400/20";
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${
          score < 0.3 ? "bg-emerald-400" : score < 0.6 ? "bg-amber-400" : "bg-red-400"
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
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${scoreBg(signal.score)}`}>
            <Icon className={`w-4 h-4 ${scoreColor(signal.score)}`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{meta.label}</p>
            <p className="text-xs text-neutral-400">{meta.description}</p>
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

      <p className="text-xs text-neutral-300 leading-relaxed">{signal.reason}</p>

      <div className="flex items-center gap-2 text-xs text-neutral-500">
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
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
        <div className={`p-2 rounded-lg ${overallBg}`}>
          <Shield className={`w-5 h-5 ${overallColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Fraud Score</span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${overallBg} ${overallColor}`}
            >
              {assessment.risk_level}
            </span>
          </div>
          <p className="text-xs text-neutral-400 truncate">{assessment.explanation}</p>
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
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${overallBg}`}>
              <Shield className={`w-6 h-6 ${overallColor}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">5-Layer Fraud Analysis</h3>
              <p className="text-xs text-neutral-400">Real-time signal correlation</p>
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

        <p className="text-sm text-neutral-300 mt-3">{assessment.explanation}</p>
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
