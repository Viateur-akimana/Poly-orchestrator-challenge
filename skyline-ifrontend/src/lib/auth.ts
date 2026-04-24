// Key for storing authentication data in localStorage
const AUTH_STORAGE_KEY = 'skyline_auth';

// Interface for authentication data
export interface AuthData {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  expiresAt: number;
}

// Get authentication data from localStorage
export const getAuthData = (): AuthData | null => {
  if (typeof window === 'undefined') return null;
  
  const authData = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!authData) return null;

  try {
    return JSON.parse(authData) as AuthData;
  } catch (error) {
    console.error('Failed to parse auth data', error);
    return null;
  }
};

// Save authentication data to localStorage
export const saveAuthData = (data: Omit<AuthData, 'expiresAt'> & { expiresIn?: number }): void => {
  if (typeof window === 'undefined') return;
  
  const authData: AuthData = {
    ...data,
    expiresAt: Date.now() + (data.expiresIn || 3600) * 1000, // Default to 1 hour
  };
  
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
};

// Clear authentication data from localStorage
export const clearAuthData = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

// Get the authentication token
export const getToken = (): string | null => {
  const authData = getAuthData();
  if (!authData) return null;
  
  // Check if token is expired
  if (Date.now() >= authData.expiresAt) {
    clearAuthData();
    return null;
  }
  
  return authData.token;
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return getToken() !== null;
};

// Check if user has a specific role
export const hasRole = (role: string): boolean => {
  const authData = getAuthData();
  return authData?.user.role === role;
};

// Check if user has any of the specified roles
export const hasAnyRole = (roles: string[]): boolean => {
  const authData = getAuthData();
  return roles.includes(authData?.user.role || '');
};

// Get current user
export const getCurrentUser = () => {
  const authData = getAuthData();
  return authData?.user || null;
};
