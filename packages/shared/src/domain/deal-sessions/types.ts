export type DealSessionStatus =
  | 'BORRADOR'
  | 'EN_NEGOCIACION'
  | 'ACORDADO'
  | 'CAIDO'
  | 'SUSPENDIDO';

export type DealNegotiationMode =
  | 'FORMAL_LICITACION'    // Licitaciones estatales / SICOES / Corporativas (Impuestos + Boletas + Retención + IUE)
  | 'SOCIOS_INTERNO'       // Acuerdos entre socios privados (Sin factura, foco en reparto y costos de personal)
  | 'COOPERATIVA_INVERSION' // Minería, áridos, inversión comunitaria (Canon / participación comunitaria)
  | 'SIMPLIFICADO';        // Cotización rápida en campo (Bruto, gastos y ganancia neta)

export type TaxScenarioType =
  | 'CON_FACTURA'     // IVA (13%) + IT (3%) = 16% nominal
  | 'RETENCION_LEY'   // 12.5% IUE + 3% IT = 15.5% para servicios
  | 'SIN_FACTURA'     // 0%
  | 'PERSONALIZADO';  // Tasa definida por el usuario

export type IuePayerType =
  | 'PROYECTO'        // Se descuenta de la bolsa líquida de los técnicos/socios que hacen la obra
  | 'EMPRESA_TITULAR' // Lo asume la empresa titular que prestó el NIT como parte de su servicio
  | 'EXENTO';         // Trato informal o régimen no sujeto a IUE

export type FeeCalculationType = 'PERCENTAGE_GROSS' | 'PERCENTAGE_NET' | 'FIXED';

export interface DirectCostItem {
  id: string;
  concept: string;
  amount: number;
  isTaxDeductible?: boolean; // ¿Cuenta con factura/recibo formal deducible de IUE?
  category?: 'viaticos' | 'materiales' | 'subcontratos' | 'tramites' | 'otros';
}

export interface StaffAssignment {
  id: string;
  role: string;               // ej. "Ingeniero Residente", "Topógrafo", "Cadista"
  quantity: number;           // Cantidad de personas
  durationMonths: number;     // Meses de duración
  monthlySalary: number;      // Salario mensual líquido pactado
  laborBurdenPct: number;     // Carga social y beneficios (ej. 33.37% o 0% si es consultor por producto)
  isDirectSiteCost: boolean;  // true: costo directo de obra | false: costo administrativo
  hasFormalPayroll: boolean;  // true: en planilla formal deducible de IUE | false: pago en mano
}

export interface DealPartner {
  id: string;
  name: string;        // ej. "Ing. Residente", "Socio Gestor", "Inversionista", "Socio Legal"
  role: string;        // ej. "Proyectista", "Gestor Comercial", "Financista", "Asesor"
  pct: number;         // Porcentaje de la utilidad neta asignado (0 - 100)
}

export interface DealPartnerResult {
  id: string;
  name: string;
  role: string;
  pct: number;
  immediateAmount: number;     // Disponible en mano durante ejecución
  deferredAmount: number;      // Cobro diferido al Acta de Recepción Definitiva
  totalAmount: number;         // Total líquido + diferido
  effectiveMarginOnGross: number; // Margen real sobre el monto bruto licitado (%)
}

export interface DealCalculationInput {
  // Modo de Negociación Activo
  negotiationMode?: DealNegotiationMode;

  // 1. Ingreso Base
  contractGrossAmount: number; // Monto bruto pactado / referencial (Bs o $)

  // 2. Escenario Fiscal Mensual (IVA + IT)
  taxScenario: {
    type: TaxScenarioType;
    customRatePct?: number; // Si es personalizado (ej. 16)
    taxCreditPct?: number;  // % de crédito fiscal que se puede descargar (ej. 30% del IVA)
  };

  // 2.1 Módulo Tributario Anual (IUE 25%)
  iueTax: {
    enabled: boolean;            // ¿Calcular previsión de IUE anual?
    ratePct: number;             // 25% por ley en Bolivia
    payer: IuePayerType;         // ¿Quién absorbe el pago del IUE?
  };

  // 3. Garantías y Pólizas (Costos no recuperables de emisión)
  guarantees: {
    hasBidBond: boolean;
    bidBondCoveragePct?: number;   // % afianzado (ej. 1.5%)
    bidBondPremiumPct?: number;    // Prima aseguradora/banco (ej. 2.0%)
    bidBondFixedCost?: number;     // O fee fijo bancario

    hasPerformanceBond: boolean;
    performanceBondCoveragePct?: number; // default 7% normativo
    performanceBondPremiumPct?: number;  // Prima aseguradora (ej. 2.5%)
    performanceBondFixedCost?: number;

    hasAdvanceBond: boolean;
    advancePct?: number;                 // % anticipo recibido (ej. 20%)
    advanceBondPremiumPct?: number;      // Prima aseguradora sobre anticipo
    advanceBondFixedCost?: number;
  };

