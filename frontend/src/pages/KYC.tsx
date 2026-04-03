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
      <div className="flex flex-col h-full md:min-h-0 min-h-screen px-4 pt-10 pb-6">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-accent-orange">Step 2 of 4</span>
        </div>
        <div className="flex gap-2 mb-5">
          <div className="h-1.5 flex-1 rounded-full bg-accent-orange" />
          <div className="h-1.5 flex-1 rounded-full bg-accent-orange" />
          <div className="h-1.5 flex-1 rounded-full bg-muted" />
          <div className="h-1.5 flex-1 rounded-full bg-muted" />
        </div>

        <h2 className="text-xl font-extrabold text-foreground mb-1 tracking-tight">
          KYC Verification
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          Quick verification to activate your coverage
        </p>

        {/* Aadhaar Card */}
        <div className="card-premium rounded-xl p-4 mb-3">
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck size={20} className="text-accent-orange" strokeWidth={1.5} />
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
            className={`w-full h-11 rounded-xl font-semibold text-sm ${
              aadhaarVerified
                ? "border-accent-green text-accent-green"
                : "bg-foreground border-0 text-background hover:bg-foreground/90"
            }`}
          >
            {aadhaarVerified ? "Verified" : "Verify with DigiLocker"}
          </Button>
        </div>

        {/* Bank Account */}
        <div className="card-premium rounded-xl p-4 mb-auto">
          <div className="flex items-center gap-3 mb-3">
            <Landmark size={20} className="text-accent-green" strokeWidth={1.5} />
            <div>
              <h3 className="text-sm font-bold text-foreground">Bank Account / UPI</h3>
              <p className="text-xs text-muted-foreground">For receiving payouts</p>
            </div>
          </div>
          <Input
            placeholder="Enter UPI ID (e.g., name@upi)"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="h-11 rounded-xl text-sm font-medium bg-secondary mb-2.5"
          />
          <Button
            className="w-full h-11 rounded-xl font-semibold text-sm bg-foreground border-0 text-background hover:bg-foreground/90"
          >
            Link Bank Account
          </Button>
        </div>

        {/* Continue */}
        <Button
          onClick={handleContinue}
          className="w-full h-12 text-sm font-bold rounded-2xl bg-foreground border-0 text-background hover:bg-foreground/90 mt-4"
        >
          Continue <ArrowRight size={16} className="ml-2" />
        </Button>
      </div>
    </MobileShell>
  );
};

export default KYC;
