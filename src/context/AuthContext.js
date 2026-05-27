import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem('meetai_user')) || null
  );
  const [token, setToken] = useState(
    localStorage.getItem('meetai_token') || null
  );

  const login = (userData, tokenData) => {
    localStorage.setItem('meetai_user', JSON.stringify(userData));
    localStorage.setItem('meetai_token', tokenData);
    setUser(userData);
    setToken(tokenData);
  };

  const logout = () => {
    localStorage.removeItem('meetai_user');
    localStorage.removeItem('meetai_token');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