  // 4. Deducciones Normativas / Retenciones en Planilla (5% a 7% Caja de Salud o Garantía)
  statutoryDeductions: {
    retentionRatePct: number;    // ej. 5% o 7%
    isRecoverable: boolean;      // true si se devuelve en Recepción Definitiva, false si aporte a fondo perdido
  };

  // 5. Diezmo / Comisión de Adjudicación / Intermediario
  adjudicationCommission: {
    type: 'PERCENTAGE_GROSS' | 'FIXED';
    value: number; // % sobre el bruto o monto fijo en Bs
    isTaxDeductible?: boolean; // Típicamente false (se paga en mano, por lo que no descuenta IUE)
  };

  // 6. Presta-Nombre / Empresa Titular / Maquila
  titularCompany: {
    enabled?: boolean;                // Switch para habilitar / deshabilitar empresa presta-nombre
    name?: string;                    // Razón social o nombre de la empresa titular
    type: FeeCalculationType;        // % del bruto, % del neto o fijo
    value: number;                   // ej. 8% por prestar el NIT y la firma
    absorbsTaxes?: boolean;          // ¿La empresa asume los impuestos (IVA/IT e IUE) dentro de su fee?
    absorbsGuaranteesCost?: boolean; // ¿La empresa asume las primas de boletas?
    absorbsAdminExpenses?: boolean;  // ¿La empresa asume costos administrativos?
  };

  // 7. Personal y Asignación de Recursos (Staffing)
  staffing: {
    assignments: StaffAssignment[];
  };

  // 8. Costos Operativos Directos
  directCosts: {
    items: DirectCostItem[];
  };

  // 9. Reparto de la Utilidad Neta (Soporta múltiples socios dinámicos)
  distribution: {
    partners?: DealPartner[];   // Lista de socios dinámicos con % personalizado
    projectManagerPct?: number; // Para compatibilidad
    businessPartnerPct?: number;// Para compatibilidad
    contingencyFundPct: number; // % Fondo de reserva / imprevistos
  };

  // 10. Enfoque Especial: Inversión en Cooperativa Minera / Producción
  cooperativeInvestment?: CooperativeInvestmentInput;
}

export type ViabilityStatus = 'VERDE' | 'AMARILLO' | 'ROJO';

export interface CooperativeInvestmentInput {
  investorCapital: number;            // Capital aportado por el inversionista (Bs)
  durationMonths: number;             // Duración estimada del contrato/ciclo (meses)
  investorSharePct: number;           // % de la utilidad o producción para el inversionista (ej. 70%)
  cooperativeSharePct: number;        // % de la utilidad o producción para la cooperativa (ej. 30%)
  operatingCostsEstimated: number;    // Costos operativos estimados del periodo (OPEX de insumos/maquinaria)
  canonComunalPct?: number;           // % Canon comunal o aporte a la comunidad (ej. 5%)
  targetInvestorRoiPct?: number;      // Retorno mínimo aceptable / Target ROI (%) del inversionista (ej. 40%)
  minCooperativeIncome?: number;      // Mínimo aceptable para la cooperativa (Bs total en el periodo)
  projectedGrossRevenue?: number;     // Ingreso proyectado por venta de mineral / producción
}

export interface CooperativeInvestmentResult {
  investorCapital: number;
  durationMonths: number;
  investorSharePct: number;
  cooperativeSharePct: number;
  operatingCostsEstimated: number;
  canonComunalPct: number;
  canonComunalAmount: number;
  projectedGrossRevenue: number;
  netDistributableSurplus: number;    // Excedente neto a repartir (Ingreso - OPEX - Canon)

  // Métricas Inversionista
  targetInvestorRoiPct: number;       // Meta de ROI del inversionista (ej. 40%)
  investorPayout: number;             // Retorno bruto total cobrado
  investorNetProfit: number;          // Retorno bruto - Capital aportado
  investorRoiPct: number;             // (investorNetProfit / investorCapital) * 100
  investorPaybackMonths: number;      // Meses estimados para recuperar el capital aportado
  investorMonthlyAverage: number;     // Retorno promedio mensual
  investorStatus: ViabilityStatus;    // Semáforo inversionista
  investorStatusMessage: string;

