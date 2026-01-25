import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ClubDashboard from './components/ClubDashboard';
import AdminDashboard from './components/AdminDashboard';
import BookSlot from './components/BookSlot';
import AdminRequests from './components/AdminRequests';
import PolicyPage from './components/PolicyPage';
import MyBookings from './components/MyBookings';
import Login from './components/Login';
import { User } from './types';
import { ClipboardList, Layers } from 'lucide-react';

// Placeholder component for routes not fully implemented
const PlaceholderPage: React.FC<{ title: string; icon?: React.ReactNode }> = ({ title, icon }) => (
  <div className="flex flex-col items-center justify-center h-96 text-center p-8 bg-white rounded-xl border border-slate-200 border-dashed">
    <div className="text-slate-300 mb-4 scale-150">
      {icon || <ClipboardList size={48} />}
    </div>
    <h2 className="text-xl font-bold text-slate-700">{title}</h2>
    <p className="text-slate-500 mt-2">This feature is part of the full application scaffolding.</p>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
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