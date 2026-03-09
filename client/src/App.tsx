import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/error-boundary';
import Layout from './pages/Layout';
import ClubDashboard from './lib/ClubDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookSlot from './pages/BookSlot';
import AdminClubs from './pages/AdminClubs';
import AdminRequests from './pages/AdminRequests';
import MasterSchedule from './pages/MasterSchedule';
import PolicyPage from './pages/PolicyPage';
import MyBookings from './pages/MyBookings';
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import { User } from './types';
import { ClipboardList, Layers } from 'lucide-react';
import { supabase } from './lib/supabase';
import { apiRequest } from './lib/api';
import { toastError } from './lib/toast';
import { getSocket, SOCKET_EVENTS } from './lib/socket';

const USER_STORAGE_KEY = 'sleazzy_user_profile';

const getCachedUser = (): User | null => {
  if (typeof window === 'undefined') return null;

  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as User;
    if (!parsed?.email || !parsed?.name || !parsed?.role) {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

const cacheUser = (nextUser: User | null) => {
  if (typeof window === 'undefined') return;

  if (!nextUser) {
    localStorage.removeItem(USER_STORAGE_KEY);
    return;
  }

  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => getCachedUser());

  React.useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      // Check for existing session on load
      const { data: { session } } = await supabase.auth.getSession();
      await handleSession(session, isMounted);
    };

    initAuth();

    // Listen for changes (sign in, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleSession(session, isMounted);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSession = async (session: any, isMounted = true) => {
    if (!isMounted) return;

    if (!session) {
      setUser(null);
      cacheUser(null);
      return;
    }

    localStorage.setItem('supabase_access_token', session.access_token);

    try {
      // /api/auth/profile auto-creates a profile + club row if missing (handles first-time OAuth logins)
      const userProfile = await apiRequest<User>('/api/auth/profile', { auth: true });
      if (!isMounted) return;
      setUser(userProfile);
      cacheUser(userProfile);
    } catch (error) {
      if (!isMounted) return;
      console.error('Failed to load user profile:', error);
      toastError(error, 'Failed to load your profile. Please try signing in again.');
      setUser(null);
      cacheUser(null);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    cacheUser(loggedInUser);

    // Join the appropriate socket room after login
    const socket = getSocket();
    if (loggedInUser.role === 'admin') {
      socket.emit(SOCKET_EVENTS.JOIN_ADMIN);
    } else if (loggedInUser.email) {
      // For clubs, the server uses club_id for rooms.
      // We'll fetch the club data to get the id, but for now we join with email as a fallback.
      // Actual club-room join with ID happens in ClubDashboard once events load.
      apiRequest<{ id: string }[]>('/api/clubs').then(clubs => {
        const match = clubs.find((c: any) => c.email === loggedInUser.email);
        if (match?.id) socket.emit(SOCKET_EVENTS.JOIN_CLUB, match.id);
      }).catch(() => { });
    }
  };

  const handleLogout = async () => {
    // Clear state first to update UI immediately
    setUser(null);
    cacheUser(null);

    // Clear specific auth tokens if any
    localStorage.removeItem('supabase_access_token');

    // Perform actual Supabase signout
    try {
      const { supabase } = await import('./lib/supabase');
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
      toastError(err, 'Logout failed. Please try again.');
    }
  };

  // Global socket room joining
  React.useEffect(() => {
    if (!user) return;

    const socket = getSocket();
    if (user.role === 'admin') {
      socket.emit(SOCKET_EVENTS.JOIN_ADMIN);
    } else if (user.email) {
      // Fetch club info to join the correct room
      apiRequest<{ id: string }[]>('/api/clubs').then(clubs => {
        const match = clubs.find((c: any) => c.email === user.email);
        if (match?.id) socket.emit(SOCKET_EVENTS.JOIN_CLUB, match.id);
      }).catch(() => { });
    }
  }, [user]);

  if (!user) {
    return (
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="*" element={<LandingPage onGoToLogin={() => { window.location.href = '/login'; }} />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Layout user={user} onLogout={handleLogout}>
          <Routes>
            <Route path="/" element={user.role === 'club' ? <ClubDashboard user={user} /> : <AdminDashboard />} />

            <Route path="/book" element={<BookSlot currentUser={user} />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/policy" element={<PolicyPage />} />

            <Route path="/admin/requests" element={<AdminRequests />} />
            <Route path="/admin/schedule" element={<MasterSchedule />} />
            <Route path="/admin/clubs" element={<AdminClubs />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;