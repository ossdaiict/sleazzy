import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CalendarPlus, 
  CalendarDays, 
  FileText, 
  ShieldCheck,
  Menu,
  Bell,
  UserCircle,
  LogOut,
  ClipboardList,
  Layers
} from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-slate-600 hover:bg-slate-100'
    }`;

  const renderNavLinks = () => {
    if (user.role === 'club') {
      return (
        <>
          <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
          <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-10">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
          <span className="text-xl font-bold text-slate-800 tracking-tight">SBG Portal</span>
        </div>
        
        <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
          {renderNavLinks()}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <UserCircle size={32} className="text-slate-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user.name}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user.role === 'club' ? `Group ${user.group}` : 'Administrator'}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20 px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu size={24} />
            </button>
            <h1 className="text-lg font-semibold text-slate-800 hidden sm:block">
              {user.role === 'club' ? 'Club Portal' : 'Administration'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button 
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col z-50">
             <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xl font-bold text-slate-800">SBG Portal</span>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <Menu size={20} />
              </button>
            </div>
            <nav className="flex-1 p-4 flex flex-col gap-1">
              {renderNavLinks()}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;