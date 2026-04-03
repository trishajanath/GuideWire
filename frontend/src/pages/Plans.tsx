import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Star, CloudRain, TrendingDown, MapPin, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileShell from "@/components/MobileShell";
import { updateCurrentUser } from "@/lib/session";

const plans = [
  {
    id: "basic",
    name: "Basic Shield",
    price: 49,
    payout: 500,
    features: [
      { icon: CloudRain, text: "Weather coverage" },
      { icon: MapPin, text: "Zone shutdowns" },
    ],
    highlighted: false,
  },
  {
    id: "standard",
    name: "Standard Shield",
    price: 69,
    payout: 800,
    features: [
      { icon: CloudRain, text: "Weather coverage" },
      { icon: TrendingDown, text: "Demand drops" },
      { icon: MapPin, text: "Zone shutdowns" },
    ],
    highlighted: true,
  },
  {
    id: "premium",
    name: "Premium Shield",
    price: 99,
    payout: 1200,
    features: [
      { icon: CloudRain, text: "Weather coverage" },
      { icon: TrendingDown, text: "Demand drops" },
      { icon: Zap, text: "Heat alerts & outages" },
    ],
    highlighted: false,
  },
];

const Plans = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("standard");

  const handleSelectPlan = () => {
    const selectedPlan = plans.find((plan) => plan.id === selected);
    updateCurrentUser({ selectedPlan: selectedPlan?.name ?? "Standard Shield" });
    navigate("/dashboard");
  };

  return (
    <MobileShell>
      <div className="flex flex-col min-h-screen px-6 pt-12 pb-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-accent-orange">Step 3 of 4</span>
        </div>
        <div className="flex gap-2 mb-8">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= 2 ? "bg-accent-orange" : "bg-muted"}`}
            />
          ))}
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">Choose Your Plan</h2>
        <p className="text-sm text-muted-foreground mb-6">Select coverage that fits your needs</p>

        <div className="space-y-4 mb-auto">
          {plans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setSelected(plan.id)}
              className={`w-full text-left rounded-2xl p-5 transition-all ${
                selected === plan.id
                  ? "bg-card shadow-card-hover ring-2 ring-accent-orange"
                  : "bg-card shadow-card"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                    {plan.name}
                  </h3>
                  {plan.highlighted && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold gradient-orange text-accent-foreground">
                      <Star size={10} /> Popular
                    </span>
                  )}
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selected === plan.id ? "border-accent-orange" : "border-border"
                  }`}
                >
                  {selected === plan.id && (
                    <div className="w-3 h-3 rounded-full bg-accent-orange" />
                  )}
                </div>
              </div>

              <div className="flex items-baseline gap-1 mb-3">
                <span className="text-2xl font-extrabold text-foreground">₹{plan.price}</span>
                <span className="text-sm text-muted-foreground font-medium">/week</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  Max ₹{plan.payout}/day
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {plan.features.map((f) => (
                  <span
                    key={f.text}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-background px-3 py-1.5 rounded-lg"
                  >
                    <f.icon size={12} />
                    {f.text}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>

        <Button
          onClick={handleSelectPlan}
          className="w-full h-14 text-base font-bold rounded-2xl gradient-orange border-0 text-accent-foreground mt-6"
        >
          Select Plan <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>
    </MobileShell>
  );
};

export default Plans;
