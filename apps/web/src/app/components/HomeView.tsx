'use client';

import React, { useState } from 'react';
import styles from './HomeView.module.css';

interface HomeViewProps {
  onSelectLicitaciones: () => void;
  onSelectInversion: () => void;
}

export function HomeView({ onSelectLicitaciones, onSelectInversion }: HomeViewProps) {
  const [activeModal, setActiveModal] = useState<'licitaciones' | 'inversion' | null>(null);

  return (
    <div className={styles.homeContainer}>
      <div className={styles.homeContent}>
        {/* BRAND HEADER */}
        <header className={styles.brandHeader}>
          <div className={styles.brandLogoRow}>
            <div className={styles.brandLogoIcon}>
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 3v18h18" />
                <path d="m7 15 4-4 4 4 6-6" />
                <path d="M17 9h4v4" />
              </svg>
            </div>
            <h1 className={styles.brandTitle}>
              CALC<span className={styles.brandTitleSpan}>Deals</span>
            </h1>
          </div>
          <p className={styles.brandSubtitle}>Ingeniería financiera pre-firma</p>
        </header>

        {/* TWO MAIN LARGE CARDS */}
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
            <div className={styles.cardTopRow}>
              <div className={styles.iconCircle}>
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <line x1="10" y1="9" x2="8" y2="9" />
                </svg>
              </div>
              <div className={styles.cardTextContent}>
                <h2 className={styles.cardTitle}>Licitaciones / Contratos</h2>
                <p className={styles.cardDescription}>
                  Calcula impuestos, boletas, prestanombre o consultoría menor. Monto del contrato → ganancia real.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={styles.helpBtn}
              onClick={(e) => {
                e.stopPropagation();
                setActiveModal('licitaciones');
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span>¿Cómo funciona?</span>
            </button>
          </div>

          {/* CARD 2: INVERSIÓN / EXTRA */}
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
            <div className={styles.cardTopRow}>
              <div className={styles.iconCircle}>
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 3v18h18" />
                  <rect x="7" y="10" width="3" height="8" rx="1" />
                  <rect x="13" y="6" width="3" height="12" rx="1" />
                  <rect x="19" y="3" width="3" height="15" rx="1" />
                </svg>
              </div>
              <div className={styles.cardTextContent}>
                <h2 className={styles.cardTitle}>Inversión / Extra</h2>
                <p className={styles.cardDescription}>
                  Cooperativa, inversionista y comunarios. Negocia en base al capital invertido y reparte utilidades.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={styles.helpBtn}
              onClick={(e) => {
                e.stopPropagation();
                setActiveModal('inversion');
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <span>¿Cómo funciona?</span>
            </button>
          </div>
        </div>

        {/* SECTION: ASÍ FUNCIONA */}
        <section className={styles.howSection}>
          <div className={styles.howSectionHeader}>
            <span className={styles.howSectionTitle}>Así funciona</span>
            <div className={styles.howSectionLine} />
          </div>

          <div className={styles.stepsGrid}>
            {/* Step 1 */}
            <div className={styles.stepCard}>
              <div className={styles.stepNumberBadge}>1</div>
              <div className={styles.stepIconContainer}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h3 className={styles.stepTitle}>Elige el tipo</h3>
              <p className={styles.stepDescription}>
                Selecciona el escenario que mejor se adapte a tu operación.
              </p>
            </div>

            {/* Step 2 */}
            <div className={styles.stepCard}>
              <div className={styles.stepNumberBadge}>2</div>
              <div className={styles.stepIconContainer}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="2" width="16" height="20" rx="2" />
                  <line x1="8" y1="6" x2="16" y2="6" />
                  <line x1="16" y1="14" x2="16" y2="18" />
                  <path d="M8 10h.01" />
                  <path d="M12 10h.01" />
                  <path d="M16 10h.01" />
                  <path d="M8 14h.01" />
                  <path d="M12 14h.01" />
                  <path d="M8 18h.01" />
                  <path d="M12 18h.01" />
                </svg>
              </div>
              <h3 className={styles.stepTitle}>Ingresa el monto</h3>
              <p className={styles.stepDescription}>
                Ingresa el monto del negocio o inversión. El sistema hace el resto.
              </p>
            </div>

            {/* Step 3 */}
            <div className={styles.stepCard}>
              <div className={styles.stepNumberBadge}>3</div>
              <div className={styles.stepIconContainer}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="9" y1="10" x2="9.01" y2="10" />
                  <line x1="12" y1="10" x2="12.01" y2="10" />
                  <line x1="15" y1="10" x2="15.01" y2="10" />
                </svg>
              </div>
              <h3 className={styles.stepTitle}>Negocia en tiempo real</h3>
              <p className={styles.stepDescription}>
                Genera escenarios, compara y negocia con todas las partes.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* POPUP / MODAL: ¿CÓMO FUNCIONA LICITACIONES? */}
      {activeModal === 'licitaciones' && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <div className={styles.iconCircle} style={{ width: 44, height: 44, minWidth: 44 }}>
                  📄
                </div>
                <div>
                  <h3 className={styles.modalTitle}>Licitaciones / Contratos</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>3 Sub-Modos Especializados</span>
                </div>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setActiveModal(null)}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>
                Diseñado para proyectos formales, licitaciones públicas (SICOES) y contratos de consultoría. Cuenta con 3 sub-modos:
              </p>

              <div className={styles.modalSubmodeCard}>
                <span className={styles.modalSubmodeTitle}>🏛️ 1. Solo (Empresa o Consultora Única)</span>
                <p className={styles.modalSubmodeDesc}>
                  Todo en un solo actor: impuestos (16%), previsión de IUE (25%), boletas de garantía, diezmo y costos de personal. Entrega una tarjeta clara de ganancia neta.
                </p>
              </div>

              <div className={styles.modalSubmodeCard}>
                <span className={styles.modalSubmodeTitle}>🤝 2. Con Prestanombre (Trato A-B)</span>
                <p className={styles.modalSubmodeDesc}>
                  Separación legal vs operativa: La empresa titular asume impuestos, boletas y su fee por el NIT. El equipo ejecutor cobra limpio. Permite simular quién absorbe los impuestos en la mesa.
                </p>
              </div>

              <div className={styles.modalSubmodeCard}>
                <span className={styles.modalSubmodeTitle}>👤 3. Consultoría Menor Individual</span>
                <p className={styles.modalSubmodeDesc}>
                  Para profesionales y técnicos independientes. Sin IUE, impuestos opcionales, con cálculo automático de cuánto ganas por día y por mes según la duración.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={styles.modalActionBtn}
              onClick={() => {
                setActiveModal(null);
                onSelectLicitaciones();
              }}
            >
              <span>Abrir Licitaciones / Contratos</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* POPUP / MODAL: ¿CÓMO FUNCIONA INVERSIÓN / COOPERATIVA? */}
      {activeModal === 'inversion' && (
        <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleGroup}>
                <div className={styles.iconCircle} style={{ width: 44, height: 44, minWidth: 44 }}>
                  📊
                </div>
                <div>
                  <h3 className={styles.modalTitle}>Inversión / Extra</h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Cooperativa, Inversionista y Comunarios</span>
                </div>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setActiveModal(null)}
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <p>
                La negociación no parte del ingreso, sino del <strong>capital que pone el inversionista</strong>:
              </p>

              <div className={styles.modalSubmodeCard}>
                <span className={styles.modalSubmodeTitle}>💰 1. Capital del Inversionista</span>
                <p className={styles.modalSubmodeDesc}>
                  El punto de partida de la mesa (ej. 350.000 Bs). Se definen el plazo de recuperación y la meta de ROI esperado.
                </p>
              </div>

              <div className={styles.modalSubmodeCard}>
                <span className={styles.modalSubmodeTitle}>⚙️ 2. Cobertura de Costos y Canon Comunal</span>
                <p className={styles.modalSubmodeDesc}>
                  Se descuentan insumos, combustible, explosivos, maquinaria y la regalía comunal antes de repartir el excedente.
                </p>
              </div>

              <div className={styles.modalSubmodeCard}>
                <span className={styles.modalSubmodeTitle}>⚖️ 3. Reparto Dual y Semáforo de Viabilidad</span>
                <p className={styles.modalSubmodeDesc}>
                  Mueve el reparto (70/30, 60/40, 50/50) en tiempo real para ver el payback en meses y verificar si el trato está en 🟢 Zona Verde para ambas partes.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={styles.modalActionBtn}
              onClick={() => {
                setActiveModal(null);
                onSelectInversion();
              }}
            >
              <span>Abrir Inversión / Cooperativa</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
