import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  switchDemoRole?: (role: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pm_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('pm_token');
      if (storedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('pm_user', JSON.stringify(res.data.user));
        } catch {
          setUser(null);
          localStorage.removeItem('pm_token');
          localStorage.removeItem('pm_user');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (identifier: string, password: string): Promise<User> => {
    const res = await api.post('/auth/login', {
      identifier,
      email: identifier,
      username: identifier,
      password,
    });
    const { token, user } = res.data;
    setToken(token);
    setUser(user);
    localStorage.setItem('pm_token', token);
    localStorage.setItem('pm_user', JSON.stringify(user));
    return user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    setToken(null);
    setUser(null);
    localStorage.removeItem('pm_token');
    localStorage.removeItem('pm_user');
  };

  // Helper for effortless live switching among the seeded institute roles during evaluation
  const switchDemoRole = async (role: Role) => {
    let email = 'admin@pinnaclemindz.com';
    let pass = 'Admin@123';

    if (role === 'SUPERVISOR') {
      email = 'supervisor1@pinnaclemindz.com';
      pass = 'Super@123';
    } else if (role === 'MENTOR') {
      email = 'mentor1@pinnaclemindz.com';
      pass = 'Mentor@123';
    } else if (role === 'STUDENT') {
      email = 'avishka.n@student.pinnacle.lk';
      pass = 'Student@123';
    }

    await login(email, pass);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, switchDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
