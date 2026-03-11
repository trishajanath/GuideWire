import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Smartphone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileShell from "@/components/MobileShell";

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp" | "profile">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [platform, setPlatform] = useState("");

  const platforms = ["Swiggy", "Zomato", "Dunzo", "Zepto", "Other"];

  return (
    <MobileShell>
      <div className="flex flex-col min-h-screen px-6 pt-12 pb-8">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {["phone", "otp", "profile"].map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                ["phone", "otp", "profile"].indexOf(step) >= i
                  ? "bg-accent-orange"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        {step === "phone" && (
          <div className="animate-slide-up">
            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-6">
              <Smartphone size={24} className="text-primary-foreground" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Enter your mobile number
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              We'll send you a verification code
            </p>
            <div className="flex gap-3 mb-6">
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
            <Button
              onClick={() => setStep("otp")}
              className="w-full h-14 text-base font-bold rounded-2xl gradient-orange border-0 text-accent-foreground"
            >
              Send OTP <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        )}

        {step === "otp" && (
          <div className="animate-slide-up">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Verify OTP
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              Enter the 6-digit code sent to +91 {phone}
            </p>
            <div className="flex gap-2 justify-center mb-8">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  className="w-12 h-14 text-center text-xl font-bold bg-card border border-border rounded-xl focus:border-accent-orange focus:ring-2 focus:ring-accent-orange/20 outline-none transition-all"
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
            <Button
              onClick={() => setStep("profile")}
              className="w-full h-14 text-base font-bold rounded-2xl gradient-orange border-0 text-accent-foreground"
            >
              Verify <ArrowRight size={18} className="ml-2" />
            </Button>
            <button className="w-full text-center text-sm font-semibold text-accent-orange mt-4">
              Resend OTP
            </button>
          </div>
        )}

        {step === "profile" && (
          <div className="animate-slide-up">
            <h2 className="text-xl font-bold text-foreground mb-2">
              Tell us about yourself
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              Basic details to get you started
            </p>
            <div className="space-y-4 mb-6">
              <Input
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-14 rounded-xl text-base font-medium bg-card"
              />
              <Input
                placeholder="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-14 rounded-xl text-base font-medium bg-card"
              />
              <div>
                <label className="text-sm font-semibold text-foreground mb-3 block">
                  Delivery Platform
                </label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                        platform === p
                          ? "gradient-orange text-accent-foreground shadow-md"
                          : "bg-card text-foreground border border-border"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <Button
              onClick={() => navigate("/kyc")}
              className="w-full h-14 text-base font-bold rounded-2xl gradient-orange border-0 text-accent-foreground"
            >
              Continue <ArrowRight size={18} className="ml-2" />
            </Button>
          </div>
        )}
      </div>
    </MobileShell>
  );
};

export default Register;
