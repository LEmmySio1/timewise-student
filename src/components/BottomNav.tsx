import { Link } from "@tanstack/react-router";
import { Home, ListTodo, Calendar, BarChart3, User, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";

const baseItems = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/tasks", label: "Tasks", icon: ListTodo, exact: false },
  { to: "/calendar", label: "Calendar", icon: Calendar, exact: false },
  { to: "/statistics", label: "Stats", icon: BarChart3, exact: false },
  { to: "/profile", label: "Profile", icon: User, exact: false },
] as const;

export function BottomNav() {
  const { role } = useAuth();
  const items = role === "admin"
    ? [...baseItems, { to: "/admin", label: "Admin", icon: ShieldCheck, exact: false } as const]
    : baseItems;

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-40 px-3 pb-3 pt-2">
      <div className="bg-card/95 backdrop-blur border border-border rounded-3xl shadow-elevated px-2 py-2 flex items-center justify-around">
        {items.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: Boolean(exact) }}
            className="group flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl text-muted-foreground data-[status=active]:text-primary data-[status=active]:bg-secondary transition-colors"
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium tracking-wide">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

