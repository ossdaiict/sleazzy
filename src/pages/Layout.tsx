import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium",
      isActive
        ? "bg-primary text-primary-foreground shadow-lg"
        : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
    );

  const renderNavLinks = () => {
    if (user.role === 'club') {
      return (
        <>
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border fixed h-full z-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="p-6 border-b border-border flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-lg border border-primary/20">
            S
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">Sleazzy</span>
        </motion.div>
        
        <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
          {renderNavLinks()}
        </nav>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="p-4 border-t border-border"
        >
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted border border-border">
            <Avatar className="h-10 w-10 border border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.role === 'club' ? `Group ${user.group}` : 'Administrator'}
              </p>
            </div>
          </div>
        </motion.div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-0 z-20 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu size={24} />
            </Button>
            <h1 className="text-xl font-semibold text-foreground hidden sm:block tracking-tight">
              {user.role === 'club' ? 'Club Portal' : 'Administration'}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-destructive rounded-full border-2 border-card" />
            </Button>
            <Button 
              variant="ghost"
              onClick={onLogout}
              className="flex items-center gap-2 text-muted-foreground hover:text-destructive"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Sidebar */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetContent side="left" className="w-64 p-0 flex flex-col bg-card border-r border-border">
          <SheetHeader className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground font-bold text-lg border border-primary/20">
                S
              </div>
              <SheetTitle className="text-xl font-bold text-foreground">Sleazzy</SheetTitle>
            </div>
          </SheetHeader>
          
          <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
            {renderNavLinks()}
          </nav>
          
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted border border-border">
              <Avatar className="h-10 w-10 border border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.role === 'club' ? `Group ${user.group}` : 'Administrator'}
                </p>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Layout;
