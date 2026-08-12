import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Menu,
  X,
  UserCircle,
  LayoutTemplate,
  Tags,
  Calendar,
  Settings2,
  Bell,
  CreditCard,
  Image as ImageIcon,
  Newspaper,
  FileImage,
  Clapperboard,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../context/ConfirmContext";

const SidebarLink = ({ to, icon: Icon, label, active, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group ${
      active
        ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/35"
        : "text-orange-100/75 hover:bg-white/8 hover:text-white"
    }`}
  >
    {active && (
      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
    )}
    <span
      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        active ? "bg-white/20" : "bg-white/5 group-hover:bg-white/10"
      }`}
    >
      <Icon size={18} />
    </span>
    <span className="font-semibold tracking-wide text-sm">{label}</span>
  </Link>
);

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { confirm } = useConfirm();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Logout?",
      message: "Are you sure you want to logout from the admin panel?",
      confirmText: "Logout",
      cancelText: "Cancel",
      tone: "danger",
    });
    if (!ok) return;
    logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/banners", icon: ImageIcon, label: "Banners" },
    { to: "/news", icon: Newspaper, label: "News" },
    { to: "/templates-poster", icon: FileImage, label: "Template Posters" },
    { to: "/templates", icon: LayoutTemplate, label: "Templates" },
    { to: "/video-templates", icon: Clapperboard, label: "Video Templates" },
    { to: "/categories", icon: Tags, label: "Categories" },
    { to: "/notifications", icon: Bell, label: "Notifications" },
    { to: "/schedule", icon: Calendar, label: "Schedule" },
    { to: "/users", icon: Users, label: "Karyakartas" },
    { to: "/pricing-plans", icon: CreditCard, label: "Plans" },
    { to: "/settings", icon: Settings2, label: "Settings" },
  ];

  const isActive = (item) => {
    if (item.to === "/") return location.pathname === "/";
    if (item.to === "/templates") {
      return (
        location.pathname === "/templates" ||
        location.pathname.startsWith("/templates/create") ||
        location.pathname.startsWith("/templates/edit")
      );
    }
    if (item.to === "/video-templates") {
      return (
        location.pathname === "/video-templates" ||
        location.pathname.startsWith("/video-templates/create") ||
        location.pathname.startsWith("/video-templates/edit")
      );
    }
    return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  };

  const pageTitle = navItems.find((item) => isActive(item))?.label || "Admin";

  return (
    <div className="min-h-screen flex bg-sand">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[17.5rem] bg-ink text-white transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:relative lg:translate-x-0 overflow-hidden`}
      >
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage: "url('/images/home/orange-corner.png')",
            backgroundSize: "cover",
            backgroundPosition: "top left",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/80 to-ink" />

        <div className="relative flex flex-col h-full">
          <div className="p-5 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/40 overflow-hidden p-1 ring-2 ring-white/10">
                <img
                  src="/images/home/social-instagram.png"
                  alt="BJP"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="font-display text-lg font-bold leading-none text-white truncate">
                  BJP Karyakarta
                </p>
                <p className="text-[10px] uppercase tracking-[0.22em] text-brand-300 mt-1.5">
                  Admin Panel
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 text-orange-100/70 hover:bg-white/10 rounded-lg lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 pt-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-200/50 px-2 mb-2">
              Main menu
            </p>
          </div>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto pb-4 hide-scrollbar">
            {navItems.map((item) => (
              <SidebarLink
                key={item.to}
                {...item}
                active={isActive(item)}
                onClick={() => setIsSidebarOpen(false)}
              />
            ))}
          </nav>

          <div className="p-3 border-t border-white/10 bg-black/25">
            <div className="flex items-center gap-3 px-3 py-3 mb-2 rounded-xl bg-white/5 border border-white/5">
              <div className="w-10 h-10 bg-brand-500/25 rounded-full flex items-center justify-center text-brand-300 ring-2 ring-brand-500/20">
                <UserCircle size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user?.name || "Admin"}
                </p>
                <p className="text-xs text-orange-100/55 truncate">
                  {user?.email || "admin@bjpkaryakarta.in"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-red-300 hover:bg-red-500/15 hover:text-red-200 rounded-xl transition-colors"
            >
              <LogOut size={18} />
              <span className="font-semibold text-sm">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "url('/images/home/lotus-watermark.png')",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right bottom",
            backgroundSize: "420px",
          }}
        />

        <header className="h-16 bg-white/90 backdrop-blur border-b border-brand-100 flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-ink hover:bg-brand-50 rounded-lg lg:hidden"
            >
              <Menu size={22} />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-brand-600 font-bold">
                BJP Karyakarta
              </p>
              <h2 className="font-display text-lg sm:text-xl font-bold text-ink leading-tight">
                {pageTitle}
              </h2>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-100">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
            <span className="text-xs font-semibold text-brand-700">Live Admin</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
