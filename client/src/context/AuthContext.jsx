import { createContext, useContext, useEffect, useState } from 'react';
import { fetchCurrentUser, logout as logoutRequest } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshUser() {
    try {
      const response = await fetchCurrentUser();
      setUser(response.user);
    } catch (_error) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  async function logout() {
    await logoutRequest();
    setUser(null);
  }

  const value = {
    user,
    setUser,
    refreshUser,
    logout,
    isLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
