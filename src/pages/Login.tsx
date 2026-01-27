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
      // const user = await response.json();
      // onLogin(user);
      
      setError('Authentication not implemented. Please connect to backend API.');
    } catch (err) {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-2xl">
          {/* Header */}
          <CardHeader className="bg-primary/10 border-b border-border/40 pb-8 pt-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-primary/30"
            >
              <ShieldCheck size={32} className="text-primary" />
            </motion.div>
            <CardTitle className="text-2xl font-bold text-foreground">Sleazzy</CardTitle>
            <CardDescription className="text-muted-foreground mt-2">
              Slot Booking Made Easy
            </CardDescription>
          </CardHeader>

        {/* Form */}
        <CardContent className="p-8">
          <h2 className="text-xl font-bold text-foreground mb-6">
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
                          className="pl-10 bg-background/50 border-border/40"
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
                          className="pl-10 bg-background/50 border-border/40"
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
              <button
                onClick={() => { 
                  setIsRegistering(!isRegistering); 
                  setError('');
                  form.reset();
                }}
                className="ml-1 text-primary font-medium hover:underline focus:outline-none"
              >
                {isRegistering ? 'Sign In' : 'Register Club'}
              </button>
            </p>
          </div>

        </CardContent>
      </Card>
      </motion.div>
    </div>
  );
};

export default Login;
