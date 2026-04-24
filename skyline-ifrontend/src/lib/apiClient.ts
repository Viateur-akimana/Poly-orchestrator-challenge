import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { getToken, clearAuth } from '@/utils/auth';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
type ErrorResponse = {
  message?: string;
  error?: string;
  statusCode?: number;
};

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ErrorResponse>) => {
    if (error.response) {
      // Handle 401 Unauthorized
      if (error.response.status === 401) {
        clearAuth();
        window.location.href = '/login';
      }

      // Extract error message from response
      const errorData = error.response.data;
      let errorMessage = 'An error occurred';

      if (typeof errorData === 'object' && errorData !== null) {
        errorMessage = (errorData as any).message ||
          (errorData as any).error?.message ||
          (errorData as any).error ||
          JSON.stringify(errorData);
      } else if (typeof errorData === 'string') {
        errorMessage = errorData;
      }

      // Log detailed error for debugging
      console.error('API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        message: errorMessage
      });

      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      // The request was made but no response was received
      return Promise.reject(new Error('No response from server. Please check your connection.'));
    } else {
      // Something happened in setting up the request
      console.error('Request Error:', error.message);
      return Promise.reject(error);
    }
  }
);

export default apiClient;
