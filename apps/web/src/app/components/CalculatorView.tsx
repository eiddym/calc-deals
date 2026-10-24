'use client';

import React, { useState, useMemo } from 'react';
import {
  calculateDeal,
  DealCalculationInput,
  DirectCostItem,
} from '@calc/shared';
import styles from './Calculator.module.css';

type CurrencyType = 'Bs' | 'USD';
type MobileTabType = 'variables' | 'resultados' | 'meta';

export function CalculatorView() {
  const [currency, setCurrency] = useState<CurrencyType>('Bs');
  const [mobileTab, setMobileTab] = useState<MobileTabType>('variables');

  // Control de habilitación de impuestos (única regla normativa de base con opción de activación)
  const [taxEnabled, setTaxEnabled] = useState<boolean>(true);
  const [selectedTaxType, setSelectedTaxType] = useState<'CON_FACTURA' | 'RETENCION_LEY' | 'PERSONALIZADO'>('CON_FACTURA');
  const [customTaxRate, setCustomTaxRate] = useState<number>(16);
  const [taxCreditPct, setTaxCreditPct] = useState<number>(0);

  // Estado limpio: Sin montos hardcodeados
  const [input, setInput] = useState<DealCalculationInput>({
    contractGrossAmount: 0,
    taxScenario: {
      type: 'CON_FACTURA',
      taxCreditPct: 0,
    },
    guarantees: {
      hasBidBond: false,
      bidBondCoveragePct: 1.5,
      bidBondPremiumPct: 2.0,
      bidBondFixedCost: 0,
      hasPerformanceBond: false,
      performanceBondCoveragePct: 7.0,
      performanceBondPremiumPct: 2.5,
      performanceBondFixedCost: 0,
      hasAdvanceBond: false,
      advancePct: 20.0,
      advanceBondPremiumPct: 2.5,
      advanceBondFixedCost: 0,
    },
    statutoryDeductions: {
      retentionRatePct: 0,
      isRecoverable: true,
    },
    adjudicationCommission: {
      type: 'PERCENTAGE_GROSS',
      value: 0,
    },
    titularCompany: {
      type: 'PERCENTAGE_GROSS',
      value: 0,
      absorbsGuaranteesCost: false,
    },
    directCosts: {
      items: [],
    },
    distribution: {
      projectManagerPct: 100,
      businessPartnerPct: 0,
      contingencyFundPct: 0,
    },
  });

  const [targetDesiredProfit, setTargetDesiredProfit] = useState<number>(0);

  // Input computado reactivamente
  const activeInput: DealCalculationInput = useMemo(() => {
    return {
      ...input,
      taxScenario: {
        type: taxEnabled ? selectedTaxType : 'SIN_FACTURA',
        customRatePct: customTaxRate,
        taxCreditPct: taxEnabled && selectedTaxType === 'CON_FACTURA' ? taxCreditPct : 0,
      },
    };
  }, [input, taxEnabled, selectedTaxType, customTaxRate, taxCreditPct]);

  // Motor financiero puro
  const result = useMemo(() => {
    return calculateDeal(activeInput);
  }, [activeInput]);

  // Formateadores monetarios
  const fmt = (val: number) => {
    return (
      new Intl.NumberFormat('es-BO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(val || 0)) + ` ${currency}`
    );
  };

  const fmtPrecise = (val: number) => {
    return (
      new Intl.NumberFormat('es-BO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val || 0) + ` ${currency}`
    );
  };

  // Manejo de costos directos
  const addExpense = () => {
    const newItem: DirectCostItem = {
      id: Date.now().toString(),
      concept: '',
      amount: 0,
    };
    setInput({
      ...input,
      directCosts: {
        items: [...(input.directCosts?.items || []), newItem],
      },
    });
  };

  const updateExpense = (id: string, field: 'concept' | 'amount', value: string | number) => {
    const updated = (input.directCosts?.items || []).map((item) => {
      if (item.id === id) {
        return { ...item, [field]: field === 'amount' ? Number(value) || 0 : value };
      }
      return item;
    });
    setInput({ ...input, directCosts: { items: updated } });
  };

  const deleteExpense = (id: string) => {
    const filtered = (input.directCosts?.items || []).filter((item) => item.id !== id);
    setInput({ ...input, directCosts: { items: filtered } });
  };

  // Estimación inversa
  const requiredGross = useMemo(() => {
    if (targetDesiredProfit <= 0) return 0;
    const pmMargin = result.distribution.projectManager.effectiveMarginOnGross;
    if (pmMargin <= 0) return 0;
    return targetDesiredProfit / (pmMargin / 100);
  }, [targetDesiredProfit, result.distribution.projectManager.effectiveMarginOnGross]);

  const hasContractAmount = (input.contractGrossAmount || 0) > 0;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.shell}>
        {/* =========================================================
            TOP COCKPIT / DEAL HUD
            ========================================================= */}
        <header className={styles.cockpitHeader}>
          <div className={styles.brandRow}>
            <div className={styles.brandInfo}>
              <span className={styles.brandBadge}>DEAL DESK</span>
              <div>
                <h1 className={styles.brandTitle}>Calculadora de Negociación y Reparto</h1>
                <p className={styles.brandSubtitle}>
                  Ingeniería de costos y liquidación pre-firma de proyectos y licitaciones.
                </p>
              </div>
            </div>

            <div className={styles.currencySwitch}>
              <button
                type="button"
                className={`${styles.currencyBtn} ${currency === 'Bs' ? styles.currencyBtnActive : ''}`}
                onClick={() => setCurrency('Bs')}
              >
                Bs
              </button>
              <button
                type="button"
                className={`${styles.currencyBtn} ${currency === 'USD' ? styles.currencyBtnActive : ''}`}
                onClick={() => setCurrency('USD')}
              >
                USD
              </button>
            </div>
          </div>

          {/* Navegación por pestañas exclusiva de Móvil / APK */}
          <nav className={styles.mobileNavTabs} aria-label="Navegación móvil">
            <button
              type="button"
              className={`${styles.mobileNavBtn} ${mobileTab === 'variables' ? styles.mobileNavBtnActive : ''}`}
              onClick={() => setMobileTab('variables')}
            >
              <span>🎛️ Variables</span>
            </button>
            <button
              type="button"
              className={`${styles.mobileNavBtn} ${mobileTab === 'resultados' ? styles.mobileNavBtnActive : ''}`}
              onClick={() => setMobileTab('resultados')}
            >
              <span>📊 Resultados</span>
            </button>
            <button
              type="button"
              className={`${styles.mobileNavBtn} ${mobileTab === 'meta' ? styles.mobileNavBtnActive : ''}`}
              onClick={() => setMobileTab('meta')}
            >
              <span>🎯 Meta</span>
            </button>
          </nav>
        </header>

        {/* =========================================================
            THE 4 HERO NUMBERS (EXECUTIVE METRICS DASHBOARD)
            ========================================================= */}
        <section className={styles.metricsGrid}>
          {/* Hero: Proyectista Real Gain */}
          <div className={styles.heroMetricCard}>
            <div className={styles.metricEyebrow}>
              <span>Ganancia Proyectista</span>
              {hasContractAmount && (
                <span className={styles.highlightPill}>
                  {result.distribution.projectManager.effectiveMarginOnGross}% margen
                </span>
              )}
            </div>
            <div className={styles.heroValue}>
              {hasContractAmount ? fmt(result.distribution.projectManager.totalAmount) : `0 ${currency}`}
            </div>
            <div className={styles.metricSubtext}>
              {hasContractAmount ? (
                <span>
                  Líquido: <strong>{fmt(result.distribution.projectManager.immediateAmount)}</strong>
                  {result.deferredRetentionPool > 0 && (
                    <span style={{ color: '#fbbf24' }}> | Cierre: {fmt(result.distribution.projectManager.deferredAmount)}</span>
                  )}
                </span>
              ) : (
                <span>Ingresa el monto del contrato</span>
              )}
            </div>
          </div>

          {/* Líquido Inmediato en Ejecución */}
          <div className={styles.metricCard}>
            <div className={styles.metricEyebrow}>
              <span>Líquido en Ejecución</span>
              <span style={{ color: '#34d399' }}>● Disponible</span>
            </div>
            <div className={styles.metricValue} style={{ color: '#38bdf8' }}>
              {fmt(result.immediateDistributablePool)}
            </div>
            <div className={styles.metricSubtext}>
              Distribuible durante la obra
            </div>
          </div>

          {/* Fondo Retenido / Caja de Salud (Diferido) */}
          <div className={styles.metricCard}>
            <div className={styles.metricEyebrow}>
              <span>Retención ({result.statutoryDeduction.ratePct}%)</span>
              <span className={result.statutoryDeduction.isRecoverable ? styles.warningPill : styles.dangerPill}>
                {result.statutoryDeduction.isRecoverable ? 'Recuperable' : 'Fondo Perdido'}
              </span>
            </div>
            <div className={styles.metricValue} style={{ color: '#fbbf24' }}>
              {fmt(result.statutoryDeduction.amount)}
            </div>
            <div className={styles.metricSubtext}>
              {result.statutoryDeduction.isRecoverable
                ? 'Cobro en Recepción Definitiva'
                : 'Aporte normativo no devuelto'}
            </div>
          </div>

          {/* Peajes & Fricciones Totales */}
          <div className={styles.metricCard}>
            <div className={styles.metricEyebrow}>
              <span>Peajes & Deducciones</span>
              {hasContractAmount && (
                <span className={styles.dangerPill}>
                  -{(100 - result.summaryMetrics.effectiveTakeRates.teamNetProfitPct).toFixed(1)}%
                </span>
              )}
            </div>
            <div className={styles.metricValue} style={{ color: '#f43f5e' }}>
              -{fmt(result.totalNonRecoverableExpenses)}
            </div>
            <div className={styles.metricSubtext}>
              Impuestos + Boletas + Diezmo + Maquila + Gastos
            </div>
          </div>
        </section>

        {/* =========================================================
            MAIN WORKSPACE: RESPONSIVE SPLIT
            En Desktop: 2 columnas completas
            En Móvil / APK: Controlado por las pestañas superiores
            ========================================================= */}
        <main className={styles.workspaceLayout}>
          {/* =====================================================
              PANEL 1: VARIABLES DE NEGOCIACIÓN
              ===================================================== */}
          <div
            className={styles.panel}
            style={{
              display:
                typeof window !== 'undefined' && window.innerWidth < 960 && mobileTab !== 'variables'
                  ? 'none'
                  : 'flex',
            }}
          >
            <div className={styles.panelTitleBar}>
              <div className={styles.panelTitle}>
                <span className={styles.panelNumber}>1</span>
                <span>Mesa de Negociación</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Variables editables</span>
            </div>

            {/* Presupuesto Principal Ofertado (Sin hardcodeo) */}
            <div className={styles.contractHeroBox}>
              <div className={styles.contractLabel}>
                <span>Monto Bruto Ofertado ({currency})</span>
                <span style={{ color: '#60a5fa' }}>Total contrato / pliego</span>
              </div>
              <div className={styles.contractInputWrapper}>
                <span className={styles.contractCurrencySign}>{currency === 'Bs' ? 'Bs' : '$'}</span>
                <input
                  type="number"
                  placeholder="0.00"
                  className={styles.contractInputLarge}
                  value={input.contractGrossAmount === 0 ? '' : input.contractGrossAmount}
                  onChange={(e) =>
                    setInput({ ...input, contractGrossAmount: Number(e.target.value) || 0 })
                  }
                  step={5000}
                />
              </div>
            </div>

            {/* 1. IMPUESTOS (ÚNICA REGLA FIJA DE NORMATIVA CON SWITCH DE HABILITACIÓN) */}
            <div className={styles.controlSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}>🏛️ Régimen Tributario</span>
                <span className={styles.sectionCostBadge} style={{ color: taxEnabled ? '#60a5fa' : '#64748b' }}>
                  {taxEnabled ? `-${fmt(result.taxes.taxAmount)} (${result.taxes.effectiveRatePct}%)` : 'Deshabilitado (0%)'}
                </span>
              </div>

              {/* Conmutador de Habilitación de Impuestos */}
              <div
                className={`${styles.tactileCard} ${taxEnabled ? styles.tactileCardActive : ''}`}
              >
                <div
                  className={styles.tactileHeaderRow}
                  onClick={() => setTaxEnabled(!taxEnabled)}
                >
                  <div className={styles.tactileInfo}>
                    <span className={styles.tactileTitle}>
                      {taxEnabled ? '✓ Impuestos HABILITADOS' : '✗ Impuestos DESHABILITADOS (Sin Factura / 0%)'}
                    </span>
                    <span className={styles.tactileSub}>
                      {taxEnabled
                        ? 'Se deduce la carga fiscal oficial sobre el contrato'
                        : 'Trato directo en mano sin deducción fiscal'}
                    </span>
                  </div>
                  <div className={`${styles.toggleTrack} ${taxEnabled ? styles.toggleTrackActive : ''}`}>
                    <div className={`${styles.toggleThumb} ${taxEnabled ? styles.toggleThumbActive : ''}`} />
                  </div>
                </div>
              </div>

              {/* Si los impuestos están habilitados, opciones de normativa */}
              {taxEnabled && (
                <>
                  <div className={styles.tabGroup}>
                    <button
                      type="button"
                      className={`${styles.tabBtn} ${selectedTaxType === 'CON_FACTURA' ? styles.tabBtnActive : ''}`}
                      onClick={() => setSelectedTaxType('CON_FACTURA')}
                    >
                      <span>Con Factura</span>
                      <span className={styles.tabBtnSubtitle}>IVA + IT = 16%</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.tabBtn} ${selectedTaxType === 'RETENCION_LEY' ? styles.tabBtnActive : ''}`}
                      onClick={() => setSelectedTaxType('RETENCION_LEY')}
                    >
                      <span>Retención Ley</span>
                      <span className={styles.tabBtnSubtitle}>15.5% Servicios</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.tabBtn} ${selectedTaxType === 'PERSONALIZADO' ? styles.tabBtnActive : ''}`}
                      onClick={() => setSelectedTaxType('PERSONALIZADO')}
                    >
                      <span>Personalizado</span>
                      <span className={styles.tabBtnSubtitle}>Tasa a definir</span>
                    </button>
                  </div>

                  {selectedTaxType === 'CON_FACTURA' && (
                    <div className={styles.inputField}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span style={{ color: '#94a3b8' }}>
                          Descargo Facturas Compras (IVA): <strong>{taxCreditPct}%</strong>
                        </span>
                        <span style={{ color: '#34d399' }}>Ahorro: +{fmt(result.taxes.taxCreditSavings)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        className={styles.sliderTrack}
                        value={taxCreditPct}
                        onChange={(e) => setTaxCreditPct(Number(e.target.value))}
                      />
                    </div>
                  )}

                  {selectedTaxType === 'PERSONALIZADO' && (
                    <div className={styles.inputField}>
                      <span className={styles.inputLabel}>Tasa impositiva aplicable (%)</span>
                      <input
                        type="number"
                        className={styles.darkInput}
                        value={customTaxRate}
                        onChange={(e) => setCustomTaxRate(Number(e.target.value) || 0)}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 2. Boletas y Pólizas */}
            <div className={styles.controlSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}>📑 Boletas y Pólizas Bancarias</span>
                <span className={styles.sectionCostBadge} style={{ color: '#c084fc' }}>
                  Costo: -{fmt(result.guarantees.totalGuaranteesCost)}
                </span>
              </div>

              {/* Boleta Seriedad */}
              <div
                className={`${styles.tactileCard} ${input.guarantees.hasBidBond ? styles.tactileCardActive : ''}`}
              >
                <div
                  className={styles.tactileHeaderRow}
                  onClick={() =>
                    setInput({
                      ...input,
                      guarantees: { ...input.guarantees, hasBidBond: !input.guarantees.hasBidBond },
                    })
                  }
                >
                  <div className={styles.tactileInfo}>
                    <span className={styles.tactileTitle}>Boleta de Seriedad de Propuesta</span>
                    <span className={styles.tactileSub}>
                      {input.guarantees.hasBidBond
                        ? `Afianzado: ${fmt(result.guarantees.bidBondAmountAfianzado)} | Prima: -${fmt(result.guarantees.bidBondCost)}`
                        : 'Desactivada'}
                    </span>
                  </div>
                  <div
                    className={`${styles.toggleTrack} ${input.guarantees.hasBidBond ? styles.toggleTrackActive : ''}`}
                  >
                    <div
                      className={`${styles.toggleThumb} ${input.guarantees.hasBidBond ? styles.toggleThumbActive : ''}`}
                    />
                  </div>
                </div>

                {input.guarantees.hasBidBond && (
                  <div className={styles.inputGrid}>
                    <div className={styles.inputField}>
                      <span className={styles.inputLabel}>% Afianzado (ej. 1.5%)</span>
                      <input
                        type="number"
                        step="0.1"
                        className={styles.darkInput}
                        value={input.guarantees.bidBondCoveragePct || 1.5}
                        onChange={(e) =>
                          setInput({
                            ...input,
                            guarantees: { ...input.guarantees, bidBondCoveragePct: Number(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>
                    <div className={styles.inputField}>
                      <span className={styles.inputLabel}>Prima Seguros / Fee (%)</span>
                      <input
                        type="number"
                        step="0.1"
                        className={styles.darkInput}
                        value={input.guarantees.bidBondPremiumPct || 2.0}
                        onChange={(e) =>
                          setInput({
                            ...input,
                            guarantees: { ...input.guarantees, bidBondPremiumPct: Number(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Boleta Cumplimiento */}
              <div
                className={`${styles.tactileCard} ${input.guarantees.hasPerformanceBond ? styles.tactileCardActive : ''}`}
              >
                <div
                  className={styles.tactileHeaderRow}
                  onClick={() =>
                    setInput({
                      ...input,
                      guarantees: { ...input.guarantees, hasPerformanceBond: !input.guarantees.hasPerformanceBond },
                    })
                  }
                >
                  <div className={styles.tactileInfo}>
                    <span className={styles.tactileTitle}>Boleta de Cumplimiento de Contrato (7%)</span>
                    <span className={styles.tactileSub}>
                      {input.guarantees.hasPerformanceBond
                        ? `Afianzado: ${fmt(result.guarantees.performanceBondAmountAfianzado)} | Prima: -${fmt(result.guarantees.performanceBondCost)}`
                        : 'Desactivada'}
                    </span>
                  </div>
                  <div
                    className={`${styles.toggleTrack} ${input.guarantees.hasPerformanceBond ? styles.toggleTrackActive : ''}`}
                  >
                    <div
                      className={`${styles.toggleThumb} ${input.guarantees.hasPerformanceBond ? styles.toggleThumbActive : ''}`}
                    />
                  </div>
                </div>

                {input.guarantees.hasPerformanceBond && (
                  <div className={styles.inputGrid}>
                    <div className={styles.inputField}>
                      <span className={styles.inputLabel}>% Afianzado (7% normativo)</span>
                      <input
                        type="number"
                        step="0.5"
                        className={styles.darkInput}
                        value={input.guarantees.performanceBondCoveragePct || 7.0}
                        onChange={(e) =>
                          setInput({
                            ...input,
                            guarantees: { ...input.guarantees, performanceBondCoveragePct: Number(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>
                    <div className={styles.inputField}>
                      <span className={styles.inputLabel}>Prima Póliza / Comisión (%)</span>
                      <input
                        type="number"
                        step="0.1"
                        className={styles.darkInput}
                        value={input.guarantees.performanceBondPremiumPct || 2.5}
                        onChange={(e) =>
                          setInput({
                            ...input,
                            guarantees: { ...input.guarantees, performanceBondPremiumPct: Number(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Retención Normativa / Caja de Salud (5% a 7%) */}
            <div className={styles.controlSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}>🏥 Retención en Planilla (Caja / Pliego)</span>
                <span className={styles.sectionCostBadge} style={{ color: '#fbbf24' }}>
                  {fmt(result.statutoryDeduction.amount)} ({result.statutoryDeduction.ratePct}%)
                </span>
              </div>

              <div className={styles.inputGrid}>
                <div className={styles.inputField}>
                  <span className={styles.inputLabel}>% Retenido por la Entidad (ej. 5%)</span>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="0"
                    className={styles.darkInput}
                    value={input.statutoryDeductions.retentionRatePct === 0 ? '' : input.statutoryDeductions.retentionRatePct}
                    onChange={(e) =>
                      setInput({
                        ...input,
                        statutoryDeductions: {
                          ...input.statutoryDeductions,
                          retentionRatePct: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div className={styles.inputField}>
                  <span className={styles.inputLabel}>Condición de Retención</span>
                  <button
                    type="button"
                    style={{
                      minHeight: '44px',
                      background: input.statutoryDeductions.isRecoverable ? '#064e3b' : '#7f1d1d',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      padding: '0.5rem',
                    }}
                    onClick={() =>
                      setInput({
                        ...input,
                        statutoryDeductions: {
                          ...input.statutoryDeductions,
                          isRecoverable: !input.statutoryDeductions.isRecoverable,
                        },
                      })
                    }
                  >
                    {input.statutoryDeductions.isRecoverable
                      ? '✓ Se cobra al cierre'
                      : '✗ Gasto perdido'}
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Fricciones de Negociación: Diezmo y Presta-nombre */}
            <div className={styles.controlSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}>🤝 Diezmo & Empresa Presta-Nombre</span>
                <span className={styles.sectionCostBadge} style={{ color: '#f43f5e' }}>
                  Total: -{fmt(result.summaryMetrics.commercialFeesTotal)}
                </span>
              </div>

              {/* Diezmo */}
              <div className={styles.inputGrid}>
                <div className={styles.inputField}>
                  <span className={styles.inputLabel}>Diezmo / Contacto (%)</span>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="0"
                    className={styles.darkInput}
                    value={input.adjudicationCommission.value === 0 ? '' : input.adjudicationCommission.value}
                    onChange={(e) =>
                      setInput({
                        ...input,
                        adjudicationCommission: {
                          ...input.adjudicationCommission,
                          value: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div className={styles.inputField}>
                  <span className={styles.inputLabel}>Monto Diezmo</span>
                  <div
                    style={{
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 0.75rem',
                      background: '#0f172a',
                      borderRadius: '8px',
                      color: '#f43f5e',
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    -{fmt(result.commission.amount)}
                  </div>
                </div>
              </div>

              {/* Empresa Titular */}
              <div className={styles.inputGrid} style={{ marginTop: '0.4rem' }}>
                <div className={styles.inputField}>
                  <span className={styles.inputLabel}>Fee Empresa Presta-Nombre (%)</span>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="0"
                    className={styles.darkInput}
                    value={input.titularCompany.value === 0 ? '' : input.titularCompany.value}
                    onChange={(e) =>
                      setInput({
                        ...input,
                        titularCompany: { ...input.titularCompany, value: Number(e.target.value) || 0 },
                      })
                    }
                  />
                </div>
                <div className={styles.inputField}>
                  <span className={styles.inputLabel}>Monto Fee Empresa</span>
                  <div
                    style={{
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 0.75rem',
                      background: '#0f172a',
                      borderRadius: '8px',
                      color: '#f43f5e',
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    -{fmt(result.titularCompany.amount)}
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Costos Directos */}
            <div className={styles.controlSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}>🛠️ Gastos Operativos de Obra</span>
                <span className={styles.sectionCostBadge} style={{ color: '#94a3b8' }}>
                  Total: -{fmt(result.directCosts.total)}
                </span>
              </div>

              <div className={styles.expenseList}>
                {(input.directCosts?.items || []).length === 0 ? (
                  <p style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', margin: '0.2rem 0' }}>
                    Sin gastos directos registrados. Añade filas si hay viáticos, materiales o insumos.
                  </p>
                ) : (
                  (input.directCosts?.items || []).map((item) => (
                    <div key={item.id} className={styles.expenseRow}>
                      <input
                        type="text"
                        placeholder="Concepto (ej. Viáticos)"
                        className={styles.darkInput}
                        value={item.concept}
                        onChange={(e) => updateExpense(item.id, 'concept', e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Monto"
                        className={styles.darkInput}
                        value={item.amount || ''}
                        onChange={(e) => updateExpense(item.id, 'amount', e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.delBtn}
                        onClick={() => deleteExpense(item.id)}
                        title="Eliminar gasto"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
                <button type="button" className={styles.newExpenseBtn} onClick={addExpense}>
                  + Añadir gasto operativo de campo
                </button>
              </div>
            </div>

            {/* 6. Repartición de Utilidades */}
            <div className={styles.controlSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}>⚖️ Reparto entre Socios</span>
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
                  Proyectista: {input.distribution.projectManagerPct}% | Gestor: {input.distribution.businessPartnerPct}%
                </span>
              </div>

              <div className={styles.inputField}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className={styles.sliderTrack}
                  value={input.distribution.projectManagerPct}
                  onChange={(e) => {
                    const pm = Number(e.target.value);
                    setInput({
                      ...input,
                      distribution: {
                        ...input.distribution,
                        projectManagerPct: pm,
                        businessPartnerPct: 100 - pm,
                      },
                    });
                  }}
                />
              </div>

              <div className={styles.inputField} style={{ marginTop: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: '#94a3b8' }}>
                    Fondo de Imprevistos / Reserva: <strong>{input.distribution.contingencyFundPct}%</strong>
                  </span>
                  <span style={{ color: '#64748b' }}>{fmt(result.distribution.contingencyFund.amount)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  className={styles.sliderTrack}
                  value={input.distribution.contingencyFundPct}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      distribution: {
                        ...input.distribution,
                        contingencyFundPct: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* =====================================================
              PANEL 2: RESULTADOS Y AUDITORÍA
              ===================================================== */}
          <div
            className={styles.rightStickyStack}
            style={{
              display:
                typeof window !== 'undefined' && window.innerWidth < 960 && mobileTab === 'variables'
                  ? 'none'
                  : 'flex',
            }}
          >
            {/* 1. Tarjetas de Reparto Proyectista vs Socio */}
            <div className={styles.partnerCardGrid}>
              {/* Proyectista */}
              <div className={`${styles.partnerTile} ${styles.partnerTileProyectista}`}>
                <span className={styles.partnerRoleBadge}>Proyectista (Técnico)</span>
                <span className={styles.partnerSumTotal}>
                  {fmt(result.distribution.projectManager.totalAmount)}
                </span>
                <div className={styles.partnerFlowRow}>
                  <span>Líquido:</span>
                  <span style={{ color: '#34d399', fontWeight: 700 }}>
                    {fmt(result.distribution.projectManager.immediateAmount)}
                  </span>
                </div>
                {result.deferredRetentionPool > 0 && (
                  <div className={styles.partnerFlowRow}>
                    <span>Al cierre:</span>
                    <span style={{ color: '#fbbf24' }}>
                      {fmt(result.distribution.projectManager.deferredAmount)}
                    </span>
                  </div>
                )}
                {hasContractAmount && (
                  <div style={{ fontSize: '0.725rem', color: '#10b981', marginTop: '0.2rem', fontWeight: 700 }}>
                    Margen real: {result.distribution.projectManager.effectiveMarginOnGross}% del bruto
                  </div>
                )}
              </div>

              {/* Socio Gestor */}
              <div className={`${styles.partnerTile} ${styles.partnerTileGestor}`}>
                <span className={styles.partnerRoleBadge}>Socio / Gestor</span>
                <span className={styles.partnerSumTotal}>
                  {fmt(result.distribution.businessPartner.totalAmount)}
                </span>
                <div className={styles.partnerFlowRow}>
                  <span>Líquido:</span>
                  <span style={{ color: '#60a5fa', fontWeight: 700 }}>
                    {fmt(result.distribution.businessPartner.immediateAmount)}
                  </span>
                </div>
                {result.deferredRetentionPool > 0 && (
                  <div className={styles.partnerFlowRow}>
                    <span>Al cierre:</span>
                    <span style={{ color: '#fbbf24' }}>
                      {fmt(result.distribution.businessPartner.deferredAmount)}
                    </span>
                  </div>
                )}
                {hasContractAmount && (
                  <div style={{ fontSize: '0.725rem', color: '#60a5fa', marginTop: '0.2rem', fontWeight: 700 }}>
                    Margen real: {result.distribution.businessPartner.effectiveMarginOnGross}% del bruto
                  </div>
                )}
              </div>
            </div>

            {/* 2. Barra de Absorción de Capital */}
            {hasContractAmount && (
              <div className={styles.visualAuditCard}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionHeading}>📊 Quién se come el Contrato</span>
                  <span style={{ fontSize: '0.725rem', color: '#64748b' }}>100% Presupuesto</span>
                </div>

                <div className={styles.auditBarWrapper}>
                  <div className={styles.auditBar}>
                    <div
                      className={styles.auditSegment}
                      style={{
                        width: `${result.summaryMetrics.effectiveTakeRates.governmentPct}%`,
                        background: '#2563eb',
                      }}
                      title={`Impuestos: ${result.summaryMetrics.effectiveTakeRates.governmentPct}%`}
                    />
                    <div
                      className={styles.auditSegment}
                      style={{
                        width: `${result.summaryMetrics.effectiveTakeRates.guaranteesPct}%`,
                        background: '#9333ea',
                      }}
                      title={`Boletas: ${result.summaryMetrics.effectiveTakeRates.guaranteesPct}%`}
                    />
                    <div
                      className={styles.auditSegment}
                      style={{
                        width: `${result.summaryMetrics.effectiveTakeRates.commercialFeesPct}%`,
                        background: '#f43f5e',
                      }}
                      title={`Diezmo y Empresa: ${result.summaryMetrics.effectiveTakeRates.commercialFeesPct}%`}
                    />
                    <div
                      className={styles.auditSegment}
                      style={{
                        width: `${result.summaryMetrics.effectiveTakeRates.directCostsPct}%`,
                        background: '#475569',
                      }}
                      title={`Costos Directos: ${result.summaryMetrics.effectiveTakeRates.directCostsPct}%`}
                    />
                    <div
                      className={styles.auditSegment}
                      style={{
                        width: `${result.summaryMetrics.effectiveTakeRates.teamNetProfitPct}%`,
                        background: '#10b981',
                      }}
                      title={`Ganancia Socios: ${result.summaryMetrics.effectiveTakeRates.teamNetProfitPct}%`}
                    />
                  </div>

                  <div className={styles.auditLegendGrid}>
                    <div className={styles.legendPill}>
                      <div className={styles.legendDot} style={{ background: '#2563eb' }} />
                      <span>Impuestos ({result.summaryMetrics.effectiveTakeRates.governmentPct}%)</span>
                    </div>
                    <div className={styles.legendPill}>
                      <div className={styles.legendDot} style={{ background: '#9333ea' }} />
                      <span>Boletas ({result.summaryMetrics.effectiveTakeRates.guaranteesPct}%)</span>
                    </div>
                    <div className={styles.legendPill}>
                      <div className={styles.legendDot} style={{ background: '#f43f5e' }} />
                      <span>Diezmo + Maquila ({result.summaryMetrics.effectiveTakeRates.commercialFeesPct}%)</span>
                    </div>
                    <div className={styles.legendPill}>
                      <div className={styles.legendDot} style={{ background: '#475569' }} />
                      <span>Gastos ({result.summaryMetrics.effectiveTakeRates.directCostsPct}%)</span>
                    </div>
                    <div className={styles.legendPill}>
                      <div className={styles.legendDot} style={{ background: '#10b981' }} />
                      <span>Ganancia ({result.summaryMetrics.effectiveTakeRates.teamNetProfitPct}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Liquidación Pre-Firma (Tabla Centavo a Centavo) */}
            <div className={styles.visualAuditCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}>🧾 Liquidación Financiera Pre-Firma</span>
              </div>

              <div className={styles.tableScrollWrap}>
                <table className={styles.ledgerTable}>
                  <thead>
                    <tr>
                      <th>Línea de Trato</th>
                      <th className={styles.textEnd}>Tasa</th>
                      <th className={styles.textEnd}>Monto ({currency})</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Monto Contrato Adjudicado</td>
                      <td className={styles.textEnd}>100%</td>
                      <td className={styles.textEnd}>
                        <strong>{fmtPrecise(result.contractGrossAmount)}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td>(-) Carga Tributaria {taxEnabled ? `(${result.taxes.type})` : '(0%)'}</td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{result.taxes.effectiveRatePct}%
                      </td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{fmtPrecise(result.taxes.taxAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td>(-) Primas Boletas y Pólizas</td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{result.summaryMetrics.effectiveTakeRates.guaranteesPct}%
                      </td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{fmtPrecise(result.guarantees.totalGuaranteesCost)}
                      </td>
                    </tr>
                    <tr>
                      <td>(-) Diezmo de Adjudicación</td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{result.commission.effectivePctOfGross}%
                      </td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{fmtPrecise(result.commission.amount)}
                      </td>
                    </tr>
                    <tr>
                      <td>(-) Fee Empresa Titular (NIT/Firma)</td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{result.titularCompany.effectivePctOfGross}%
                      </td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{fmtPrecise(result.titularCompany.amount)}
                      </td>
                    </tr>
                    <tr>
                      <td>(-) Costos Directos Operativos</td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{result.summaryMetrics.effectiveTakeRates.directCostsPct}%
                      </td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{fmtPrecise(result.directCosts.total)}
                      </td>
                    </tr>
                    {!result.statutoryDeduction.isRecoverable && (
                      <tr>
                        <td>(-) Aporte No Recuperable a Caja</td>
                        <td className={`${styles.textEnd} ${styles.redCut}`}>
                          -{result.statutoryDeduction.ratePct}%
                        </td>
                        <td className={`${styles.textEnd} ${styles.redCut}`}>
                          -{fmtPrecise(result.statutoryDeduction.amount)}
                        </td>
                      </tr>
                    )}
                    <tr className={styles.ledgerTotalRow}>
                      <td>(=) UTILIDAD NETA DEL EQUIPO</td>
                      <td className={`${styles.textEnd} ${styles.greenGain}`}>
                        {result.summaryMetrics.effectiveTakeRates.teamNetProfitPct}%
                      </td>
                      <td className={`${styles.textEnd} ${styles.greenGain}`}>
                        {fmtPrecise(result.totalNetProfitPool)}
                      </td>
                    </tr>
                    {result.statutoryDeduction.isRecoverable && (
                      <tr>
                        <td style={{ color: '#fbbf24' }}>
                          (-) Retención Diferida (Cobro al Cierre)
                        </td>
                        <td className={`${styles.textEnd} ${styles.amberFreeze}`}>
                          -{result.statutoryDeduction.ratePct}%
                        </td>
                        <td className={`${styles.textEnd} ${styles.amberFreeze}`}>
                          -{fmtPrecise(result.deferredRetentionPool)}
                        </td>
                      </tr>
                    )}
                    <tr className={styles.ledgerTotalRow} style={{ background: 'rgba(37, 99, 235, 0.15)' }}>
                      <td style={{ color: '#38bdf8' }}>(★) LÍQUIDO DISPONIBLE EN EJECUCIÓN</td>
                      <td className={styles.textEnd} style={{ color: '#38bdf8' }}>
                        {result.contractGrossAmount > 0
                          ? ((result.immediateDistributablePool / result.contractGrossAmount) * 100).toFixed(1)
                          : 0}
                        %
                      </td>
                      <td className={styles.textEnd} style={{ color: '#38bdf8' }}>
                        {fmtPrecise(result.immediateDistributablePool)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Simulador Inverso Rápido */}
            <div className={styles.reverseWidget}>
              <div className={styles.reverseWidgetHeader}>
                <span className={styles.reverseTitle}>🎯 Meta: ¿Cuánto debo cotizar?</span>
                <span style={{ fontSize: '0.725rem', color: '#93c5fd' }}>Cálculo Inverso</span>
              </div>
              <div className={styles.inputField}>
                <span className={styles.inputLabel}>Quiero ganar limpio en mano ({currency}):</span>
                <input
                  type="number"
                  placeholder="0"
                  step={2000}
                  className={styles.darkInput}
                  value={targetDesiredProfit === 0 ? '' : targetDesiredProfit}
                  onChange={(e) => setTargetDesiredProfit(Number(e.target.value) || 0)}
                />
              </div>
              <div className={styles.reverseOutputBox}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cotización Mínima Necesaria:</span>
                <span className={styles.reverseOutputNumber}>{fmt(requiredGross)}</span>
              </div>
            </div>
          </div>
        </main>

        {/* =========================================================
            FLOATING STICKY BOTTOM BAR (MOBILE / APK ONLY)
            ========================================================= */}
        <div className={styles.mobileFloatingBar}>
          <div className={styles.mobileFloatingGain}>
            <span className={styles.mobileFloatingLabel}>Tu Ganancia Neta</span>
            <span className={styles.mobileFloatingAmount}>
              {hasContractAmount ? fmt(result.distribution.projectManager.totalAmount) : `0 ${currency}`}
            </span>
          </div>
          <button
            type="button"
            className={styles.mobileFloatingActionBtn}
            onClick={() => setMobileTab(mobileTab === 'variables' ? 'resultados' : 'variables')}
          >
            {mobileTab === 'variables' ? 'Ver Resultados ➔' : 'Editar Variables ✎'}
          </button>
        </div>
      </div>
    </div>
  );
}
