import React, { useState } from 'react';
import { User, Role, ClubGroupType } from '../types';
import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const MOCK_USERS: (User & { password: string })[] = [
  {
    email: 'admin@sbg.edu',
    password: '123',
    role: 'admin',
    name: 'SBG Admin'
  },
  {
    email: 'programming@sbg.edu',
    password: '123',
    role: 'club',
    name: 'Programming Club',
    group: 'A'
  },
  {
    email: 'music@sbg.edu',
    password: '123',
    role: 'club',
    name: 'Music Club',
    group: 'B'
  }
];

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegistering) {
      // Mock Registration Logic
      setError("Registration is currently closed. Please use a demo account.");
      return;
    }

    const user = MOCK_USERS.find(u => u.email === email && u.password === password);
    
    if (user) {
      // Create user object without password
      const { password, ...safeUser } = user;
      onLogin(safeUser);
    } else {
      setError('Invalid email or password. Try admin@sbg.edu / 123');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-blue-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">SBG Slot Booking</h1>
          <p className="text-blue-100 mt-2 text-sm">University Venue Management Portal</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6">
            {isRegistering ? 'Club Registration' : 'Welcome Back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isRegistering ? 'Create Account' : 'Sign In'}
              <ArrowRight size={18} />
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {isRegistering ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                className="ml-1 text-blue-600 font-medium hover:underline focus:outline-none"
              >
                {isRegistering ? 'Sign In' : 'Register Club'}
              </button>
            </p>
          </div>

          {!isRegistering && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 text-center">
                Demo Credentials
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => { setEmail('admin@sbg.edu'); setPassword('123'); }}
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded text-slate-600 border border-slate-200"
                >
                  <strong>Admin:</strong> admin@sbg.edu
                </button>
                <button 
                   onClick={() => { setEmail('programming@sbg.edu'); setPassword('123'); }}
                   className="p-2 bg-slate-50 hover:bg-slate-100 rounded text-slate-600 border border-slate-200"
                >
                  <strong>Club:</strong> programming@sbg.edu
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;