import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, User, ArrowRight } from "lucide-react";
import MobileShell from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveAdminSession } from "@/lib/session";

const ADMIN_USERNAMES = ["admin", "administrator", "insurer"];
const ADMIN_PASSWORD = "admin123";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const canSubmit = username.trim().length > 0 && password.trim().length > 0;

  const handleLogin = () => {
    const normalizedUsername = username.trim().toLowerCase();
    const normalizedPassword = password.trim();

    if (!ADMIN_USERNAMES.includes(normalizedUsername) || normalizedPassword !== ADMIN_PASSWORD) {
      setError("Invalid admin credentials.");
      return;
    }

    saveAdminSession({
      username: normalizedUsername,
      loggedInAt: new Date().toISOString(),
    });
    setError("");
    navigate("/admin");
  };

  return (
    <MobileShell>
      <div className="flex flex-col min-h-screen px-4 pt-12 pb-8">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-5">
          <Shield size={18} className="text-muted-foreground" strokeWidth={1.5} />
        </div>

        <h2 className="text-xl font-extrabold text-foreground mb-1.5 tracking-tight">Admin Login</h2>
        <p className="text-sm text-muted-foreground mb-8">Sign in to access insurer analytics.</p>

        <div className="space-y-3">
          <div className="flex items-center h-12 bg-secondary rounded-xl border border-border/30 px-3">
            <User size={14} className="text-muted-foreground mr-2" />
            <Input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-full border-0 rounded-none text-sm font-medium bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
          </div>

          <div className="flex items-center h-12 bg-secondary rounded-xl border border-border/30 px-3">
            <Lock size={14} className="text-muted-foreground mr-2" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-full border-0 rounded-none text-sm font-medium bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
          </div>
        </div>

        {error ? <p className="text-sm text-destructive mt-3">{error}</p> : null}

        <p className="text-xs text-muted-foreground mt-2">
          Demo credentials: username <span className="font-semibold">admin</span> and password <span className="font-semibold">admin123</span>
        </p>

        <Button
          onClick={handleLogin}
          disabled={!canSubmit}
          className="w-full h-14 text-base font-bold rounded-2xl border-0 mt-5"
        >
          Login <ArrowRight size={18} className="ml-2" />
        </Button>

        <div className="flex-1" />

        <button
          onClick={() => navigate("/")}
          className="w-full text-center text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          Back to role selection
        </button>
      </div>
    </MobileShell>
  );
};

export default AdminLogin;
