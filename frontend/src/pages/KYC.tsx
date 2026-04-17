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
  const [upiLinked, setUpiLinked] = useState(false);
  const [upiLinking, setUpiLinking] = useState(false);
  const [upiError, setUpiError] = useState("");

  const handleLinkUpi = () => {
    const id = upiId.trim();
    if (!id) {
      setUpiError("Please enter a UPI ID");
      return;
    }
    if (!/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(id)) {
      setUpiError("Invalid UPI ID format (e.g., name@upi)");
      return;
    }
    setUpiError("");
    setUpiLinking(true);
    // Simulate Razorpay UPI verification (test mode)
    setTimeout(() => {
      setUpiLinking(false);
      setUpiLinked(true);
      updateCurrentUser({ upiId: id });
    }, 1200);
  };

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
          <span className="text-xs font-medium text-muted-foreground">Step 2 of 4</span>
        </div>
        <div className="flex gap-2 mb-5">
          <div className="h-1 flex-1 rounded-full bg-muted-foreground/40" />
          <div className="h-1 flex-1 rounded-full bg-muted-foreground/40" />
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
            <ShieldCheck size={20} className="text-muted-foreground" strokeWidth={1.5} />
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
            {upiLinked && (
              <CheckCircle2 size={22} className="ml-auto text-accent-green" />
            )}
          </div>
          <Input
            placeholder="Enter UPI ID (e.g., name@upi)"
            value={upiId}
            onChange={(e) => { setUpiId(e.target.value); setUpiError(""); setUpiLinked(false); }}
            disabled={upiLinking}
            className="h-11 rounded-xl text-sm font-medium bg-secondary mb-1"
          />
          {upiError && <p className="text-xs text-destructive mb-1.5">{upiError}</p>}
          {upiLinked && <p className="text-xs text-accent-green mb-1.5">UPI linked via Razorpay (test mode)</p>}
          <Button
            onClick={handleLinkUpi}
            disabled={upiLinking || upiLinked}
            className={`w-full h-11 rounded-xl font-semibold text-sm mt-1 ${
              upiLinked
                ? "border-accent-green text-accent-green bg-transparent border"
                : "bg-foreground border-0 text-background hover:bg-foreground/90"
            }`}
          >
            {upiLinking ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Verifying via Razorpay…
              </span>
            ) : upiLinked ? "UPI Linked ✓" : "Link Bank Account"}
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
