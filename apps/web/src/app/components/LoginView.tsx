'use client';

import React, { useState } from 'react';
import styles from './LoginView.module.css';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface LoginViewProps {
  onBackToHome?: () => void;
  onSuccess?: () => void;
}

export function LoginView({ onBackToHome, onSuccess }: LoginViewProps) {
  const { user, loginLocal, loginOidc, logout, isLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'local' | 'oidc'>('local');
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUser.trim()) return;

    const ok = await loginLocal(emailOrUser, password);
    if (ok) {
      setSuccessMessage('¡Sesión iniciada con éxito!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else if (onBackToHome) onBackToHome();
        else window.location.href = '/';
      }, 700);
    }
  };

  const handleOidcSubmit = async (provider: string = 'Keycloak SSO') => {
    const ok = await loginOidc(provider);
    if (ok) {
      setSuccessMessage(`¡Autenticado vía OIDC con ${provider}!`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else if (onBackToHome) onBackToHome();
        else window.location.href = '/';
      }, 700);
    }
  };

  const handleDemoLogin = async () => {
    setEmailOrUser('ing.evaluador@consorcio.bo');
    setPassword('••••••••••••');
    const ok = await loginLocal('ing.evaluador@consorcio.bo', 'demo123');
    if (ok) {
      setSuccessMessage('¡Ingresando como Evaluador Demo!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        else if (onBackToHome) onBackToHome();
        else window.location.href = '/';
      }, 600);
    }
  };

  return (
    <div className={styles.container}>
      {/* TOP BAR */}
      <header className={styles.topBar}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => {
            if (onBackToHome) onBackToHome();
            else window.location.href = '/';
          }}
        >
          ← Volver a CALC Deals
        </button>

        <div className={styles.topRightActions}>
          <button
            type="button"
            className={styles.themeBtn}
            onClick={toggleTheme}
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {theme === 'light' ? '🌙 Modo Oscuro' : '☀️ Modo Claro'}
          </button>
        </div>
      </header>

      {/* MAIN AUTH CARD */}
      <main className={styles.main}>
        <div className={styles.loginCard}>
          {/* BRAND */}
          <div className={styles.brandHeader}>
            <div className={styles.logoIcon}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h1 className={styles.title}>
              CALC<span className={styles.titleSpan}>Deals</span>
            </h1>
            <p className={styles.subtitle}>
              Plataforma de Ingeniería Financiera Pre-Firma y Licitaciones
            </p>
          </div>

          {/* ACTIVE USER BANNER (IF ALREADY LOGGED IN) */}
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'center' }}>
              <div className={styles.successAlert}>
                ✓ Sesión activa como <strong>{user.name}</strong> ({user.authMethod.toUpperCase()})
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {user.email} · {user.role} ({user.company || 'Consorcio'})
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={() => {
                    if (onBackToHome) onBackToHome();
                    else window.location.href = '/';
                  }}
                >
                  Continuar al Tablero →
                </button>
                <button
                  type="button"
                  className={styles.backBtn}
                  onClick={logout}
                  style={{ color: 'var(--rose-accent)' }}
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* SUCCESS MESSAGE IF ANY */}
              {successMessage && (
                <div className={styles.successAlert}>
                  <span>✓</span> {successMessage}
                </div>
              )}

              {/* TABS: LOCAL VS OIDC */}
              <div className={styles.authTabs}>
                <button
                  type="button"
                  className={`${styles.authTab} ${activeTab === 'local' ? styles.authTabActive : ''}`}
                  onClick={() => setActiveTab('local')}
                >
                  <span>🔑 Acceso Local</span>
                </button>
                <button
                  type="button"
                  className={`${styles.authTab} ${activeTab === 'oidc' ? styles.authTabActive : ''}`}
                  onClick={() => setActiveTab('oidc')}
                >
                  <span>🌐 OIDC / SSO</span>
                </button>
              </div>

              {/* TAB 1: LOCAL FORM */}
              {activeTab === 'local' && (
                <form className={styles.form} onSubmit={handleLocalSubmit}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Usuario o Correo Corporativo</label>
                    <div className={styles.inputWrapper}>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="ej: cmendoza@consorcio.bo o usuario"
                        value={emailOrUser}
                        onChange={(e) => setEmailOrUser(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className={styles.inputGroup}>
                    <div className={styles.labelRow}>
                      <label className={styles.label}>Contraseña</label>
                      <span className={styles.forgotLink} title="Contacta al administrador del sistema">
                        ¿Olvidaste tu contraseña?
                      </span>
                    </div>
                    <div className={styles.inputWrapper}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className={styles.input}
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className={styles.togglePassBtn}
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? 'Ocultar' : 'Mostrar'}
                      >
                        {showPassword ? '👁️' : '🔒'}
                      </button>
                    </div>
                  </div>

                  <div className={styles.rememberRow}>
                    <input
                      type="checkbox"
                      id="rememberMe"
                      className={styles.checkbox}
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <label htmlFor="rememberMe" style={{ cursor: 'pointer' }}>
                      Mantener sesión iniciada en este equipo
                    </label>
                  </div>

                  <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                    {isLoading ? '⏳ Verificando credenciales...' : 'Ingresar al Sistema →'}
                  </button>
                </form>
              )}

              {/* TAB 2: OIDC / SSO FEDERADO */}
              {activeTab === 'oidc' && (
                <div className={styles.oidcSection}>
                  <button
                    type="button"
                    className={styles.oidcPrimaryBtn}
                    onClick={() => handleOidcSubmit('Keycloak SSO Consorcio')}
                    disabled={isLoading}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <span>Iniciar con OIDC / SSO Corporativo</span>
                  </button>

                  <button
                    type="button"
                    className={styles.oidcSecondaryBtn}
                    onClick={() => handleOidcSubmit('Google Workspace')}
                    disabled={isLoading}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    <span>Google Workspace / Microsoft 365</span>
                  </button>

                  <div className={styles.oidcInfoCard}>
                    <div className={styles.oidcInfoIcon}>🔒</div>
                    <div className={styles.oidcInfoText}>
                      <strong>Autenticación OpenID Connect (RFC 6749 / 7636 PKCE):</strong> Inicio de sesión corporativo centralizado. Sincroniza permisos de consorcio, roles y claves criptográficas de forma segura sin revelar contraseñas.
                    </div>
                  </div>
                </div>
              )}

              {/* DEMO ACCESO RÁPIDO */}
              <div className={styles.demoCard}>
                <span className={styles.demoText}>
                  ¿Deseas probar la plataforma sin registrarte?
                </span>
                <button type="button" className={styles.demoBtn} onClick={handleDemoLogin}>
                  ⚡ Entrar como Demo
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
