import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Role, ClubGroupType } from '../types';
import { apiRequest } from '../lib/api';
import { toastSuccess } from '../lib/toast';
import { getErrorMessage } from '../lib/errors';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ThemeToggle } from '../components/theme-toggle';
import { GradientBackground } from '../components/gradient-background';
import { Logo } from '../components/Logo';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';

interface LoginProps {
  // Updated to accept the JWT token as a second argument
  onLogin: (user: User, token?: string) => void;
}

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registrationSchema = loginSchema.extend({
  clubName: z.string().min(2, 'Club name is required'),
  groupCategory: z.enum(['A', 'B', 'C'], {
    required_error: "Please select a group category",
  }),
});

type LoginFormData = z.infer<typeof registrationSchema>;

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<LoginFormData>({
    resolver: zodResolver(isRegistering ? registrationSchema : loginSchema),
    defaultValues: {
      email: '',
      password: '',
      clubName: '',
      groupCategory: 'A',
    },
  });

  const handleSubmit = async (values: LoginFormData) => {
    setError('');

    try {
      if (isRegistering) {
        await apiRequest('/api/auth/register', {
          method: 'POST',
          body: {
            email: values.email,
            password: values.password,
            clubName: values.clubName,
            groupCategory: values.groupCategory,
          },
        });
        toastSuccess('Account created successfully! Signing you in...');
      }

      // 1. Call your custom backend login route instead of Supabase
      const loginResponse = await apiRequest<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: {
          email: values.email,
          password: values.password,
        },
      });

      if (!loginResponse.token) {
        throw new Error('Login failed: No token received');
      }

      // 2. Temporarily store the token so the profile API request below can use it
      localStorage.setItem('jwt_token', loginResponse.token);

      // 3. Fetch the profile data using the new token
      const userProfile = await apiRequest<{
        id: string;
        email: string;
        name: string;
        role: Role;
        group?: ClubGroupType;
      }>('/api/auth/profile', { auth: true });

      toastSuccess(`Welcome back, ${userProfile.name}!`);
      
      // 4. Pass both the profile and the token back to App.tsx
      onLogin(userProfile, loginResponse.token);

    } catch (err) {
      console.error(err);
      setError(getErrorMessage(err, 'Authentication failed.'));
      // Clean up if something failed mid-way
      localStorage.removeItem('jwt_token');
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-bgMain dark:bg-transparent relative overflow-hidden">
      <GradientBackground />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="p-px rounded-2xl bg-linear-to-r from-indigo-500/60 via-purple-500/60 to-cyan-500/60 dark:from-indigo-400/40 dark:via-violet-500/40 dark:to-cyan-400/40 shadow-2xl">
          <div className="rounded-2xl overflow-hidden bg-white/95 dark:bg-[#0A0F1F]/95 backdrop-blur-xl">
            {/* Header */}
            <div className="border-b border-borderSoft/50 dark:border-white/10 pb-8 pt-8 sm:pt-10 text-center px-6 sm:px-8">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex justify-center mb-5"
              >
                <Logo size="lg" showText={false} />
              </motion.div>
              <h1 className="text-2xl sm:text-3xl font-bold text-textPrimary tracking-tight">Sleazzy</h1>
              <p className="text-textSecondary mt-2 text-sm font-medium">
                Slot Booking Made Easy
              </p>
            </div>

            {/* Form */}
            <div className="p-6 sm:p-8 space-y-6">
              <motion.h2
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg sm:text-xl font-bold text-textPrimary tracking-tight"
              >
                {isRegistering ? 'Club Registration' : 'Welcome Back'}
              </motion.h2>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

                  {isRegistering && (
                    <>
                      <FormField
                        control={form.control}
                        name="clubName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-textSecondary font-semibold text-sm">Club Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. AI Club" className="h-11 rounded-xl" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="groupCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-textSecondary font-semibold text-sm">Group Category</FormLabel>
                            <FormControl>
                              <select
                                className="flex h-11 w-full rounded-xl border border-borderSoft bg-transparent px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:cursor-not-allowed disabled:opacity-50 appearance-none [&>option]:bg-popover"
                                {...field}
                              >
                                <option value="A">Group A (Academic/Tech)</option>
                                <option value="B">Group B (Cultural)</option>
                                <option value="C">Group C (Sports)</option>
                              </select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-textSecondary font-semibold text-sm">Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail size={18} className="absolute left-3.5 top-3 text-textMuted z-10" />
                            <Input
                              type="email"
                              className="pl-11 h-11 rounded-xl"
                              placeholder="club_name@dau.ac.in"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-textSecondary font-semibold text-sm">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock size={18} className="absolute left-3.5 top-3 text-textMuted z-10" />
                            <Input
                              type="password"
                              className="pl-11 h-11 rounded-xl"
                              placeholder="Enter your password"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {error && (
                    <Alert variant="destructive" className="rounded-xl">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <motion.div whileTap={{ scale: 0.98 }} className="pt-2">
                    <Button
                      type="submit"
                      className="w-full rounded-xl h-12 text-base font-semibold bg-linear-to-r from-brand via-violet-500 to-cyan-500 text-white shadow-lg shadow-brand/25 hover:shadow-xl hover:shadow-brand/30 transition-all"
                      disabled={form.formState.isSubmitting}
                    >
                      {form.formState.isSubmitting ? (
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          {isRegistering ? 'Create Account' : 'Sign In'}
                          <ArrowRight size={18} className="ml-1" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </Form>

              <div className="text-center pt-2">
                <p className="text-sm text-textMuted">
                  {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setError('');
                      form.reset();
                    }}
                    className="ml-1 h-auto p-0 text-brand font-semibold hover:text-brandLink hover:underline"
                  >
                    {isRegistering ? 'Sign In' : 'Register Club'}
                  </Button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;