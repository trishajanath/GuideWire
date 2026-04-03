import { useNavigate } from "react-router-dom";
import { Shield, Zap, IndianRupee, CloudRain, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileShell from "@/components/MobileShell";
import logo from "@/assets/fairroute-logo.png";

const features = [
  { icon: Zap, text: "Automatic payouts", desc: "Instant when triggers fire" },
  { icon: Shield, text: "No manual claims", desc: "Zero-touch processing" },
  { icon: IndianRupee, text: "Affordable premiums", desc: "Starting at ₹49/week" },
  { icon: CloudRain, text: "Full coverage", desc: "Weather, demand & zones" },
];

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div className="flex flex-col h-full px-4 pt-14 pb-8 md:min-h-0 min-h-screen">
        {/* Logo + Hero */}
        <div className="flex flex-col items-center mb-6 animate-slide-up">
          <img src={logo} alt="FairRoute" className="w-16 h-16 mb-3" />
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">
            FairRoute
          </h1>
          <p className="text-sm text-muted-foreground mt-2 text-center leading-relaxed max-w-[260px]">
            Income protection for gig workers. Automatic payouts when disruptions hit.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-1 flex-1 animate-slide-up" style={{ animationDelay: "0.15s" }}>
          {features.map((f) => (
            <div
              key={f.text}
              className="flex items-center gap-4 rounded-xl px-4 py-3"
            >
              <f.icon size={20} className="text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
              <div className="min-w-0">
                <span className="text-sm font-semibold text-foreground block">{f.text}</span>
                <span className="text-[11px] text-muted-foreground">{f.desc}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-6 space-y-3 animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <Button
            onClick={() => navigate("/register")}
            className="w-full h-14 text-base font-bold rounded-2xl bg-foreground border-0 text-background hover:bg-foreground/90"
          >
            Get Started <ArrowRight size={18} className="ml-2" />
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
