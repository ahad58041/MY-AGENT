import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Upload, Rocket } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/upload", label: "New Post", icon: Upload, end: false },
];

export default function Layout() {
  return (
    <div className="flex min-h-dvh">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex items-center gap-2 px-6 py-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <Rocket className="h-5 w-5" />
          </span>
          <span className="text-xl font-extrabold tracking-tight">ReelPilot</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-3 font-semibold transition cursor-pointer ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-border px-5 py-4">
          <span className="text-sm text-foreground/50">Theme</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobile) */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <Rocket className="h-4 w-4" />
            </span>
            <span className="text-lg font-extrabold">ReelPilot</span>
          </div>
          <nav className="flex gap-1">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                aria-label={label}
                className={({ isActive }) =>
                  `flex h-11 w-11 items-center justify-center rounded-xl transition cursor-pointer ${
                    isActive ? "bg-primary text-white" : "text-foreground/70 hover:bg-muted"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
              </NavLink>
            ))}
            <ThemeToggle />
          </nav>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
