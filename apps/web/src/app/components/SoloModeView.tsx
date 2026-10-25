'use client';

import React, { useState } from 'react';
import styles from './SoloModeView.module.css';
import { useTheme } from '../context/ThemeContext';
import {
  DealCalculationInput,
  DealCalculationResult,
  StaffAssignment,
  DirectCostItem,
} from '@calc/shared';

interface SoloModeViewProps {
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

export function SoloModeView({
  input,
  setInput,
  result,
  currency,
  fmt,
  onBackToHub,
  onDownloadPdf,
  onCopySummary,
  isGeneratingPdf,
}: SoloModeViewProps) {
  const { theme, toggleTheme } = useTheme();
  const [durationMonths, setDurationMonths] = useState<number>(2);

  // Cambiar duración del contrato y limitar roles para no exceder la duración total
  const handleDurationChange = (newMonths: number) => {
    const valid = Math.max(1, newMonths);
    setDurationMonths(valid);
    setInput((prev) => ({
      ...prev,
      staffing: {
        assignments: prev.staffing.assignments.map((s) => ({
          ...s,
          durationMonths: s.durationMonths > valid ? valid : s.durationMonths,
        })),
      },
    }));
  };

  // Sincronizar meses de todo el personal con la duración total del contrato
  const handleSyncStaffDuration = () => {
    setInput((prev) => ({
      ...prev,
      staffing: {
        assignments: prev.staffing.assignments.map((s) => ({
          ...s,
          durationMonths,
        })),
      },
    }));
  };

  // Collapsible state for the 5 blocks
  const [openBlocks, setOpenBlocks] = useState({
    personal: true,
    gastos: true,
    impuestos: true,
    boletas: true,
    contingencia: true,
  });

  const toggleBlock = (block: keyof typeof openBlocks) => {
    setOpenBlocks((prev) => ({ ...prev, [block]: !prev[block] }));
  };

  // CARGAR PLANTILLA GAD POTOSÍ (450.000 Bs · 2 Meses · Personal 248.000 Bs)
  const handleLoadGadPotosiTemplate = () => {
    setDurationMonths(2);
    setInput((prev) => ({
      ...prev,
      negotiationMode: 'FORMAL_LICITACION',
      contractGrossAmount: 450000,
      taxScenario: {
        type: 'CON_FACTURA',
        taxCreditPct: 35,
      },
      iueTax: {
        enabled: true,
        ratePct: 25,
        payer: 'PROYECTO',
      },
      guarantees: {
        hasBidBond: true,
        bidBondCoveragePct: 1.5,
        bidBondPremiumPct: 2.0,
        hasPerformanceBond: true,
        performanceBondCoveragePct: 7.0,
        performanceBondPremiumPct: 2.5,
        hasAdvanceBond: true,
        advancePct: 20.0,
        advanceBondPremiumPct: 2.5,
      },
      statutoryDeductions: {
        retentionRatePct: 5.0,
        isRecoverable: true,
      },
      adjudicationCommission: {
        type: 'PERCENTAGE_GROSS',
        value: 0,
      },
      titularCompany: {
        enabled: false,
        type: 'PERCENTAGE_GROSS',
        value: 0,
        absorbsTaxes: false,
        absorbsGuaranteesCost: false,
        absorbsAdminExpenses: false,
      },
      distribution: {
        ...prev.distribution,
        contingencyFundPct: 3.0,
      },
      staffing: {
        assignments: [
          {
            id: 'gad-staff-1',
            role: 'Director de Estudio / Gerente de Proyecto',
            quantity: 1,
            durationMonths: 2,
            monthlySalary: 30000,
            laborBurdenPct: 0,
            isDirectSiteCost: true,
            hasFormalPayroll: true,
          },
          {
            id: 'gad-staff-2',
            role: 'Especialista Estructural y Geotécnico',
            quantity: 1,
            durationMonths: 2,
            monthlySalary: 25000,
            laborBurdenPct: 0,
            isDirectSiteCost: true,
            hasFormalPayroll: true,
          },
          {
            id: 'gad-staff-3',
            role: 'Especialista Hidráulico e Hidrológico',
            quantity: 1,
            durationMonths: 2,
            monthlySalary: 25000,
            laborBurdenPct: 0,
            isDirectSiteCost: true,
            hasFormalPayroll: true,
          },
          {
            id: 'gad-staff-4',
            role: 'Especialista Ambiental y Social',
            quantity: 1,
            durationMonths: 2,
            monthlySalary: 20000,
            laborBurdenPct: 0,
            isDirectSiteCost: true,
            hasFormalPayroll: true,
          },
          {
            id: 'gad-staff-5',
            role: 'Topógrafo y Brigada de Campo',
            quantity: 1,
            durationMonths: 2,
            monthlySalary: 14000,
            laborBurdenPct: 0,
            isDirectSiteCost: true,
            hasFormalPayroll: false,
          },
          {
            id: 'gad-staff-6',
            role: 'Cadista y Modelador BIM',
            quantity: 1,
            durationMonths: 2,
            monthlySalary: 10000,
            laborBurdenPct: 0,
            isDirectSiteCost: true,
            hasFormalPayroll: false,
          },
        ],
      },
      directCosts: {
        items: [
          {
            id: 'gad-cost-1',
            concept: 'Ensayos de laboratorio (suelos y rotura de probetas de hormigón)',
            category: 'subcontratos',
            amount: 12000,
            isTaxDeductible: true,
          },
          {
            id: 'gad-cost-2',
            concept: 'Alquiler camioneta 4x4 + combustible y mantenimiento de ruta',
            category: 'viaticos',
            amount: 12000,
            isTaxDeductible: true,
          },
          {
            id: 'gad-cost-3',
            concept: 'Hospedaje y viáticos en municipios de Potosí',
            category: 'viaticos',
            amount: 8000,
            isTaxDeductible: false,
          },
          {
            id: 'gad-cost-4',
            concept: 'Impresión de planos, ploteos y carpetas ejecutivas de entrega',
            category: 'materiales',
            amount: 4000,
            isTaxDeductible: true,
          },
        ],
      },
    }));
  };

  const handleClear = () => {
    setInput((prev) => ({
      ...prev,
      contractGrossAmount: 0,
      staffing: { assignments: [] },
      directCosts: { items: [] },
    }));
  };

  // Staffing row handlers
  const handleAddStaff = () => {
    const newStaff: StaffAssignment = {
      id: Date.now().toString(),
      role: 'Nuevo Cargo / Profesional',
      quantity: 1,
      durationMonths: durationMonths || 1,
      monthlySalary: 5000,
      laborBurdenPct: 33.37,
      isDirectSiteCost: true,
      hasFormalPayroll: true,
    };
    setInput((prev) => ({
      ...prev,
      staffing: { assignments: [...prev.staffing.assignments, newStaff] },
    }));
  };

  const handleUpdateStaff = (id: string, updates: Partial<StaffAssignment>) => {
    setInput((prev) => ({
      ...prev,
      staffing: {
        assignments: prev.staffing.assignments.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      },
    }));
  };

  const handleDeleteStaff = (id: string) => {
    setInput((prev) => ({
      ...prev,
      staffing: { assignments: prev.staffing.assignments.filter((s) => s.id !== id) },
    }));
  };

  // Direct costs handlers
  const handleAddCost = () => {
    const newCost: DirectCostItem = {
      id: Date.now().toString(),
      concept: 'Nuevo concepto de gasto',
      category: 'otros',
      amount: 1000,
      isTaxDeductible: true,
    };
    setInput((prev) => ({
      ...prev,
      directCosts: { items: [...prev.directCosts.items, newCost] },
    }));
  };

  const handleUpdateCost = (id: string, updates: Partial<DirectCostItem>) => {
    setInput((prev) => ({
      ...prev,
      directCosts: {
        items: prev.directCosts.items.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      },
    }));
  };

  const handleDeleteCost = (id: string) => {
    setInput((prev) => ({
      ...prev,
      directCosts: { items: prev.directCosts.items.filter((c) => c.id !== id) },
    }));
  };

  const validMonths = Math.max(1, durationMonths);
  const totalPersonnelCost = result.staffing.totalPersonnelCost;
  const personnelMonthlyCost = totalPersonnelCost / validMonths;
  const netProfitMonthly = result.totalNetProfitPool / validMonths;
  const netProfitDaily = result.totalNetProfitPool / (validMonths * 22);

  return (
    <div className={styles.container}>
      {/* TOP BAR */}
      <header className={styles.topBar}>
        <div className={styles.navGroup}>
          <button type="button" className={styles.backBtn} onClick={onBackToHub}>
            ← Licitaciones
          </button>
          <span className={styles.badge}>Modo Solo</span>
          <h1 className={styles.title}>Estimación de Costos por Bloques</h1>
        </div>

        <div className={styles.actionGroup}>
          <button
            type="button"
            className={styles.templateBtn}
            onClick={handleLoadGadPotosiTemplate}
            title="Cargar presupuesto de referencia GAD Potosí (450.000 Bs · 2 Meses · Personal 248.000 Bs)"
          >
            <span>📋 Cargar Plantilla GAD Potosí (450.000 Bs)</span>
          </button>
          <button type="button" className={styles.clearBtn} onClick={handleClear} title="Limpiar datos">
            Limpiar
          </button>
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
        {/* CONTRACT HERO */}
        <section className={styles.contractHero}>
          <div className={styles.heroInputsRow}>
            {/* Monto Bruto */}
            <div className={styles.heroInputGroup}>
              <label className={styles.heroLabel}>Monto Bruto del Contrato / Pliego Licitado</label>
              <div className={styles.heroInputWrapper}>
                <span className={styles.heroCurrency}>{currency}</span>
                <input
                  type="number"
                  className={styles.heroInput}
                  value={input.contractGrossAmount || ''}
                  placeholder="450000"
                  onChange={(e) =>
                    setInput((prev) => ({
                      ...prev,
                      contractGrossAmount: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            {/* Duración Total */}
            <div className={styles.heroInputGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.heroLabel}>Duración Total del Contrato</label>
                <button
                  type="button"
                  onClick={handleSyncStaffDuration}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38bdf8',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    fontWeight: 700,
                  }}
                  title="Sincronizar todos los cargos a los meses del contrato"
                >
                  ⚡ Aplicar {durationMonths}m a todo el personal
                </button>
              </div>
              <div className={styles.heroInputWrapper}>
                <input
                  type="number"
                  min="1"
                  max="48"
                  className={styles.heroInput}
                  value={durationMonths}
                  onChange={(e) => handleDurationChange(Math.max(1, parseInt(e.target.value) || 1))}
                />
                <span style={{ color: '#38bdf8', fontSize: '1.15rem', fontWeight: 800 }}>meses</span>
              </div>
            </div>
          </div>

          {/* METRIC GRID */}
          <div className={styles.heroMetaGrid}>
            <div className={styles.heroMetaBox}>
              <span className={styles.heroMetaLabel}>Personal / Mes</span>
              <span className={styles.heroMetaValue} style={{ color: '#38bdf8' }}>
                {fmt(personnelMonthlyCost)}/mes
              </span>
            </div>

            <div className={styles.heroMetaBox}>
              <span className={styles.heroMetaLabel}>Utilidad Neta / Mes</span>
              <span className={styles.heroMetaValue} style={{ color: '#34d399' }}>
                {fmt(netProfitMonthly)}/mes
              </span>
            </div>

            <div className={styles.heroMetaBox}>
              <span className={styles.heroMetaLabel}>Utilidad Neta / Día</span>
              <span className={styles.heroMetaValue} style={{ color: '#fbbf24' }}>
                {fmt(netProfitDaily)}/día
              </span>
            </div>

            <div className={styles.heroMetaBox}>
              <span className={styles.heroMetaLabel}>Utilidad Neta Total</span>
              <span className={styles.heroMetaValue}>
                {fmt(result.totalNetProfitPool)} ({result.summaryMetrics.effectiveTakeRates.teamNetProfitPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </section>

        {/* =========================================================
            BLOQUE 1: PERSONAL & STAFFING
            ========================================================= */}
        <section className={styles.costBlock}>
          <div className={styles.blockHeader} onClick={() => toggleBlock('personal')}>
            <div className={styles.blockTitleGroup}>
              <div className={styles.blockIcon}>👥</div>
              <div>
                <h3 className={styles.blockTitle}>Bloque 1: Personal y Equipo Técnico</h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {input.staffing.assignments.length} asignaciones · Sueldos y duración por rol
                </span>
              </div>
            </div>
            <div className={styles.blockSummary}>
              <span className={styles.blockTotal}>
                -{fmt(totalPersonnelCost)} ({fmt(personnelMonthlyCost)}/mes)
              </span>
              <span className={styles.blockToggleIcon}>{openBlocks.personal ? '▲' : '▼'}</span>
            </div>
          </div>

          {openBlocks.personal && (
            <div className={styles.blockBody}>
              <table className={styles.itemTable}>
                <thead>
                  <tr>
                    <th>Cargo / Función</th>
                    <th style={{ width: '70px' }}>Cant.</th>
                    <th style={{ width: '80px' }}>Meses</th>
                    <th style={{ width: '120px' }}>Sueldo ({currency})</th>
                    <th style={{ width: '90px' }}>Carga (%)</th>
                    <th style={{ width: '130px' }}>Subtotal</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {input.staffing.assignments.map((staff) => {
                    const baseCost = staff.quantity * staff.durationMonths * staff.monthlySalary;
                    const totalCost = baseCost * (1 + (staff.laborBurdenPct || 0) / 100);
                    return (
                      <tr key={staff.id}>
                        <td>
                          <input
                            type="text"
                            className={styles.tableInput}
                            value={staff.role}
                            onChange={(e) => handleUpdateStaff(staff.id, { role: e.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className={styles.tableInput}
                            value={staff.quantity}
                            onChange={(e) => handleUpdateStaff(staff.id, { quantity: parseInt(e.target.value) || 1 })}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <input
                              type="number"
                              className={styles.tableInput}
                              value={staff.durationMonths}
                              min="1"
                              max={durationMonths}
                              onChange={(e) =>
                                handleUpdateStaff(staff.id, {
                                  durationMonths: Math.max(1, parseInt(e.target.value) || 1),
                                })
                              }
                              style={{ width: '60px' }}
                            />
                            <span
                              style={{
                                fontSize: '0.72rem',
                                color: staff.durationMonths > durationMonths ? '#f87171' : '#94a3b8',
                                fontWeight: 600,
                              }}
                              title={`Tope de duración del contrato: ${durationMonths} meses`}
                            >
                              /{durationMonths}m
                            </span>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            className={styles.tableInput}
                            value={staff.monthlySalary}
                            onChange={(e) => handleUpdateStaff(staff.id, { monthlySalary: parseFloat(e.target.value) || 0 })}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className={styles.tableInput}
                            value={staff.laborBurdenPct}
                            placeholder="33.37"
                            onChange={(e) => handleUpdateStaff(staff.id, { laborBurdenPct: parseFloat(e.target.value) || 0 })}
                          />
                        </td>
                        <td style={{ fontWeight: 700, color: '#f8fafc' }}>{fmt(totalCost)}</td>
                        <td>
                          <button
                            type="button"
                            className={styles.delBtn}
                            onClick={() => handleDeleteStaff(staff.id)}
                            title="Eliminar cargo"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {input.staffing.assignments.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                        No hay personal asignado. Agrega un cargo o carga la plantilla GAD Potosí.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className={styles.addBtnRow}>
                <button type="button" className={styles.addRowBtn} onClick={handleAddStaff}>
                  + Agregar Cargo de Personal
                </button>
                <button
                  type="button"
                  style={{
                    background: 'rgba(99, 102, 241, 0.15)',
                    border: '1px solid #6366f1',
                    color: '#c7d2fe',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                  onClick={handleSyncStaffDuration}
                  title="Sincronizar la duración de todos los cargos con los meses del contrato"
                >
                  🔄 Sincronizar personal a {durationMonths} meses
                </button>
              </div>
            </div>
          )}
        </section>

        {/* =========================================================
            BLOQUE 2: GASTOS OPERATIVOS DIRECTOS
            ========================================================= */}
        <section className={styles.costBlock}>
          <div className={styles.blockHeader} onClick={() => toggleBlock('gastos')}>
            <div className={styles.blockTitleGroup}>
              <div className={styles.blockIcon} style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                📦
              </div>
              <div>
                <h3 className={styles.blockTitle}>Bloque 2: Gastos Operativos Directos</h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  {input.directCosts.items.length} partidas · Laboratorio, movilidad, hospedaje, consumibles
                </span>
              </div>
            </div>
            <div className={styles.blockSummary}>
              <span className={styles.blockTotal}>-{fmt(result.directCosts.total)}</span>
              <span className={styles.blockToggleIcon}>{openBlocks.gastos ? '▲' : '▼'}</span>
            </div>
          </div>

          {openBlocks.gastos && (
            <div className={styles.blockBody}>
              <table className={styles.itemTable}>
                <thead>
                  <tr>
                    <th>Concepto del Gasto</th>
                    <th style={{ width: '150px' }}>Categoría</th>
                    <th style={{ width: '110px' }}>¿Con Factura?</th>
                    <th style={{ width: '140px' }}>Monto ({currency})</th>
                    <th style={{ width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {input.directCosts.items.map((cost) => (
                    <tr key={cost.id}>
                      <td>
                        <input
                          type="text"
                          className={styles.tableInput}
                          value={cost.concept}
                          onChange={(e) => handleUpdateCost(cost.id, { concept: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          className={styles.tableInput}
                          value={cost.category || 'otros'}
                          onChange={(e) => handleUpdateCost(cost.id, { category: e.target.value as any })}
                        >
                          <option value="viaticos">Viáticos / Movilidad</option>
                          <option value="materiales">Materiales / Insumos</option>
                          <option value="subcontratos">Subcontratos / Lab</option>
                          <option value="tramites">Trámites / Notaría</option>
                          <option value="otros">Otros Gastos</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={cost.isTaxDeductible ?? true}
                          onChange={(e) => handleUpdateCost(cost.id, { isTaxDeductible: e.target.checked })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className={styles.tableInput}
                          value={cost.amount}
                          onChange={(e) => handleUpdateCost(cost.id, { amount: parseFloat(e.target.value) || 0 })}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.delBtn}
                          onClick={() => handleDeleteCost(cost.id)}
                          title="Eliminar gasto"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                  {input.directCosts.items.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                        No hay gastos operativos registrados. Agrega una partida o carga la plantilla GAD Potosí.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <div className={styles.addBtnRow}>
                <button type="button" className={styles.addRowBtn} onClick={handleAddCost}>
                  + Agregar Partida de Gasto
                </button>
              </div>
            </div>
          )}
        </section>

        {/* =========================================================
            BLOQUE 3: IMPUESTOS Y CARGAS FISCALES
            ========================================================= */}
        <section className={styles.costBlock}>
          <div className={styles.blockHeader} onClick={() => toggleBlock('impuestos')}>
            <div className={styles.blockTitleGroup}>
              <div className={styles.blockIcon} style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                🏛️
              </div>
              <div>
                <h3 className={styles.blockTitle}>Bloque 3: Impuestos y Retenciones de Pliego</h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  IVA/IT 16% · Previsión IUE 25% · Retención 5% normativa
                </span>
              </div>
            </div>
            <div className={styles.blockSummary}>
              <span className={styles.blockTotal}>
                -{fmt(result.taxes.taxAmount + result.iue.deductedFromProjectPool + result.statutoryDeduction.amount)}
              </span>
              <span className={styles.blockToggleIcon}>{openBlocks.impuestos ? '▲' : '▼'}</span>
            </div>
          </div>

          {openBlocks.impuestos && (
            <div className={styles.blockBody}>
              <div className={styles.fieldGrid}>
                {/* IVA / IT */}
                <div className={styles.fieldCard}>
                  <label className={styles.fieldLabel}>Factura Comercial (IVA 13% + IT 3%)</label>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>Monto nominal:</span>
                    <strong style={{ color: '#f87171' }}>{fmt(result.taxes.taxAmount)}</strong>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      Descargo de compras (Crédito Fiscal IVA): {input.taxScenario.taxCreditPct || 0}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={input.taxScenario.taxCreditPct || 0}
                      style={{ width: '100%', accentColor: '#3b82f6' }}
                      onChange={(e) =>
                        setInput((prev) => ({
                          ...prev,
                          taxScenario: { ...prev.taxScenario, taxCreditPct: parseInt(e.target.value) },
                        }))
                      }
                    />
                  </div>
                </div>

                {/* IUE 25% */}
                <div className={styles.fieldCard}>
                  <div className={styles.switchRow}>
                    <label className={styles.fieldLabel}>Previsión Anual IUE (25%)</label>
                    <input
                      type="checkbox"
                      checked={input.iueTax.enabled}
                      onChange={(e) =>
                        setInput((prev) => ({
                          ...prev,
                          iueTax: { ...prev.iueTax, enabled: e.target.checked },
                        }))
                      }
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>IUE estimado a pagar:</span>
                    <strong style={{ color: '#f87171' }}>-{fmt(result.iue.estimatedIueAmount)}</strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Calculado deduciendo gastos con factura y nómina laboral.
                  </span>
                </div>

                {/* Retención Normativa 5% */}
                <div className={styles.fieldCard}>
                  <label className={styles.fieldLabel}>
                    Retención de Pliego ({input.statutoryDeductions.retentionRatePct}%)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.88rem', color: '#cbd5e1' }}>Retenido en planilla:</span>
                    <strong style={{ color: '#fbbf24' }}>{fmt(result.statutoryDeduction.amount)}</strong>
                  </div>
                  <div className={styles.switchRow} style={{ marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {input.statutoryDeductions.isRecoverable ? 'Recuperable al cierre' : 'Fondo perdido'}
                    </span>
                    <button
                      type="button"
                      style={{
                        background: 'transparent',
                        border: '1px solid #475569',
                        color: '#93c5fd',
                        fontSize: '0.72rem',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      onClick={() =>
                        setInput((prev) => ({
                          ...prev,
                          statutoryDeductions: {
                            ...prev.statutoryDeductions,
                            isRecoverable: !prev.statutoryDeductions.isRecoverable,
                          },
                        }))
                      }
                    >
                      Cambiar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =========================================================
            BLOQUE 4: BOLETAS DE GARANTÍA
            ========================================================= */}
        <section className={styles.costBlock}>
          <div className={styles.blockHeader} onClick={() => toggleBlock('boletas')}>
            <div className={styles.blockTitleGroup}>
              <div className={styles.blockIcon} style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                📜
              </div>
              <div>
                <h3 className={styles.blockTitle}>Bloque 4: Gestión Financiera & Boletas Bancarias</h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Seriedad (1.5%) · Cumplimiento (7%) · Anticipo (20%)
                </span>
              </div>
            </div>
            <div className={styles.blockSummary}>
              <span className={styles.blockTotal}>-{fmt(result.guarantees.totalGuaranteesCost)}</span>
              <span className={styles.blockToggleIcon}>{openBlocks.boletas ? '▲' : '▼'}</span>
            </div>
          </div>

          {openBlocks.boletas && (
            <div className={styles.blockBody}>
              <div className={styles.fieldGrid}>
                {/* Seriedad */}
                <div className={styles.fieldCard}>
                  <div className={styles.switchRow}>
                    <label className={styles.fieldLabel}>Seriedad de Propuesta (1.5%)</label>
                    <input
                      type="checkbox"
                      checked={input.guarantees.hasBidBond}
                      onChange={(e) =>
                        setInput((prev) => ({
                          ...prev,
                          guarantees: { ...prev.guarantees, hasBidBond: e.target.checked },
                        }))
                      }
                    />
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                    Afianzado: {fmt(result.guarantees.bidBondAmountAfianzado)} | Costo póliza:{' '}
                    <strong>{fmt(result.guarantees.bidBondCost)}</strong>
                  </span>
                </div>

                {/* Cumplimiento */}
                <div className={styles.fieldCard}>
                  <div className={styles.switchRow}>
                    <label className={styles.fieldLabel}>Cumplimiento de Contrato (7%)</label>
                    <input
                      type="checkbox"
                      checked={input.guarantees.hasPerformanceBond}
                      onChange={(e) =>
                        setInput((prev) => ({
                          ...prev,
                          guarantees: { ...prev.guarantees, hasPerformanceBond: e.target.checked },
                        }))
                      }
                    />
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                    Afianzado: {fmt(result.guarantees.performanceBondAmountAfianzado)} | Costo póliza:{' '}
                    <strong>{fmt(result.guarantees.performanceBondCost)}</strong>
                  </span>
                </div>

                {/* Anticipo */}
                <div className={styles.fieldCard}>
                  <div className={styles.switchRow}>
                    <label className={styles.fieldLabel}>Buena Inversión de Anticipo (20%)</label>
                    <input
                      type="checkbox"
                      checked={input.guarantees.hasAdvanceBond}
                      onChange={(e) =>
                        setInput((prev) => ({
                          ...prev,
                          guarantees: { ...prev.guarantees, hasAdvanceBond: e.target.checked },
                        }))
                      }
                    />
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                    Afianzado: {fmt(result.guarantees.advanceBondAmountAfianzado)} | Costo póliza:{' '}
                    <strong>{fmt(result.guarantees.advanceBondCost)}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =========================================================
            BLOQUE 5: CONTINGENCIA & RESERVA
            ========================================================= */}
        <section className={styles.costBlock}>
          <div className={styles.blockHeader} onClick={() => toggleBlock('contingencia')}>
            <div className={styles.blockTitleGroup}>
              <div className={styles.blockIcon} style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                🛡️
              </div>
              <div>
                <h3 className={styles.blockTitle}>Bloque 5: Contingencia e Imprevistos</h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Fondo de reserva para retrasos, clima o eventualidades
                </span>
              </div>
            </div>
            <div className={styles.blockSummary}>
              <span className={styles.blockTotal}>
                -{fmt(result.distribution.contingencyFund.amount || 0)}
              </span>
              <span className={styles.blockToggleIcon}>{openBlocks.contingencia ? '▲' : '▼'}</span>
            </div>
          </div>

          {openBlocks.contingencia && (
            <div className={styles.blockBody}>
              <div style={{ maxWidth: '400px' }}>
                <label className={styles.fieldLabel}>Porcentaje de Contingencia sobre la ganancia:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={input.distribution.contingencyFundPct || 0}
                    style={{ flex: 1, accentColor: '#818cf8' }}
                    onChange={(e) =>
                      setInput((prev) => ({
                        ...prev,
                        distribution: {
                          ...prev.distribution,
                          contingencyFundPct: parseInt(e.target.value) || 0,
                        },
                      }))
                    }
                  />
                  <strong style={{ minWidth: '40px', color: '#818cf8' }}>
                    {input.distribution.contingencyFundPct || 0}%
                  </strong>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* =========================================================
          STICKY BOTTOM BAR
          ========================================================= */}
      <footer className={styles.stickyFooter}>
        <div className={styles.footerMetrics}>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Total Contrato ({durationMonths}m)</span>
            <span className={styles.metricVal}>{fmt(input.contractGrossAmount)}</span>
          </div>

          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Personal Mensual</span>
            <span className={styles.metricVal} style={{ color: '#38bdf8' }}>
              {fmt(personnelMonthlyCost)}/mes
            </span>
          </div>

          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Utilidad Neta Total</span>
            <span className={styles.metricValNet}>
              {fmt(result.totalNetProfitPool)}
            </span>
            <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 700 }}>
              {fmt(netProfitMonthly)}/mes · {fmt(netProfitDaily)}/día
            </span>
          </div>
        </div>

        <button type="button" className={styles.viewDetailBtn} onClick={onDownloadPdf}>
          <span>Ver Resultado y Dictamen PDF →</span>
        </button>
      </footer>
    </div>
  );
}
