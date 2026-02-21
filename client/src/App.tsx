import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/error-boundary';
import Layout from './pages/Layout';
import ClubDashboard from './lib/ClubDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookSlot from './pages/BookSlot';
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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  React.useEffect(() => {
    const initAuth = async () => {
      // Check for existing session on load
      const { data: { session } } = await supabase.auth.getSession();
      handleSession(session);

      // Listen for changes (sign in, sign out, etc.)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        handleSession(session);
      });

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, []);

  const handleSession = async (session: any) => {
    if (!session) {
      setUser(null);
      return;
    }

    localStorage.setItem('supabase_access_token', session.access_token);

    try {
      const userProfile = await apiRequest<User>('/api/auth/profile', { auth: true });
      setUser(userProfile);
    } catch (error) {
      console.log("Profile not found, attempting auto-registration for Google User...");
      // Profile likely doesn't exist (First time Google Login)
      try {
        const { user } = session;
        const name = user.user_metadata.full_name || user.email?.split('@')[0] || 'New Club';

        // Register as a club by default
        // Note: register endpoint might fail if it tries to create auth user again, 
        // but our modified register logic in auth.ts uses upsert for profile which is good.
        // However, auth.ts tries to create supabase auth user. We should check that.
        // Actually, auth.ts does `supabase.auth.admin.createUser`. This will fail if user exists.
        // We might need a separate endpoint for "create profile only" OR update register to handle existing auth users.
        // Let's assume for now we might need to fix backend. But I'll try calling register.
        // Wait, calling register with a password will try to create a new user. 
        // Strategy: We need the backend to support "ensure profile exists". 
        // Let's rely on the fact that if I call register, strict validation might fail or duplicate user error.

        // ALTERNATIVE: Use a new specific endpoint or modifying profile fetching to auto-create?
        // Let's update `handleSession` to just set user based on session if profile fails? 
        // No, we need the `role`. 
        // Let's try to hit a new endpoint `api/auth/google-callback`? 
        // Or simpler: Update `auth.ts` to have a `create-profile` route?
        // Or just call `register` and catch the "user already exists" error but hope it creates the profile?
        // The current `register` implementation in `auth.ts` does:
        // 1. Check if user exists (by email/admin check).
        // 2. Create user (throws if exists).
        // 3. Upsert profile. 
        // If step 2 throws, step 3 is skipped.
        // So we need to fix backend `auth.ts` to allow "registering" an existing user (just creating profile).

        // For this step (App.tsx), I will leave the auto-register intent but I know it might fail. 
        // I will PROCEED to fix `auth.ts` in the NEXT step.

        await apiRequest('/api/auth/register', {
          method: 'POST',
          body: {
            userId: user.id,
            email: user.email,
            password: 'google-oauth-placeholder-password-123', // Dummy, won't override actual auth
            clubName: name,
            groupCategory: 'A'
          }
        });

        const newProfile = await apiRequest<User>('/api/auth/profile', { auth: true });
        setUser(newProfile);
      } catch (regError) {
        console.error("Auto-registration failed", regError);
        toastError(regError, 'Could not complete setup. Please contact support.');
        setUser(null);
      }
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = async () => {
    // Clear state first to update UI immediately
    setUser(null);

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

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;