import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Smartphone, ArrowRight, Loader2, MapPin, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MobileShell from "@/components/MobileShell";
import { saveCurrentUser } from "@/lib/session";
import { CityZone, getCityZones, registerUser, sendOTP, verifyOTP, ZONES } from "@/lib/api";

/* Bangalore delivery zones */

type CitySuggestion = {
  placeId: string;
  primaryText: string;
  description: string;
};

const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY?.trim() ?? "";

const normalizeCityKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace("bangalore", "bengaluru");

const filterZonesByCity = (zones: CityZone[], cityValue: string): CityZone[] => {
  const cityKey = normalizeCityKey(cityValue);
  if (!cityKey) return [];
  return zones.filter((zone) => normalizeCityKey(zone.city) === cityKey);
};

const LOCAL_ZONES: CityZone[] = ZONES.map((zone) => ({ id: zone.id, city: zone.city, area: zone.area }));

const Register = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "otp" | "profile">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [cityFocused, setCityFocused] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [placesReady, setPlacesReady] = useState(false);
  const [zoneId, setZoneId] = useState("");
  const [zoneArea, setZoneArea] = useState("");
  const [displayedZones, setDisplayedZones] = useState<CityZone[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const cityBlurTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!GOOGLE_PLACES_API_KEY) return;

    const googleMaps = (window as any).google?.maps;
    if (googleMaps?.places) {
      setPlacesReady(true);
      return;
    }

    const scriptId = "fairroute-google-places-script";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    const handleReady = () => setPlacesReady(true);

    if (existingScript) {
      existingScript.addEventListener("load", handleReady);
      return () => {
        existingScript.removeEventListener("load", handleReady);
      };
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_PLACES_API_KEY)}&libraries=places`;
    script.addEventListener("load", handleReady);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener("load", handleReady);
    };
  }, []);

  useEffect(() => {
    if (!placesReady || city.trim().length < 2) {
      setCitySuggestions([]);
      setCityLoading(false);
      return;
    }

    let canceled = false;
    setCityLoading(true);

    const timer = window.setTimeout(() => {
      const googleMaps = (window as any).google?.maps;
      const AutocompleteService = googleMaps?.places?.AutocompleteService;
      const service = AutocompleteService ? new AutocompleteService() : null;
      if (!service) {
        if (!canceled) {
          setCitySuggestions([]);
          setCityLoading(false);
        }
        return;
      }

      service.getPlacePredictions(
        {
          input: city,
          types: ["(cities)"],
        },
        (predictions: any[] | null, status: string) => {
          if (canceled) return;
          if (status === "OK" && predictions?.length) {
            setCitySuggestions(
              predictions.slice(0, 6).map((prediction) => ({
                placeId: prediction.place_id,
                primaryText: prediction.structured_formatting?.main_text ?? prediction.description,
                description: prediction.description,
              })),
            );
          } else {
            setCitySuggestions([]);
          }
          setCityLoading(false);
        },
      );
    }, 250);

    return () => {
      canceled = true;
      window.clearTimeout(timer);
    };
  }, [city, placesReady]);

  useEffect(() => {
    return () => {
      if (cityBlurTimerRef.current !== null) {
        window.clearTimeout(cityBlurTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const normalizedCity = city.trim();
    if (!normalizedCity || normalizedCity.length < 2) {
      setDisplayedZones([]);
      setZoneId("");
      setZoneArea("");
      setZonesLoading(false);
      return;
    }

    let canceled = false;
    setZonesLoading(true);

    const timer = window.setTimeout(() => {
      getCityZones(normalizedCity)
        .then((res) => {
          if (canceled) return;
          const apiFilteredZones = filterZonesByCity(res.zones, normalizedCity);
          const localFilteredZones = filterZonesByCity(LOCAL_ZONES, normalizedCity);
          const zones = apiFilteredZones.length ? apiFilteredZones : localFilteredZones;

          setDisplayedZones(zones);
          if (zones.length === 0) {
            setZoneId("");
            setZoneArea("");
          } else {
            setZoneId((currentZoneId) =>
              zones.some((zone) => zone.id === currentZoneId) ? currentZoneId : zones[0].id,
            );
            setZoneArea((currentZoneArea) =>
              zones.some((zone) => zone.area === currentZoneArea) ? currentZoneArea : zones[0].area,
            );
          }
        })
        .catch(() => {
          if (canceled) return;
          const fallbackZones = filterZonesByCity(LOCAL_ZONES, normalizedCity);
          setDisplayedZones(fallbackZones);
          if (fallbackZones.length === 0) {
            setZoneId("");
            setZoneArea("");
          } else {
            setZoneId((currentZoneId) =>
              fallbackZones.some((zone) => zone.id === currentZoneId) ? currentZoneId : fallbackZones[0].id,
            );
            setZoneArea((currentZoneArea) =>
              fallbackZones.some((zone) => zone.area === currentZoneArea) ? currentZoneArea : fallbackZones[0].area,
            );
          }
        })
        .finally(() => {
          if (!canceled) {
            setZonesLoading(false);
          }
        });
    }, 450);

    return () => {
      canceled = true;
      window.clearTimeout(timer);
    };
  }, [city]);

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
    if (!name.trim() || !city.trim() || phone.length !== 10) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await registerUser({
        name: name.trim(),
        phone,
        city: city.trim(),
        platform: "Swiggy",
        zone_area: zoneArea,
      });
      saveCurrentUser({
        name: name.trim(),
        phone,
        city: city.trim(),
        zoneArea: zoneArea,
        platform: "Swiggy",
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
        <div className="flex flex-col h-full px-4 pt-12 pb-8 overflow-hidden">
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
                    ? "bg-foreground text-background hover:bg-foreground/90"
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
                    ? "bg-foreground text-background hover:bg-foreground/90"
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
            <div className="animate-slide-up h-full flex flex-col">
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

                {/* City input */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    <MapPin size={14} className="inline mr-1" /> City
                  </label>
                  <div className="relative">
                    <Input
                      placeholder="Enter your city"
                      value={city}
                      onChange={(e) => {
                        setCity(e.target.value);
                        setCityFocused(true);
                      }}
                      onFocus={() => setCityFocused(true)}
                      onBlur={() => {
                        cityBlurTimerRef.current = window.setTimeout(() => {
                          setCityFocused(false);
                        }, 120);
                      }}
                      className="h-14 rounded-xl text-base font-medium bg-secondary"
                    />

                    {placesReady && cityFocused && (cityLoading || citySuggestions.length > 0) && (
                      <div className="absolute z-20 top-[calc(100%+6px)] left-0 right-0 bg-secondary border border-border/50 rounded-xl shadow-xl overflow-hidden">
                        {cityLoading ? (
                          <p className="px-4 py-3 text-sm text-muted-foreground">Finding cities...</p>
                        ) : (
                          citySuggestions.map((suggestion) => (
                            <button
                              key={suggestion.placeId}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setCity(suggestion.primaryText);
                                setCityFocused(false);
                              }}
                              className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-foreground/5 transition-colors"
                            >
                              {suggestion.description}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Delivery zone picker */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-3 block">
                    <MapPin size={14} className="inline mr-1" /> Delivery Zone
                  </label>
                  {!city.trim() ? (
                    <p className="text-xs text-muted-foreground mb-2">Enter a city to load delivery zones.</p>
                  ) : zonesLoading ? (
                    <p className="text-xs text-muted-foreground mb-2">Refreshing zones for {city.trim()}...</p>
                  ) : null}
                  <div className="max-h-64 overflow-y-auto scrollbar-visible pr-1">
                    <div className="grid grid-cols-1 gap-2">
                      {displayedZones.map((z) => (
                        <button
                          key={z.id}
                          type="button"
                            onClick={() => {
                              setZoneId(z.id);
                              setZoneArea(z.area);
                            }}
                          className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            zoneId === z.id
                              ? "bg-foreground/10 text-foreground border border-foreground/20"
                              : "bg-secondary border border-border/40 text-foreground"
                          }`}
                        >
                          {z.area}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Platform (Swiggy only) */}
                <div>
                  <label className="text-sm font-semibold text-foreground mb-3 block">
                    Delivery Platform
                  </label>
                  <div className="px-5 py-3 rounded-xl text-sm font-semibold bg-foreground/10 text-foreground border border-foreground/20 text-center">
                    Swiggy
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
