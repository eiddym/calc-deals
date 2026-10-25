'use client';

import React, { useState } from 'react';
import styles from './HomeView.module.css';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

interface HomeViewProps {
  onSelectLicitaciones: () => void;
  onSelectInversion: () => void;
  onSelectSoloWithPreset?: () => void;
  onSelectConsultoriaWithPreset?: () => void;
  onNavigateLogin?: () => void;
}

export function HomeView({
  onSelectLicitaciones,
  onSelectInversion,
  onSelectSoloWithPreset,
  onSelectConsultoriaWithPreset,
  onNavigateLogin,
}: HomeViewProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [activeModal, setActiveModal] = useState<'licitaciones' | 'inversion' | null>(null);

  const handleLoginClick = () => {
    if (onNavigateLogin) {
      onNavigateLogin();
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div className={styles.homeContainer}>
      {/* TOP NAVIGATION BAR */}
      <nav className={styles.topNav}>
        <div className={styles.topNavInner}>
          <div className={styles.brandGroup}>
            <div className={styles.brandLogoIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <h1 className={styles.brandTitle}>
              CALC<span className={styles.brandTitleSpan}>Deals</span>
            </h1>
            <span className={styles.versionBadge}>v2.4 Pro Bolivia</span>
          </div>

          <div className={styles.navActions}>
            <button
              type="button"
              className={styles.themeBtn}
              onClick={toggleTheme}
              title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            >
              {theme === 'light' ? '🌙 Modo Oscuro' : '☀️ Modo Claro'}
            </button>

            {user ? (
              <div className={styles.userBadge}>
                <span>👤</span>
                <span className={styles.userName}>{user.name}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 800 }}>
                  ({user.authMethod.toUpperCase()})
                </span>
                <button
                  type="button"
                  className={styles.userLogoutBtn}
                  onClick={logout}
                  title="Cerrar sesión"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button type="button" className={styles.loginBtn} onClick={handleLoginClick}>
                <span>🔐</span>
                <span>Iniciar Sesión</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className={styles.homeContent}>
        {/* EXECUTIVE HERO */}
        <section className={styles.heroSection}>
          <div className={styles.heroEyebrow}>
            <span>🏛️ Ingeniería Financiera Pre-Firma · DS 0181 SICOES & Ley 843</span>
          </div>

          <h2 className={styles.heroHeading}>
            Que no se te escape ningún centavo{' '}
            <span className={styles.heroHighlight}>antes de adjudicar un contrato.</span>
          </h2>

          <p className={styles.heroSubheading}>
            Simula al centavo impuestos reales bolivianos (IVA, IT, IUE 25%), costo de personal técnico mensual, boletas de garantía, retención del 5% y reparto transparente entre socios o prestanombres.
          </p>
        </section>

        {/* 4 HIGHLIGHT STRIP CARDS */}
        <div className={styles.stripGrid}>
          <div className={styles.stripCard}>
            <div className={styles.stripCardIcon}>📊</div>
            <h3 className={styles.stripCardTitle}>100% Ley 843 & SIN</h3>
            <p className={styles.stripCardDesc}>
              IVA 13% + IT 3% con crédito fiscal de compras y retención de IUE 25% anual sobre utilidad imponible.
            </p>
          </div>

          <div className={styles.stripCard}>
            <div className={styles.stripCardIcon}>🏢</div>
            <h3 className={styles.stripCardTitle}>Varianza Prestanombre</h3>
            <p className={styles.stripCardDesc}>
              Negocia el fee (3% - 25%) y demuestra numéricamente si conviene que el titular absorba impuestos.
            </p>
          </div>

          <div className={styles.stripCard}>
            <div className={styles.stripCardIcon}>⏱️</div>
            <h3 className={styles.stripCardTitle}>Tarifador por Día y Mes</h3>
            <p className={styles.stripCardDesc}>
              Para consultorías menores: te quedan X Bs en mano → Y Bs/día con Gestora y retención de ley opcional.
            </p>
          </div>

          <div className={styles.stripCard}>
            <div className={styles.stripCardIcon}>📑</div>
            <h3 className={styles.stripCardTitle}>Dictamen en PDF</h3>
            <p className={styles.stripCardDesc}>
              Exporta el informe ejecutivo de distribución financiera listo para anexar al contrato o acuerdo de consorcio.
            </p>
          </div>
        </div>

        {/* SECTION: TWO MAIN ACTION CARDS */}
        <section>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Elige tu escenario de negociación</h3>
            <p className={styles.sectionSubtitle}>
              Selecciona el modelo contractual que refleja la estructura real de tu operación.
            </p>
          </div>

          <div className={styles.cardsList}>
            {/* CARD 1: LICITACIONES / CONTRATOS */}
            <div
              className={styles.mainCard}
              onClick={onSelectLicitaciones}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectLicitaciones();
                }
              }}
            >
              <div className={styles.cardHeaderArea}>
                <div className={styles.cardTopRow}>
                  <div className={`${styles.iconCircle} ${styles.iconCircleLicitaciones}`}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <line x1="10" y1="9" x2="8" y2="9" />
                    </svg>
                  </div>
                  <button
                    type="button"
                    className={styles.helpBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModal('licitaciones');
                    }}
                  >
                    <span>¿Cómo funciona?</span>
                  </button>
                </div>

                <div>
                  <h4 className={styles.cardTitle}>Licitaciones & Contratos</h4>
                  <p className={styles.cardDescription}>
                    Calcula impuestos formales, boletas bancarias, varianza de prestanombres o consultoría menor. Desde el monto adjudicado hasta la ganancia en mano.
                  </p>
                </div>

                {/* Submodes Preview */}
                <div className={styles.submodesList}>
                  <div className={styles.submodeItem}>
                    <span className={styles.submodeTag}>👥 Modo Solo:</span>
                    <span className={styles.submodeDesc}>Planilla GAD (Personal/mes + Gastos + Boletas + IUE)</span>
                  </div>
                  <div className={styles.submodeItem}>
                    <span className={styles.submodeTag}>🏢 Prestanombre:</span>
                    <span className={styles.submodeDesc}>Titular (firma con NIT) vs Ejecutor (obra y equipo)</span>
                  </div>
                  <div className={styles.submodeItem}>
                    <span className={styles.submodeTag}>👤 Consultoría Menor:</span>
                    <span className={styles.submodeDesc}>Honorario bruto → Tarifa neta por día y por mes</span>
                  </div>
                </div>
              </div>

              <div className={styles.cardFooterArea}>
                <button
                  type="button"
                  className={styles.actionBtnPrimary}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLicitaciones();
                  }}
                >
                  <span>Entrar a Mesa de Licitaciones →</span>
                </button>

                {/* Quick Presets */}
                <div className={styles.quickPresetsRow}>
                  <span className={styles.quickPresetLabel}>Accesos Rápidos:</span>
                  <button
                    type="button"
                    className={styles.presetBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectSoloWithPreset) onSelectSoloWithPreset();
                      else onSelectLicitaciones();
                    }}
                  >
                    📋 GAD Potosí (450k Bs)
                  </button>
                  <button
                    type="button"
                    className={styles.presetBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectConsultoriaWithPreset) onSelectConsultoriaWithPreset();
                      else onSelectLicitaciones();
                    }}
                  >
                    ⚡ Consultoría (35k Bs)
                  </button>
                </div>
              </div>
            </div>

            {/* CARD 2: INVERSIÓN / COOPERATIVAS */}
            <div
              className={styles.mainCard}
              onClick={onSelectInversion}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectInversion();
                }
              }}
            >
              <div className={styles.cardHeaderArea}>
                <div className={styles.cardTopRow}>
                  <div className={`${styles.iconCircle} ${styles.iconCircleInversion}`}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M3 3v18h18" />
                      <rect x="7" y="10" width="3" height="8" rx="1" />
                      <rect x="13" y="6" width="3" height="12" rx="1" />
                      <rect x="19" y="3" width="3" height="15" rx="1" />
                    </svg>
                  </div>
                  <button
                    type="button"
                    className={styles.helpBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModal('inversion');
                    }}
                  >
                    <span>¿Cómo funciona?</span>
                  </button>
                </div>

                <div>
                  <h4 className={styles.cardTitle}>Inversión & Minería</h4>
                  <p className={styles.cardDescription}>
                    Especial para proyectos donde el factor central es el capital que aporta el inversionista, los meses de retorno (ROI) y el reparto con la cooperativa y comunarios.
                  </p>
                </div>

                {/* Submodes Preview */}
                <div className={styles.submodesList}>
                  <div className={styles.submodeItem}>
                    <span className={styles.submodeTag}>💎 Capital de Entrada:</span>
                    <span className={styles.submodeDesc}>Inversión de capital + costos operativos del periodo</span>
                  </div>
                  <div className={styles.submodeItem}>
                    <span className={styles.submodeTag}>📈 Retorno & Tiempo:</span>
                    <span className={styles.submodeDesc}>Retorno esperado (%) y meses para amortizar inversión</span>
                  </div>
                  <div className={styles.submodeItem}>
                    <span className={styles.submodeTag}>🤝 Reparto Tripartito:</span>
                    <span className={styles.submodeDesc}>Inversionista + Cooperativa de base + Comunarios</span>
                  </div>
                </div>
              </div>

              <div className={styles.cardFooterArea}>
                <button
                  type="button"
                  className={`${styles.actionBtnPrimary} ${styles.actionBtnEmerald}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectInversion();
                  }}
                >
                  <span>Entrar a Mesa de Inversión →</span>
                </button>

                <div className={styles.quickPresetsRow}>
                  <span className={styles.quickPresetLabel}>Enfoque:</span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Calculadora inversa de producción mínima para garantizar el retorno.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* METODOLOGÍA EN 3 PASOS */}
        <section className={styles.howSection}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Metodología de Negociación en 3 Pasos</h3>
            <p className={styles.sectionSubtitle}>
              Garantiza que ningún costo oculto o carga tributaria quede fuera de la mesa.
            </p>
          </div>

          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <div className={styles.stepTopRow}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepIcon}>⚙️</div>
              </div>
              <h4 className={styles.stepTitle}>Elige el Escenario</h4>
              <p className={styles.stepDescription}>
                Selecciona si eres empresa adjudicataria única (Solo), ejecutor con NIT prestado, o consultor individual.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepTopRow}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepIcon}>⏱️</div>
              </div>
              <h4 className={styles.stepTitle}>Fija Duración y Costos</h4>
              <p className={styles.stepDescription}>
                Carga meses de contrato, sueldos del personal, compras con factura, retenciones y boletas de garantía.
              </p>
            </div>

            <div className={styles.stepCard}>
              <div className={styles.stepTopRow}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepIcon}>📄</div>
              </div>
              <h4 className={styles.stepTitle}>Negocia y Emite Dictamen</h4>
              <p className={styles.stepDescription}>
                Ajusta porcentajes de reparto en tiempo real y descarga el dictamen PDF para sustentar el acuerdo legal.
              </p>
            </div>
          </div>
        </section>

        {/* REGULATORY COMPLIANCE FOOTER STRIP */}
        <section className={styles.regulatoryStrip}>
          <div className={styles.regulatoryText}>
            <span className={styles.regulatoryTitle}>Marco Normativo Integrado</span>
            <span className={styles.regulatoryDesc}>
              Parámetros tributarios y contractuales precalibrados conforme a la legislación fiscal vigente en Bolivia.
            </span>
          </div>

          <div className={styles.regulatoryBadges}>
            <span className={styles.regBadge}>Ley 843 (IVA 13% · IT 3%)</span>
            <span className={styles.regBadge}>IUE 25% (D.S. 24051)</span>
            <span className={styles.regBadge}>DS 0181 SICOES</span>
            <span className={styles.regBadge}>Gestora 14.42%</span>
            <span className={styles.regBadge}>Retención Ley 15.5%</span>
          </div>
        </section>
      </main>

      {/* HELP POPUP MODALS */}
      {activeModal === 'licitaciones' && (
        <div className={styles.modalBackdrop} onClick={() => setActiveModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>¿Cómo funciona Licitaciones / Contratos?</h3>
              <button type="button" className={styles.closeModalBtn} onClick={() => setActiveModal(null)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>
                Este módulo está diseñado para <strong>adjudicaciones públicas (SICOES)</strong> o contratos privados llave en mano.
              </p>
              <p>
                <strong>1. Modo Solo:</strong> Introduce el pliego (ej. 450.000 Bs) y desglosa el costo del personal técnico por mes (ej. 124.000 Bs/mes en 2 meses). El sistema deduce el crédito fiscal, primas de boletas y el IUE 25% anual.
              </p>
              <p>
                <strong>2. Con Prestanombre:</strong> Si la empresa titular pone la firma y tú el trabajo técnico, analiza la varianza fiscal para definir si el fee que pide el titular (ej. 8%) cubre los impuestos o perjudica al equipo ejecutor.
              </p>
              <p>
                <strong>3. Consultoría Menor:</strong> Para trabajos individuales de 1 a 6 meses. Te indica exactamente la tarifa neta por día y honorario mensual tras aportes de ley.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeModal === 'inversion' && (
        <div className={styles.modalBackdrop} onClick={() => setActiveModal(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>¿Cómo funciona Inversión / Cooperativas?</h3>
              <button type="button" className={styles.closeModalBtn} onClick={() => setActiveModal(null)}>
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>
                En lugar de partir de un contrato cerrado, este modo parte del <strong>capital que arriesga el inversionista</strong>.
              </p>
              <p>
                <strong>1. Capital + Operación:</strong> Ingresas el monto invertido y los costos operativos estimados para arrancar el proyecto o paraje minero.
              </p>
              <p>
                <strong>2. Retorno Deseado:</strong> Fijas la ganancia meta del inversionista (ej. 40%) y el plazo en meses.
              </p>
              <p>
                <strong>3. Calculadora Inversa:</strong> El motor te calcula la producción o ingreso bruto mínimo mensual que la cooperativa debe generar para cumplir ese retorno antes de repartir utilidades entre socios y comunarios.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
