import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'ADMIN' | 'SUPPORT' | 'DRIVER';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  fullName?: string;
  mobile?: string;
  isActive: boolean;
  subscriptionDaysLeft?: number;
}

interface AuthContextType {
  token: string | null;
  currentUser: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSupport: boolean;
  isDriver: boolean;
  login: (username: string, password: string, captchaCode?: string, captchaId?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  getAuthHeader: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'helibar_auth_token';
const USER_KEY = 'helibar_auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (token && !currentUser) {
      // Fetch /api/users/me with Bearer token
      fetch('/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Session invalid');
        })
        .then((data) => {
          const user: User = {
            id: data.id,
            username: data.username,
            role: data.role as UserRole,
            fullName: data.full_name,
            mobile: data.mobile,
            isActive: data.is_active,
            subscriptionDaysLeft: data.days_left,
          };
          setCurrentUser(user);
          localStorage.setItem(USER_KEY, JSON.stringify(user));
        })
        .catch(() => {
          logout();
        });
    }
  }, [token]);

  const login = async (
    username: string,
    password: string,
    captchaCode?: string,
    captchaId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          captcha_code: captchaCode,
          captcha_id: captchaId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || 'نامعتبر',
        };
      }

      const data = await res.json();
      const accessToken = data.access_token;
      const user: User = {
        id: data.user.id,
        username: data.user.username,
        role: data.user.role as UserRole,
        fullName: data.user.full_name,
        mobile: data.user.mobile,
        isActive: data.user.is_active,
        subscriptionDaysLeft: data.user.subscription_days_left,
      };

      setToken(accessToken);
      setCurrentUser(user);
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'خطا در ارتباط با سرور سامانه هلی‌بار.',
      };
    }
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('sipaad_issuer_user');
  };

  const getAuthHeader = (): Record<string, string> => {
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
    };
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        currentUser,
        isAuthenticated: !!token && !!currentUser,
        isAdmin: currentUser?.role === 'ADMIN',
        isSupport: currentUser?.role === 'SUPPORT',
        isDriver: currentUser?.role === 'DRIVER',
        login,
        logout,
        getAuthHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
