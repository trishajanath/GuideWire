import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Landmark, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileShell from "@/components/MobileShell";
import { updateCurrentUser } from "@/lib/session";

const KYC = () => {
  const navigate = useNavigate();
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [upiId, setUpiId] = useState("");

  const handleContinue = () => {
    updateCurrentUser({
      aadhaarVerified,
      upiId: upiId.trim(),
    });
    navigate("/plans");
  };

  return (
    <MobileShell>
      <div className="flex flex-col min-h-screen px-6 pt-12 pb-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-accent-orange">Step 2 of 4</span>
        </div>
        <div className="flex gap-2 mb-8">
          <div className="h-1.5 flex-1 rounded-full bg-accent-orange" />
          <div className="h-1.5 flex-1 rounded-full bg-accent-orange" />
          <div className="h-1.5 flex-1 rounded-full bg-muted" />
          <div className="h-1.5 flex-1 rounded-full bg-muted" />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">
          KYC Verification
        </h2>
        <p className="text-sm text-muted-foreground mb-8">
          Quick verification to activate your coverage
        </p>

        {/* Aadhaar Card */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <ShieldCheck size={20} className="text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Aadhaar Verification</h3>
              <p className="text-xs text-muted-foreground">Secure verification via DigiLocker</p>
            </div>
            {aadhaarVerified && (
              <CheckCircle2 size={22} className="ml-auto text-accent-green" />
            )}
          </div>
          <Button
            onClick={() => setAadhaarVerified(true)}
            variant={aadhaarVerified ? "outline" : "default"}
            className={`w-full h-12 rounded-xl font-semibold ${
              aadhaarVerified
                ? "border-accent-green text-accent-green"
                : "gradient-primary border-0 text-primary-foreground"
            }`}
          >
            {aadhaarVerified ? "✓ Verified" : "Verify with DigiLocker"}
          </Button>
        </div>

        {/* Bank Account */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl gradient-green flex items-center justify-center">
              <Landmark size={20} className="text-accent-foreground" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Bank Account / UPI</h3>
              <p className="text-xs text-muted-foreground">For receiving payouts</p>
            </div>
          </div>
          <Input
            placeholder="Enter UPI ID (e.g., name@upi)"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="h-12 rounded-xl text-sm font-medium bg-background mb-3"
          />
          <Button
            className="w-full h-12 rounded-xl font-semibold gradient-green border-0 text-accent-foreground"
          >
            Link Bank Account
          </Button>
        </div>

        {/* Continue */}
        <Button
          onClick={handleContinue}
          className="w-full h-14 text-base font-bold rounded-2xl gradient-orange border-0 text-accent-foreground mt-6"
        >
          Continue <ArrowRight size={18} className="ml-2" />
        </Button>
      </div>
    </MobileShell>
  );
};

export default KYC;
