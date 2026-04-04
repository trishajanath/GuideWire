import { useNavigate } from "react-router-dom";
import { Home, History, Bell, User, CloudRain } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: CloudRain, label: "Weather", path: "/weather" },
  { icon: History, label: "History", path: "/payouts" },
  { icon: Bell, label: "Alerts", path: "/trigger" },
  { icon: User, label: "Profile", path: "/profile" },
];

interface BottomNavProps {
  active?: string;
}

const BottomNav = ({ active = "Home" }: BottomNavProps) => {
  const navigate = useNavigate();

  return (
    <>
      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 md:static md:shrink-0 bg-background/95 backdrop-blur-md border-t border-border/40 px-4 pb-4 pt-2 z-40">
        <div className="flex justify-between items-center max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = active === item.label;
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1.5 min-w-[56px] py-1 transition-all ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`px-3 py-1.5 rounded-xl transition-colors ${isActive ? "bg-foreground/10" : ""}`}>
                  <item.icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                </div>
                <span className={`text-[10px] leading-none ${isActive ? "font-bold text-foreground" : "font-medium"}`}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
