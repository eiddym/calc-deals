'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  authMethod: 'local' | 'oidc';
  company?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loginLocal: (emailOrUser: string, pass: string) => Promise<boolean>;
  loginOidc: (provider?: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loginLocal: async () => false,
  loginOidc: async () => false,
  logout: () => {},
  isLoading: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Cargar sesión guardada si existe
    const saved = localStorage.getItem('calc_deals_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        console.error('Error restaurando sesión:', e);
      }
    }
  }, []);

  const loginLocal = async (emailOrUser: string, _pass: string): Promise<boolean> => {
    setIsLoading(true);
    // Simulación de autenticación local con respuesta inmediata
    await new Promise((r) => setTimeout(r, 600));
    const isMockEmail = emailOrUser.includes('@');
    const newUser: AuthUser = {
      id: 'usr-' + Date.now(),
      name: isMockEmail ? emailOrUser.split('@')[0].replace('.', ' ') : emailOrUser,
      email: isMockEmail ? emailOrUser : `${emailOrUser}@empresa.bo`,
      role: 'Ingeniero Evaluador Senior',
      company: 'Consorcio Vial & Asociados',
      authMethod: 'local',
    };
    setUser(newUser);
    localStorage.setItem('calc_deals_user', JSON.stringify(newUser));
    setIsLoading(false);
    return true;
  };

  const loginOidc = async (provider: string = 'Keycloak SSO'): Promise<boolean> => {
    setIsLoading(true);
    // Simulación de flujo OIDC (OpenID Connect federado)
    await new Promise((r) => setTimeout(r, 800));
    const newUser: AuthUser = {
      id: 'oidc-usr-' + Date.now(),
      name: 'Ing. Carlos Mendoza R.',
      email: 'carlos.mendoza@consorcio.bo',
      role: 'Gerente de Proyectos & Licitaciones',
      company: 'Empresa Constructora Titular S.R.L.',
      authMethod: 'oidc',
      avatarUrl: undefined,
    };
    setUser(newUser);
    localStorage.setItem('calc_deals_user', JSON.stringify(newUser));
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('calc_deals_user');
  };

  return (
    <AuthContext.Provider value={{ user, loginLocal, loginOidc, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
