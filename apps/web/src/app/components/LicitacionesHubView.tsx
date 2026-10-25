'use client';

import React from 'react';
import styles from './LicitacionesHubView.module.css';

interface LicitacionesHubViewProps {
  onBackToHome: () => void;
  onSelectSolo: () => void;
  onSelectPrestanombre: () => void;
  onSelectConsultoria: () => void;
  currency: 'Bs' | 'USD';
  onCurrencyChange: (c: 'Bs' | 'USD') => void;
}

export function LicitacionesHubView({
  onBackToHome,
  onSelectSolo,
  onSelectPrestanombre,
  onSelectConsultoria,
  currency,
  onCurrencyChange,
}: LicitacionesHubViewProps) {
  return (
    <div className={styles.hubContainer}>
      <div className={styles.hubContent}>
        {/* TOP NAV */}
        <div className={styles.topNav}>
          <button type="button" className={styles.backBtn} onClick={onBackToHome}>
            ← Volver al Inicio
          </button>
          <div className={styles.currencySwitch}>
            <button
              type="button"
              className={`${styles.currencyBtn} ${currency === 'Bs' ? styles.currencyBtnActive : ''}`}
              onClick={() => onCurrencyChange('Bs')}
            >
              Bs
            </button>
            <button
              type="button"
              className={`${styles.currencyBtn} ${currency === 'USD' ? styles.currencyBtnActive : ''}`}
              onClick={() => onCurrencyChange('USD')}
            >
              USD
            </button>
          </div>
        </div>

        {/* HUB HEADER */}
        <header className={styles.hubHeader}>
          <span className={styles.hubBadge}>Licitaciones y Contrataciones</span>
          <h1 className={styles.hubTitle}>Selecciona el Tipo de Contrato</h1>
          <p className={styles.hubSubtitle}>
            Cada modo cuenta con su propia lógica matemática y una interfaz especializada para su contexto.
          </p>
        </header>

        {/* 3 DISTINCT MODE CARDS */}
        <div className={styles.modesList}>
          {/* MODO 1: SOLO */}
          <div
            className={styles.modeCard}
            onClick={onSelectSolo}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectSolo();
              }
            }}
          >
            <div className={styles.modeTopRow}>
              <div className={`${styles.modeIconCircle} ${styles.modeIconSolo}`}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                  <path d="M9 9v.01" />
                  <path d="M9 12v.01" />
                  <path d="M9 15v.01" />
                  <path d="M9 18v.01" />
                </svg>
              </div>
              <div className={styles.modeMainText}>
                <div className={styles.modeTitleRow}>
                  <h2 className={styles.modeTitle}>1. Modo Solo (Empresa o Consultora)</h2>
                  <span className={`${styles.pillBadge} ${styles.pillBadgeSolo}`}>Presupuesto Completo</span>
                </div>
                <p className={styles.modeDescription}>
                  Para la empresa o consultora que ejecuta la totalidad del contrato. Estimación de costos reales desglosada por bloques internos (personal, gastos, impuestos, gestión y contingencia).
                </p>
              </div>
            </div>

            <div className={styles.modeMetaGrid}>
              <div className={styles.modeMetaItem}>
                <span className={styles.modeMetaLabel}>Punto de Partida</span>
                <span className={styles.modeMetaValue}>Costos reales por bloques (Personal + Gastos + Impuestos)</span>
              </div>
              <div className={styles.modeMetaItem}>
                <span className={styles.modeMetaLabel}>Pantalla Principal</span>
                <span className={styles.modeMetaValue}>Estimación de costos + Plantilla GAD Potosí (450.000 Bs)</span>
              </div>
              <div className={styles.modeMetaItem}>
                <span className={styles.modeMetaLabel}>Resultado Clave</span>
                <span className={styles.modeMetaValue}>Utilidad neta de la empresa después de todo</span>
              </div>
            </div>

            <div className={styles.modeActionRow}>
              <button type="button" className={styles.enterBtn}>
                <span>Entrar a Estimación de Costos</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* MODO 2: CON PRESTANOMBRE */}
          <div
            className={styles.modeCard}
            onClick={onSelectPrestanombre}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectPrestanombre();
              }
            }}
          >
            <div className={styles.modeTopRow}>
              <div className={`${styles.modeIconCircle} ${styles.modeIconPrestanombre}`}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className={styles.modeMainText}>
                <div className={styles.modeTitleRow}>
                  <h2 className={styles.modeTitle}>2. Modo Con Prestanombre (Trato A-B)</h2>
                  <span className={`${styles.pillBadge} ${styles.pillBadgePrestanombre}`}>Negociación Legal vs Ejecutor</span>
                </div>
                <p className={styles.modeDescription}>
                  Negociación directa entre el Ejecutor (equipo técnico y de obra) y la Empresa Titular (NIT, firma legal y boletas). Matriz de quién asume qué y calculadora inversa de fee.
                </p>
              </div>
            </div>

            <div className={styles.modeMetaGrid}>
              <div className={styles.modeMetaItem}>
                <span className={styles.modeMetaLabel}>Punto de Partida</span>
                <span className={styles.modeMetaValue}>Monto de contrato + Fee negociado + Separación de cargas</span>
              </div>
              <div className={styles.modeMetaItem}>
                <span className={styles.modeMetaLabel}>Pantalla Principal</span>
                <span className={styles.modeMetaValue}>Dos tarjetas cara a cara (Titular vs Ejecutor) + Varianza A-B</span>
              </div>
              <div className={styles.modeMetaItem}>
                <span className={styles.modeMetaLabel}>Resultado Clave</span>
                <span className={styles.modeMetaValue}>Cuánto le queda neto a cada uno + "Quiero X% neto"</span>
              </div>
            </div>

            <div className={styles.modeActionRow}>
              <button type="button" className={styles.enterBtn}>
                <span>Entrar a Negociación A-B</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* MODO 3: CONSULTORÍA MENOR */}
          <div
            className={styles.modeCard}
            onClick={onSelectConsultoria}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectConsultoria();
              }
            }}
          >
            <div className={styles.modeTopRow}>
              <div className={`${styles.modeIconCircle} ${styles.modeIconConsultoria}`}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className={styles.modeMainText}>
                <div className={styles.modeTitleRow}>
                  <h2 className={styles.modeTitle}>3. Modo Consultoría Menor (Individual)</h2>
                  <span className={`${styles.pillBadge} ${styles.pillBadgeConsultoria}`}>Honorario Simple</span>
                </div>
                <p className={styles.modeDescription}>
                  Para consultores independientes o contratos directos ágiles sin personería jurídica empresarial. Sin IUE anual, sin prestanombre y con foco en el neto diario y mensual en mano.
                </p>
              </div>
            </div>

            <div className={styles.modeMetaGrid}>
              <div className={styles.modeMetaItem}>
                <span className={styles.modeMetaLabel}>Punto de Partida</span>
                <span className={styles.modeMetaValue}>Monto de honorarios + Duración + Retenciones activas</span>
              </div>
              <div className={styles.modeMetaItem}>
                <span className={styles.modeMetaLabel}>Pantalla Principal</span>
                <span className={styles.modeMetaValue}>Vista minimalista directa: Retención Ley, Gestora y Gastos</span>
              </div>
              <div className={styles.modeMetaItem}>
                <span className={styles.modeMetaLabel}>Resultado Clave</span>
                <span className={styles.modeMetaValue}>Tarjeta grande "Te quedan X" + Tarifa por día y por mes</span>
              </div>
            </div>

            <div className={styles.modeActionRow}>
              <button type="button" className={styles.enterBtn}>
                <span>Entrar a Consultoría Menor</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
