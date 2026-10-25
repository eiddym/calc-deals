'use client';

import React, { useState } from 'react';
import styles from './ConsultoriaModeView.module.css';
import { useTheme } from '../context/ThemeContext';
import { DealCalculationInput, DealCalculationResult } from '@calc/shared';

interface ConsultoriaModeViewProps {
  input: DealCalculationInput;
  setInput: React.Dispatch<React.SetStateAction<DealCalculationInput>>;
  result: DealCalculationResult;
  currency: 'Bs' | 'USD';
  fmt: (val: number) => string;
  onBackToHub: () => void;
  onDownloadPdf: () => void;
  onCopySummary: () => void;
  isGeneratingPdf?: boolean;
}

export function ConsultoriaModeView({
  input,
  setInput,
  result,
  currency,
  fmt,
  onBackToHub,
  onDownloadPdf,
  onCopySummary,
  isGeneratingPdf,
}: ConsultoriaModeViewProps) {
  const { theme, toggleTheme } = useTheme();
  // Gestora (14.42%) y Caja de Salud (10%) switches
  const [hasGestora, setHasGestora] = useState<boolean>(false);
  const [hasCajaSalud, setHasCajaSalud] = useState<boolean>(false);
  const [directExpenseAmount, setDirectExpenseAmount] = useState<number>(0);
  
  // Duración con selector de unidad flexible (días, semanas, meses)
  type DurationUnit = 'meses' | 'semanas' | 'dias';
  const [durationValue, setDurationValue] = useState<number>(3);
  const [durationUnit, setDurationUnit] = useState<DurationUnit>('meses');

  // Conversión a días hábiles y meses equivalentes
  let effectiveMonths = 1;
  let effectiveDays = 22;

  if (durationUnit === 'meses') {
    effectiveMonths = Math.max(0.1, durationValue);
    effectiveDays = Math.round(effectiveMonths * 22);
  } else if (durationUnit === 'semanas') {
    effectiveDays = Math.max(1, Math.round(durationValue * 5));
    effectiveMonths = effectiveDays / 22;
  } else {
    // dias
    effectiveDays = Math.max(1, durationValue);
    effectiveMonths = effectiveDays / 22;
  }

  // Deducción de Gestora y Caja si están activas
  const gestoraDeduction = hasGestora ? (input.contractGrossAmount * 14.42) / 100 : 0;
  const cajaSaludDeduction = hasCajaSalud ? (input.contractGrossAmount * 10) / 100 : 0;

  // Monto final en mano
  const baseNet = result.totalNetProfitPool;
  const finalCleanInHand = Math.max(
    0,
    baseNet - gestoraDeduction - cajaSaludDeduction - directExpenseAmount
  );

  const netPerMonth = effectiveMonths > 0 ? finalCleanInHand / effectiveMonths : 0;
  const netPerDay = effectiveDays > 0 ? finalCleanInHand / effectiveDays : 0;
  const netMarginPct =
    input.contractGrossAmount > 0
      ? ((finalCleanInHand / input.contractGrossAmount) * 100).toFixed(1)
      : '0.0';

  const handleUpdateDirectExpense = (val: number) => {
    setDirectExpenseAmount(val);
    setInput((prev) => ({
      ...prev,
      directCosts: {
        items:
          val > 0
            ? [
                {
                  id: 'consultoria-gastos',
                  concept: 'Gastos directos de consultoría (viáticos/movilidad)',
                  amount: val,
                  category: 'viaticos',
                  isTaxDeductible: false,
                },
              ]
            : [],
      },
    }));
  };

  return (
    <div className={styles.container}>
      {/* TOP BAR */}
      <header className={styles.topBar}>
        <div className={styles.navGroup}>
          <button type="button" className={styles.backBtn} onClick={onBackToHub}>
            ← Licitaciones
          </button>
          <span className={styles.badge}>Consultoría Menor</span>
          <h1 className={styles.title}>Cálculo Simple de Neto Personal</h1>
        </div>

        <div className={styles.actionGroup}>
          <button type="button" className={styles.backBtn} onClick={onDownloadPdf} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? '⏳ PDF...' : '📄 Dictamen PDF'}
          </button>
          <button type="button" className={styles.backBtn} onClick={onCopySummary}>
            📋 WhatsApp
          </button>
          <button
            type="button"
            className={styles.themeBtn}
            onClick={toggleTheme}
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <main className={styles.content}>
        {/* =========================================================
            BIG HERO RESULT CARD
            ========================================================= */}
        <section className={styles.heroResultCard}>
          <div className={styles.heroEyebrow}>
            <span>💰 Te quedan limpios en mano</span>
          </div>

          <div className={styles.heroMainAmount}>{fmt(finalCleanInHand)}</div>

          <div className={styles.heroTakeaway}>
            Te quedan <strong>{fmt(finalCleanInHand)}</strong> → <span className={styles.highlightPerDay}>{fmt(netPerDay)}/día</span>
          </div>

          <div className={styles.heroSubGrid}>
            <div className={styles.subItem}>
              <span className={styles.subLabel}>Tarifa Neta por Día</span>
              <span className={styles.subVal} style={{ color: '#2dd4bf' }}>
                {fmt(netPerDay)}/día
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Para {effectiveDays} días de trabajo
              </span>
            </div>

            <div className={styles.subItem}>
              <span className={styles.subLabel}>Honorario por Mes</span>
              <span className={styles.subVal} style={{ color: '#5eead4' }}>
                {fmt(netPerMonth)}/mes
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Equivale a {effectiveMonths >= 1 ? `${effectiveMonths.toFixed(1)} meses` : `${(effectiveMonths * 30).toFixed(0)} días`}
              </span>
            </div>

            <div className={styles.subItem}>
              <span className={styles.subLabel}>Margen Neto Real</span>
              <span className={styles.subVal} style={{ color: '#f8fafc' }}>
                {netMarginPct}%
              </span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>De tu contrato bruto</span>
            </div>
          </div>
        </section>

        {/* =========================================================
            MINIMAL FORM CARD
            ========================================================= */}
        <section className={styles.formCard}>
          <div className={styles.fieldRow}>
            {/* Monto del Contrato */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>1. Monto Total del Contrato / Honorario Bruto</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputPrefix}>{currency}</span>
                <input
                  type="number"
                  className={styles.textInput}
                  value={input.contractGrossAmount || ''}
                  placeholder="35000"
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      contractGrossAmount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            {/* Duración */}
            <div className={styles.inputGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.inputLabel}>2. Duración del Trabajo</label>
                <div className={styles.unitToggleGroup}>
                  <button
                    type="button"
                    className={`${styles.unitBtn} ${durationUnit === 'meses' ? styles.unitBtnActive : ''}`}
                    onClick={() => setDurationUnit('meses')}
                  >
                    Meses
                  </button>
                  <button
                    type="button"
                    className={`${styles.unitBtn} ${durationUnit === 'semanas' ? styles.unitBtnActive : ''}`}
                    onClick={() => setDurationUnit('semanas')}
                  >
                    Semanas
                  </button>
                  <button
                    type="button"
                    className={`${styles.unitBtn} ${durationUnit === 'dias' ? styles.unitBtnActive : ''}`}
                    onClick={() => setDurationUnit('dias')}
                  >
                    Días
                  </button>
                </div>
              </div>
              <div className={styles.inputWrapper}>
                <input
                  type="number"
                  className={styles.textInput}
                  value={durationValue}
                  min="1"
                  onChange={(e) => setDurationValue(Math.max(1, parseFloat(e.target.value) || 1))}
                />
                <span style={{ color: '#5eead4', fontSize: '0.9rem', fontWeight: 700 }}>
                  {durationUnit}
                </span>
              </div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                = {effectiveDays} días hábiles (aprox. {effectiveMonths.toFixed(1)} meses)
              </span>
            </div>
          </div>

          {/* RÉGIMEN IMPOSITIVO */}
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Régimen de Cobro / Facturación</label>
            <div className={styles.regimeList}>
              <div
                className={`${styles.regimeOption} ${
                  input.taxScenario.type === 'RETENCION_LEY' ? styles.regimeOptionActive : ''
                }`}
                onClick={() =>
                  setInput((prev) => ({
                    ...prev,
                    taxScenario: { type: 'RETENCION_LEY' },
                  }))
                }
              >
                <span className={styles.regimeTitle}>Retención de Ley</span>
                <span className={styles.regimeSub}>15.5% Servicios (12.5% IUE + 3% IT)</span>
              </div>

              <div
                className={`${styles.regimeOption} ${
                  input.taxScenario.type === 'CON_FACTURA' ? styles.regimeOptionActive : ''
                }`}
                onClick={() =>
                  setInput((prev) => ({
                    ...prev,
                    taxScenario: { type: 'CON_FACTURA', taxCreditPct: 30 },
                  }))
                }
              >
                <span className={styles.regimeTitle}>Factura Propia</span>
                <span className={styles.regimeSub}>16% IVA + IT (con crédito compras)</span>
              </div>

              <div
                className={`${styles.regimeOption} ${
                  input.taxScenario.type === 'SIN_FACTURA' ? styles.regimeOptionActive : ''
                }`}
                onClick={() =>
                  setInput((prev) => ({
                    ...prev,
                    taxScenario: { type: 'SIN_FACTURA' },
                  }))
                }
              >
                <span className={styles.regimeTitle}>Sin Retención / Exento</span>
                <span className={styles.regimeSub}>0% deducción impositiva</span>
              </div>
            </div>
          </div>

          {/* SWITCHES DE DEDUCCIONES OPCIONALES */}
          <div className={styles.switchesList}>
            {/* Gestora */}
            <div className={styles.switchItem}>
              <div className={styles.switchInfo}>
                <span className={styles.switchTitle}>Aporte a la Gestora Pública / AFP (14.42%)</span>
                <span className={styles.switchDesc}>
                  Cotización mensual obligatoria para consultores con contratos estatales mayores a un salario mínimo.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {hasGestora && (
                  <strong style={{ color: '#f87171', fontSize: '0.88rem' }}>
                    -{fmt(gestoraDeduction)}
                  </strong>
                )}
                <input
                  type="checkbox"
                  style={{ width: '20px', height: '20px', accentColor: '#0d9488' }}
                  checked={hasGestora}
                  onChange={(e) => setHasGestora(e.target.checked)}
                />
              </div>
            </div>

            {/* Seguro de Salud */}
            <div className={styles.switchItem}>
              <div className={styles.switchInfo}>
                <span className={styles.switchTitle}>Caja Nacional de Salud / Seguro Voluntario (10%)</span>
                <span className={styles.switchDesc}>
                  Aporte facultativo para cobertura médica durante la vigencia del contrato.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {hasCajaSalud && (
                  <strong style={{ color: '#f87171', fontSize: '0.88rem' }}>
                    -{fmt(cajaSaludDeduction)}
                  </strong>
                )}
                <input
                  type="checkbox"
                  style={{ width: '20px', height: '20px', accentColor: '#0d9488' }}
                  checked={hasCajaSalud}
                  onChange={(e) => setHasCajaSalud(e.target.checked)}
                />
              </div>
            </div>

            {/* Gastos directos de operación */}
            <div className={styles.switchItem}>
              <div className={styles.switchInfo}>
                <span className={styles.switchTitle}>Gastos Directos de Consultoría</span>
                <span className={styles.switchDesc}>
                  Viáticos, combustible, impresiones y traslados necesarios para cumplir el servicio.
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{currency}</span>
                <input
                  type="number"
                  style={{
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#f8fafc',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '6px',
                    width: '100px',
                    textAlign: 'right',
                    fontWeight: 700,
                  }}
                  value={directExpenseAmount || ''}
                  placeholder="0"
                  onChange={(e) => handleUpdateDirectExpense(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
