import { User, ArrowLeft, Shield, CreditCard, HelpCircle, LogOut, ChevronRight, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";
import { clearCurrentUser, formatIndianPhone, getCurrentUser } from "@/lib/session";

const Profile = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();

  const menuItems = [
    { icon: Shield, label: "My Plan", desc: user?.selectedPlan ?? "No plan selected" },
    { icon: MapPin, label: "Zone", desc: user?.zoneArea ? `${user.zoneArea}, ${user.city}` : user?.city ?? "Not set" },
    { icon: CreditCard, label: "Payment Methods", desc: user?.upiId ? "UPI linked" : "Not linked" },
    { icon: HelpCircle, label: "Help & Support", desc: "FAQs, contact us" },
  ];

  const handleLogout = () => {
    clearCurrentUser();
    navigate("/");
  };

  return (
    <MobileShell>
      <div className="px-4 pt-10 pb-24">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <ArrowLeft size={18} className="text-foreground" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-extrabold text-foreground tracking-tight">Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="card-premium rounded-2xl p-6 mb-8 flex items-center gap-4 shadow-elevated">
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <User size={20} className="text-muted-foreground" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-foreground">{user?.name ?? "Guest User"}</h2>
            <p className="text-sm text-muted-foreground">{formatIndianPhone(user?.phone ?? "")}</p>
            <p className="text-xs text-accent-orange font-semibold mt-0.5">
              {user?.platform ?? "Platform"} · {user?.city ?? "City"}
            </p>
          </div>
        </div>

        <div className="space-y-1 mb-8">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="w-full rounded-xl px-4 py-3.5 flex items-center gap-3 hover:bg-secondary/60 transition-colors"
            >
              <item.icon size={18} className="text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground/50" />
            </button>
          ))}
        </div>

        <button onClick={handleLogout} className="w-full rounded-xl px-4 py-3.5 flex items-center gap-3 hover:bg-destructive/10 transition-colors">
          <LogOut size={18} className="text-destructive" strokeWidth={1.5} />
          <span className="text-sm font-semibold text-destructive">Logout</span>
        </button>
      </div>
      <BottomNav active="Profile" />
    </MobileShell>
  );
};

export default Profile;
