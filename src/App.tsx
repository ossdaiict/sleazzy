import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './pages/Layout';
import ClubDashboard from './lib/ClubDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookSlot from './pages/BookSlot';
import AdminRequests from './pages/AdminRequests';
import PolicyPage from './pages/PolicyPage';
import MyBookings from './pages/MyBookings';
import Login from './pages/Login';
import { User } from './types';
import { ClipboardList, Layers } from 'lucide-react';

// Placeholder component for routes not fully implemented
const PlaceholderPage: React.FC<{ title: string; icon?: React.ReactNode }> = ({ title, icon }) => (
  <div className="flex flex-col items-center justify-center h-96 text-center p-8 bg-card rounded-xl border border-border border-dashed">
    <div className="text-muted-foreground mb-4 scale-150">
      {icon || <ClipboardList size={48} />}
    </div>
    <h2 className="text-xl font-bold text-foreground">{title}</h2>
    <p className="text-muted-foreground mt-2">This feature is part of the full application scaffolding.</p>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
    // TODO: Call logout API endpoint if needed
    // await fetch('/api/auth/logout', { method: 'POST' });
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          {/* Dashboard - Conditional based on Role */}
          <Route path="/" element={user.role === 'club' ? <ClubDashboard /> : <AdminDashboard />} />

          {/* Club Routes */}
          <Route path="/book" element={<BookSlot currentUser={user} />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/policy" element={<PolicyPage />} />

          {/* Admin Routes */}
          <Route path="/admin/requests" element={<AdminRequests />} />
          <Route path="/admin/schedule" element={<PlaceholderPage title="Master Schedule" icon={<Layers size={48} />} />} />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;