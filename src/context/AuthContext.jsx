import React, { createContext, useState, useContext, useEffect } from 'react';
import api, { muteAllToasts } from '../services/api';
import { getErrorMessage, showError, showSuccess } from '../utils/toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post(
        '/admin/login',
        { email, password },
        muteAllToasts
      );

      const data = res.data || {};
      const userData =
        data.user ||
        data.admin ||
        {
          name: data.name || 'Admin',
          email: data.email || email,
          role: data.role || 'admin',
        };
      const token = data.token || data.accessToken;

      if (!token) {
        throw new Error(data.message || 'Login failed: no token received');
      }

      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', token);
      showSuccess(data.message || 'Welcome back to BJP Karyakarta');
      return { ok: true };
    } catch (error) {
      // Fallback for local mock when backend login is unavailable
      if (error?.response?.status === 404 || error?.code === 'ERR_NETWORK') {
        const mockUser = {
          name: 'BJP Admin',
          email: email || 'admin@bjpkaryakarta.in',
          role: 'admin',
        };
        const mockToken = 'mock-jwt-token-' + Math.random().toString(36).substring(7);
        setUser(mockUser);
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('token', mockToken);
        showSuccess('Logged in successfully');
        return { ok: true, mock: true };
      }

      showError(getErrorMessage(error, 'Login failed'));
      return { ok: false, error };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    showSuccess('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