  // Métricas Cooperativa
  minCooperativeIncome: number;       // Meta mínima exigida por la cooperativa
  cooperativePayout: number;          // Monto total recibido por la cooperativa
  cooperativeMonthlyIncome: number;   // Monto promedio mensual recibido
  cooperativeStatus: ViabilityStatus; // Semáforo cooperativa
  cooperativeStatusMessage: string;

  // Viabilidad global del acuerdo
  overallDealStatus: ViabilityStatus;
  overallDealMessage: string;

  // Punto de equilibrio y requerimiento inverso
  breakEvenRevenueRequired: number;   // Ingreso mínimo bruto necesario para satisfacer ambas metas
  cooperativePayoutAtBreakEven: number;
  investorPayoutAtBreakEven: number;
}

export interface DealCalculationResult {
  contractGrossAmount: number;
  negotiationMode: DealNegotiationMode;

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

  // Deducción impositiva mensual (IVA + IT)
  taxes: {
    type: TaxScenarioType;
    nominalRatePct: number;
    effectiveRatePct: number;
    taxAmount: number;
    taxCreditSavings: number;
  };

  // Previsión de IUE Anual (25%)
  iue: {
    enabled: boolean;
    ratePct: number;
    payer: IuePayerType;
    deductibleExpensesTotal: number;    // Gastos formales que bajan el IUE
    nonDeductibleExpensesTotal: number; // Gastos informales (diezmo, sin factura) que NO bajan el IUE
    taxableProfitBase: number;          // Utilidad neta imponible ante el SIN
    estimatedIueAmount: number;         // 25% de la utilidad imponible
    deductedFromProjectPool: number;    // Descontado de la ganancia si payer === 'PROYECTO'
    companyAbsorbedIue: number;         // Si payer === 'EMPRESA_TITULAR'
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

  // Fee de la empresa titular (presta-nombre) y análisis de varianza
  titularCompany: {
    enabled: boolean;
    name?: string;
    amount: number;
    effectivePctOfGross: number;
    absorbsTaxes: boolean;
    absorbsGuaranteesCost: boolean;
    absorbsAdminExpenses: boolean;
    varianceAnalysis: {
      ifTitularAbsorbsTaxes: {
        teamNetGain: number;
        teamLiquidGain: number;
        effectiveMargin: number;
      };
      ifTeamAbsorbsTaxes: {
        teamNetGain: number;
        teamLiquidGain: number;
        effectiveMargin: number;
      };
      taxBurdenDifference: number; // Monto extra que gana el equipo si la titular absorbe impuestos
    };
  };

  // Personal y Staffing
  staffing: {
    totalPersonnelCost: number;
    directSitePersonnelCost: number;
    administrativePersonnelCost: number;
    assignmentsCount: number;
  };

  // Costos directos de ejecución
  directCosts: {
    total: number;
    items: DirectCostItem[];
  };

  // Resumen de deducciones no recuperables (gastos reales del proyecto)
  totalNonRecoverableExpenses: number;

  // Flujo de Caja en Dos Fases:
  immediateDistributablePool: number; // Disponible durante la ejecución
  deferredRetentionPool: number;      // Retención temporal cobrada en Recepción Definitiva
  totalNetProfitPool: number;         // Inmediato + Diferido

  // Repartición detallada de socios
  distribution: {
    partners: DealPartnerResult[];     // Lista completa de socios calculados
    projectManager: DealPartnerResult; // Para compatibilidad
    businessPartner: DealPartnerResult;// Para compatibilidad
    contingencyFund: {
      pct: number;
      amount: number;
    };
  };

  // Métricas de visualización y control
  summaryMetrics: {
    grossAmount: number;
    governmentAndTaxesTotal: number;  // Impuestos (IVA/IT + IUE de proyecto)
    financialGuaranteesTotal: number; // Costo primas bancarias / seguros
    commercialFeesTotal: number;      // Diezmo + Fee empresa titular
    personnelCostsTotal: number;      // Planilla de personal
    directOperatingCostsTotal: number; // Gastos de campo e insumos
    teamNetProfitTotal: number;       // Lo que le queda al equipo
    effectiveTakeRates: {
      governmentPct: number;
      guaranteesPct: number;
      commercialFeesPct: number;
      personnelPct: number;
      directCostsPct: number;
      teamNetProfitPct: number;
    };
  };

  // Enfoque Cooperativa - Inversión (Métricas de Inversión, Payback y Semáforos)
  cooperativeInvestment?: CooperativeInvestmentResult;
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
