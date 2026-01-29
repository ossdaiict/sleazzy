import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './pages/Layout';
import ClubDashboard from './lib/ClubDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookSlot from './pages/BookSlot';
import AdminRequests from './pages/AdminRequests';
import MasterSchedule from './pages/MasterSchedule';
import PolicyPage from './pages/PolicyPage';
import MyBookings from './pages/MyBookings';
import Login from './pages/Login';
import { User, Role, ClubGroupType } from './types';
import { ClipboardList, Layers } from 'lucide-react';
import { supabase } from './lib/supabase';
import { apiRequest } from './lib/api';

// const PlaceholderPage: React.FC<{ title: string; icon?: React.ReactNode }> = ({ title, icon }) => (
//   <div className="flex flex-col items-center justify-center h-96 text-center p-8 bg-card rounded-xl border border-border border-dashed">
//     <div className="text-muted-foreground mb-4 scale-150">
//       {icon || <ClipboardList size={48} />}
//     </div>
//     <h2 className="text-xl font-bold text-foreground">{title}</h2>
//     <p className="text-muted-foreground mt-2">This feature is part of the full application scaffolding.</p>
//   </div>
// );

const App: React.FC = () => {
  const getDefaultUser = (): User => {
    if (import.meta.env.DEV) {
      const storedRole = localStorage.getItem('dev_user_role') as Role | null;
      const storedName = localStorage.getItem('dev_user_name') || 'Programming Club';

      if (storedRole === 'admin') {
        return {
          email: 'admin@university.edu',
          name: 'SBG Admin',
          role: 'admin',
        };
      }

      return {
        email: 'club@university.edu',
        name: storedName,
        role: 'club',
        group: 'A',
      };
    }
    return null as any;
  };

  // Placeholder removed
  const [user, setUser] = useState<User | null>(null);

  React.useEffect(() => {
    const initAuth = async () => {
      // Check for existing session on load
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        handleSession(session);
      }

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
      // Don't clear user immediately if we want to allow dev override? 
      // Actually, if we are in real auth mode, we should sync with session.
      // But let's check if we have a DEV override active and NO session.
      // For now, let's enforce real auth state.
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

    // Clear dev mode persistence
    if (import.meta.env.DEV) {
      localStorage.removeItem('dev_user_role');
      localStorage.removeItem('dev_user_name');
    }

    // Clear specific auth tokens if any
    localStorage.removeItem('supabase_access_token');

    // Perform actual Supabase signout
    try {
      const { supabase } = await import('./lib/supabase');
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <HashRouter>
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
    </HashRouter>
  );
};

export default App;