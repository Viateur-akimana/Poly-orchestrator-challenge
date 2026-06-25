import apiClient from '@/lib/apiClient';
import { LoginCredentials, RegisterData, AuthResponse } from '@/types/auth';

export const authService = {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { data } = response.data;
      return {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || data.accessToken,
        expiresIn: data.expiresIn || 3600
      };
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Login failed';
      throw new Error(message);
    }
  },

  // Register new user
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await apiClient.post('/auth/register', userData);
      const { data } = response.data;
      return {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || data.accessToken,
        expiresIn: data.expiresIn || 3600
      };
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Registration failed';
      throw new Error(message);
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      throw error;
    }
  },

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const response = await apiClient.post('/auth/refresh-token', { refreshToken });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get current user
  async getCurrentUser(): Promise<any> {
    try {
      const response = await apiClient.get('/auth/me');
      return response.data.data.user;
    } catch (error) {
      throw error;
    }
  },

  // Request password reset
  async forgotPassword(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (error) {
      throw error;
    }
  },

  // Reset password
  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword: password });
    } catch (error) {
      throw error;
    }
  },

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    try {
      await apiClient.post('/auth/verify-email', { token });
    } catch (error) {
      throw error;
    }
  },

  // Resend verification email
  async resendVerificationEmail(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/resend-verification', { email });
    } catch (error) {
      throw error;
    }
  },

  // Update profile
  async updateProfile(data: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }): Promise<any> {
    try {
      const response = await apiClient.put('/auth/profile', data);
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  // Change password
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    try {
      await apiClient.put('/auth/change-password', data);
    } catch (error) {
      throw error;
    }
  }
};

