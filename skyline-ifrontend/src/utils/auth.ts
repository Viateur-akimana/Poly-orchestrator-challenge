// Token storage keys
const TOKEN_KEY = 'skyline_auth_token';
const REFRESH_TOKEN_KEY = 'skyline_refresh_token';
const USER_KEY = 'skyline_user';

// Save tokens to local storage
export const saveAuth = (token: string, refreshToken: string, user: any) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

// Get the authentication token
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

// Get the refresh token
export const getRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

// Get the current user
export const getCurrentUser = (): any => {
  const userStr = localStorage.getItem(USER_KEY);
  return userStr ? JSON.parse(userStr) : null;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// Clear authentication data
export const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

// Set auth header for axios
export const setAuthHeader = (token: string): void => {
  // This is handled by the axios interceptor in apiClient
};

// Initialize auth state
export const initAuth = (): void => {
  const token = getToken();
  if (token) {
    setAuthHeader(token);
  }
};
