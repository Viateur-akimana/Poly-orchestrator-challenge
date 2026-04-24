import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authService } from '@/services/auth.service';
import { ArrowLeft } from 'lucide-react';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      setIsLoading(true);
      setError(null);
      await authService.forgotPassword(values.email);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 bg-background-light dark:bg-background-dark font-display">
      <div className="w-full max-w-md rounded-3xl bg-white/80 dark:bg-surface-dark border border-black/5 dark:border-white/10 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="flex flex-col items-center gap-6">
          <div className="w-full flex justify-start">
            <Link to="/login" className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
              <ArrowLeft size={16} className="mr-1" /> Back to log in
            </Link>
          </div>
          
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-3xl">lock_reset</span>
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Forgot Password?</h1>
              <p className="text-slate-600 dark:text-slate-400">
                No worries, we'll send you reset instructions.
              </p>
            </div>
          </div>

          {isSuccess ? (
            <div className="w-full flex flex-col items-center gap-6">
              <div className="bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-200 px-4 py-3 rounded-xl text-sm w-full text-center">
                If your email is registered, you will receive a password reset link shortly. Please check your inbox.
              </div>
              <Link
                to="/login"
                className="flex w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-primary hover:bg-primary/90 text-background-dark text-base font-bold leading-normal tracking-[0.015em] transition-colors duration-200"
              >
                Return to log in
              </Link>
            </div>
          ) : (
            <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <div className="bg-red-50/80 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-200 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}
              
              <label className="flex w-full flex-col">
                <p className="pb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</p>
                <input
                  {...register('email')}
                  className="form-input flex h-12 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-background-dark p-3 text-base font-normal leading-normal text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-primary focus:outline-0 focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter your email address"
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </label>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full min-w-[84px] mt-2 cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-primary hover:bg-primary/90 text-background-dark text-base font-bold leading-normal tracking-[0.015em] transition-colors duration-200 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="animate-spin rounded-full border-b-2 border-background-dark mr-2"></span>
                    Sending instructions...
                  </span>
                ) : (
                  <span className="truncate">Reset Password</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
