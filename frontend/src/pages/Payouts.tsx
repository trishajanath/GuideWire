import { ArrowLeft, IndianRupee, CloudRain, MapPin, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileShell from "@/components/MobileShell";
import BottomNav from "@/components/BottomNav";

const payouts = [
  { id: 1, date: "Jul 15", event: "Heavy Rain", amount: 720, icon: CloudRain },
  { id: 2, date: "Jul 8", event: "Zone Closure", amount: 520, icon: MapPin },
  { id: 3, date: "Jun 29", event: "Demand Drop", amount: 380, icon: TrendingDown },
  { id: 4, date: "Jun 20", event: "Heavy Rain", amount: 240, icon: CloudRain },
  { id: 5, date: "Jun 12", event: "Zone Closure", amount: 180, icon: MapPin },
];

const Payouts = () => {
  const navigate = useNavigate();

  return (
    <MobileShell>
      <div className="px-6 pt-10 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-card shadow-card flex items-center justify-center">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Your Payouts</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-card rounded-2xl p-4 shadow-card text-center">
            <p className="text-xs text-muted-foreground font-medium mb-1">This Month</p>
            <p className="text-2xl font-extrabold text-foreground flex items-center justify-center">
              <IndianRupee size={18} />1,240
            </p>
          </div>
          <div className="bg-card rounded-2xl p-4 shadow-card text-center">
            <p className="text-xs text-muted-foreground font-medium mb-1">All Time</p>
            <p className="text-2xl font-extrabold text-accent-green flex items-center justify-center">
              <IndianRupee size={18} />4,820
            </p>
          </div>
        </div>

        {/* Payout List */}
        <div className="space-y-3">
          {payouts.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate("/payout-detail")}
              className="w-full bg-card rounded-2xl p-4 shadow-card flex items-center gap-4 hover:shadow-card-hover transition-shadow text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <p.icon size={20} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-foreground">{p.event}</h3>
                <p className="text-xs text-muted-foreground">{p.date}</p>
              </div>
              <span className="text-base font-extrabold text-accent-green">
                +₹{p.amount}
              </span>
            </button>
          ))}
        </div>
      </div>
      <BottomNav active="History" />
    </MobileShell>
  );
};

export default Payouts;
