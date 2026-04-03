import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Smartphone, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileShell from "@/components/MobileShell";
import { getCurrentUser } from "@/lib/session";

const Login = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const normalized = phone.replace(/\D/g, "").slice(-10);
  const isValid = normalized.length === 10;

  const handleLogin = () => {
    const user = getCurrentUser();

    if (!user) {
      setError("No account found. Please sign up first.");
      return;
    }

    if (user.phone !== normalized) {
      setError("Phone number does not match your registered account.");
      return;
    }

    setError("");
    navigate("/dashboard");
  };

  return (
    <MobileShell>
      <div className="flex flex-col min-h-screen px-4 pt-12 pb-8">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-5">
          <Smartphone size={18} className="text-muted-foreground" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-extrabold text-foreground mb-1.5 tracking-tight">Login</h2>
        <p className="text-sm text-muted-foreground mb-8">
          Enter your registered mobile number
        </p>

        {/* Unified input row */}
        <div className="flex items-center h-14 bg-secondary rounded-xl border border-border/30 focus-within:border-foreground/30 focus-within:shadow-[0_0_0_2px_rgba(255,255,255,0.06)] transition-all mb-4 overflow-hidden">
          <span className="px-4 text-sm font-semibold text-muted-foreground border-r border-border/30">+91</span>
          <Input
            type="tel"
            placeholder="Mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-full border-0 rounded-none text-base font-medium bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-3"
            maxLength={10}
          />
        </div>

        {error ? <p className="text-sm text-destructive mb-4">{error}</p> : null}

        <Button
          onClick={handleLogin}
          disabled={!isValid}
          className={`w-full h-14 text-base font-bold rounded-2xl border-0 transition-all ${
            isValid
              ? "bg-accent-orange text-white hover:bg-accent-orange/90"
              : "bg-secondary text-muted-foreground cursor-not-allowed"
          }`}
        >
          Login <ArrowRight size={18} className="ml-2" />
        </Button>

        <div className="flex-1" />

        {/* Trust + footer */}
        <div className="space-y-4 mt-8">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
            <Lock size={10} strokeWidth={1.5} />
            <span>Used only for login & security</span>
          </div>
          <button
            onClick={() => navigate("/register")}
            className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            New here? <span className="text-foreground font-semibold">Create account</span>
          </button>
        </div>
      </div>
    </MobileShell>
  );
};

export default Login;
