import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CloudRain, TrendingDown, MapPin, Zap, ArrowRight, Sparkles, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileShell from "@/components/MobileShell";
import { getCurrentUser, updateCurrentUser } from "@/lib/session";
import { selectPlan as apiSelectPlan, getRecommendedPlan, getPremiumQuote, type PlanRecommendation, type PremiumQuote } from "@/lib/api";

const planDefs = [
  {
    id: "basic",
    name: "Basic Shield",
    backendName: "Basic",
    features: ["Weather coverage", "Zone shutdowns"],
  },
  {
    id: "standard",
    name: "Standard Shield",
    backendName: "Standard",
    features: ["Weather coverage", "Demand drops", "Zone shutdowns"],
  },
  {
    id: "premium",
    name: "Premium Shield",
    backendName: "Premium",
    features: ["Weather coverage", "Demand drops", "Heat alerts & outages"],
  },
];

const Plans = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [selected, setSelected] = useState("standard");
  const [recommendation, setRecommendation] = useState<PlanRecommendation | null>(null);
  const [quotes, setQuotes] = useState<Record<string, PremiumQuote>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getRecommendedPlan(6, 50)
      .then((rec) => {
        setRecommendation(rec);
        const match = planDefs.find(
          (p) => p.id === rec.recommended_plan || p.name.toLowerCase().includes(rec.recommended_plan),
        );
        if (match) setSelected(match.id);
      })
      .catch(() => {});
  }, []);

  /* Fetch dynamic pricing for each plan based on user city */
  const userCity = user?.city ?? "";
  useEffect(() => {
    Promise.all(
      planDefs.map((p) =>
        getPremiumQuote(p.backendName, userCity)
          .then((q) => ({ id: p.id, quote: q }))
          .catch(() => null),
      ),
    ).then((results) => {
      const map: Record<string, PremiumQuote> = {};
      results.forEach((r) => { if (r) map[r.id] = r.quote; });
      setQuotes(map);
    });
  }, [userCity]);

  const handleSelectPlan = async () => {
    const selectedPlan = planDefs.find((p) => p.id === selected);
    const planName = selectedPlan?.name ?? "Standard Shield";
    setSubmitting(true);
    try {
      if (user?.backendUserId) {
        await apiSelectPlan(user.backendUserId, selectedPlan?.backendName ?? "Standard");
      }
    } catch {
      /* proceed anyway */
    }
    updateCurrentUser({ selectedPlan: planName });
    setSubmitting(false);
    navigate("/dashboard");
  };

  const selectedPlanName = planDefs.find((p) => p.id === selected)?.name ?? "Standard Shield";

  return (
    <MobileShell>
      <div className="flex flex-col h-full md:min-h-0 min-h-screen px-4 pt-10 pb-6">
          {/* Progress — thin & subtle */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">Step 3 of 4</span>
          </div>
          <div className="flex gap-1.5 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${i <= 2 ? "bg-muted-foreground/40" : "bg-muted"}`}
              />
            ))}
          </div>

          <h2 className="text-xl font-extrabold text-foreground mb-1 tracking-tight">Choose Your Plan</h2>
          <p className="text-sm text-muted-foreground mb-6">Select coverage that fits your needs</p>

          <div className="space-y-2.5 mb-auto">
            {planDefs.map((plan) => {
              const isSelected = selected === plan.id;
              const isRecommended = recommendation?.recommended_plan === plan.id;
              const q = quotes[plan.id];
              const price = q?.weekly_premium ?? (plan.id === "basic" ? 49 : plan.id === "standard" ? 69 : 99);
              const dailyCap = q?.daily_cap ?? (plan.id === "basic" ? 500 : plan.id === "standard" ? 800 : 1200);
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelected(plan.id)}
                  className={`w-full text-left rounded-xl px-4 py-3.5 transition-all duration-200 ${
                    isSelected
                      ? "bg-[hsl(0_0%_11%)] border border-border/60 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_4px_24px_rgba(0,0,0,0.4)]"
                      : "bg-transparent border border-border/30 hover:border-border/50"
                  }`}
                >
                  {/* Header: name + badge + check */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground">
                        {plan.name}
                      </h3>
                      {isRecommended && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-foreground/10 text-muted-foreground">
                          <Sparkles size={9} /> Recommended
                        </span>
                      )}
                    </div>
                    <div
                      className={`w-4.5 h-4.5 rounded-full flex items-center justify-center transition-all ${
                        isSelected
                          ? "bg-foreground"
                          : "border border-border/60"
                      }`}
                    >
                      {isSelected && (
                        <Check size={11} className="text-background" strokeWidth={2.5} />
                      )}
                    </div>
                  </div>

                  {/* Price row */}
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-lg font-extrabold text-foreground tracking-tight">₹{price}</span>
                    <span className="text-xs text-muted-foreground font-medium">/week</span>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      Cap ₹{dailyCap}/day
                    </span>
                  </div>

                  {/* Features as inline text */}
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {plan.features.join(" · ")}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Sticky CTA */}
          <Button
            onClick={handleSelectPlan}
            disabled={submitting}
            className="w-full h-14 text-sm font-bold rounded-2xl bg-foreground border-0 text-background hover:bg-foreground/90 mt-5"
          >
            {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
            Continue with {selectedPlanName} <ArrowRight size={16} className="ml-2" />
          </Button>
      </div>
    </MobileShell>
  );
};

export default Plans;
