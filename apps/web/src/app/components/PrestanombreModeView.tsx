'use client';

import React, { useState } from 'react';
import styles from './PrestanombreModeView.module.css';
import { DealCalculationInput, DealCalculationResult } from '@calc/shared';

interface PrestanombreModeViewProps {
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

export function PrestanombreModeView({
  input,
  setInput,
  result,
  currency,
  fmt,
  onBackToHub,
  onDownloadPdf,
  onCopySummary,
  isGeneratingPdf,
}: PrestanombreModeViewProps) {
  // Estado para la calculadora inversa "Quiero quedar con X% neto"
  const [targetTeamNetMarginPct, setTargetTeamNetMarginPct] = useState<number>(30);

  // Fee de la empresa titular
  const titularFeePct = input.titularCompany.value || 8;
  const titularFeeAmount = result.titularCompany.amount || 0;

  // Calculadora inversa: calcular fee que se le puede ofrecer al titular para que el ejecutor quede con targetTeamNetMarginPct
  const handleCalculateInverseFee = (targetMargin: number) => {
    setTargetTeamNetMarginPct(targetMargin);
    const gross = input.contractGrossAmount || 1;
    // Gastos que asume el ejecutor:
    const executorCosts =
      result.staffing.totalPersonnelCost +
      result.directCosts.total +
      (input.adjudicationCommission.type === 'PERCENTAGE_GROSS'
        ? (gross * input.adjudicationCommission.value) / 100
        : input.adjudicationCommission.value);

    // Impuestos si no los asume titular
    const extraTaxes = !input.titularCompany.absorbsTaxes
      ? result.taxes.taxAmount + result.iue.deductedFromProjectPool
      : 0;
    const extraGuarantees = !input.titularCompany.absorbsGuaranteesCost
      ? result.guarantees.totalGuaranteesCost
      : 0;

    const targetTeamGain = (gross * targetMargin) / 100;
    const requiredTeamLiquid = targetTeamGain + executorCosts + extraTaxes + extraGuarantees;
    const availableForTitular = Math.max(0, gross - requiredTeamLiquid);
    const maxTitularFeePct = Math.round(((availableForTitular / gross) * 100) * 10) / 10;

    setInput((prev) => ({
      ...prev,
      titularCompany: {
        ...prev.titularCompany,
        value: maxTitularFeePct,
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
          <span className={styles.badge}>Modo Con Prestanombre</span>
          <h1 className={styles.title}>Negociación A (Ejecutor) vs B (Titular)</h1>
        </div>

        <div className={styles.actionGroup}>
          <button type="button" className={styles.backBtn} onClick={onDownloadPdf} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? '⏳ PDF...' : '📄 Dictamen PDF'}
          </button>
          <button type="button" className={styles.backBtn} onClick={onCopySummary}>
            📋 WhatsApp
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <main className={styles.content}>
        {/* =========================================================
            THE 2 LARGE CARDS (TITULAR VS EJECUTOR)
            ========================================================= */}
        <section className={styles.dualHeroGrid}>
          {/* CARD 1: EMPRESA TITULAR (PRESTANOMBRE) */}
          <div className={`${styles.heroCard} ${styles.heroCardTitular}`}>
            <div className={styles.cardTop}>
              <div className={`${styles.cardRole} ${styles.cardRoleTitular}`}>
                <span>🏢 Titular (Firma & NIT)</span>
              </div>
              <span className={`${styles.cardPill} ${styles.cardPillTitular}`}>
                {titularFeePct}% del bruto
              </span>
            </div>

            <div className={`${styles.mainValue} ${styles.mainValueTitular}`}>
              {fmt(titularFeeAmount)}
            </div>

            <div className={styles.cardMetaList}>
              <div className={styles.metaRow}>
                <span>Impuestos (IVA/IT/IUE):</span>
                <strong>
                  {input.titularCompany.absorbsTaxes
                    ? `Asume -${fmt(result.taxes.taxAmount + result.iue.companyAbsorbedIue)}`
                    : 'No asume (paga ejecutor)'}
                </strong>
              </div>
              <div className={styles.metaRow}>
                <span>Boletas de Garantía:</span>
                <strong>
                  {input.titularCompany.absorbsGuaranteesCost
                    ? `Asume -${fmt(result.guarantees.totalGuaranteesCost)}`
                    : 'No asume'}
                </strong>
              </div>
              <div className={styles.metaRow}>
                <span>Retención 5% Pliego:</span>
                <strong>
                  {input.statutoryDeductions.isRecoverable
                    ? `Cobra al cierre +${fmt(result.statutoryDeduction.amount)}`
                    : 'Aporte normativo'}
                </strong>
              </div>
            </div>
          </div>

          {/* CARD 2: EQUIPO EJECUTOR */}
          <div className={`${styles.heroCard} ${styles.heroCardEjecutor}`}>
            <div className={styles.cardTop}>
              <div className={`${styles.cardRole} ${styles.cardRoleEjecutor}`}>
                <span>👷 Equipo Ejecutor (Técnico / Obra)</span>
              </div>
              <span className={`${styles.cardPill} ${styles.cardPillEjecutor}`}>
                {(result.titularCompany.varianceAnalysis.ifTitularAbsorbsTaxes.effectiveMargin || 0).toFixed(1)}% margen
              </span>
            </div>

            <div className={`${styles.mainValue} ${styles.mainValueEjecutor}`}>
              {fmt(
                result.titularCompany.varianceAnalysis.ifTitularAbsorbsTaxes.teamNetGain ||
                  result.totalNetProfitPool
              )}
            </div>

            <div className={styles.cardMetaList}>
              <div className={styles.metaRow}>
                <span>Líquido transferido:</span>
                <strong>
                  {fmt(
                    input.contractGrossAmount -
                      titularFeeAmount -
                      (input.titularCompany.absorbsTaxes ? 0 : result.taxes.taxAmount)
                  )}
                </strong>
              </div>
              <div className={styles.metaRow}>
                <span>Costos de Personal y Obra:</span>
                <strong style={{ color: '#fca5a5' }}>
                  -{fmt(result.staffing.totalPersonnelCost + result.directCosts.total)}
                </strong>
              </div>
              <div className={styles.metaRow}>
                <span>Diezmo / Intermediario:</span>
                <strong style={{ color: '#fca5a5' }}>
                  -{fmt(result.commission.amount)}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {/* VARIANCE BANNER */}
        <div className={styles.varianceBanner}>
          <div className={styles.varianceText}>
            💡 <strong>Análisis de Varianza Fiscal A vs B:</strong> Si la empresa titular absorbe los impuestos en su
            balance y aprovecha sus compras formales, el equipo ejecutor gana{' '}
            <strong>+{fmt(result.titularCompany.varianceAnalysis.taxBurdenDifference)} adicionales en mano</strong>.
          </div>
          <div className={styles.varianceValue}>
            +{fmt(result.titularCompany.varianceAnalysis.taxBurdenDifference)}
          </div>
        </div>

        {/* =========================================================
            MESA DE NEGOCIACIÓN CENTRAL
            ========================================================= */}
        <section className={styles.deskSection}>
          <h2 className={styles.sectionTitle}>
            <span>🎛️ Mesa de Negociación del Contrato y Fee</span>
          </h2>

          <div className={styles.inputsGrid}>
            {/* Monto del Contrato */}
            <div className={styles.inputCard}>
              <label className={styles.inputLabel}>1. Monto Bruto del Contrato Ofertado</label>
              <input
                type="number"
                className={styles.bigInput}
                value={input.contractGrossAmount || ''}
                placeholder="500000"
                onChange={(e) =>
                  setInput((prev) => ({
                    ...prev,
                    contractGrossAmount: parseFloat(e.target.value) || 0,
                  }))
                }
              />
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Total adjudicado a facturar con NIT titular ({currency})
              </span>
            </div>

            {/* Fee del Prestanombre */}
            <div className={styles.inputCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.inputLabel}>2. Fee de la Empresa Titular</label>
                <strong style={{ color: '#818cf8', fontSize: '1.15rem' }}>{titularFeePct}%</strong>
              </div>
              <input
                type="range"
                min="3"
                max="25"
                step="0.5"
                value={titularFeePct}
                style={{ width: '100%', accentColor: '#6366f1' }}
                onChange={(e) =>
                  setInput((prev) => ({
                    ...prev,
                    titularCompany: {
                      ...prev.titularCompany,
                      value: parseFloat(e.target.value) || 0,
                    },
                  }))
                }
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#cbd5e1' }}>
                <span>Monto a cobrar:</span>
                <strong>{fmt(titularFeeAmount)}</strong>
              </div>
            </div>
          </div>

          {/* CALCULADORA INVERSA "QUIERO QUEDAR CON X% NETO" */}
          <div className={styles.inverseBox}>
            <div className={styles.inverseTitle}>
              <span>🎯 Calculadora Inversa: "Quiero que el Ejecutor quede con..."</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  style={{
                    background: '#0f172a',
                    border: '1px solid #3b82f6',
                    color: '#34d399',
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    width: '90px',
                  }}
                  value={targetTeamNetMarginPct}
                  onChange={(e) => handleCalculateInverseFee(parseFloat(e.target.value) || 0)}
                />
                <span style={{ fontWeight: 700, color: '#f8fafc' }}>% margen neto</span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {[20, 25, 30, 35, 40].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    style={{
                      background: targetTeamNetMarginPct === pct ? '#2563eb' : 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      padding: '0.35rem 0.65rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleCalculateInverseFee(pct)}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              <span style={{ fontSize: '0.82rem', color: '#93c5fd', marginLeft: 'auto' }}>
                Fee máximo a ofrecer a la titular: <strong>{titularFeePct}%</strong> ({fmt(titularFeeAmount)})
              </span>
            </div>
          </div>

          {/* =========================================================
              MATRIZ DE SEPARACIÓN DE CARGAS (QUIÉN ASUME QUÉ)
              ========================================================= */}
          <div style={{ marginTop: '0.5rem' }}>
            <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#cbd5e1', marginBottom: '0.75rem' }}>
              3. Matriz de Cargas: ¿Quién asume cada costo?
            </h3>

            <div className={styles.matrixGrid}>
              {/* Impuestos */}
              <div className={styles.matrixCard}>
                <div className={styles.matrixCardHeader}>
                  <span className={styles.matrixCardTitle}>Impuestos (IVA 13% + IT 3% + IUE)</span>
                  <div className={styles.toggleSwitch}>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${
                        input.titularCompany.absorbsTaxes ? styles.toggleBtnTitular : ''
                      }`}
                      onClick={() =>
                        setInput((prev) => ({
                          ...prev,
                          titularCompany: { ...prev.titularCompany, absorbsTaxes: true },
                        }))
                      }
                    >
                      Titular
                    </button>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${
                        !input.titularCompany.absorbsTaxes ? styles.toggleBtnEjecutor : ''
                      }`}
                      onClick={() =>
                        setInput((prev) => ({
                          ...prev,
                          titularCompany: { ...prev.titularCompany, absorbsTaxes: false },
                        }))
                      }
                    >
                      Ejecutor
                    </button>
                  </div>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {input.titularCompany.absorbsTaxes
                    ? 'La titular cubre todos los impuestos con su factura y balance.'
                    : 'El equipo ejecutor descuenta los impuestos de su bolsa líquida.'}
                </span>
              </div>

              {/* Boletas de Garantía */}
              <div className={styles.matrixCard}>
                <div className={styles.matrixCardHeader}>
                  <span className={styles.matrixCardTitle}>Boletas de Garantía (Primas bancarias)</span>
                  <div className={styles.toggleSwitch}>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${
                        input.titularCompany.absorbsGuaranteesCost ? styles.toggleBtnTitular : ''
                      }`}
                      onClick={() =>
                        setInput((prev) => ({
                          ...prev,
                          titularCompany: { ...prev.titularCompany, absorbsGuaranteesCost: true },
                        }))
                      }
                    >
                      Titular
                    </button>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${
                        !input.titularCompany.absorbsGuaranteesCost ? styles.toggleBtnEjecutor : ''
                      }`}
                      onClick={() =>
                        setInput((prev) => ({
                          ...prev,
                          titularCompany: { ...prev.titularCompany, absorbsGuaranteesCost: false },
                        }))
                      }
                    >
                      Ejecutor
                    </button>
                  </div>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Costo estimado de emisión de boletas: {fmt(result.guarantees.totalGuaranteesCost)}
                </span>
              </div>

              {/* Diezmo / Intermediario */}
              <div className={styles.matrixCard}>
                <div className={styles.matrixCardHeader}>
                  <span className={styles.matrixCardTitle}>Diezmo / Comisión de Adjudicación</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <input
                      type="number"
                      style={{
                        background: '#1e293b',
                        border: '1px solid #475569',
                        color: '#f8fafc',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        width: '60px',
                        textAlign: 'right',
                        fontWeight: 700,
                      }}
                      value={input.adjudicationCommission.value}
                      onChange={(e) =>
                        setInput((prev) => ({
                          ...prev,
                          adjudicationCommission: {
                            ...prev.adjudicationCommission,
                            value: parseFloat(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                    <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>%</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Asumido 100% por el equipo ejecutor: -{fmt(result.commission.amount)}
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
