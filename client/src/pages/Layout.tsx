import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GradientBackground } from '../components/gradient-background';
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarDays,
  FileText,
  ShieldCheck,
  Menu,
  Bell,
  LogOut,
  ClipboardList,
  Layers,
} from 'lucide-react';
import { User } from '../types';
import { Button } from '../components/ui/button';
import { ThemeToggle } from '../components/theme-toggle';
import NotificationPanel from '../components/NotificationPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
};

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm font-medium active:scale-[0.98] touch-manipulation relative overflow-hidden group",
      isActive
        ? "text-white shadow-lg shadow-brand/25 bg-gradient-to-r from-brand to-brandLink"
        : "text-textMuted hover:text-textPrimary hover:bg-hoverSoft"
    );

  const renderNavLinks = () => {
    if (user.role === 'club') {
      return (
        <>
          <div className="px-4 py-2 text-xs font-bold text-textMuted/60 uppercase tracking-widest mb-2 mt-2">
            Club Menu
          </div>
          <NavLink to="/" className={navClass} end>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/book" className={navClass}>
            <CalendarPlus size={20} />
            <span>Book a Slot</span>
          </NavLink>
          <NavLink to="/my-bookings" className={navClass}>
            <CalendarDays size={20} />
            <span>My Bookings</span>
          </NavLink>
          <NavLink to="/policy" className={navClass}>
            <FileText size={20} />
            <span>Policy</span>
          </NavLink>
        </>
      );
    } else {
      return (
        <>
          <div className="px-4 py-2 text-xs font-bold text-textMuted/60 uppercase tracking-widest mb-2 mt-2">
            Admin Controls
          </div>
          <NavLink to="/" className={navClass} end>
            <ShieldCheck size={20} />
            <span>Admin Dashboard</span>
          </NavLink>
          <NavLink to="/admin/requests" className={navClass}>
            <ClipboardList size={20} />
            <span>Pending Requests</span>
          </NavLink>
          <NavLink to="/admin/schedule" className={navClass}>
            <Layers size={20} />
            <span>Master Schedule</span>
          </NavLink>
        </>
      );
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex bg-transparent relative selection:bg-brand selection:text-white">
      <GradientBackground />
      {/* Sidebar - Desktop (Floating Style) */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 fixed h-full z-10 p-4">
        <div className="flex flex-col h-full glass-card border-[0.5px] border-white/20 dark:border-white/10 flex-1 overflow-hidden backdrop-blur-3xl bg-white/50 dark:bg-black/40">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="p-5 lg:p-6 border-b border-borderSoft flex items-center gap-3"
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-10 h-10 bg-gradient-to-br from-brand to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand/20"
            >
              S
            </motion.div>
            <span className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-textPrimary to-textSecondary tracking-tight font-sans">Sleazzy</span>
          </motion.div>

          <motion.nav
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto overscroll-contain scrollbar-hide"
          >
            {renderNavLinks()}
          </motion.nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="p-4 border-t border-borderSoft/50"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-hoverSoft/50 transition-colors cursor-pointer group">
              <Avatar className="h-10 w-10 border-2 border-white dark:border-white/10 shrink-0 shadow-sm ring-2 ring-transparent group-hover:ring-brand/20 transition-all">
                <AvatarFallback className="bg-gradient-to-br from-brand to-purple-600 text-white font-semibold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-textPrimary truncate group-hover:text-brand transition-colors">
                  {user.name}
                </p>
                <p className="text-xs text-textMuted truncate">
                  {user.role === 'club' ? `Group ${user.group}` : 'Administrator'}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 lg:ml-72 flex flex-col h-screen h-[100dvh]">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 z-20 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between safe-area-inset-top"
        >
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0 h-10 w-10 rounded-xl active:scale-95 glass bg-white/50"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu size={22} />
            </Button>
            <div className="hidden md:block">
              {/* Breadcrumb or simplified title could go here, or just keep it clean */}
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-textPrimary truncate tracking-tight md:hidden">
              {user.role === 'club' ? 'Club Portal' : 'Administration'}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="glass rounded-full px-1 py-1 shadow-sm">
              <ThemeToggle />
            </div>

            {user.role === 'admin' ? (
              <NotificationPanel />
            ) : (
              <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full glass hover:bg-white/60 dark:hover:bg-black/40 transition-all">
                <Bell size={20} className="text-textSecondary" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="hidden sm:flex items-center gap-2 text-textMuted hover:text-error hover:bg-error/10 rounded-full h-10 px-4 font-medium transition-all"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </Button>
          </div>
        </motion.header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overscroll-contain pb-safe">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent
          side="left"
          className="w-[min(85vw,320px)] sm:w-72 p-0 flex flex-col glass-dark border-r border-white/10"
        >
          <SheetHeader className="p-5 sm:p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand/20">
                S
              </div>
              <SheetTitle className="text-xl font-bold text-textPrimary">Sleazzy</SheetTitle>
            </div>
          </SheetHeader>

          <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto overscroll-contain">
            {renderNavLinks()}
          </nav>

          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
              <Avatar className="h-10 w-10 border border-white/10 shrink-0">
                <AvatarFallback className="bg-brand/10 text-brand font-semibold text-sm">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-textPrimary truncate">
                  {user.name}
                </p>
                <p className="text-xs text-textMuted truncate">
                  {user.role === 'club' ? `Group ${user.group}` : 'Administrator'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full mt-2 justify-start text-error hover:text-error hover:bg-error/10"
              onClick={onLogout}
            >
              <LogOut size={18} className="mr-2" /> Logout
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Layout;
