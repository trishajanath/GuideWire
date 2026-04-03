import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileShell from "@/components/MobileShell";
import { getCurrentUser } from "@/lib/session";

const Login = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    const user = getCurrentUser();
    const normalized = phone.replace(/\D/g, "").slice(-10);

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
      <div className="flex flex-col min-h-screen px-6 pt-12 pb-8">
        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-6">
          <Smartphone size={24} className="text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Login</h2>
        <p className="text-sm text-muted-foreground mb-8">
          Enter your registered mobile number
        </p>

        <div className="flex gap-3 mb-4">
          <div className="w-16 h-14 bg-card rounded-xl border border-border flex items-center justify-center text-sm font-bold text-foreground">
            +91
          </div>
          <Input
            type="tel"
            placeholder="Mobile Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-14 rounded-xl text-base font-medium bg-card"
            maxLength={10}
          />
        </div>

        {error ? <p className="text-sm text-destructive mb-4">{error}</p> : null}

        <Button
          onClick={handleLogin}
          className="w-full h-14 text-base font-bold rounded-2xl gradient-orange border-0 text-accent-foreground"
        >
          Login <ArrowRight size={18} className="ml-2" />
        </Button>

        <button
          onClick={() => navigate("/register")}
          className="w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mt-4"
        >
          New here? <span className="text-accent-orange">Create account</span>
        </button>
      </div>
    </MobileShell>
  );
};

export default Login;
