import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: Role;
  token: string | null;
  isLoading: boolean;
  demoUsers: User[];
  login: (email: string, pass: string) => Promise<void>;
  switchRole: (role: Role, email?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('minesafe_token'));
  const [demoUsers, setDemoUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchDemoUsers = async () => {
    try {
      const users = await api.getDemoUsers();
      setDemoUsers(users);
    } catch (e) {
      console.error('Error fetching demo users:', e);
    }
  };

  const refreshUser = async () => {
    try {
      if (token) {
        const u = await api.getMe();
        setUser(u);
      }
    } catch (e) {
      console.warn('Session expired or invalid token');
      // If failed, auto-login as Worker for immediate seamless demo
      await autoDemoLogin();
    }
  };

  const autoDemoLogin = async () => {
    try {
      const res = await api.switchRole('WORKER');
      localStorage.setItem('minesafe_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (e) {
      console.error('Auto login error:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchDemoUsers();
      if (token) {
        try {
          const u = await api.getMe();
          setUser(u);
        } catch {
          await autoDemoLogin();
        }
      } else {
        await autoDemoLogin();
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await api.login(email, pass);
    localStorage.setItem('minesafe_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const switchRole = async (targetRole: Role, email?: string) => {
    setIsLoading(true);
    try {
      const res = await api.switchRole(targetRole, email);
      localStorage.setItem('minesafe_token', res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (e) {
      console.error('Failed to switch role:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('minesafe_token');
    setToken(null);
    setUser(null);
  };

  const currentRole: Role = user?.role || 'WORKER';

  return (
    <AuthContext.Provider
      value={{
        user,
        role: currentRole,
        token,
        isLoading,
        demoUsers,
        login,
        switchRole,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
