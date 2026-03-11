import { User, ArrowLeft, Shield, CreditCard, HelpCircle, LogOut, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";

const menuItems = [
  { icon: Shield, label: "My Plan", desc: "Standard Shield" },
  { icon: CreditCard, label: "Payment Methods", desc: "UPI linked" },
  { icon: HelpCircle, label: "Help & Support", desc: "FAQs, contact us" },
];

const Profile = () => {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div className="px-6 pt-10 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-card shadow-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-card rounded-2xl p-5 shadow-card mb-6 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center">
            <User size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Ramesh Kumar</h2>
            <p className="text-sm text-muted-foreground">+91 98765 43210</p>
            <p className="text-xs text-accent-orange font-semibold">Swiggy • Bangalore</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="w-full bg-card rounded-2xl p-4 shadow-card flex items-center gap-4 hover:shadow-card-hover transition-shadow"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <item.icon size={18} className="text-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </button>
          ))}
        </div>

        <button className="w-full bg-destructive/10 rounded-2xl p-4 flex items-center gap-4">
          <LogOut size={18} className="text-destructive" />
          <span className="text-sm font-bold text-destructive">Logout</span>
        </button>
      </div>
      <BottomNav active="Profile" />
    </MobileShell>
  );
};

export default Profile;
