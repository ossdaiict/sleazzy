import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Role, ClubGroupType } from '../types';
import { supabase } from '../lib/supabase';
import { apiRequest } from '../lib/api';
import { ShieldCheck, Mail, Lock, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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
  onLogin: (user: User) => void;
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
        // Registration Flow
        await apiRequest('/api/auth/register', {
          method: 'POST',
          body: {
            email: values.email,
            password: values.password,
            clubName: values.clubName,
            groupCategory: values.groupCategory,
          },
        });

        // After successful registration, proceed to login automatically
      }

      // Login Flow
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error || !data.user || !data.session) {
        throw new Error(error?.message || 'Login failed');
      }

      localStorage.setItem('supabase_access_token', data.session.access_token);

      // Fetch user profile via backend to bypass RLS and get club details
      const userProfile = await apiRequest<{
        id: string;
        email: string;
        name: string;
        role: Role;
        group?: ClubGroupType;
      }>('/api/auth/profile', { auth: true });

      onLogin(userProfile);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle background effect - minimal */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border border-border bg-card">
          {/* Header */}
          <CardHeader className="border-b border-border pb-8 pt-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20"
            >
              <ShieldCheck size={28} className="text-primary" />
            </motion.div>
            <CardTitle className="text-3xl font-bold text-foreground tracking-tight">Sleazzy</CardTitle>
            <CardDescription className="text-muted-foreground mt-2 text-base font-medium">
              Slot Booking Made Easy
            </CardDescription>
          </CardHeader>

          {/* Form */}
          <CardContent className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-foreground mb-6 tracking-tight">
              {isRegistering ? 'Club Registration' : 'Welcome Back'}
            </h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">

                {isRegistering && (
                  <>
                    <FormField
                      control={form.control}
                      name="clubName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Club Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. AI Club" {...field} />
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
                          <FormLabel>Group Category</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                {...field}
                              >
                                <option value="A">Group A (Academic/Tech)</option>
                                <option value="B">Group B (Cultural)</option>
                                <option value="C">Group C (Sports)</option>
                              </select>
                            </div>
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
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail size={18} className="absolute left-3 top-2.5 text-muted-foreground z-10" />
                          <Input
                            type="email"
                            className="pl-10"
                            placeholder="name@university.edu"
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock size={18} className="absolute left-3 top-2.5 text-muted-foreground z-10" />
                          <Input
                            type="password"
                            className="pl-10"
                            placeholder="••••••••"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  disabled={form.formState.isSubmitting}
                >
                  {isRegistering ? 'Create Account' : 'Sign In'}
                  <ArrowRight size={18} />
                </Button>
              </form>
            </Form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full max-w-sm mx-auto flex items-center gap-2"
              onClick={async () => {
                setError('');
                try {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: window.location.origin,
                    },
                  });
                  if (error) throw error;
                } catch (err: any) {
                  setError(err.message);
                }
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isRegistering ? 'Already have an account?' : "Don't have an account?"}
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setError('');
                    form.reset();
                  }}
                  className="ml-1 h-auto p-0 text-primary font-medium hover:underline"
                >
                  {isRegistering ? 'Sign In' : 'Register Club'}
                </Button>
              </p>
            </div>

          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
