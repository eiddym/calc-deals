export type DealSessionStatus =
  | 'BORRADOR'
  | 'EN_NEGOCIACION'
  | 'ACORDADO'
  | 'CAIDO'
  | 'SUSPENDIDO';

export type TaxScenarioType =
  | 'CON_FACTURA'     // IVA (13%) + IT (3%) = 16% nominal
  | 'RETENCION_LEY'   // 12.5% IUE + 3% IT = 15.5% para servicios
  | 'SIN_FACTURA'     // 0%
  | 'PERSONALIZADO';  // Tasa definida por el usuario

export type FeeCalculationType = 'PERCENTAGE_GROSS' | 'PERCENTAGE_NET' | 'FIXED';

export interface DirectCostItem {
  id: string;
  concept: string;
  amount: number;
  category?: 'viaticos' | 'materiales' | 'subcontratos' | 'tramites' | 'otros';
}

export interface DealCalculationInput {
  // 1. Ingreso Base
  contractGrossAmount: number; // Monto bruto pactado / referencial (Bs o $)

  // 2. Escenario Fiscal
  taxScenario: {
    type: TaxScenarioType;
    customRatePct?: number; // Si es personalizado (ej. 16)
    taxCreditPct?: number;  // % de crédito fiscal que se puede descargar (ej. 30% del IVA)
  };

  // 3. Garantías y Pólizas (Costos no recuperables de emisión)
  guarantees: {
    // Boleta de Seriedad de Propuesta (usualmente 1% a 1.5% del referencial)
    hasBidBond: boolean;
    bidBondCoveragePct?: number;   // % afianzado (ej. 1.5%)
    bidBondPremiumPct?: number;    // Costo de prima de la aseguradora/banco (ej. 2.0% del afianzado)
    bidBondFixedCost?: number;     // O fee fijo bancario (ej. 350 Bs)

    // Boleta de Cumplimiento de Contrato (normativa 7% del contrato adjudicado)
    hasPerformanceBond: boolean;
    performanceBondCoveragePct?: number; // default 7%
    performanceBondPremiumPct?: number;  // Prima aseguradora (ej. 2.5% del afianzado)
    performanceBondFixedCost?: number;

    // Boleta de Anticipo (ej. 20% del contrato)
    hasAdvanceBond: boolean;
    advancePct?: number;                 // % del contrato recibido como anticipo (ej. 20%)
    advanceBondPremiumPct?: number;      // Prima aseguradora sobre el monto del anticipo
    advanceBondFixedCost?: number;
  };

  // 4. Deducciones Normativas / Retenciones en Planilla (ej. 5% de caja de salud / fondo de garantía)
  statutoryDeductions: {
    retentionRatePct: number;    // ej. 5% (caja de salud o retención por planilla)
    isRecoverable: boolean;      // true si es fondo de garantía devuelto al cierre, false si es aporte a caja
  };

  // 5. Diezmo / Comisión de Adjudicación / Intermediario
  adjudicationCommission: {
    type: 'PERCENTAGE_GROSS' | 'FIXED';
    value: number; // % sobre el bruto (ej. 10) o monto fijo en Bs
  };

  // 6. Presta-Nombre / Empresa Titular / Maquila
  titularCompany: {
    type: FeeCalculationType; // % del bruto, % del neto o fijo
    value: number;            // ej. 8% por prestar el NIT y la firma
    absorbsGuaranteesCost?: boolean; // ¿la empresa asume las primas de boletas o la bolsa común?
  };

  // 7. Costos Operativos Directos
  directCosts: {
    items: DirectCostItem[];
  };

  // 8. Reparto de la Utilidad Neta
  distribution: {
    projectManagerPct: number; // % para el proyectista / ejecutor técnico
    businessPartnerPct: number; // % para el socio comercial / gestor
    contingencyFundPct: number; // % fondo de reserva / imprevistos
  };
}

export interface DealCalculationResult {
  contractGrossAmount: number;

  // Costos financieros de pólizas/boletas
  guarantees: {
    bidBondAmountAfianzado: number;
    bidBondCost: number;
    performanceBondAmountAfianzado: number;
    performanceBondCost: number;
    advanceBondAmountAfianzado: number;
    advanceBondCost: number;
    totalGuaranteesCost: number;
  };

  // Deducción impositiva
  taxes: {
    type: TaxScenarioType;
    nominalRatePct: number;
    effectiveRatePct: number;
    taxAmount: number;
    taxCreditSavings: number;
  };

  // Retención normativa (caja / pliego)
  statutoryDeduction: {
    ratePct: number;
    amount: number;
    isRecoverable: boolean;
  };

  // Comisión / diezmo
  commission: {
    amount: number;
    effectivePctOfGross: number;
  };

  // Fee de la empresa titular (presta-nombre)
  titularCompany: {
    amount: number;
    effectivePctOfGross: number;
  };

  // Costos directos de ejecución
  directCosts: {
    total: number;
    items: DirectCostItem[];
  };

  // Resumen de deducciones no recuperables (gastos reales del proyecto)
  totalNonRecoverableExpenses: number;

  // Flujo de Caja en Dos Fases:
  // 1. Inmediato: Dinero líquido disponible durante la ejecución (después de descontar retención temporal si es recuperable)
  immediateDistributablePool: number;

  // 2. Diferido: Monto retenido que se cobrará tras recepción definitiva (si isRecoverable = true)
  deferredRetentionPool: number;

  // 3. Bolsa Neta Total (Inmediato + Diferido)
  totalNetProfitPool: number;

  // Repartición detallada
  distribution: {
    projectManager: {
      pct: number;
      immediateAmount: number;
      deferredAmount: number;
      totalAmount: number;
      effectiveMarginOnGross: number; // % de ganancia real sobre el bruto
    };
    businessPartner: {
      pct: number;
      immediateAmount: number;
      deferredAmount: number;
      totalAmount: number;
      effectiveMarginOnGross: number;
    };
    contingencyFund: {
      pct: number;
      amount: number;
    };
  };

  // Métricas de visualización y control
  summaryMetrics: {
    grossAmount: number;
    governmentAndTaxesTotal: number;  // Impuestos + aportes normativos no recuperables
    financialGuaranteesTotal: number; // Costo primas bancarias / seguros
    commercialFeesTotal: number;      // Diezmo + Fee empresa titular
    directOperatingCostsTotal: number; // Gastos de campo
    teamNetProfitTotal: number;       // Lo que le queda al equipo (Proyectista + Socios)
    effectiveTakeRates: {
      governmentPct: number;
      guaranteesPct: number;
      commercialFeesPct: number;
      directCostsPct: number;
      teamNetProfitPct: number;
    };
  };
}

export interface DealSession {
  id: string;
  name: string;
  status: DealSessionStatus;
  input: DealCalculationInput;
  result: DealCalculationResult;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
