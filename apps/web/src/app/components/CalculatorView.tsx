'use client';

import React, { useState, useMemo } from 'react';
import {
  calculateDeal,
  DealCalculationInput,
  DealNegotiationMode,
  DealPartner,
  DirectCostItem,
  StaffAssignment,
  TaxScenarioType,
} from '@calc/shared';
import { DealCharts } from './DealCharts';
import { generateDealPdf } from '../utils/pdfExport';
import { HomeView } from './HomeView';
import { LoginView } from './LoginView';
import { LicitacionesHubView } from './LicitacionesHubView';
import { SoloModeView } from './SoloModeView';
import { PrestanombreModeView } from './PrestanombreModeView';
import { ConsultoriaModeView } from './ConsultoriaModeView';
import styles from './Calculator.module.css';

type CurrencyType = 'Bs' | 'USD';
type TabKey = 'resumen' | 'negociacion' | 'costos' | 'reparto' | 'detalle';

// Presets de roles rápidos de personal para cuadrilla
const STAFF_PRESETS: Array<{
  role: string;
  monthlySalary: number;
  laborBurdenPct: number;
  isDirectSiteCost: boolean;
  hasFormalPayroll: boolean;
}> = [
  { role: 'Ing. Residente', monthlySalary: 8000, laborBurdenPct: 33.37, isDirectSiteCost: true, hasFormalPayroll: true },
  { role: 'Topógrafo', monthlySalary: 5000, laborBurdenPct: 0, isDirectSiteCost: true, hasFormalPayroll: true },
  { role: 'Cadista', monthlySalary: 3500, laborBurdenPct: 0, isDirectSiteCost: false, hasFormalPayroll: true },
  { role: 'Esp. Seguridad', monthlySalary: 5500, laborBurdenPct: 33.37, isDirectSiteCost: true, hasFormalPayroll: true },
  { role: 'Maestro Obra', monthlySalary: 4500, laborBurdenPct: 33.37, isDirectSiteCost: true, hasFormalPayroll: true },
  { role: 'Apoyo / Chofer', monthlySalary: 3000, laborBurdenPct: 0, isDirectSiteCost: true, hasFormalPayroll: false },
];

