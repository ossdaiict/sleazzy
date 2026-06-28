import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarDays,
  FileText,
  ShieldCheck,
  Bell,
  LogOut,
  ClipboardList,
  Layers,
  Users,
  Home,
  ListTodo,
  Calendar,
  Archive,
  MapPin,
} from 'lucide-react';
import { User } from '../types';
import { Button } from '../components/ui/button';
import { ThemeToggle } from '../components/theme-toggle';
import NotificationPanel from '../components/NotificationPanel';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { getClubLogoUrl, getLogoBgClass } from '../lib/logos';
import { Logo } from '../components/Logo';
import { GdgFooterCredit } from '../components/GdgFooterCredit';
import { cn } from '@/lib/utils';
import { getSocket } from '../lib/socket';
import { toast } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
}

const adminLinks = [
  { to: '/', label: 'Dashboard', icon: ShieldCheck, end: true },
  { to: '/admin/requests', label: 'Requests', icon: ClipboardList },
  { to: '/admin/schedule', label: 'Schedule', icon: Layers },
  { to: '/admin/clubs', label: 'Clubs', icon: Users },
  { to: '/admin/venues', label: 'Venues', icon: MapPin },
  { to: '/admin/event-reports', label: 'Event Reports', icon: FileText },
  { to: '/members', label: 'Members', icon: Users },
  { to: '/archives', label: 'Archives', icon: Archive },
];

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();
  const isCommittee = user.name.toLowerCase().includes('committee');
  const clubLabel = isCommittee ? 'Committee' : 'Club';

  const links = user.role === 'club' 
    ? [
        { to: '/', label: 'Club Portal', icon: Home, end: true },
        { to: '/book', label: 'Book Venue', icon: CalendarPlus },
        { to: '/my-bookings', label: 'My Bookings', icon: ListTodo },
        { to: '/manage-events', label: 'Manage Events', icon: Calendar },
        { to: '/event-reports', label: 'Event Reports', icon: FileText },
        { to: '/members', label: 'Members', icon: Users },
        { to: '/archives', label: 'Archives', icon: Archive },
        { to: '/policy', label: 'Policy', icon: FileText },
      ]
    : adminLinks;

  React.useEffect(() => {
    if (user.role !== 'club') return;

    const socket = getSocket();
    const handleStatusChanged = (payload: { eventName: string; status: 'approved' | 'rejected' | 'deleted' }) => {
      if (payload.status === 'approved') {
        toast.success(`Booking Approved: ${payload.eventName}`, {
          description: 'Your request has been officially confirmed.',
          duration: 5000,
        });
      } else if (payload.status === 'rejected') {
        toast.error(`Booking Rejected: ${payload.eventName}`, {
          description: 'Your request was not approved by the admin.',
          duration: 6000,
        });
      }
    };

    if (!socket) return;
    socket.on('booking:status_changed', handleStatusChanged);
    return () => {
      socket.off('booking:status_changed', handleStatusChanged);
    };
  }, [user]);

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 relative group',
      isActive
        ? 'text-brand bg-brand/8 font-semibold'
        : 'text-textMuted dark:text-white hover:text-textPrimary dark:hover:text-white hover:bg-hoverSoft'
    );

  const mobileNavClass = (isActive: boolean) =>
    cn(
      'flex flex-col items-center justify-center gap-0.5 py-1 px-2 rounded-xl transition-all duration-200 relative min-h-0',
      isActive
        ? 'text-brand'
        : 'text-textMuted active:text-textPrimary'
    );

  return (
    <div className="min-h-dvh flex bg-bgMain relative">
      {/* ====== Desktop Sidebar ====== */}
      <aside className="hidden lg:flex flex-col w-(--sidebar-width) fixed h-full z-10 border-r border-borderSoft bg-card/80 backdrop-blur-xl">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="p-5 lg:p-6 border-b border-borderSoft"
          >
            <Logo size="md" />
          </motion.div>

          {/* Nav */}
          <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto overscroll-contain scrollbar-hide">
            <div className="px-3 py-2 text-[10px] font-bold text-textMuted/50 uppercase tracking-[0.15em] mt-1 mb-1">
              {user.role === 'club' ? 'Club Menu' : 'Admin Controls'}
            </div>
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} className={navItemClass} end={link.end}>
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 bg-brand/8 rounded-xl"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <link.icon size={20} className="relative z-10" />
                    <span className="relative z-10">{link.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* User Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="p-3 border-t border-borderSoft"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-hoverSoft transition-colors group">
               <Avatar className={cn("h-10 w-10 border border-borderSoft shrink-0 shadow-sm transition-all group-hover:border-brand/50 ring-2 ring-brand/10 bg-white", getLogoBgClass(user.name))}>
                <AvatarImage src={user.logoUrl || getClubLogoUrl(user.name) || ''} alt={user.name} className="object-contain p-1 drop-shadow-[0_1px_1px_rgba(0,0,0,0.12)]" />
                <AvatarFallback className="bg-brand text-white font-semibold text-sm flex items-center justify-center">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-textPrimary truncate group-hover:text-brand transition-colors">
                  {user.name}
                </p>
                <p className="text-xs text-textMuted dark:text-white/85 truncate">
                  {user.role === 'club' ? `Group ${user.group}` : 'Administrator'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="h-8 w-8 rounded-lg text-textMuted hover:text-error hover:bg-error/10 shrink-0 opacity-0 group-hover:opacity-100 transition-all"
              >
                <LogOut size={16} />
              </Button>
            </div>
          </motion.div>
        </div>
      </aside>

      {/* ====== Main Content ====== */}
      <div className="flex-1 min-w-0 overflow-x-hidden lg:ml-(--sidebar-width) flex flex-col min-h-dvh">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between bg-bgMain/80 backdrop-blur-xl border-b border-borderSoft/50"
          style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile logo */}
            <div className="lg:hidden">
              <Logo size="sm" showText={false} />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-textPrimary truncate tracking-tight lg:hidden">
              {links.find(l => l.end ? location.pathname === l.to : location.pathname.startsWith(l.to))?.label
                ?? (user.role === 'club' ? 'Club Portal' : 'Administration')}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="rounded-lg border border-borderSoft/60 shadow-sm bg-card/80 backdrop-blur flex items-center justify-center">
              <ThemeToggle />
            </div>
            <NotificationPanel />
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="flex items-center gap-2 text-textMuted hover:text-error rounded-lg h-9 px-2.5 sm:px-3 font-medium transition-all border border-borderSoft/60 bg-card/80 backdrop-blur"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </motion.header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 mb-bottom-nav lg:mb-0">
          <div className="max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Footer (desktop) */}
        <footer className="hidden lg:block border-t border-borderSoft/50 py-4 px-6">
          <GdgFooterCredit compact className="max-w-none" />
        </footer>
      </div>

      {/* ====== Mobile Bottom Navigation ====== */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-card/90 backdrop-blur-2xl border-t border-borderSoft/60 shadow-[0_-4px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_30px_rgba(0,0,0,0.3)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        <div className="flex items-stretch justify-around px-2 py-1.5">
          {links.map((link) => {
            const isActive = link.end
              ? location.pathname === link.to
              : location.pathname.startsWith(link.to);

            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={mobileNavClass(isActive)}
              >
                <div className="relative">
                  {isActive && (
                    <motion.div
                      layoutId="mobile-active"
                      className="absolute -inset-2 bg-brand/10 rounded-full"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <link.icon size={22} className="relative z-10" />
                </div>
                <span className={cn(
                  'text-[10px] font-semibold relative z-10',
                  isActive ? 'text-brand' : 'text-textMuted'
                )}>
                  {link.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
