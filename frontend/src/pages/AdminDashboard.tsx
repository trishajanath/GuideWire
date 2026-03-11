import { Users, AlertTriangle, IndianRupee, TrendingUp, CloudRain, MapPin, BarChart3, Settings, LogOut, Shield, Zap, FileText } from "lucide-react";
import logo from "@/assets/fairroute-logo.png";

const sidebarItems = [
  { icon: BarChart3, label: "Overview", active: true },
  { icon: Users, label: "Workers" },
  { icon: Zap, label: "Triggers" },
  { icon: IndianRupee, label: "Payouts" },
  { icon: TrendingUp, label: "Analytics" },
  { icon: FileText, label: "Reports" },
  { icon: Settings, label: "Settings" },
];

const activeTriggers = [
  { event: "Heavy Rain", zone: "Mumbai — Andheri", workers: 342, payout: "₹2.4L" },
  { event: "Zone Closure", zone: "Delhi — Connaught Place", workers: 128, payout: "₹89K" },
  { event: "Heatwave", zone: "Hyderabad — Madhapur", workers: 215, payout: "₹1.6L" },
];

const recentPayouts = [
  { id: "FR-0892", worker: "Ramesh K.", amount: "₹720", event: "Heavy Rain", date: "Jul 15", status: "Completed" },
  { id: "FR-0891", worker: "Suresh M.", amount: "₹520", event: "Zone Closure", date: "Jul 15", status: "Completed" },
  { id: "FR-0890", worker: "Priya D.", amount: "₹380", event: "Demand Drop", date: "Jul 14", status: "Completed" },
  { id: "FR-0889", worker: "Amit S.", amount: "₹450", event: "Heavy Rain", date: "Jul 14", status: "Processing" },
  { id: "FR-0888", worker: "Raj P.", amount: "₹620", event: "Heatwave", date: "Jul 13", status: "Completed" },
];

const AdminDashboard = () => {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 gradient-primary text-primary-foreground">
        <div className="p-6 flex items-center gap-3">
          <img src={logo} alt="FairRoute" className="w-10 h-10" />
          <div>
            <h1 className="text-base font-bold">FairRoute</h1>
            <p className="text-[10px] opacity-70">Admin Dashboard</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                item.active
                  ? "bg-white/15 text-primary-foreground"
                  : "text-primary-foreground/70 hover:bg-white/10"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-primary-foreground/70 hover:bg-white/10">
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 lg:p-8 max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
              <p className="text-sm text-muted-foreground">Real-time platform metrics</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse-gentle" />
              <span className="text-xs font-semibold text-muted-foreground">Live</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Active Workers", value: "12,847", icon: Users, color: "gradient-primary" },
              { label: "Active Triggers", value: "3", icon: AlertTriangle, color: "bg-warning" },
              { label: "Today's Payouts", value: "₹4.89L", icon: IndianRupee, color: "gradient-green" },
              { label: "Premium Revenue", value: "₹6.29L", icon: TrendingUp, color: "gradient-orange" },
            ].map((stat) => (
              <div key={stat.label} className="bg-card rounded-2xl p-5 shadow-card">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </span>
                  <div className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <stat.icon size={16} className="text-primary-foreground" />
                  </div>
                </div>
                <p className="text-2xl font-extrabold text-foreground">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Active Triggers */}
          <div className="bg-card rounded-2xl p-5 shadow-card mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Active Triggers</h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-warning/10 text-warning">
                {activeTriggers.length} Active
              </span>
            </div>
            <div className="space-y-3">
              {activeTriggers.map((t, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-background rounded-xl">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0">
                    {t.event.includes("Rain") ? (
                      <CloudRain size={18} className="text-warning" />
                    ) : t.event.includes("Zone") ? (
                      <MapPin size={18} className="text-warning" />
                    ) : (
                      <AlertTriangle size={18} className="text-warning" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{t.event}</p>
                    <p className="text-xs text-muted-foreground">{t.zone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{t.workers} workers</p>
                    <p className="text-xs text-muted-foreground">{t.payout}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payouts Table */}
          <div className="bg-card rounded-2xl p-5 shadow-card">
            <h2 className="text-base font-bold text-foreground mb-4">Recent Payouts</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">ID</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Worker</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Event</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayouts.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-background/50">
                      <td className="py-3 px-2 font-mono text-xs font-semibold text-foreground">{p.id}</td>
                      <td className="py-3 px-2 font-semibold text-foreground">{p.worker}</td>
                      <td className="py-3 px-2 text-muted-foreground">{p.event}</td>
                      <td className="py-3 px-2 font-bold text-accent-green">{p.amount}</td>
                      <td className="py-3 px-2 text-muted-foreground">{p.date}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            p.status === "Completed"
                              ? "bg-accent-green/10 text-accent-green"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
