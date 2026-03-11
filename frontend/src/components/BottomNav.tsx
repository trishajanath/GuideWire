import { useNavigate } from "react-router-dom";
import { Home, History, Bell, User } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", path: "/dashboard" },
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
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-2 z-50">
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = active === item.label;
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${
                isActive
                  ? "text-accent-orange"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[11px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
