import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Role, ClubGroupType } from '../types';
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
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSubmit = async (values: LoginFormValues) => {
    setError('');

    if (isRegistering) {
      setError("Registration is currently closed. Please contact the administrator.");
      return;
    }

    // TODO: Replace with actual API call
    try {
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(values)
      // });
      // 
      // if (!response.ok) {
      //   throw new Error('Login failed');
      // }
      // 
      // const user = await response.json();
      // onLogin(user);
      
      setError('Authentication not implemented. Please connect to backend API.');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
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
