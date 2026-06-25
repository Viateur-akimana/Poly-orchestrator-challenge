
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  identifier: z.string().min(3, 'Please enter your email or phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login, error, setError } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      await login({
        email: values.identifier, // Accepts either email or phone
        password: values.password,
      });
      navigate('/dashboard');
    } catch (err) {
      // Error is already handled by the auth context
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 bg-background-light dark:bg-background-dark font-display">


      {/* Centered Card */}
      <div className="w-full max-w-md rounded-3xl bg-white/80 dark:bg-surface-dark border border-black/5 dark:border-white/10 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="flex flex-col items-center gap-6">
          {/* Currency Icon */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">currency_exchange</span>
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome Back</h1>
              <p className="text-slate-600 dark:text-slate-400">Log in to securely send money from Russia to Rwanda.</p>
            </div>
          </div>

          {/* Login Form */}
          <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50/80 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-200 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}
            {/* Identifier Field */}
            <label className="flex w-full flex-col">
              <p className="pb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Email or Phone Number</p>
              <input
                {...register('identifier')}
                className="form-input flex h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-background-dark p-3 text-base font-normal leading-normal text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20"
                placeholder="Enter your email or phone number"
                autoComplete="username"
              />
              {errors.identifier && (
                <p className="mt-1 text-sm text-red-600">{errors.identifier.message}</p>
              )}
            </label>

            {/* Password Field */}
            <label className="flex w-full flex-col">
              <div className="flex w-full items-center justify-between pb-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Password</p>
                <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link>
              </div>
              <div className="flex w-full flex-1 items-stretch rounded-lg">
                <input
                  {...register('password')}
                  className="form-input flex h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-l-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-background-dark p-3 pr-2 text-base font-normal leading-normal text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter your password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                />
                <button
                  className="flex items-center justify-center rounded-r-xl border border-l-0 border-slate-300 dark:border-white/10 bg-white dark:bg-background-dark px-3 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </label>


            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-primary hover:bg-primary/90 text-background-dark text-base font-bold leading-normal tracking-[0.015em] transition-colors duration-200 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <span className="animate-spin rounded-full border-b-2 border-white mr-2"></span>
                  Logging in...
                </span>
              ) : (
                <span className="truncate">Log In</span>
              )}
            </button>
          </form>
          <div className="text-center text-sm text-slate-600 dark:text-slate-400">
            <span>Don't have an account?</span>{' '}
            <Link className="font-bold text-primary underline hover:underline" to="/register">
              Sign Up
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 text-center text-xs text-slate-500 dark:text-slate-500 w-full">
        <Link className="hover:underline hover:text-primary" to="/terms">Terms of Service</Link>
        <span className="mx-2">·</span>
        <Link className="hover:underline hover:text-primary" to="/privacy">Privacy Policy</Link>
      </footer>
    </div>
  );
}