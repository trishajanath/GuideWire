import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Smartphone, ArrowRight, Loader2, MapPin, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileShell from "@/components/MobileShell";
import { saveCurrentUser } from "@/lib/session";
import { registerUser, sendOTP, verifyOTP, ZONES } from "@/lib/api";

/* Bangalore delivery zones */

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp" | "profile">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState(ZONES[0].id as string);
  const [platform, setPlatform] = useState<"Swiggy" | "Zomato">("Swiggy");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  const handleSendOtp = async () => {
    const normalizedPhone = phone.replace(/\D/g, "").slice(-10);
    if (normalizedPhone.length !== 10) return;
    setSubmitting(true);
    setError("");
    try {
      setPhone(normalizedPhone);
      const res = await sendOTP(normalizedPhone);
      setDebugOtp(res.otp);
      setStep("otp");
    } catch (err: any) {
      setError(err.message ?? "Failed to send OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setSubmitting(true);
    setError("");
    setDebugOtp(null);
    try {
      const res = await sendOTP(phone);
      setDebugOtp(res.otp);
    } catch (err: any) {
      setError(err.message ?? "Failed to resend OTP");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setSubmitting(true);
    setError("");
    try {
      await verifyOTP(phone, otp);
      setDebugOtp(null);
      setStep("profile");
    } catch (err: any) {
      setError(err.message ?? "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = async () => {
    if (!name.trim() || phone.length !== 10) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await registerUser({
        name: name.trim(),
        phone,
        city: "Bengaluru",
        platform,
      });
      saveCurrentUser({
        name: name.trim(),
        phone,
        city: "Bengaluru",
        platform,
        selectedPlan: "Standard Shield",
        backendUserId: res.user_id,
        zoneId,
      });
      navigate("/kyc");
    } catch (err: any) {
      setError(err.message ?? "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileShell>
        <div className="flex flex-col min-h-screen px-4 pt-12 pb-8">
          {/* Progress — thin & subtle */}
          <div className="flex gap-1.5 mb-8">
            {["phone", "otp", "profile"].map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  ["phone", "otp", "profile"].indexOf(step) >= i
                    ? "bg-muted-foreground/40"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>

          {step === "phone" && (
            <div className="animate-slide-up flex flex-col flex-1">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center mb-5">
                <Smartphone size={18} className="text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-extrabold text-foreground mb-1.5 tracking-tight">
                Enter your mobile number
              </h2>
              <p className="text-sm text-muted-foreground mb-8">
                We'll send a 6-digit code via SMS
              </p>

              {/* Unified input */}
              <div className="flex items-center h-14 bg-secondary rounded-xl border border-border/30 focus-within:border-foreground/30 focus-within:shadow-[0_0_0_2px_rgba(255,255,255,0.06)] transition-all mb-6 overflow-hidden">
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
              {error && <p className="text-sm text-destructive mb-4">{error}</p>}
              <Button
                onClick={handleSendOtp}
                disabled={submitting || phone.replace(/\D/g, "").length < 10}
                className={`w-full h-14 text-base font-bold rounded-2xl border-0 transition-all ${
                  phone.replace(/\D/g, "").length >= 10
                    ? "bg-accent-orange text-white hover:bg-accent-orange/90"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {submitting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                Send OTP <ArrowRight size={18} className="ml-2" />
              </Button>

              <div className="flex-1" />

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60 mt-8">
                <Lock size={10} strokeWidth={1.5} />
                <span>Your number is only used for login & security</span>
              </div>
            </div>
          )}

          {step === "otp" && (
            <div className="animate-slide-up flex flex-col flex-1">
              <h2 className="text-xl font-extrabold text-foreground mb-1.5 tracking-tight">Verify OTP</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter the 6-digit code sent to +91 {phone}
              </p>

              {/* Debug banner */}
              {debugOtp && (
                <div className="bg-foreground/5 border border-border/30 rounded-xl px-4 py-2.5 mb-5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Demo OTP: <span className="text-foreground font-mono tracking-widest">{debugOtp}</span>
                  </p>
                </div>
              )}
              <div className="flex gap-2 justify-center mb-8">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    className="w-11 h-13 text-center text-lg font-bold bg-secondary border border-border/30 rounded-lg focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.06)] outline-none transition-all"
                    value={otp[i] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const newOtp = otp.split("");
                      newOtp[i] = val;
                      setOtp(newOtp.join(""));
                      if (val && e.target.nextElementSibling) {
                        (e.target.nextElementSibling as HTMLInputElement).focus();
                      }
                    }}
                  />
                ))}
              </div>
              {error && <p className="text-sm text-destructive mb-4">{error}</p>}
              <Button
                onClick={handleVerifyOtp}
                disabled={submitting || otp.length < 6}
                className={`w-full h-14 text-base font-bold rounded-2xl border-0 transition-all ${
                  otp.length >= 6
                    ? "bg-accent-orange text-white hover:bg-accent-orange/90"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {submitting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                Verify <ArrowRight size={18} className="ml-2" />
              </Button>
              <button
                onClick={handleResendOtp}
                disabled={submitting}
                className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground mt-4 disabled:opacity-50 transition-colors"
              >
                Resend OTP
              </button>

              <div className="flex-1" />

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60 mt-8">
                <Lock size={10} strokeWidth={1.5} />
                <span>Code expires in 5 minutes</span>
              </div>
            </div>
          )}

          {step === "profile" && (
            <div className="animate-slide-up">
              <h2 className="text-xl font-extrabold text-foreground mb-2 tracking-tight">
                Tell us about yourself
              </h2>
              <p className="text-sm text-muted-foreground mb-8">Basic details to get you started</p>
              <div className="space-y-4 mb-6">
                <Input
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 rounded-xl text-base font-medium bg-secondary"
                />

                {/* City — locked to Bengaluru */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    <MapPin size={14} className="inline mr-1" /> City
                  </label>
                  <div className="h-14 rounded-xl text-base font-medium bg-secondary border border-border/40 flex items-center px-4 text-foreground">
                    Bengaluru
                  </div>
                </div>

                {/* Delivery zone picker */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-3 block">
                    <MapPin size={14} className="inline mr-1" /> Delivery Zone
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {ZONES.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setZoneId(z.id)}
                        className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                          zoneId === z.id
                            ? "bg-accent-orange/15 text-accent-orange border border-accent-orange/30"
                            : "bg-secondary border border-border/40 text-foreground"
                        }`}
                      >
                        {z.area}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform toggle */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-3 block">
                    Delivery Platform
                  </label>
                  <div className="flex gap-3">
                    {(["Swiggy", "Zomato"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlatform(p)}
                        className={`flex-1 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                          platform === p
                            ? "bg-accent-orange/15 text-accent-orange border border-accent-orange/30"
                            : "bg-secondary border border-border/40 text-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {error && <p className="text-sm text-destructive mb-4">{error}</p>}
              <Button
                onClick={handleContinue}
                disabled={submitting}
                className="w-full h-14 text-base font-bold rounded-2xl bg-foreground text-background border-0 hover:bg-foreground/90"
              >
                {submitting ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                Continue <ArrowRight size={18} className="ml-2" />
              </Button>
            </div>
          )}
      </div>
    </MobileShell>
  );
};

export default Register;
