import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { RegisterData } from '@/types/auth';
import { toast } from 'sonner';

// Define form schema with Zod
const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      // Split full name into first and last name
      const nameParts = values.fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Map form data to RegisterData interface
      const registerData: RegisterData = {
        email: values.email,
        password: values.password,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: '', // Optional field
        confirmPassword: values.password,
        acceptTerms: values.acceptTerms
      };

      await registerUser(registerData);
      toast.success('Account created successfully! Welcome to SKYLINE Transfers.');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen w-full font-display">
      {/* Left Pane (Image Section) */}
      <div
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-background-dark"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10"></div>
        <div className="relative z-10 p-12 text-center text-white max-w-lg">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mx-auto">
            <span className="material-symbols-outlined text-4xl">currency_exchange</span>
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] md:text-5xl">
            Send Money Home, Simply & Securely
          </h1>
          <p className="mt-4 text-base font-normal leading-normal opacity-90">
            Connecting families between Russia and Rwanda. Instant, affordable, and always secure.
          </p>
        </div>
      </div>
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 md:p-12 bg-background-light dark:bg-background-dark">
        <div className="w-full max-w-md space-y-8">
          {/* Page Heading */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-black leading-tight tracking-[-0.033em] text-slate-900 dark:text-white">
              Create Your Account
            </h1>
            <p className="mt-2 text-base font-normal leading-normal text-slate-600 dark:text-slate-400">
              Get started in seconds
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Full Name Field */}
            <div>
              <label className="flex flex-col">
                <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-200">Full Name</p>
                <input
                  {...register('fullName')}
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl placeholder:text-slate-400 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-300 dark:border-white/10 bg-white dark:bg-surface-dark h-14 dark:text-white dark:placeholder:text-slate-600 p-[15px] text-base font-normal leading-normal"
                  placeholder="Enter your full name"
                  type="text"
                />
              </label>
              {errors.fullName && (
                <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="flex flex-col">
                <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-200">Email</p>
                <input
                  {...register('email')}
                  className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl placeholder:text-slate-400 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-300 dark:border-white/10 bg-white dark:bg-surface-dark h-14 dark:text-white dark:placeholder:text-slate-600 p-[15px] text-base font-normal leading-normal"
                  placeholder="Enter your email address"
                  type="email"
                  autoComplete="email"
                />
              </label>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="flex flex-col">
                <p className="text-base font-medium leading-normal pb-2 text-slate-900 dark:text-slate-200">Password</p>
                <div className="relative flex w-full flex-1 items-stretch">
                  <input
                    {...register('password')}
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-xl placeholder:text-slate-400 focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-300 dark:border-white/10 bg-white dark:bg-surface-dark h-14 dark:text-white dark:placeholder:text-slate-600 p-[15px] text-base font-normal leading-normal pr-12"
                    placeholder="Create a secure password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                  />
                  <button
                    aria-label="Toggle password visibility"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </label>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start space-x-3">
              <input
                {...register('acceptTerms')}
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 dark:border-white/10 text-primary focus:ring-primary mt-1"
              />
              <label className="text-sm text-slate-600 dark:text-slate-400">
                I agree to the{' '}
                <Link to="/terms" className="font-medium text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="font-medium text-primary hover:underline">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>
            {errors.acceptTerms && (
              <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>
            )}

            {/* Create Account Button */}
            <div>
              <Button
                type="submit"
                disabled={loading}
                className="flex w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-5 bg-primary hover:bg-primary/90 text-background-dark text-base font-bold leading-normal tracking-[0.015em] transition-colors duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating Account...
                  </div>
                ) : (
                  <span className="truncate">Create Account</span>
                )}
              </Button>
            </div>

            {/* Legal Text */}
            <p className="text-xs text-center text-slate-600 dark:text-slate-400">
              By creating an account, you agree to our{' '}
              <Link to="/terms" className="font-medium text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-medium text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <Link to="/login" className="font-bold underline text-primary hover:underline">
                  Log In
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;