export function CalculatorView() {
  const [currency, setCurrency] = useState<CurrencyType>('Bs');
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Control de habilitación de impuestos (única regla normativa de base con opción de activación)
  const [taxEnabled, setTaxEnabled] = useState<boolean>(true);
  const [selectedTaxType, setSelectedTaxType] = useState<TaxScenarioType>('CON_FACTURA');
  const [customTaxRate, setCustomTaxRate] = useState<number>(16);
  const [taxCreditPct, setTaxCreditPct] = useState<number>(0);

  // Lista dinámica de socios (multi-socio personalizable)
  const [partners, setPartners] = useState<DealPartner[]>([
    { id: '1', name: 'Ingeniero Residente', role: 'Proyectista / Técnico', pct: 60 },
    { id: '2', name: 'Socio Gestor', role: 'Comercial / Contacto', pct: 40 },
  ]);

  // Estado limpio: Sin montos hardcodeados (contrato y gastos inician en 0)
  const [input, setInput] = useState<DealCalculationInput>({
    negotiationMode: 'FORMAL_LICITACION',
    contractGrossAmount: 0,
    taxScenario: {
      type: 'CON_FACTURA',
      taxCreditPct: 0,
    },
    iueTax: {
      enabled: true,
      ratePct: 25,
      payer: 'PROYECTO',
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
      isTaxDeductible: false,
    },
    titularCompany: {
      enabled: false,
      name: '',
      type: 'PERCENTAGE_GROSS',
      value: 0,
      absorbsTaxes: false,
      absorbsGuaranteesCost: false,
      absorbsAdminExpenses: false,
    },
    staffing: {
      assignments: [],
    },
    directCosts: {
      items: [],
    },
    distribution: {
      contingencyFundPct: 0,
    },
  });

  // Navegación de nivel superior (Home limpio blanco/crema vs Workspaces)
  const [currentView, setCurrentView] = useState<
    'home' | 'login' | 'licitaciones_hub' | 'licitacion_solo' | 'licitacion_prestanombre' | 'licitacion_consultoria' | 'inversion'
  >('home');
  // Submodos de Licitaciones: Solo | Con Prestanombre | Consultoría Menor
  const [licitacionSubMode, setLicitacionSubMode] = useState<'solo' | 'prestanombre' | 'consultoria'>('solo');

  const [targetDesiredProfit, setTargetDesiredProfit] = useState<number>(0);

  // Duración del contrato (para métricas por día/mes, especialmente en modo Independiente)
  const [contractDurationValue, setContractDurationValue] = useState<number>(1);
  const [contractDurationUnit, setContractDurationUnit] = useState<'days' | 'weeks' | 'months'>('months');

  // Estado especializado para Negociación Cooperativa / Inversión (Enfoque centrado en capital del inversionista)
  const [coopInvestorCapital, setCoopInvestorCapital] = useState<number>(0);
  const [coopDurationMonths, setCoopDurationMonths] = useState<number>(18);
  const [coopInvestorSharePct, setCoopInvestorSharePct] = useState<number>(70);
  const [coopOperatingCosts, setCoopOperatingCosts] = useState<number>(0);
  const [coopCanonPct, setCoopCanonPct] = useState<number>(5);
  const [coopTargetRoiPct, setCoopTargetRoiPct] = useState<number>(40);
  const [coopMinCoopIncome, setCoopMinCoopIncome] = useState<number>(0);
  const [coopProjectedRevenue, setCoopProjectedRevenue] = useState<number>(0);

  // Notificación tipo toast temporal
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLicitacionSubModeChange = (subMode: 'solo' | 'prestanombre' | 'consultoria') => {
    setLicitacionSubMode(subMode);
    if (subMode === 'solo') {
      setTaxEnabled(true);
      setSelectedTaxType('CON_FACTURA');
      setInput((prev) => ({
        ...prev,
        negotiationMode: 'FORMAL_LICITACION',
        iueTax: { ...prev.iueTax, enabled: true, payer: 'PROYECTO' },
        guarantees: {
          ...prev.guarantees,
          hasBidBond: true,
          hasPerformanceBond: true,
        },
        statutoryDeductions: {
          retentionRatePct: 7,
          isRecoverable: true,
        },
        titularCompany: {
          ...prev.titularCompany,
          enabled: false,
          value: 0,
        },
      }));
    } else if (subMode === 'prestanombre') {
      setTaxEnabled(true);
      setSelectedTaxType('CON_FACTURA');
      setInput((prev) => ({
        ...prev,
        negotiationMode: 'SOCIOS_INTERNO',
        iueTax: { ...prev.iueTax, enabled: true, payer: 'EMPRESA_TITULAR' },
        guarantees: {
          ...prev.guarantees,
          hasBidBond: true,
          hasPerformanceBond: true,
        },
        statutoryDeductions: {
          retentionRatePct: 5,
          isRecoverable: true,
        },
        titularCompany: {
          ...prev.titularCompany,
          enabled: true,
          type: 'PERCENTAGE_GROSS',
          value: prev.titularCompany.value || 8,
          absorbsTaxes: true,
          absorbsGuaranteesCost: true,
        },
      }));
    } else if (subMode === 'consultoria') {
      setTaxEnabled(false);
      setSelectedTaxType('SIN_FACTURA');
      setInput((prev) => ({
        ...prev,
        negotiationMode: 'SIMPLIFICADO',
        iueTax: { ...prev.iueTax, enabled: false, payer: 'EXENTO' },
        guarantees: {
          ...prev.guarantees,
          hasBidBond: false,
          hasPerformanceBond: false,
          hasAdvanceBond: false,
        },
        statutoryDeductions: {
          retentionRatePct: 0,
          isRecoverable: true,
        },
        titularCompany: {
          ...prev.titularCompany,
          enabled: false,
          value: 0,
        },
      }));
    }
  };

  // Cambio de modo de negociación con ajuste de preconfiguraciones
  const handleModeChange = (mode: DealNegotiationMode) => {
    if (mode === 'FORMAL_LICITACION') {
      setTaxEnabled(true);
      setSelectedTaxType('CON_FACTURA');
      setInput((prev) => ({
        ...prev,
        negotiationMode: mode,
        iueTax: { ...prev.iueTax, enabled: true, payer: 'PROYECTO' },
        guarantees: {
          ...prev.guarantees,
          hasBidBond: true,
          hasPerformanceBond: true,
        },
        statutoryDeductions: {
          retentionRatePct: 7,
          isRecoverable: true,
        },
      }));
    } else if (mode === 'SOCIOS_INTERNO' || mode === 'SIMPLIFICADO') {
      setTaxEnabled(false);
      setSelectedTaxType('SIN_FACTURA');
      setInput((prev) => ({
        ...prev,
        negotiationMode: 'SOCIOS_INTERNO',
        iueTax: { ...prev.iueTax, enabled: false, payer: 'EXENTO' },
        guarantees: {
          ...prev.guarantees,
          hasBidBond: false,
          hasPerformanceBond: false,
          hasAdvanceBond: false,
        },
        statutoryDeductions: {
          retentionRatePct: 0,
          isRecoverable: true,
        },
      }));
    } else if (mode === 'COOPERATIVA_INVERSION') {
      setTaxEnabled(false);
      setSelectedTaxType('SIN_FACTURA');
      setInput((prev) => ({
        ...prev,
        negotiationMode: mode,
        iueTax: { ...prev.iueTax, enabled: false, payer: 'EXENTO' },
        guarantees: {
          ...prev.guarantees,
          hasBidBond: false,
          hasPerformanceBond: false,
          hasAdvanceBond: false,
        },
        statutoryDeductions: {
          retentionRatePct: coopCanonPct,
          isRecoverable: false, // Canon / aporte comunal
        },
      }));
    }
  };

  // Input computado reactivamente con los toggles fiscales y la lista de socios
  const activeInput: DealCalculationInput = useMemo(() => {
    const isCoop = input.negotiationMode === 'COOPERATIVA_INVERSION';
    const effectiveGross = isCoop
      ? (coopProjectedRevenue > 0 ? coopProjectedRevenue : input.contractGrossAmount)
      : input.contractGrossAmount;

    return {
      ...input,
      contractGrossAmount: effectiveGross,
      taxScenario: {
        type: taxEnabled ? selectedTaxType : 'SIN_FACTURA',
        customRatePct: customTaxRate,
        taxCreditPct: taxEnabled && selectedTaxType === 'CON_FACTURA' ? taxCreditPct : 0,
      },
      distribution: {
        ...input.distribution,
        partners: isCoop
          ? [
              { id: 'partner-inv', name: 'Inversionista (Capital)', role: 'Financista', pct: coopInvestorSharePct },
              { id: 'partner-coop', name: 'Cooperativa (Área & Mano de Obra)', role: 'Comunidad / Socios', pct: Math.max(0, 100 - coopInvestorSharePct) },
            ]
          : partners,
      },
      cooperativeInvestment: isCoop
        ? {
            investorCapital: coopInvestorCapital,
            durationMonths: coopDurationMonths,
            investorSharePct: coopInvestorSharePct,
            cooperativeSharePct: Math.max(0, 100 - coopInvestorSharePct),
            operatingCostsEstimated: coopOperatingCosts,
            canonComunalPct: coopCanonPct,
            targetInvestorRoiPct: coopTargetRoiPct,
            minCooperativeIncome: coopMinCoopIncome,
            projectedGrossRevenue: coopProjectedRevenue > 0 ? coopProjectedRevenue : input.contractGrossAmount,
          }
        : undefined,
    };
  }, [
    input,
    taxEnabled,
    selectedTaxType,
    customTaxRate,
    taxCreditPct,
    partners,
    coopInvestorCapital,
    coopDurationMonths,
    coopInvestorSharePct,
    coopOperatingCosts,
    coopCanonPct,
    coopTargetRoiPct,
    coopMinCoopIncome,
    coopProjectedRevenue,
  ]);

  // Motor financiero puro con precisión decimal.js
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

  // Duración en días equivalentes
  const durationInDays = useMemo(() => {
    const v = Math.max(1, contractDurationValue || 1);
    if (contractDurationUnit === 'days') return v;
    if (contractDurationUnit === 'weeks') return v * 7;
    return v * 30; // months approx
  }, [contractDurationValue, contractDurationUnit]);

  const durationInMonths = useMemo(() => {
    return durationInDays / 30;
  }, [durationInDays]);

  const netPerDay = useMemo(() => {
    return durationInDays > 0 ? result.totalNetProfitPool / durationInDays : 0;
  }, [result.totalNetProfitPool, durationInDays]);

  const netPerMonth = useMemo(() => {
    return durationInMonths > 0 ? result.totalNetProfitPool / durationInMonths : 0;
  }, [result.totalNetProfitPool, durationInMonths]);

  // Manejo de Socios Dinámicos
  const addPartner = (roleName?: string) => {
    const newPartner: DealPartner = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      name: `Socio ${partners.length + 1}`,
      role: roleName || 'Participante',
      pct: 0,
    };
    setPartners([...partners, newPartner]);
  };

  const updatePartner = (id: string, updates: Partial<DealPartner>) => {
    setPartners(partners.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deletePartner = (id: string) => {
    if (partners.length <= 1) return;
    setPartners(partners.filter((p) => p.id !== id));
  };

  const splitPartnersEqually = () => {
    if (partners.length === 0) return;
    const rem = Math.max(0, 100 - (input.distribution.contingencyFundPct || 0));
    const equalPct = Math.floor(rem / partners.length);
    const remainder = rem - equalPct * partners.length;
    setPartners(
      partners.map((p, idx) => ({
        ...p,
        pct: idx === 0 ? equalPct + remainder : equalPct,
      }))
    );
  };

  const totalPartnerPct = useMemo(() => {
    return (
      partners.reduce((sum, p) => sum + (Number(p.pct) || 0), 0) +
      (Number(input.distribution.contingencyFundPct) || 0)
    );
  }, [partners, input.distribution.contingencyFundPct]);

  // Manejo de Staffing / Personal
  const addStaffRole = (preset?: (typeof STAFF_PRESETS)[0]) => {
    const newStaff: StaffAssignment = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      role: preset?.role || '',
      quantity: 1,
      durationMonths: 1,
      monthlySalary: preset?.monthlySalary || 0,
      laborBurdenPct: preset?.laborBurdenPct ?? 0,
      isDirectSiteCost: preset?.isDirectSiteCost ?? true,
      hasFormalPayroll: preset?.hasFormalPayroll ?? true,
    };

    setInput((prev) => ({
      ...prev,
      staffing: {
        assignments: [...prev.staffing.assignments, newStaff],
      },
    }));
  };

  const updateStaff = (id: string, updates: Partial<StaffAssignment>) => {
    setInput((prev) => ({
      ...prev,
      staffing: {
        assignments: prev.staffing.assignments.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      },
    }));
  };

  const deleteStaff = (id: string) => {
    setInput((prev) => ({
      ...prev,
      staffing: {
        assignments: prev.staffing.assignments.filter((item) => item.id !== id),
      },
    }));
  };

  // Manejo de costos directos
  const addExpense = () => {
    const newItem: DirectCostItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 6),
      concept: '',
      amount: 0,
      isTaxDeductible: true,
      category: 'otros',
    };
    setInput((prev) => ({
      ...prev,
      directCosts: {
        items: [...prev.directCosts.items, newItem],
      },
    }));
  };

  const updateExpense = (id: string, updates: Partial<DirectCostItem>) => {
    setInput((prev) => ({
      ...prev,
      directCosts: {
        items: prev.directCosts.items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      },
    }));
  };

  const deleteExpense = (id: string) => {
    setInput((prev) => ({
      ...prev,
      directCosts: {
        items: prev.directCosts.items.filter((item) => item.id !== id),
      },
    }));
  };

  // Estimación inversa (Meta financiera)
  const requiredGross = useMemo(() => {
    if (targetDesiredProfit <= 0) return 0;
    const pmMargin = result.distribution.projectManager.effectiveMarginOnGross;
    if (pmMargin <= 0) return 0;
    return targetDesiredProfit / (pmMargin / 100);
  }, [targetDesiredProfit, result.distribution.projectManager.effectiveMarginOnGross]);

  const hasContractAmount = (input.contractGrossAmount || 0) > 0;

  // Descarga del Dictamen PDF
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await generateDealPdf(activeInput, result, currency);
      showToast('✓ Dictamen PDF generado con éxito');
    } catch (err) {
      console.error('Error generando PDF:', err);
      showToast('Error generando PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Copiar resumen de negociación al portapapeles para WhatsApp
  const handleCopySummary = () => {
    const lines = [
      `💼 *RESUMEN DE NEGOCIACIÓN PRE-FIRMA*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📌 *Modo:* ${input.negotiationMode}`,
      `💰 *Monto Contrato:* ${fmtPrecise(result.contractGrossAmount)}`,
      ``,
      `📉 *DEDUCCIONES Y PEAJES:*`,
      `• Impuestos (IVA/IT): -${fmtPrecise(result.taxes.taxAmount)} (${result.taxes.effectiveRatePct}%)`,
      result.iue.enabled ? `• IUE (25% ${result.iue.payer}): -${fmtPrecise(result.iue.deductedFromProjectPool)}` : null,
      result.guarantees.totalGuaranteesCost > 0 ? `• Boletas / Pólizas: -${fmtPrecise(result.guarantees.totalGuaranteesCost)}` : null,
      result.commission.amount > 0 ? `• Diezmo / Comisión: -${fmtPrecise(result.commission.amount)} (${result.commission.effectivePctOfGross}%)` : null,
      result.titularCompany.enabled ? `• Fee Empresa Titular: -${fmtPrecise(result.titularCompany.amount)} (${result.titularCompany.effectivePctOfGross}%)` : null,
      result.staffing.totalPersonnelCost > 0 ? `• Personal / Staffing: -${fmtPrecise(result.staffing.totalPersonnelCost)}` : null,
      result.directCosts.total > 0 ? `• Gastos Directos: -${fmtPrecise(result.directCosts.total)}` : null,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🏆 *UTILIDAD TOTAL EQUIPO:* ${fmtPrecise(result.totalNetProfitPool)} (${result.summaryMetrics.effectiveTakeRates.teamNetProfitPct}%)`,
      `💧 *Líquido Inmediato:* ${fmtPrecise(result.immediateDistributablePool)}`,
      result.deferredRetentionPool > 0 ? `⏳ *Retención al Cierre:* ${fmtPrecise(result.deferredRetentionPool)}` : null,
      ``,
      `⚖️ *REPARTO ENTRE SOCIOS:*`,
      ...result.distribution.partners.map(
        (p) => `• *${p.name} (${p.pct}%):* ${fmtPrecise(p.totalAmount)} (Líquido: ${fmtPrecise(p.immediateAmount)} | Cierre: ${fmtPrecise(p.deferredAmount)})`
      ),
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Generado con *Calc Deals Desk* (Bolivia)`,
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(lines);
    showToast('✓ Resumen copiado para WhatsApp');
  };

  // Navegación paso a paso en el footer flotante
  const tabSequence: TabKey[] = ['resumen', 'negociacion', 'costos', 'reparto', 'detalle'];
  const handleNextTab = () => {
    const currentIndex = tabSequence.indexOf(activeTab);
    const nextIndex = (currentIndex + 1) % tabSequence.length;
    setActiveTab(tabSequence[nextIndex]);
  };

  // 0. Página de Login (Local + OIDC)
  if (currentView === 'login') {
    return (
      <LoginView
        onBackToHome={() => setCurrentView('home')}
        onSuccess={() => setCurrentView('home')}
      />
    );
  }

  // 1. Home Principal (Blanco / Crema Ejecutivo)
  if (currentView === 'home') {
    return (
      <HomeView
        onSelectLicitaciones={() => {
          setCurrentView('licitaciones_hub');
        }}
        onSelectInversion={() => {
          setCurrentView('inversion');
          handleModeChange('COOPERATIVA_INVERSION');
        }}
        onSelectSoloWithPreset={() => {
          handleLicitacionSubModeChange('solo');
          setCurrentView('licitacion_solo');
        }}
        onSelectConsultoriaWithPreset={() => {
          handleLicitacionSubModeChange('consultoria');
          setCurrentView('licitacion_consultoria');
        }}
        onNavigateLogin={() => {
          setCurrentView('login');
        }}
      />
    );
  }

  // 2. Sub-hub selector de Licitaciones / Contratos
  if (currentView === 'licitaciones_hub') {
    return (
      <LicitacionesHubView
        onBackToHome={() => setCurrentView('home')}
        onSelectSolo={() => {
          handleLicitacionSubModeChange('solo');
          setCurrentView('licitacion_solo');
        }}
        onSelectPrestanombre={() => {
          handleLicitacionSubModeChange('prestanombre');
          setCurrentView('licitacion_prestanombre');
        }}
        onSelectConsultoria={() => {
          handleLicitacionSubModeChange('consultoria');
          setCurrentView('licitacion_consultoria');
        }}
        currency={currency}
        onCurrencyChange={setCurrency}
      />
    );
  }

  // 3. Modo Solo (Estimación de Costos por Bloques - GAD Potosí)
  if (currentView === 'licitacion_solo') {
    return (
      <SoloModeView
        input={activeInput}
        setInput={setInput}
        result={result}
        currency={currency}
        fmt={fmt}
        onBackToHub={() => setCurrentView('licitaciones_hub')}
        onDownloadPdf={handleDownloadPdf}
        onCopySummary={handleCopySummary}
        isGeneratingPdf={isGeneratingPdf}
      />
    );
  }

  // 4. Modo Con Prestanombre (Trato A-B y Negociación de Fee)
  if (currentView === 'licitacion_prestanombre') {
    return (
      <PrestanombreModeView
        input={activeInput}
        setInput={setInput}
        result={result}
        currency={currency}
        fmt={fmt}
        onBackToHub={() => setCurrentView('licitaciones_hub')}
        onDownloadPdf={handleDownloadPdf}
        onCopySummary={handleCopySummary}
        isGeneratingPdf={isGeneratingPdf}
      />
    );
  }

  // 5. Modo Consultoría Menor (Individual - Neto Personal y por Día/Mes)
  if (currentView === 'licitacion_consultoria') {
    return (
      <ConsultoriaModeView
        input={activeInput}
        setInput={setInput}
        result={result}
        currency={currency}
        fmt={fmt}
        onBackToHub={() => setCurrentView('licitaciones_hub')}
        onDownloadPdf={handleDownloadPdf}
        onCopySummary={handleCopySummary}
        isGeneratingPdf={isGeneratingPdf}
      />
    );
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.shell}>
        {/* =========================================================
            TOP COCKPIT / DEAL HUD
            ========================================================= */}
        <header className={styles.cockpitHeader}>
          <div className={styles.brandRow}>
            <div className={styles.brandInfo}>
              <button
                type="button"
                className={styles.backHomeBtn}
                onClick={() => setCurrentView('home')}
                title="Volver al menú principal"
              >
                ← Inicio
              </button>
              <span className={styles.brandBadge}>INVERSIÓN</span>
              <div>
                <h1 className={styles.brandTitle}>Inversión / Extra</h1>
                <p className={styles.brandSubtitle}>
                  Cooperativa, inversionista y comunarios. Negocia en base al capital invertido y reparte utilidades.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {toastMessage && <div className={styles.toastPill}>{toastMessage}</div>}
              <button
                type="button"
                className={styles.pdfBtn}
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                title="Generar dictamen ejecutivo pre-firma en PDF"
              >
                <span>{isGeneratingPdf ? '⏳ Generando...' : '📄 Dictamen PDF'}</span>
              </button>
              <button type="button" className={styles.exportBtn} onClick={handleCopySummary} title="Copiar resumen para WhatsApp">
                <span>📋 WhatsApp</span>
              </button>
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
          </div>

          {/* BARRA FIJA DE 5 PESTAÑAS (NAV TABS: RESUMEN, NEGOCIACIÓN, COSTOS, REPARTO, DETALLE) */}
          <nav className={styles.navTabContainer} aria-label="Navegación principal">
            <button
              type="button"
              className={`${styles.navTabBtn} ${activeTab === 'resumen' ? styles.navTabBtnActive : ''}`}
              onClick={() => setActiveTab('resumen')}
            >
              <span>📊 Resumen</span>
            </button>
            <button
              type="button"
              className={`${styles.navTabBtn} ${activeTab === 'negociacion' ? styles.navTabBtnActive : ''}`}
              onClick={() => setActiveTab('negociacion')}
            >
              <span>🎛️ Negociación</span>
            </button>
            <button
              type="button"
              className={`${styles.navTabBtn} ${activeTab === 'costos' ? styles.navTabBtnActive : ''}`}
              onClick={() => setActiveTab('costos')}
            >
              <span>👥 Costos ({result.staffing.assignmentsCount + result.directCosts.items.length})</span>
            </button>
            <button
              type="button"
              className={`${styles.navTabBtn} ${activeTab === 'reparto' ? styles.navTabBtnActive : ''}`}
              onClick={() => setActiveTab('reparto')}
            >
              <span>⚖️ Reparto ({partners.length} socios)</span>
            </button>
            <button
              type="button"
              className={`${styles.navTabBtn} ${activeTab === 'detalle' ? styles.navTabBtnActive : ''}`}
              onClick={() => setActiveTab('detalle')}
            >
              <span>🧾 Detalle</span>
            </button>
          </nav>
        </header>

        {/* =========================================================
            THE 4 HERO NUMBERS (SIEMPRE VISIBLES COMO HUD EJECUTIVO)
            ========================================================= */}
        {input.negotiationMode === 'COOPERATIVA_INVERSION' && result.cooperativeInvestment ? (
          <section className={styles.metricsGrid}>
            {/* Card 1: Inversionista Retorno & ROI */}
            <div className={styles.heroMetricCard}>
              <div className={styles.metricEyebrow}>
                <span>Inversionista (Retorno Bruto)</span>
                <span
                  className={
                    result.cooperativeInvestment.investorStatus === 'VERDE'
                      ? styles.statusPillGreen
                      : result.cooperativeInvestment.investorStatus === 'AMARILLO'
                      ? styles.statusPillYellow
                      : styles.statusPillRed
                  }
                >
                  {result.cooperativeInvestment.investorRoiPct > 0 ? '+' : ''}
                  {result.cooperativeInvestment.investorRoiPct}% ROI
                </span>
              </div>
              <div className={styles.heroValue}>
                {fmt(result.cooperativeInvestment.investorPayout)}
              </div>
              <div className={styles.metricSubtext}>
                <span>
                  Capital: <strong>{fmt(result.cooperativeInvestment.investorCapital)}</strong> | Ganancia Neta:{' '}
                  <strong style={{ color: result.cooperativeInvestment.investorNetProfit >= 0 ? '#34d399' : '#f43f5e' }}>
                    {fmt(result.cooperativeInvestment.investorNetProfit)}
                  </strong>
                </span>
              </div>
            </div>

            {/* Card 2: Cooperativa Excedente & Mes */}
            <div className={styles.metricCard}>
              <div className={styles.metricEyebrow}>
                <span>Cooperativa ({result.cooperativeInvestment.cooperativeSharePct}%)</span>
                <span style={{ color: '#34d399' }}>
                  ● {fmt(result.cooperativeInvestment.cooperativeMonthlyIncome)}/mes
                </span>
              </div>
              <div className={styles.metricValue} style={{ color: '#38bdf8' }}>
                {fmt(result.cooperativeInvestment.cooperativePayout)}
              </div>
              <div className={styles.metricSubtext}>
                Mínimo esperado: {fmt(result.cooperativeInvestment.minCooperativeIncome || 0)}
              </div>
            </div>

            {/* Card 3: Payback Recuperación */}
            <div className={styles.metricCard}>
              <div className={styles.metricEyebrow}>
                <span>Plazo: {result.cooperativeInvestment.durationMonths} meses</span>
                <span
                  className={
                    result.cooperativeInvestment.investorPaybackMonths <= result.cooperativeInvestment.durationMonths
                      ? styles.warningPill
                      : styles.dangerPill
                  }
                >
                  {result.cooperativeInvestment.investorPaybackMonths <= result.cooperativeInvestment.durationMonths
                    ? 'En Plazo'
                    : 'Fuera de Plazo'}
                </span>
              </div>
              <div className={styles.metricValue} style={{ color: '#fbbf24' }}>
                {result.cooperativeInvestment.investorPaybackMonths > 120
                  ? 'No recupera'
                  : `${result.cooperativeInvestment.investorPaybackMonths.toFixed(1)} meses`}
              </div>
              <div className={styles.metricSubtext}>
                Payback recuperación de capital ({fmt(result.cooperativeInvestment.investorCapital)})
              </div>
            </div>

            {/* Card 4: Semáforo de la Mesa */}
            <div className={styles.metricCard}>
              <div className={styles.metricEyebrow}>
                <span>Viabilidad de la Mesa</span>
                <span
                  className={
                    result.cooperativeInvestment.overallDealStatus === 'VERDE'
                      ? styles.statusPillGreen
                      : result.cooperativeInvestment.overallDealStatus === 'AMARILLO'
                      ? styles.statusPillYellow
                      : styles.statusPillRed
                  }
                >
                  {result.cooperativeInvestment.overallDealStatus}
                </span>
              </div>
              <div
                className={styles.metricValue}
                style={{
                  color:
                    result.cooperativeInvestment.overallDealStatus === 'VERDE'
                      ? '#34d399'
                      : result.cooperativeInvestment.overallDealStatus === 'AMARILLO'
                      ? '#fbbf24'
                      : '#f43f5e',
                  fontSize: '1.25rem',
                }}
              >
                {result.cooperativeInvestment.overallDealStatus === 'VERDE'
                  ? '🟢 ZONA VERDE'
                  : result.cooperativeInvestment.overallDealStatus === 'AMARILLO'
                  ? '🟡 ZONA AMARILLA'
                  : '🔴 ZONA ROJA'}
              </div>
              <div className={styles.metricSubtext}>
                {result.cooperativeInvestment.overallDealStatus === 'VERDE'
                  ? 'Acuerdo viable y rentable para ambos'
                  : result.cooperativeInvestment.overallDealStatus === 'AMARILLO'
                  ? 'Negociación tensa: ajustar % o plazo'
                  : 'Inviable con números actuales'}
              </div>
            </div>
          </section>
        ) : licitacionSubMode === 'prestanombre' ? (
          <section className={styles.metricsGrid}>
            {/* Card 1: Titular Company (Legal / Facturación) */}
            <div className={styles.heroMetricCard} style={{ borderColor: '#6366f1' }}>
              <div className={styles.metricEyebrow}>
                <span>🏢 Titular (NIT / Legal)</span>
                <span className={styles.highlightPill}>
                  {result.titularCompany.effectivePctOfGross}% del contrato
                </span>
              </div>
              <div className={styles.heroValue} style={{ color: '#818cf8' }}>
                {fmt(result.titularCompany.amount)}
              </div>
              <div className={styles.metricSubtext}>
                <span>
                  {result.titularCompany.name || 'Empresa Prestanombre'} | Asume: {result.titularCompany.absorbsTaxes ? 'Impuestos + ' : ''}Boletas + Retención 5%
                </span>
              </div>
            </div>

            {/* Card 2: Ejecutor (Equipo Técnico) */}
            <div className={styles.heroMetricCard} style={{ borderColor: '#10b981' }}>
              <div className={styles.metricEyebrow}>
                <span>👷 Ejecutor (Equipo Real)</span>
                <span className={styles.statusPillGreen}>
                  {(result.titularCompany.varianceAnalysis.ifTitularAbsorbsTaxes.effectiveMargin || 0).toFixed(1)}% margen
                </span>
              </div>
              <div className={styles.heroValue} style={{ color: '#34d399' }}>
                {fmt(result.titularCompany.varianceAnalysis.ifTitularAbsorbsTaxes.teamNetGain || result.totalNetProfitPool)}
              </div>
              <div className={styles.metricSubtext}>
                <span>
                  Ganancia neta limpia tras cubrir personal, compras, diezmo y gastos de obra
                </span>
              </div>
            </div>

            {/* Card 3: Varianza Fiscal A vs B */}
            <div className={styles.metricCard}>
              <div className={styles.metricEyebrow}>
                <span>Varianza Fiscal A vs B</span>
                <span className={styles.warningPill}>Impacto Tributario</span>
              </div>
              <div className={styles.metricValue} style={{ color: '#fbbf24' }}>
                +{fmt(result.titularCompany.varianceAnalysis.taxBurdenDifference)}
              </div>
              <div className={styles.metricSubtext}>
                Ahorro neto para el ejecutor si Titular absorbe impuestos y crédito fiscal en su balance
              </div>
            </div>

            {/* Card 4: Total Contrato Bruto */}
            <div className={styles.metricCard}>
              <div className={styles.metricEyebrow}>
                <span>Contrato Total Bruto</span>
                <span style={{ color: '#94a3b8' }}>Base 100%</span>
              </div>
              <div className={styles.metricValue} style={{ color: '#f8fafc' }}>
                {fmt(input.contractGrossAmount)}
              </div>
              <div className={styles.metricSubtext}>
                Facturación total adjudicada al NIT titular
              </div>
            </div>
          </section>
        ) : licitacionSubMode === 'consultoria' ? (
          <section className={styles.metricsGrid}>
            {/* Card 1: Te quedan X limpios */}
            <div className={styles.heroMetricCard} style={{ borderColor: '#0ea5e9' }}>
              <div className={styles.metricEyebrow}>
                <span>💰 Te quedan limpios en mano</span>
                <span className={styles.statusPillGreen}>Sin IUE Empresarial</span>
              </div>
              <div className={styles.heroValue} style={{ color: '#38bdf8' }}>
                {fmt(result.totalNetProfitPool)}
              </div>
              <div className={styles.metricSubtext}>
                <span>
                  Plazo total: <strong>{contractDurationValue} {contractDurationUnit}</strong> (~{Math.round(durationInDays)} días)
                </span>
              </div>
            </div>

            {/* Card 2: Neto por Mes */}
            <div className={styles.metricCard}>
              <div className={styles.metricEyebrow}>
                <span>Honorario Neto Mensual</span>
                <span style={{ color: '#34d399' }}>● Promedio</span>
              </div>
              <div className={styles.metricValue} style={{ color: '#34d399' }}>
                {fmt(netPerMonth)}/mes
              </div>
              <div className={styles.metricSubtext}>
                Equivalente mensual neto tras impuestos
              </div>
            </div>

            {/* Card 3: Neto por Día */}
            <div className={styles.metricCard}>
              <div className={styles.metricEyebrow}>
                <span>Honorario Neto por Día</span>
                <span style={{ color: '#fbbf24' }}>● Jornada</span>
              </div>
              <div className={styles.metricValue} style={{ color: '#fbbf24' }}>
                {fmt(netPerDay)}/día
              </div>
              <div className={styles.metricSubtext}>
                Calculado sobre 22 días hábiles de trabajo al mes
              </div>
            </div>

            {/* Card 4: Retenciones & Gastos */}
            <div className={styles.metricCard}>
              <div className={styles.metricEyebrow}>
                <span>Deducciones & Retención</span>
                <span className={styles.dangerPill}>
                  -{(100 - result.summaryMetrics.effectiveTakeRates.teamNetProfitPct).toFixed(1)}%
                </span>
              </div>
              <div className={styles.metricValue} style={{ color: '#f43f5e' }}>
                -{fmt(result.taxes.taxAmount + result.directCosts.total)}
              </div>
              <div className={styles.metricSubtext}>
                Retención tributaria ({input.taxScenario.type === 'RETENCION_LEY' ? '15.5%' : 'IVA/IT'}) + Gastos directos
              </div>
            </div>
          </section>
        ) : (
          <section className={styles.metricsGrid}>
            {/* Modo Solo: Una tarjeta principal destacada de ganancia neta */}
            <div className={styles.heroMetricCard}>
              <div className={styles.metricEyebrow}>
                <span>{partners[0]?.name || 'Ganancia Neta Limpia (1 Actor)'}</span>
                {hasContractAmount && (
                  <span className={styles.highlightPill}>
                    {result.summaryMetrics.effectiveTakeRates.teamNetProfitPct.toFixed(1)}% margen neto
                  </span>
                )}
              </div>
              <div className={styles.heroValue}>
                {hasContractAmount ? fmt(result.totalNetProfitPool) : `0 ${currency}`}
              </div>
              <div className={styles.metricSubtext}>
                {hasContractAmount ? (
                  <span>
                    Líquido: <strong>{fmt(result.immediateDistributablePool)}</strong>
                    {result.deferredRetentionPool > 0 && (
                      <span style={{ color: '#fbbf24' }}>
                        {' '}
                        | Cierre: {fmt(result.deferredRetentionPool)}
                      </span>
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
                Flujo disponible durante la ejecución de la obra
              </div>
            </div>

            {/* Fondo Retenido / Boletas (Diferido) */}
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
                  ? 'Cobro en Recepción Definitiva de obra'
                  : 'Aporte normativo no devuelto'}
              </div>
            </div>

            {/* Peajes & Cargas Totales */}
            <div className={styles.metricCard}>
              <div className={styles.metricEyebrow}>
                <span>Costos & Peajes Totales</span>
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
                Impuestos + IUE + Boletas + Diezmo + Personal + Obra
              </div>
            </div>
          </section>
        )}

        {/* =========================================================
            CONTENIDO DINÁMICO DE LAS 5 PESTAÑAS
            ========================================================= */}
        <main>
          {/* =========================================================
              TAB 1: 📊 RESUMEN (PANORAMA EJECUTIVO & GRÁFICAS ECHARTS)
              ========================================================= */}
          {activeTab === 'resumen' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* BANNER CONTEXTUAL SEGÚN ESCENARIO */}
              {(input.negotiationMode === 'SOCIOS_INTERNO' || input.negotiationMode === 'SIMPLIFICADO') && (
                <div style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
                  <strong style={{ color: '#60a5fa' }}>👤 Consultor Independiente & Prestanombre</strong>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                    {input.titularCompany?.enabled
                      ? 'Trato A-B con Prestanombre activo: Verifica si el acuerdo es justo tras impuestos, boletas y fee de la titular.'
                      : 'Consultor Independiente directo: Sin intermediarios ni prestanombre. Revisa tu ganancia neta limpia y el neto por día según la duración pactada.'}
                  </p>
                </div>
              )}
              {input.negotiationMode === 'FORMAL_LICITACION' && (
                <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
                  <strong style={{ color: '#34d399' }}>🏛️ Empresa / Licitación</strong>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Licitación formal corporativa o estatal (SICOES): Evalúa la utilidad neta retenida tras deducir impuestos (16%), previsión de IUE (25%), boletas bancarias y retenciones de pliego.
                  </p>
                </div>
              )}
              {input.negotiationMode === 'COOPERATIVA_INVERSION' && (
                <div style={{ background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '12px', padding: '0.85rem 1rem' }}>
                  <strong style={{ color: '#fbbf24' }}>⛏️ Cooperativa / Inversión</strong>
                  <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Explotación o servicios mineros/comunitarios: Deducción de canon comunal no recuperable y retención en la fuente (15.5%).
                  </p>
                </div>
              )}

              {/* GRÁFICAS INTERACTIVAS ECHARTS (WATERFALL + DONUT) */}
              <DealCharts result={result} currency={currency} />

              {/* DURACIÓN DEL CONTRATO + MÉTRICAS POR TIEMPO */}
              <div className={styles.reverseWidget} style={{ marginTop: '0.5rem' }}>
                <div className={styles.reverseWidgetHeader}>
                  <span className={styles.reverseTitle}>⏱️ Duración del Contrato</span>
                  <span style={{ fontSize: '0.725rem', color: '#93c5fd' }}>Para neto por día / mes</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="number"
                    min={1}
                    className={styles.darkInput}
                    style={{ width: '100px' }}
                    value={contractDurationValue}
                    onChange={(e) => setContractDurationValue(Math.max(1, Number(e.target.value) || 1))}
                  />
                  <select
                    className={styles.darkInput}
                    style={{ width: '140px' }}
                    value={contractDurationUnit}
                    onChange={(e) => setContractDurationUnit(e.target.value as any)}
                  >
                    <option value="days">Días</option>
                    <option value="weeks">Semanas</option>
                    <option value="months">Meses</option>
                  </select>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    ≈ {Math.round(durationInDays)} días · {durationInMonths.toFixed(1)} meses
                  </span>
                </div>
                {hasContractAmount && result.distribution.projectManager && (
                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Neto por día</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
                        {fmt(result.distribution.projectManager.totalAmount / durationInDays)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Neto por mes</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>
                        {fmt(result.distribution.projectManager.totalAmount / Math.max(0.1, durationInMonths))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tarjetas de Reparto por Socio */}
              <div className={styles.partnerCardGrid}>
                {result.distribution.partners.map((partner, index) => (
                  <div
                    key={partner.id}
                    className={`${styles.partnerTile} ${index === 0 ? styles.partnerTileProyectista : styles.partnerTileGestor}`}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className={styles.partnerRoleBadge}>{partner.role || 'Socio'}</span>
                      <span className={styles.partnerPctBadge}>{partner.pct}%</span>
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>
                      {partner.name}
                    </span>
                    <span className={styles.partnerSumTotal}>{fmt(partner.totalAmount)}</span>
                    <div className={styles.partnerFlowRow}>
                      <span>Líquido Obra:</span>
                      <span style={{ color: '#34d399', fontWeight: 700 }}>{fmt(partner.immediateAmount)}</span>
                    </div>
                    {result.deferredRetentionPool > 0 && (
                      <div className={styles.partnerFlowRow}>
                        <span>Al Cierre (Recepción):</span>
                        <span style={{ color: '#fbbf24' }}>{fmt(partner.deferredAmount)}</span>
                      </div>
                    )}
                    {hasContractAmount && (
                      <div style={{ fontSize: '0.725rem', color: '#10b981', marginTop: '0.2rem', fontWeight: 700 }}>
                        Margen real: {partner.effectiveMarginOnGross}% del contrato bruto
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Tarjeta de Varianza de Empresa Presta-Nombre (si está habilitada) */}
              {result.titularCompany.enabled && (
                <div className={styles.varianceCard}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionHeading}>
                      🏢 Varianza Fiscal: Empresa Presta-Nombre ({result.titularCompany.name || 'Empresa Titular'})
                    </span>
                    <span className={styles.sectionCostBadge} style={{ color: '#38bdf8' }}>
                      Fee: -{fmt(result.titularCompany.amount)} ({result.titularCompany.effectivePctOfGross}%)
                    </span>
                  </div>

                  <div className={styles.varianceGrid}>
                    <div
                      className={`${styles.varianceOption} ${result.titularCompany.absorbsTaxes ? styles.varianceOptionActive : ''}`}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8' }}>
                        Opción A: Titular ABSORBE Impuestos
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        La empresa titular asume IVA/IT e IUE de su fee. El equipo técnico cobra limpio.
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#34d399', marginTop: '0.25rem' }}>
                        Ganancia Equipo: {fmt(result.titularCompany.varianceAnalysis.ifTitularAbsorbsTaxes.teamNetGain)}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Margen: {result.titularCompany.varianceAnalysis.ifTitularAbsorbsTaxes.effectiveMargin}%
                      </span>
                    </div>

                    <div
                      className={`${styles.varianceOption} ${!result.titularCompany.absorbsTaxes ? styles.varianceOptionActive : ''}`}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f43f5e' }}>
                        Opción B: Equipo ABSORBE Impuestos
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        Se descuentan los impuestos del contrato y la titular se queda su fee íntegro.
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fb7185', marginTop: '0.25rem' }}>
                        Ganancia Equipo: {fmt(result.titularCompany.varianceAnalysis.ifTeamAbsorbsTaxes.teamNetGain)}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        Margen: {result.titularCompany.varianceAnalysis.ifTeamAbsorbsTaxes.effectiveMargin}%
                      </span>
                    </div>
                  </div>

                  <div className={styles.varianceDiffBanner}>
                    <span>Diferencia en juego en la mesa de negociación:</span>
                    <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>
                      +{fmt(result.titularCompany.varianceAnalysis.taxBurdenDifference)}
                    </strong>
                  </div>
                </div>
              )}

              {/* Módulo de Previsión Fiscal de IUE */}
              {result.iue.enabled && (
                <div className={styles.iueBox}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionHeading}>🏛️ Alerta Tributaria Anual: IUE (25%)</span>
                    <span className={styles.sectionCostBadge} style={{ color: '#60a5fa' }}>
                      {result.iue.payer === 'PROYECTO'
                        ? `-${fmt(result.iue.deductedFromProjectPool)} descontado del proyecto`
                        : result.iue.payer === 'EMPRESA_TITULAR'
                        ? `${fmt(result.iue.companyAbsorbedIue)} asumido por titular`
                        : 'Exento'}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                    Base imponible estimada para el SIN:{' '}
                    <strong style={{ color: '#ffffff' }}>{fmt(result.iue.taxableProfitBase)}</strong>. Gastos formales deducibles:{' '}
                    <strong style={{ color: '#34d399' }}>{fmt(result.iue.deductibleExpensesTotal)}</strong>. Gastos no deducibles (diezmo / informal):{' '}
                    <strong style={{ color: '#f43f5e' }}>{fmt(result.iue.nonDeductibleExpensesTotal)}</strong>.
                  </p>
                </div>
              )}

              {/* Simulador Inverso Rápido */}
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
          )}

          {/* =========================================================
              TAB 2: 🎛️ NEGOCIACIÓN (CONTRATO, IMPUESTOS, BOLETAS, DIEZMO, TITULAR)
              ========================================================= */}
          {activeTab === 'negociacion' && (
            <div className={styles.panel}>
              <div className={styles.panelTitleBar}>
                <div className={styles.panelTitle}>
                  <span className={styles.panelNumber}>1</span>
                  <span>
                    {input.negotiationMode === 'COOPERATIVA_INVERSION'
                      ? 'Mesa de Negociación Cooperativa - Inversión'
                      : 'Mesa de Negociación y Peajes'}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {input.negotiationMode === 'COOPERATIVA_INVERSION'
                    ? 'Enfoque centrado en capital del inversionista'
                    : 'Variables maestras'}
                </span>
              </div>

              {input.negotiationMode === 'COOPERATIVA_INVERSION' && result.cooperativeInvestment ? (
                <div className={styles.coopSectionWrapper}>
                  {/* 1. EL NÚMERO PRINCIPAL: CAPITAL QUE PONE EL INVERSIONISTA */}
                  <div className={styles.coopHeroCard}>
                    <div className={styles.coopHeroHeader}>
                      <div className={styles.coopHeroTitle}>
                        <span>💰 1. Capital del Inversionista</span>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
                          (Punto de partida de toda la negociación)
                        </span>
                      </div>
                      <div className={styles.coopHeroBadge}>Número Principal</div>
                    </div>

                    <div className={styles.coopInputHeroWrapper}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b' }}>
                        {currency === 'Bs' ? 'Bs' : '$'}
                      </span>
                      <input
                        type="number"
                        placeholder="0.00"
                        className={styles.coopInputHero}
                        value={coopInvestorCapital === 0 ? '' : coopInvestorCapital}
                        onChange={(e) => setCoopInvestorCapital(Number(e.target.value) || 0)}
                        step={10000}
                      />
                    </div>

                    <div className={styles.coopQuickBtns}>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', alignSelf: 'center' }}>
                        Añadir rápido:
                      </span>
                      <button
                        type="button"
                        className={styles.coopQuickBtn}
                        onClick={() => setCoopInvestorCapital((c) => c + 50000)}
                      >
                        +50k
                      </button>
                      <button
                        type="button"
                        className={styles.coopQuickBtn}
                        onClick={() => setCoopInvestorCapital((c) => c + 100000)}
                      >
                        +100k
                      </button>
                      <button
                        type="button"
                        className={styles.coopQuickBtn}
                        onClick={() => setCoopInvestorCapital((c) => c + 250000)}
                      >
                        +250k
                      </button>
                      <button
                        type="button"
                        className={styles.coopQuickBtn}
                        onClick={() => setCoopInvestorCapital((c) => c + 500000)}
                      >
                        +500k
                      </button>
                      <button
                        type="button"
                        className={styles.coopQuickBtn}
                        style={{ color: '#f87171' }}
                        onClick={() => setCoopInvestorCapital(0)}
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {/* 2. PARÁMETROS DE LA MESA Y REPARTO EN TIEMPO REAL */}
                  <div className={styles.coopParamsGrid}>
                    {/* Plazo y Retorno Objetivo */}
                    <div className={styles.coopParamCard}>
                      <div className={styles.coopParamLabel}>
                        <span>⏱️ Duración del Ciclo / Contrato:</span>
                        <strong style={{ color: '#38bdf8' }}>{coopDurationMonths} meses</strong>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="36"
                        step="1"
                        className={styles.sliderTrack}
                        value={coopDurationMonths}
                        onChange={(e) => setCoopDurationMonths(Number(e.target.value))}
                      />
                      <div className={styles.splitButtonsGroup}>
                        {[6, 12, 18, 24, 36].map((m) => (
                          <button
                            key={m}
                            type="button"
                            className={`${styles.splitBtn} ${coopDurationMonths === m ? styles.splitBtnActive : ''}`}
                            onClick={() => setCoopDurationMonths(m)}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>

                      <div style={{ marginTop: '0.65rem' }}>
                        <div className={styles.coopParamLabel}>
                          <span>🎯 Retorno Objetivo Inversionista (Target ROI):</span>
                          <strong style={{ color: '#fbbf24' }}>{coopTargetRoiPct}%</strong>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          step="5"
                          className={styles.sliderTrack}
                          value={coopTargetRoiPct}
                          onChange={(e) => setCoopTargetRoiPct(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {/* Reparto Dual Inversionista vs Cooperativa */}
                    <div className={styles.coopParamCard}>
                      <div className={styles.coopParamLabel}>
                        <span>⚖️ Reparto Acordado del Excedente:</span>
                        <span>
                          <strong style={{ color: '#60a5fa' }}>{coopInvestorSharePct}% Inv</strong> /{' '}
                          <strong style={{ color: '#34d399' }}>{100 - coopInvestorSharePct}% Coop</strong>
                        </span>
                      </div>

                      {/* Visual Dual Track */}
                      <div className={styles.dualSliderTrack}>
                        <div
                          className={styles.dualSliderLeft}
                          style={{ width: `${coopInvestorSharePct}%` }}
                        >
                          {coopInvestorSharePct >= 20 ? `${coopInvestorSharePct}% Inv` : ''}
                        </div>
                        <div
                          className={styles.dualSliderRight}
                          style={{ width: `${100 - coopInvestorSharePct}%` }}
                        >
                          {100 - coopInvestorSharePct >= 20 ? `${100 - coopInvestorSharePct}% Coop` : ''}
                        </div>
                      </div>

                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="5"
                        className={styles.sliderTrack}
                        value={coopInvestorSharePct}
                        onChange={(e) => setCoopInvestorSharePct(Number(e.target.value))}
                      />

                      <div className={styles.splitButtonsGroup}>
                        {[
                          { label: '80/20', inv: 80 },
                          { label: '70/30', inv: 70 },
                          { label: '60/40', inv: 60 },
                          { label: '50/50', inv: 50 },
                          { label: '40/60', inv: 40 },
                        ].map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            className={`${styles.splitBtn} ${coopInvestorSharePct === item.inv ? styles.splitBtnActive : ''}`}
                            onClick={() => setCoopInvestorSharePct(item.inv)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Costos Operativos y Canon Comunal */}
                    <div className={styles.coopParamCard}>
                      <div className={styles.coopParamLabel}>
                        <span>⚙️ Costos Operativos Estimados (OPEX):</span>
                        <span style={{ color: '#f43f5e', fontWeight: 800 }}>-{fmt(coopOperatingCosts)}</span>
                      </div>
                      <input
                        type="number"
                        placeholder="0.00"
                        className={styles.darkInput}
                        value={coopOperatingCosts === 0 ? '' : coopOperatingCosts}
                        onChange={(e) => setCoopOperatingCosts(Number(e.target.value) || 0)}
                        step={5000}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Combustible, explosivos, mantenimiento de maquinaria, insumos mineros y cuadrillas.
                      </span>

                      <div style={{ marginTop: '0.65rem' }}>
                        <div className={styles.coopParamLabel}>
                          <span>🏛️ Canon / Aporte Comunal (% s/bruto):</span>
                          <strong style={{ color: '#fbbf24' }}>
                            {coopCanonPct}% (-{fmt(result.cooperativeInvestment.canonComunalAmount)})
                          </strong>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="15"
                          step="1"
                          className={styles.sliderTrack}
                          value={coopCanonPct}
                          onChange={(e) => setCoopCanonPct(Number(e.target.value))}
                        />
                      </div>
                    </div>

                    {/* Mínimo Cooperativa y Producción Estimada */}
                    <div className={styles.coopParamCard}>
                      <div className={styles.coopParamLabel}>
                        <span>⛏️ Mínimo Aceptable para la Cooperativa:</span>
                        <strong style={{ color: '#34d399' }}>{fmt(coopMinCoopIncome)}</strong>
                      </div>
                      <input
                        type="number"
                        placeholder="0.00"
                        className={styles.darkInput}
                        value={coopMinCoopIncome === 0 ? '' : coopMinCoopIncome}
                        onChange={(e) => setCoopMinCoopIncome(Number(e.target.value) || 0)}
                        step={5000}
                      />
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                        Piso mínimo de ganancia total que exige la asamblea cooperativista para autorizar el acuerdo.
                      </span>

                      <div style={{ marginTop: '0.65rem' }}>
                        <div className={styles.coopParamLabel}>
                          <span>💎 Ingreso Estimado Venta Mineral (Bruto):</span>
                          <strong style={{ color: '#38bdf8' }}>{fmt(coopProjectedRevenue)}</strong>
                        </div>
                        <input
                          type="number"
                          placeholder="0.00"
                          className={styles.darkInput}
                          value={coopProjectedRevenue === 0 ? '' : coopProjectedRevenue}
                          onChange={(e) => setCoopProjectedRevenue(Number(e.target.value) || 0)}
                          step={20000}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. BOTÓN DE CÁLCULO INVERSO: BREAK-EVEN REQUERIDO */}
                  <div className={styles.breakEvenHighlight}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>
                        Ingreso Mínimo de Equilibrio para que ambos estén en Zona Verde:
                      </span>
                      <strong style={{ fontSize: '1.15rem', color: '#38bdf8', fontFamily: 'monospace' }}>
                        {fmt(result.cooperativeInvestment.breakEvenRevenueRequired)}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className={styles.tactileBtnPrimary}
                      style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', minHeight: 'auto' }}
                      onClick={() => setCoopProjectedRevenue(result.cooperativeInvestment!.breakEvenRevenueRequired)}
                    >
                      ⚡ Cargar este ingreso estimado
                    </button>
                  </div>

                  {/* 4. SCOREBOARD DE COMPARACIÓN EN VIVO (MESA DE REUNIÓN) */}
                  <div className={styles.coopScoreboard}>
                    {/* Columna Inversionista */}
                    <div className={`${styles.scoreboardCard} ${styles.scoreboardInvestor}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#60a5fa', fontSize: '0.95rem' }}>💼 Inversionista</strong>
                        <span
                          className={
                            result.cooperativeInvestment.investorStatus === 'VERDE'
                              ? styles.statusPillGreen
                              : result.cooperativeInvestment.investorStatus === 'AMARILLO'
                              ? styles.statusPillYellow
                              : styles.statusPillRed
                          }
                        >
                          {result.cooperativeInvestment.investorStatus}
                        </span>
                      </div>

                      <div className={styles.scoreRow}>
                        <span>Capital Aportado:</span>
                        <span className={styles.scoreValBold}>{fmt(result.cooperativeInvestment.investorCapital)}</span>
                      </div>
                      <div className={styles.scoreRow}>
                        <span>Retorno Bruto ({result.cooperativeInvestment.investorSharePct}%):</span>
                        <span className={styles.scoreValBold} style={{ color: '#38bdf8' }}>
                          {fmt(result.cooperativeInvestment.investorPayout)}
                        </span>
                      </div>
                      <div className={styles.scoreRow}>
                        <span>Ganancia Neta Limpia:</span>
                        <span
                          className={styles.scoreValBold}
                          style={{ color: result.cooperativeInvestment.investorNetProfit >= 0 ? '#34d399' : '#f43f5e' }}
                        >
                          {fmt(result.cooperativeInvestment.investorNetProfit)}
                        </span>
                      </div>
                      <div className={styles.scoreRow}>
                        <span>ROI Obtenido vs Objetivo:</span>
                        <span className={styles.scoreValBold}>
                          {result.cooperativeInvestment.investorRoiPct}%{' '}
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            (meta: {result.cooperativeInvestment.targetInvestorRoiPct || 40}%)
                          </span>
                        </span>
                      </div>
                      <div className={styles.scoreRow}>
                        <span>Tiempo Recuperación (Payback):</span>
                        <span className={styles.scoreValBold} style={{ color: '#fbbf24' }}>
                          {result.cooperativeInvestment.investorPaybackMonths > 120
                            ? 'No recupera'
                            : `${result.cooperativeInvestment.investorPaybackMonths.toFixed(1)} meses`}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.73rem', color: '#cbd5e1', margin: '0.2rem 0 0' }}>
                        {result.cooperativeInvestment.investorStatusMessage}
                      </p>
                    </div>

                    {/* Columna Cooperativa */}
                    <div className={`${styles.scoreboardCard} ${styles.scoreboardCoop}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#34d399', fontSize: '0.95rem' }}>⛏️ Cooperativa Minera</strong>
                        <span
                          className={
                            result.cooperativeInvestment.cooperativeStatus === 'VERDE'
                              ? styles.statusPillGreen
                              : result.cooperativeInvestment.cooperativeStatus === 'AMARILLO'
                              ? styles.statusPillYellow
                              : styles.statusPillRed
                          }
                        >
                          {result.cooperativeInvestment.cooperativeStatus}
                        </span>
                      </div>

                      <div className={styles.scoreRow}>
                        <span>Excedente Recibido ({result.cooperativeInvestment.cooperativeSharePct}%):</span>
                        <span className={styles.scoreValBold} style={{ color: '#34d399' }}>
                          {fmt(result.cooperativeInvestment.cooperativePayout)}
                        </span>
                      </div>
                      <div className={styles.scoreRow}>
                        <span>Ingreso Promedio Mensual:</span>
                        <span className={styles.scoreValBold} style={{ color: '#38bdf8' }}>
                          {fmt(result.cooperativeInvestment.cooperativeMonthlyIncome)}/mes
                        </span>
                      </div>
                      <div className={styles.scoreRow}>
                        <span>Mínimo Aceptable Exigido:</span>
                        <span className={styles.scoreValBold}>
                          {fmt(result.cooperativeInvestment.minCooperativeIncome || 0)}
                        </span>
                      </div>
                      <div className={styles.scoreRow}>
                        <span>Canon Comunal Generado ({result.cooperativeInvestment.canonComunalPct}%):</span>
                        <span className={styles.scoreValBold} style={{ color: '#fbbf24' }}>
                          {fmt(result.cooperativeInvestment.canonComunalAmount)}
                        </span>
                      </div>
                      <div className={styles.scoreRow}>
                        <span>Costos OPEX Cubiertos:</span>
                        <span className={styles.scoreValBold} style={{ color: '#94a3b8' }}>
                          {fmt(result.cooperativeInvestment.operatingCostsEstimated)}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.73rem', color: '#cbd5e1', margin: '0.2rem 0 0' }}>
                        {result.cooperativeInvestment.cooperativeStatusMessage}
                      </p>
                    </div>
                  </div>

                  {/* 5. VEREDICTO DE LA REUNIÓN (SEMÁFORO GLOBAL) */}
                  <div
                    className={`${styles.verdictBanner} ${
                      result.cooperativeInvestment.overallDealStatus === 'VERDE'
                        ? styles.verdictBannerGreen
                        : result.cooperativeInvestment.overallDealStatus === 'AMARILLO'
                        ? styles.verdictBannerYellow
                        : styles.verdictBannerRed
                    }`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '1rem', color: '#ffffff' }}>
                        {result.cooperativeInvestment.overallDealStatus === 'VERDE' && '🟢 ZONA VERDE: Trato Viable y Recomendado'}
                        {result.cooperativeInvestment.overallDealStatus === 'AMARILLO' && '🟡 ZONA AMARILLA: Negociación en Tensión'}
                        {result.cooperativeInvestment.overallDealStatus === 'ROJO' && '🔴 ZONA ROJA: Trato Inviable'}
                      </strong>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f1f5f9' }}>
                        Dictamen de Asamblea
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: '#f1f5f9', margin: 0 }}>
                      {result.cooperativeInvestment.overallDealMessage}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Presupuesto Principal Ofertado (Sin hardcodeo) */}
                  <div className={styles.contractHeroBox}>
                <div className={styles.contractLabel}>
                  <span>Monto Bruto Ofertado ({currency})</span>
                  <span style={{ color: '#60a5fa' }}>Total contrato / pliego licitado</span>
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
                  <span className={styles.sectionHeading}>🏛️ Régimen Tributario Mensual (IVA + IT)</span>
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

                {/* Opciones de normativa */}
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

              {/* 1.1 MÓDULO ANUAL DE IUE (25%) CON EXPLICADOR CLARO */}
              <div className={styles.controlSection}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionHeading}>📑 Previsión Anual IUE (25%)</span>
                  <span className={styles.sectionCostBadge} style={{ color: '#60a5fa' }}>
                    {input.iueTax.enabled ? `-${fmt(result.iue.deductedFromProjectPool)}` : 'Desactivado'}
                  </span>
                </div>

                <div
                  className={`${styles.tactileCard} ${input.iueTax.enabled ? styles.tactileCardActive : ''}`}
                >
                  <div
                    className={styles.tactileHeaderRow}
                    onClick={() =>
                      setInput((prev) => ({
                        ...prev,
                        iueTax: { ...prev.iueTax, enabled: !prev.iueTax.enabled },
                      }))
                    }
                  >
                    <div className={styles.tactileInfo}>
                      <span className={styles.tactileTitle}>
                        {input.iueTax.enabled ? '✓ IUE 25% Calculado' : '✗ IUE No Contemplado'}
                      </span>
                      <span className={styles.tactileSub}>
                        {input.iueTax.enabled
                          ? 'Calcula la utilidad imponible neta al final del contrato'
                          : 'Operación informal o no sujeta a IUE'}
                      </span>
                    </div>
                    <div className={`${styles.toggleTrack} ${input.iueTax.enabled ? styles.toggleTrackActive : ''}`}>
                      <div className={`${styles.toggleThumb} ${input.iueTax.enabled ? styles.toggleThumbActive : ''}`} />
                    </div>
                  </div>
                </div>

                {input.iueTax.enabled && (
                  <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <span className={styles.inputLabel}>¿Quién asume el pago del 25% de IUE?</span>
                    <div className={styles.iuePayerGrid}>
                      <button
                        type="button"
                        className={`${styles.iuePayerBtn} ${input.iueTax.payer === 'PROYECTO' ? styles.iuePayerBtnActive : ''}`}
                        onClick={() =>
                          setInput((prev) => ({
                            ...prev,
                            iueTax: { ...prev.iueTax, payer: 'PROYECTO' },
                          }))
                        }
                      >
                        El Proyecto (Equipo)
                      </button>
                      <button
                        type="button"
                        className={`${styles.iuePayerBtn} ${input.iueTax.payer === 'EMPRESA_TITULAR' ? styles.iuePayerBtnActive : ''}`}
                        onClick={() =>
                          setInput((prev) => ({
                            ...prev,
                            iueTax: { ...prev.iueTax, payer: 'EMPRESA_TITULAR' },
                          }))
                        }
                      >
                        Empresa Titular
                      </button>
                      <button
                        type="button"
                        className={`${styles.iuePayerBtn} ${input.iueTax.payer === 'EXENTO' ? styles.iuePayerBtnActive : ''}`}
                        onClick={() =>
                          setInput((prev) => ({
                            ...prev,
                            iueTax: { ...prev.iueTax, payer: 'EXENTO' },
                          }))
                        }
                      >
                        Exento / Informal
                      </button>
                    </div>

                    {/* CUADRO DIDÁCTICO EXPLICATIVO */}
                    <div className={styles.conceptExplainerBox}>
                      <div className={styles.conceptItem}>
                        <span className={styles.conceptTag} style={{ background: '#1e3a8a', color: '#60a5fa' }}>
                          El Proyecto
                        </span>
                        <span>
                          Los ingenieros y cuadrilla que ejecutan el trabajo. El IUE se descuenta de su fondo de ganancias.
                        </span>
                      </div>
                      <div className={styles.conceptItem}>
                        <span className={styles.conceptTag} style={{ background: '#064e3b', color: '#34d399' }}>
                          Empresa Titular
                        </span>
                        <span>
                          La empresa que prestó el NIT y firma asume el IUE de su propia comisión o margen corporativo.
                        </span>
                      </div>
                      <div className={styles.conceptItem}>
                        <span className={styles.conceptTag} style={{ background: '#334155', color: '#cbd5e1' }}>
                          Exento
                        </span>
                        <span>
                          Trato directo entre personas naturales sin declaración de IUE ante el SIN.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. BOLETAS Y PÓLIZAS BANCARIAS */}
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

                {/* Boleta Anticipo */}
                <div
                  className={`${styles.tactileCard} ${input.guarantees.hasAdvanceBond ? styles.tactileCardActive : ''}`}
                >
                  <div
                    className={styles.tactileHeaderRow}
                    onClick={() =>
                      setInput({
                        ...input,
                        guarantees: { ...input.guarantees, hasAdvanceBond: !input.guarantees.hasAdvanceBond },
                      })
                    }
                  >
                    <div className={styles.tactileInfo}>
                      <span className={styles.tactileTitle}>Boleta de Anticipo (20%)</span>
                      <span className={styles.tactileSub}>
                        {input.guarantees.hasAdvanceBond
                          ? `Afianzado: ${fmt(result.guarantees.advanceBondAmountAfianzado)} | Prima: -${fmt(result.guarantees.advanceBondCost)}`
                          : 'Desactivada'}
                      </span>
                    </div>
                    <div
                      className={`${styles.toggleTrack} ${input.guarantees.hasAdvanceBond ? styles.toggleTrackActive : ''}`}
                    >
                      <div
                        className={`${styles.toggleThumb} ${input.guarantees.hasAdvanceBond ? styles.toggleThumbActive : ''}`}
                      />
                    </div>
                  </div>

                  {input.guarantees.hasAdvanceBond && (
                    <div className={styles.inputGrid}>
                      <div className={styles.inputField}>
                        <span className={styles.inputLabel}>% Anticipo recibido (ej. 20%)</span>
                        <input
                          type="number"
                          step="1"
                          className={styles.darkInput}
                          value={input.guarantees.advancePct || 20.0}
                          onChange={(e) =>
                            setInput({
                              ...input,
                              guarantees: { ...input.guarantees, advancePct: Number(e.target.value) || 0 },
                            })
                          }
                        />
                      </div>
                      <div className={styles.inputField}>
                        <span className={styles.inputLabel}>Prima Póliza Anticipo (%)</span>
                        <input
                          type="number"
                          step="0.1"
                          className={styles.darkInput}
                          value={input.guarantees.advanceBondPremiumPct || 2.5}
                          onChange={(e) =>
                            setInput({
                              ...input,
                              guarantees: { ...input.guarantees, advanceBondPremiumPct: Number(e.target.value) || 0 },
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. RETENCIÓN NORMATIVA EN PLANILLA (CAJA / PLIEGO) */}
              <div className={styles.controlSection}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionHeading}>🏥 Retención en Planilla (Caja / Pliego)</span>
                  <span className={styles.sectionCostBadge} style={{ color: '#fbbf24' }}>
                    {fmt(result.statutoryDeduction.amount)} ({result.statutoryDeduction.ratePct}%)
                  </span>
                </div>

                <div className={styles.inputGrid}>
                  <div className={styles.inputField}>
                    <span className={styles.inputLabel}>% Retenido por la Entidad (ej. 5% o 7%)</span>
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
                    <span className={styles.inputLabel}>Condición de Devolución</span>
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
                        : '✗ Fondo perdido / Aporte'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. DIEZMO DE ADJUDICACIÓN */}
              <div className={styles.controlSection}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionHeading}>🤝 Diezmo / Intermediario de Adjudicación</span>
                  <span className={styles.sectionCostBadge} style={{ color: '#f43f5e' }}>
                    Comisión: -{fmt(result.commission.amount)} ({result.commission.effectivePctOfGross}%)
                  </span>
                </div>

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
              </div>

              {/* 5. EMPRESA TITULAR / PRESTA-NOMBRE CON SWITCH Y ANÁLISIS DE VARIANZA */}
              <div className={styles.controlSection}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionHeading}>🏢 Empresa Presta-Nombre (NIT & Firma)</span>
                  <span className={styles.sectionCostBadge} style={{ color: input.titularCompany.enabled ? '#38bdf8' : '#64748b' }}>
                    {input.titularCompany.enabled ? `-${fmt(result.titularCompany.amount)}` : 'Desactivada'}
                  </span>
                </div>

                {/* Botón de Habilitación / Deshabilitación de Empresa Titular */}
                <div
                  className={`${styles.tactileCard} ${input.titularCompany.enabled ? styles.tactileCardActive : ''}`}
                >
                  <div
                    className={styles.tactileHeaderRow}
                    onClick={() =>
                      setInput((prev) => ({
                        ...prev,
                        titularCompany: {
                          ...prev.titularCompany,
                          enabled: !prev.titularCompany.enabled,
                        },
                      }))
                    }
                  >
                    <div className={styles.tactileInfo}>
                      <span className={styles.tactileTitle}>
                        {input.titularCompany.enabled
                          ? '✓ Empresa Presta-Nombre HABILITADA'
                          : '✗ Empresa Presta-Nombre DESHABILITADA (Empresa Propia)'}
                      </span>
                      <span className={styles.tactileSub}>
                        {input.titularCompany.enabled
                          ? 'Se pacta un fee por usar el NIT, firma y personería jurídica de un tercero'
                          : 'El contrato se ejecuta con personería propia o trato directo'}
                      </span>
                    </div>
                    <div className={`${styles.toggleTrack} ${input.titularCompany.enabled ? styles.toggleTrackActive : ''}`}>
                      <div className={`${styles.toggleThumb} ${input.titularCompany.enabled ? styles.toggleThumbActive : ''}`} />
                    </div>
                  </div>
                </div>

                {input.titularCompany.enabled && (
                  <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div className={styles.inputGrid}>
                      <div className={styles.inputField}>
                        <span className={styles.inputLabel}>Razón Social / Nombre Empresa</span>
                        <input
                          type="text"
                          placeholder="ej. Constructora Andina SRL"
                          className={styles.darkInput}
                          value={input.titularCompany.name || ''}
                          onChange={(e) =>
                            setInput((prev) => ({
                              ...prev,
                              titularCompany: { ...prev.titularCompany, name: e.target.value },
                            }))
                          }
                        />
                      </div>
                      <div className={styles.inputField}>
                        <span className={styles.inputLabel}>Fee Empresa Titular (%)</span>
                        <input
                          type="number"
                          step="0.5"
                          placeholder="0"
                          className={styles.darkInput}
                          value={input.titularCompany.value === 0 ? '' : input.titularCompany.value}
                          onChange={(e) =>
                            setInput((prev) => ({
                              ...prev,
                              titularCompany: { ...prev.titularCompany, value: Number(e.target.value) || 0 },
                            }))
                          }
                        />
                      </div>
                    </div>

                    {/* SWITCH CRUCIAL DE ABSORCIÓN TRIBUTARIA */}
                    <div
                      className={`${styles.tactileCard} ${input.titularCompany.absorbsTaxes ? styles.tactileCardActive : ''}`}
                    >
                      <div
                        className={styles.tactileHeaderRow}
                        onClick={() =>
                          setInput((prev) => ({
                            ...prev,
                            titularCompany: {
                              ...prev.titularCompany,
                              absorbsTaxes: !prev.titularCompany.absorbsTaxes,
                            },
                          }))
                        }
                      >
                        <div className={styles.tactileInfo}>
                          <span className={styles.tactileTitle}>
                            {input.titularCompany.absorbsTaxes
                              ? '🏢 Empresa Titular ABSORBE Carga Impositiva'
                              : '👷 Equipo Técnico ABSORBE Carga Impositiva'}
                          </span>
                          <span className={styles.tactileSub}>
                            {input.titularCompany.absorbsTaxes
                              ? 'La empresa titular cubre los impuestos de su fee. El equipo recibe su pago limpio.'
                              : 'Los impuestos se descuentan del contrato y la empresa se queda su fee íntegro.'}
                          </span>
                        </div>
                        <div className={`${styles.toggleTrack} ${input.titularCompany.absorbsTaxes ? styles.toggleTrackActive : ''}`}>
                          <div className={`${styles.toggleThumb} ${input.titularCompany.absorbsTaxes ? styles.toggleThumbActive : ''}`} />
                        </div>
                      </div>
                    </div>

                    {/* TARJETA DE VARIANZA EN VIVO */}
                    <div className={styles.varianceCard}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8' }}>
                        ⚖️ Simulación de Varianza en la Mesa:
                      </span>
                      <div className={styles.varianceGrid}>
                        <div className={styles.varianceOption}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Si Titular Asume:</span>
                          <strong style={{ fontSize: '0.9rem', color: '#34d399' }}>
                            {fmt(result.titularCompany.varianceAnalysis.ifTitularAbsorbsTaxes.teamNetGain)}
                          </strong>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            Margen: {result.titularCompany.varianceAnalysis.ifTitularAbsorbsTaxes.effectiveMargin}%
                          </span>
                        </div>
                        <div className={styles.varianceOption}>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Si Equipo Asume:</span>
                          <strong style={{ fontSize: '0.9rem', color: '#f43f5e' }}>
                            {fmt(result.titularCompany.varianceAnalysis.ifTeamAbsorbsTaxes.teamNetGain)}
                          </strong>
                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                            Margen: {result.titularCompany.varianceAnalysis.ifTeamAbsorbsTaxes.effectiveMargin}%
                          </span>
                        </div>
                      </div>
                      <div className={styles.varianceDiffBanner}>
                        <span>Diferencia en juego:</span>
                        <strong>+{fmt(result.titularCompany.varianceAnalysis.taxBurdenDifference)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

          {/* =========================================================
              TAB 3: 👥 COSTOS (PERSONAL & GASTOS DIRECTOS)
              ========================================================= */}
          {activeTab === 'costos' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* SECCIÓN 1: STAFFING / PERSONAL */}
              <div className={styles.panel}>
                <div className={styles.sectionHeader}>
                  <div className={styles.panelTitle}>
                    <span className={styles.panelNumber}>👥</span>
                    <span>Asignación de Personal & Cargas Sociales</span>
                  </div>
                  <span className={styles.sectionCostBadge} style={{ color: '#fb923c' }}>
                    Total Planilla: -{fmt(result.staffing.totalPersonnelCost)}
                  </span>
                </div>

                {/* Presets rápidos */}
                <div className={styles.staffPresetRow}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>+ Rol Rápido:</span>
                  {STAFF_PRESETS.map((preset) => (
                    <button
                      key={preset.role}
                      type="button"
                      className={styles.staffPresetBtn}
                      onClick={() => addStaffRole(preset)}
                    >
                      {preset.role}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={styles.staffPresetBtn}
                    style={{ borderColor: '#3b82f6', color: '#60a5fa' }}
                    onClick={() => addStaffRole()}
                  >
                    + Personalizado
                  </button>
                </div>

                {/* Lista de asignaciones */}
                <div className={styles.staffCardList}>
                  {input.staffing.assignments.length === 0 ? (
                    <p style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', margin: '0.5rem 0' }}>
                      Sin personal asignado aún. Pulsa un rol rápido arriba para añadir residentes, topógrafos o cadistas.
                    </p>
                  ) : (
                    input.staffing.assignments.map((staff) => {
                      const baseSalary = (staff.monthlySalary || 0) * (staff.quantity || 1) * (staff.durationMonths || 1);
                      const burden = baseSalary * ((staff.laborBurdenPct || 0) / 100);
                      const lineTotal = baseSalary + burden;

                      return (
                        <div key={staff.id} className={styles.staffCard}>
                          <div className={styles.staffCardTop}>
                            <div className={styles.staffRoleTitle}>
                              <span>👷</span>
                              <input
                                type="text"
                                placeholder="Cargo / Rol (ej. Ingeniero)"
                                className={styles.darkInput}
                                style={{ width: '180px', minHeight: '36px' }}
                                value={staff.role}
                                onChange={(e) => updateStaff(staff.id, { role: e.target.value })}
                              />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span className={styles.staffCostPill}>-{fmt(lineTotal)}</span>
                              <button
                                type="button"
                                className={styles.delBtn}
                                onClick={() => deleteStaff(staff.id)}
                                title="Eliminar asignación"
                              >
                                ×
                              </button>
                            </div>
                          </div>

                          <div className={styles.staffInputsGrid}>
                            <div className={styles.inputField}>
                              <span className={styles.inputLabel}>Salario Mensual ({currency})</span>
                              <input
                                type="number"
                                placeholder="0"
                                className={styles.darkInput}
                                value={staff.monthlySalary || ''}
                                onChange={(e) => updateStaff(staff.id, { monthlySalary: Number(e.target.value) || 0 })}
                              />
                            </div>
                            <div className={styles.inputField}>
                              <span className={styles.inputLabel}>Cant. Personas</span>
                              <input
                                type="number"
                                min="1"
                                className={styles.darkInput}
                                value={staff.quantity}
                                onChange={(e) => updateStaff(staff.id, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                              />
                            </div>
                            <div className={styles.inputField}>
                              <span className={styles.inputLabel}>Meses Obra</span>
                              <input
                                type="number"
                                min="1"
                                className={styles.darkInput}
                                value={staff.durationMonths}
                                onChange={(e) => updateStaff(staff.id, { durationMonths: Math.max(1, Number(e.target.value) || 1) })}
                              />
                            </div>
                            <div className={styles.inputField}>
                              <span className={styles.inputLabel}>Carga Social %</span>
                              <input
                                type="number"
                                step="0.1"
                                className={styles.darkInput}
                                value={staff.laborBurdenPct}
                                onChange={(e) => updateStaff(staff.id, { laborBurdenPct: Number(e.target.value) || 0 })}
                              />
                            </div>
                          </div>

                          <div className={styles.staffTogglesRow}>
                            <button
                              type="button"
                              className={`${styles.miniToggleBtn} ${staff.laborBurdenPct > 0 ? styles.miniToggleBtnActive : ''}`}
                              onClick={() =>
                                updateStaff(staff.id, {
                                  laborBurdenPct: staff.laborBurdenPct > 0 ? 0 : 33.37,
                                })
                              }
                            >
                              {staff.laborBurdenPct > 0 ? '✓ Con Leyes Sociales (+33.37%)' : 'Consultor / Recibo (0%)'}
                            </button>
                            <button
                              type="button"
                              className={`${styles.miniToggleBtn} ${staff.isDirectSiteCost ? styles.miniToggleBtnActive : ''}`}
                              onClick={() => updateStaff(staff.id, { isDirectSiteCost: !staff.isDirectSiteCost })}
                            >
                              {staff.isDirectSiteCost ? '🏗️ Costo Directo Obra' : '🏢 Administrativo'}
                            </button>
                            <button
                              type="button"
                              className={`${styles.miniToggleBtn} ${staff.hasFormalPayroll ? styles.miniToggleBtnActive : styles.miniToggleBtnActiveWarning}`}
                              onClick={() => updateStaff(staff.id, { hasFormalPayroll: !staff.hasFormalPayroll })}
                            >
                              {staff.hasFormalPayroll ? '🧾 Deducible IUE' : '⚠️ Pago Informal / No Deducible'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SECCIÓN 2: GASTOS OPERATIVOS DIRECTOS */}
              <div className={styles.panel}>
                <div className={styles.sectionHeader}>
                  <div className={styles.panelTitle}>
                    <span className={styles.panelNumber}>🛠️</span>
                    <span>Gastos Operativos & Logística de Obra</span>
                  </div>
                  <span className={styles.sectionCostBadge} style={{ color: '#94a3b8' }}>
                    Total: -{fmt(result.directCosts.total)}
                  </span>
                </div>

                <div className={styles.expenseList}>
                  {input.directCosts.items.length === 0 ? (
                    <p style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', margin: '0.2rem 0' }}>
                      Sin gastos directos registrados. Añade filas si hay viáticos, materiales, alquiler de equipo o subcontratos.
                    </p>
                  ) : (
                    input.directCosts.items.map((item) => (
                      <div key={item.id} className={styles.expenseRow}>
                        <input
                          type="text"
                          placeholder="Concepto (ej. Viáticos, Combustible)"
                          className={styles.darkInput}
                          value={item.concept}
                          onChange={(e) => updateExpense(item.id, { concept: e.target.value })}
                        />
                        <input
                          type="number"
                          placeholder="Monto"
                          className={styles.darkInput}
                          value={item.amount || ''}
                          onChange={(e) => updateExpense(item.id, { amount: Number(e.target.value) || 0 })}
                        />
                        <button
                          type="button"
                          className={`${styles.miniToggleBtn} ${item.isTaxDeductible ? styles.miniToggleBtnActive : styles.miniToggleBtnActiveWarning}`}
                          style={{ minHeight: '44px' }}
                          onClick={() => updateExpense(item.id, { isTaxDeductible: !item.isTaxDeductible })}
                          title="¿Tiene factura o recibo deducible de IUE?"
                        >
                          {item.isTaxDeductible ? 'Facturado' : 'Sin Fact.'}
                        </button>
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
            </div>
          )}

          {/* =========================================================
              TAB 4: ⚖️ REPARTO (MULTI-SOCIO DINÁMICO & PERSONALIZABLE)
              ========================================================= */}
          {activeTab === 'reparto' && (
            <div className={styles.panel}>
              <div className={styles.sectionHeader}>
                <div className={styles.panelTitle}>
                  <span className={styles.panelNumber}>⚖️</span>
                  <span>Acuerdo de Reparto entre Socios ({partners.length} participantes)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className={styles.miniToggleBtn}
                    style={{ borderColor: '#3b82f6', color: '#60a5fa' }}
                    onClick={splitPartnersEqually}
                  >
                    Dividir en Partes Iguales
                  </button>
                </div>
              </div>

              {/* Alerta de validación de porcentajes */}
              {totalPartnerPct !== 100 && (
                <div className={styles.partnerValidationWarning}>
                  ⚠️ La suma actual es <strong>{totalPartnerPct}%</strong>. Debe sumar exactamente <strong>100%</strong> (incluyendo el fondo de reserva).
                </div>
              )}

              {/* Botones de presets para añadir socios */}
              <div className={styles.staffPresetRow}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>+ Añadir Socio:</span>
                <button type="button" className={styles.staffPresetBtn} onClick={() => addPartner('Inversionista')}>
                  + Inversionista
                </button>
                <button type="button" className={styles.staffPresetBtn} onClick={() => addPartner('Asesor Legal')}>
                  + Asesor Legal
                </button>
                <button type="button" className={styles.staffPresetBtn} onClick={() => addPartner('Gestor Terreno')}>
                  + Gestor Terreno
                </button>
                <button type="button" className={styles.staffPresetBtn} onClick={() => addPartner('Maestro de Obra')}>
                  + Maestro Obra
                </button>
                <button
                  type="button"
                  className={styles.staffPresetBtn}
                  style={{ borderColor: '#10b981', color: '#34d399' }}
                  onClick={() => addPartner()}
                >
                  + Otro Socio
                </button>
              </div>

              {/* Lista dinámica de socios con sliders individuales */}
              <div className={styles.partnerList}>
                {partners.map((partner) => {
                  const partnerResult = result.distribution.partners.find((p) => p.id === partner.id);

                  return (
                    <div key={partner.id} className={styles.partnerRowCard}>
                      <div className={styles.partnerRowTop}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '220px' }}>
                          <input
                            type="text"
                            placeholder="Nombre del Socio"
                            className={styles.darkInput}
                            style={{ minHeight: '36px', fontWeight: 700 }}
                            value={partner.name}
                            onChange={(e) => updatePartner(partner.id, { name: e.target.value })}
                          />
                          <input
                            type="text"
                            placeholder="Rol / Aporte"
                            className={styles.darkInput}
                            style={{ minHeight: '36px', width: '150px' }}
                            value={partner.role}
                            onChange={(e) => updatePartner(partner.id, { role: e.target.value })}
                          />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={styles.partnerPctBadge}>{partner.pct}%</span>
                          {partners.length > 1 && (
                            <button
                              type="button"
                              className={styles.delBtn}
                              onClick={() => deletePartner(partner.id)}
                              title="Eliminar socio"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Slider individual del socio */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="1"
                          className={styles.sliderTrack}
                          value={partner.pct}
                          onChange={(e) => updatePartner(partner.id, { pct: Number(e.target.value) || 0 })}
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className={styles.darkInput}
                          style={{ width: '70px', minHeight: '36px', textAlign: 'center' }}
                          value={partner.pct}
                          onChange={(e) => updatePartner(partner.id, { pct: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                        />
                      </div>

                      {/* Desglose de ganancia calculada para este socio */}
                      {partnerResult && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            paddingTop: '0.4rem',
                            borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
                            fontSize: '0.75rem',
                          }}
                        >
                          <span>
                            Total: <strong style={{ color: '#ffffff' }}>{fmt(partnerResult.totalAmount)}</strong>
                          </span>
                          <span>
                            Líquido en obra: <strong style={{ color: '#34d399' }}>{fmt(partnerResult.immediateAmount)}</strong>
                          </span>
                          {result.deferredRetentionPool > 0 && (
                            <span>
                              Al cierre: <strong style={{ color: '#fbbf24' }}>{fmt(partnerResult.deferredAmount)}</strong>
                            </span>
                          )}
                          <span style={{ color: '#60a5fa' }}>
                            Margen bruto: <strong>{partnerResult.effectiveMarginOnGross}%</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Fondo de Imprevistos / Contingencia */}
              <div className={styles.controlSection} style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                  <span style={{ color: '#94a3b8' }}>
                    Fondo de Reserva / Imprevistos: <strong>{input.distribution.contingencyFundPct}%</strong>
                  </span>
                  <span style={{ color: '#cbd5e1', fontWeight: 700 }}>{fmt(result.distribution.contingencyFund.amount)}</span>
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
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Se aparta de la bolsa líquida antes del reparto final a los socios para cubrir contingencias de obra.
                </span>
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 5: 🧾 DETALLE (AUDITORÍA FINANCIERA & EXPORT PDF)
              ========================================================= */}
          {activeTab === 'detalle' && (
            <div className={styles.visualAuditCard}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}>🧾 Liquidación Financiera Pre-Firma (Centavo a Centavo)</span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    className={styles.pdfBtn}
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    style={{ minHeight: '36px', padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    📄 {isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}
                  </button>
                  <button
                    type="button"
                    className={styles.exportBtn}
                    onClick={handleCopySummary}
                    style={{ minHeight: '36px', padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    Copiar WhatsApp
                  </button>
                </div>
              </div>

              <div className={styles.tableScrollWrap}>
                <table className={styles.ledgerTable}>
                  <thead>
                    <tr>
                      <th>Línea de Trato / Rubro</th>
                      <th className={styles.textEnd}>Tasa / %</th>
                      <th className={styles.textEnd}>Monto ({currency})</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Monto Contrato Adjudicado (Bruto)</td>
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
                    {result.iue.enabled && result.iue.payer === 'PROYECTO' && (
                      <tr>
                        <td>(-) Previsión Anual IUE (25% Proyecto)</td>
                        <td className={`${styles.textEnd} ${styles.redCut}`}>
                          {result.contractGrossAmount > 0
                            ? `-${((result.iue.deductedFromProjectPool / result.contractGrossAmount) * 100).toFixed(1)}%`
                            : '0%'}
                        </td>
                        <td className={`${styles.textEnd} ${styles.redCut}`}>
                          -{fmtPrecise(result.iue.deductedFromProjectPool)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td>(-) Primas Boletas y Pólizas Bancarias</td>
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
                    {result.titularCompany.enabled && (
                      <tr>
                        <td>
                          (-) Fee Empresa Titular ({result.titularCompany.name || 'NIT/Firma'}
                          {result.titularCompany.absorbsTaxes ? ' - Asume Impuestos' : ''})
                        </td>
                        <td className={`${styles.textEnd} ${styles.redCut}`}>
                          -{result.titularCompany.effectivePctOfGross}%
                        </td>
                        <td className={`${styles.textEnd} ${styles.redCut}`}>
                          -{fmtPrecise(result.titularCompany.amount)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td>(-) Personal & Cargas Sociales (Staffing)</td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{result.summaryMetrics.effectiveTakeRates.personnelPct}%
                      </td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{fmtPrecise(result.staffing.totalPersonnelCost)}
                      </td>
                    </tr>
                    <tr>
                      <td>(-) Costos Directos & Logística de Obra</td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{result.summaryMetrics.effectiveTakeRates.directCostsPct}%
                      </td>
                      <td className={`${styles.textEnd} ${styles.redCut}`}>
                        -{fmtPrecise(result.directCosts.total)}
                      </td>
                    </tr>
                    {!result.statutoryDeduction.isRecoverable && result.statutoryDeduction.amount > 0 && (
                      <tr>
                        <td>(-) Aporte No Recuperable a Caja de Salud</td>
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
                    {result.statutoryDeduction.isRecoverable && result.statutoryDeduction.amount > 0 && (
                      <tr>
                        <td style={{ color: '#fbbf24' }}>
                          (-) Retención Diferida (Cobro al Cierre / Recepción)
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
          )}
        </main>

        {/* =========================================================
            FLOATING STICKY BOTTOM BAR (MOBILE / APK ONLY)
            ========================================================= */}
        <div className={styles.mobileFloatingBar}>
          <div className={styles.mobileFloatingGain}>
            <span className={styles.mobileFloatingLabel}>Tu Ganancia ({partners[0]?.name?.split(' ')[0] || 'Socio 1'})</span>
            <span className={styles.mobileFloatingAmount}>
              {hasContractAmount ? fmt(result.distribution.partners[0]?.totalAmount || 0) : `0 ${currency}`}
            </span>
          </div>
          <button
            type="button"
            className={styles.mobileFloatingActionBtn}
            onClick={handleNextTab}
          >
            Pestaña: {activeTab.toUpperCase()} ➔
          </button>
        </div>
      </div>
    </div>
  );
}
