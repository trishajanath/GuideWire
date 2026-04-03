import { useNavigate } from "react-router-dom";
import { Shield, Zap, IndianRupee, CloudRain } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileShell from "@/components/MobileShell";
import logo from "@/assets/fairroute-logo.png";

const features = [
  { icon: Zap, text: "Automatic payouts" },
  { icon: Shield, text: "No manual claims" },
  { icon: IndianRupee, text: "Affordable weekly premiums" },
  { icon: CloudRain, text: "Weather & demand coverage" },
];

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div className="flex flex-col min-h-screen px-6 pt-12 pb-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 animate-slide-up">
          <img src={logo} alt="FairRoute" className="w-20 h-20 mb-4" />
          <h1 className="text-2xl font-extrabold text-primary tracking-tight">
            FairRoute
          </h1>
        </div>

        {/* Hero */}
        <div className="text-center mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-xl font-bold text-foreground mb-3 leading-tight">
            Income Protection for<br />Gig Workers
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            Automatic payouts when rain, heatwaves or low demand affects your income.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-auto animate-slide-up" style={{ animationDelay: "0.2s" }}>
          {features.map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-4 bg-card rounded-xl p-4 shadow-card"
            >
              <div className="w-10 h-10 rounded-lg gradient-orange flex items-center justify-center flex-shrink-0">
                <f.icon size={20} className="text-accent-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">{f.text}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 space-y-3 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <Button
            onClick={() => navigate("/register")}
            className="w-full h-14 text-base font-bold rounded-2xl gradient-orange border-0 text-accent-foreground shadow-lg"
          >
            Get Started
          </Button>
          <button
            onClick={() => navigate("/login")}
            className="w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Already have an account? <span className="text-accent-orange">Login</span>
          </button>
        </div>
      </div>
    </MobileShell>
  );
};

export default Welcome;
