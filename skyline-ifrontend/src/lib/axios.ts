import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getToken, clearAuthData } from '@/lib/auth';

// Create axios instance with base URL and headers
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5004/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      // If we have a refresh token, try to refresh the access token
      // Otherwise, redirect to login
      clearAuthData();
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Handle other errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error:', error.response.data);

      // Handle specific error statuses
      if (error.response.status === 403) {
        // Forbidden - user doesn't have permission
        console.error('You do not have permission to perform this action');
      } else if (error.response.status === 404) {
        // Not found
        console.error('The requested resource was not found');
      } else if (error.response.status >= 500) {
        // Server error
        console.error('A server error occurred. Please try again later.');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server. Please check your connection.');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Helper function to handle file uploads with progress
export const uploadFile = async (
  url: string,
  file: File,
  onProgress?: (progress: number) => void,
  config?: AxiosRequestConfig
): Promise<AxiosResponse> => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post(url, formData, {
    ...config,
    headers: {
      ...config?.headers,
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.lengthComputable) {
        const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        onProgress(progress);
      }
    },
  });
};

export default api;
