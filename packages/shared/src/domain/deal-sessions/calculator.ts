import Decimal from 'decimal.js';
import {
  CooperativeInvestmentResult,
  DealCalculationInput,
  DealCalculationResult,
  DealNegotiationMode,
  DealPartner,
  DealPartnerResult,
  ViabilityStatus,
} from './types';

// Configuración de precisión decimal estricta para cálculos financieros
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

function d(val: number | string | undefined | null): Decimal {
  if (val === undefined || val === null || val === '') return new Decimal(0);
  try {
    return new Decimal(val);
  } catch {
    return new Decimal(0);
  }
}

function r2(val: Decimal): number {
  return val.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export function calculateDeal(input: DealCalculationInput): DealCalculationResult {
  const G = d(input.contractGrossAmount);
  const mode: DealNegotiationMode = input.negotiationMode || 'FORMAL_LICITACION';

  // 1. Costos Financieros de Boletas y Pólizas Bancarias (No recuperables)
  let bidCost = d(0);
  let bidAmountAfianzado = d(0);
  if (input.guarantees.hasBidBond) {
    const coverage = d(input.guarantees.bidBondCoveragePct || 1.5).div(100);
    const premium = d(input.guarantees.bidBondPremiumPct || 2.0).div(100);
    bidAmountAfianzado = G.mul(coverage);
    bidCost = bidAmountAfianzado.mul(premium).plus(d(input.guarantees.bidBondFixedCost || 0));
  }

  let perfCost = d(0);
  let perfAmountAfianzado = d(0);
  if (input.guarantees.hasPerformanceBond) {
    const coverage = d(input.guarantees.performanceBondCoveragePct || 7.0).div(100);
    const premium = d(input.guarantees.performanceBondPremiumPct || 2.5).div(100);
    perfAmountAfianzado = G.mul(coverage);
    perfCost = perfAmountAfianzado.mul(premium).plus(d(input.guarantees.performanceBondFixedCost || 0));
  }

  let advCost = d(0);
  let advAmountAfianzado = d(0);
  if (input.guarantees.hasAdvanceBond) {
    const advanceRate = d(input.guarantees.advancePct || 20.0).div(100);
    const premium = d(input.guarantees.advanceBondPremiumPct || 2.5).div(100);
    advAmountAfianzado = G.mul(advanceRate);
    advCost = advAmountAfianzado.mul(premium).plus(d(input.guarantees.advanceBondFixedCost || 0));
  }

  const totalGuaranteesCost = bidCost.plus(perfCost).plus(advCost);

  // 2. Carga Fiscal Mensual (IVA + IT o Retención en la Fuente)
  let nominalTaxRate = d(0);
  let effectiveTaxRate = d(0);
  let grossTaxAmount = d(0);
  let taxCreditSavings = d(0);
  let effectiveTaxAmount = d(0);

  if (input.taxScenario.type === 'CON_FACTURA') {
    nominalTaxRate = d(16); // IVA 13% + IT 3%
    grossTaxAmount = G.mul(nominalTaxRate.div(100));

    // Descargo de compras con factura (Crédito Fiscal IVA sobre el 13%)
    const creditRate = d(input.taxScenario.taxCreditPct || 0).div(100);
    taxCreditSavings = G.mul(d(13).div(100)).mul(creditRate);
    effectiveTaxAmount = Decimal.max(0, grossTaxAmount.minus(taxCreditSavings));
    effectiveTaxRate = G.gt(0) ? effectiveTaxAmount.div(G).mul(100) : nominalTaxRate;
  } else if (input.taxScenario.type === 'RETENCION_LEY') {
    nominalTaxRate = d(15.5); // 12.5% IUE + 3% IT servicios
    effectiveTaxRate = nominalTaxRate;
    grossTaxAmount = G.mul(nominalTaxRate.div(100));
    effectiveTaxAmount = grossTaxAmount;
  } else if (input.taxScenario.type === 'PERSONALIZADO') {
    nominalTaxRate = d(input.taxScenario.customRatePct || 0);
    effectiveTaxRate = nominalTaxRate;
    grossTaxAmount = G.mul(nominalTaxRate.div(100));
    effectiveTaxAmount = grossTaxAmount;
  } else {
    // SIN_FACTURA
    nominalTaxRate = d(0);
    effectiveTaxRate = d(0);
    grossTaxAmount = d(0);
    effectiveTaxAmount = d(0);
  }

  // 3. Personal y Asignación de Recursos (Staffing)
  let totalPersonnelCost = d(0);
  let directSitePersonnelCost = d(0);
  let adminPersonnelCost = d(0);
  let formalPersonnelCost = d(0); // Deducible para IUE
  let informalPersonnelCost = d(0);

  const assignments = input.staffing?.assignments || [];
  for (const asg of assignments) {
    const qty = d(asg.quantity || 1);
    const months = d(asg.durationMonths || 1);
    const salary = d(asg.monthlySalary || 0);
    const burden = d(asg.laborBurdenPct || 0).div(100);
    const personCost = salary.mul(d(1).plus(burden)).mul(qty).mul(months);

    totalPersonnelCost = totalPersonnelCost.plus(personCost);

    if (asg.isDirectSiteCost) {
      directSitePersonnelCost = directSitePersonnelCost.plus(personCost);
    } else {
      adminPersonnelCost = adminPersonnelCost.plus(personCost);
    }

    if (asg.hasFormalPayroll) {
      formalPersonnelCost = formalPersonnelCost.plus(personCost);
    } else {
      informalPersonnelCost = informalPersonnelCost.plus(personCost);
    }
  }

  // 4. Costos Operativos Directos
  const directCostsItems = input.directCosts?.items || [];
  let directCostsTotal = d(0);
  let deductibleDirectCosts = d(0);
  let nonDeductibleDirectCosts = d(0);

  for (const item of directCostsItems) {
    const itemAmt = d(item.amount || 0);
    directCostsTotal = directCostsTotal.plus(itemAmt);
    if (item.isTaxDeductible !== false) {
      deductibleDirectCosts = deductibleDirectCosts.plus(itemAmt);
    } else {
      nonDeductibleDirectCosts = nonDeductibleDirectCosts.plus(itemAmt);
    }
  }

  // 5. Retención Normativa / Caja de Salud (5% a 7%)
  const retentionRate = d(input.statutoryDeductions.retentionRatePct || 0);
  const statutoryAmount = G.mul(retentionRate.div(100));
  const isRecoverableRetention = !!input.statutoryDeductions.isRecoverable;

  // 6. Diezmo / Comisión de Adjudicación
  let commissionAmount = d(0);
  if (input.adjudicationCommission.type === 'FIXED') {
    commissionAmount = d(input.adjudicationCommission.value || 0);
  } else {
    commissionAmount = G.mul(d(input.adjudicationCommission.value || 0).div(100));
  }
  const commissionEffectivePct = G.gt(0) ? commissionAmount.div(G).mul(100) : d(0);

  // 7. Fee Empresa Titular (Presta-Nombre / Maquila) & Análisis de Varianza
  const titularConfig = input.titularCompany || {
    type: 'PERCENTAGE_GROSS',
    value: 0,
    enabled: false,
    absorbsTaxes: false,
    absorbsGuaranteesCost: false,
    absorbsAdminExpenses: false,
  };

  const isTitularEnabled = titularConfig.enabled !== false && (titularConfig.value || 0) > 0;
  let titularCompanyAmount = d(0);

  if (isTitularEnabled) {
    if (titularConfig.type === 'FIXED') {
      titularCompanyAmount = d(titularConfig.value || 0);
    } else if (titularConfig.type === 'PERCENTAGE_NET') {
      const netBase = Decimal.max(0, G.minus(effectiveTaxAmount).minus(totalGuaranteesCost));
      titularCompanyAmount = netBase.mul(d(titularConfig.value || 0).div(100));
    } else {
      titularCompanyAmount = G.mul(d(titularConfig.value || 0).div(100));
    }

    if (titularConfig.absorbsGuaranteesCost) {
      titularCompanyAmount = Decimal.max(0, titularCompanyAmount.minus(totalGuaranteesCost));
    }
  }

  const titularEffectivePct = G.gt(0) ? titularCompanyAmount.div(G).mul(100) : d(0);
  const titularAbsorbsTaxes = isTitularEnabled && !!titularConfig.absorbsTaxes;

  // 8. Módulo de IUE Anual (25%)
  const iueConfig = input.iueTax || { enabled: false, ratePct: 25, payer: 'EXENTO' };
  let estimatedIue = d(0);
  let iueDeductedFromProject = d(0);
  let companyAbsorbedIue = d(0);
  let taxableProfitBase = d(0);

  const deductibleExpenses = formalPersonnelCost
    .plus(deductibleDirectCosts)
    .plus(totalGuaranteesCost)
    .plus(effectiveTaxAmount)
    .plus(titularCompanyAmount);

  const nonDeductibleExpenses = informalPersonnelCost
    .plus(nonDeductibleDirectCosts)
    .plus(commissionAmount);

  if (iueConfig.enabled && input.taxScenario.type !== 'SIN_FACTURA') {
    taxableProfitBase = Decimal.max(0, G.minus(deductibleExpenses));
    const iueRate = d(iueConfig.ratePct || 25).div(100);
    estimatedIue = taxableProfitBase.mul(iueRate);

    if (iueConfig.payer === 'PROYECTO' && !titularAbsorbsTaxes) {
      iueDeductedFromProject = estimatedIue;
    } else if (iueConfig.payer === 'EMPRESA_TITULAR' || titularAbsorbsTaxes) {
      companyAbsorbedIue = estimatedIue;
    }
  }

  // 9. Cálculo de Gastos No Recuperables y Bolsas de Ganancia
  // Si la empresa titular asume los impuestos, NO se le descuentan al equipo que ejecuta
  const projectEffectiveTaxes = titularAbsorbsTaxes ? d(0) : effectiveTaxAmount;
  const nonRecoverableStatutory = isRecoverableRetention ? d(0) : statutoryAmount;

  const totalNonRecoverableExpenses = projectEffectiveTaxes
    .plus(totalGuaranteesCost)
    .plus(commissionAmount)
    .plus(titularCompanyAmount)
    .plus(totalPersonnelCost)
    .plus(directCostsTotal)
    .plus(nonRecoverableStatutory)
    .plus(iueDeductedFromProject);

  const totalNetProfitPool = Decimal.max(0, G.minus(totalNonRecoverableExpenses));
  const deferredRetentionPool = isRecoverableRetention ? statutoryAmount : d(0);
  const immediateDistributablePool = Decimal.max(0, totalNetProfitPool.minus(deferredRetentionPool));

  // Análisis de Varianza (Titular asume impuestos vs Equipo asume impuestos)
  const taxesVarianceAmount = effectiveTaxAmount.plus(iueConfig.enabled ? estimatedIue : d(0));
  const teamNetGainIfTitularAbsorbs = Decimal.max(
    0,
    G.minus(totalGuaranteesCost)
      .minus(commissionAmount)
      .minus(titularCompanyAmount)
      .minus(totalPersonnelCost)
      .minus(directCostsTotal)
      .minus(nonRecoverableStatutory)
  );
  const teamNetGainIfTeamAbsorbs = Decimal.max(
    0,
    teamNetGainIfTitularAbsorbs.minus(taxesVarianceAmount)
  );

  const varianceAnalysis = {
    ifTitularAbsorbsTaxes: {
      teamNetGain: r2(teamNetGainIfTitularAbsorbs),
      teamLiquidGain: r2(Decimal.max(0, teamNetGainIfTitularAbsorbs.minus(deferredRetentionPool))),
      effectiveMargin: G.gt(0) ? r2(teamNetGainIfTitularAbsorbs.div(G).mul(100)) : 0,
    },
    ifTeamAbsorbsTaxes: {
      teamNetGain: r2(teamNetGainIfTeamAbsorbs),
      teamLiquidGain: r2(Decimal.max(0, teamNetGainIfTeamAbsorbs.minus(deferredRetentionPool))),
      effectiveMargin: G.gt(0) ? r2(teamNetGainIfTeamAbsorbs.div(G).mul(100)) : 0,
    },
    taxBurdenDifference: r2(teamNetGainIfTitularAbsorbs.minus(teamNetGainIfTeamAbsorbs)),
  };

  // 10. Repartición de Utilidad Neta (Multi-Socio Dinámico)
  const dist = input.distribution || {
    contingencyFundPct: 0,
  };

  const contingencyPct = Decimal.max(0, Decimal.min(100, d(dist.contingencyFundPct || 0)));
  const contingencyAmount = totalNetProfitPool.mul(contingencyPct.div(100));

  const partnerPoolTotal = Decimal.max(0, totalNetProfitPool.minus(contingencyAmount));
  const partnerPoolImmediate = Decimal.max(
    0,
    immediateDistributablePool.mul(d(1).minus(contingencyPct.div(100)))
  );
  const partnerPoolDeferred = deferredRetentionPool;

  // Obtener lista de socios (dinámica o por defecto proyectista + socio)
  let partnersInput: DealPartner[] = [];
  if (dist.partners && dist.partners.length > 0) {
    partnersInput = dist.partners;
  } else {
    const pmPct = dist.projectManagerPct !== undefined ? dist.projectManagerPct : 100;
    const bpPct = dist.businessPartnerPct !== undefined ? dist.businessPartnerPct : 0;
    partnersInput = [
      { id: 'partner-pm', name: 'Proyectista (Técnico)', role: 'Proyectista Responsable', pct: pmPct },
      { id: 'partner-bp', name: 'Socio Gestor', role: 'Gestor Comercial', pct: bpPct },
    ];
  }

  const totalPartnerShares = partnersInput.reduce((acc, p) => acc.plus(d(p.pct || 0)), d(0));

  const calculatedPartners: DealPartnerResult[] = partnersInput.map((p) => {
    const shareRatio = totalPartnerShares.gt(0) ? d(p.pct || 0).div(totalPartnerShares) : d(0);
    const imm = partnerPoolImmediate.mul(shareRatio);
    const def = partnerPoolDeferred.mul(shareRatio);
    const tot = imm.plus(def);
    const margin = G.gt(0) ? tot.div(G).mul(100) : d(0);

    return {
      id: p.id,
      name: p.name || 'Socio',
      role: p.role || 'Participante',
      pct: p.pct || 0,
      immediateAmount: r2(imm),
      deferredAmount: r2(def),
      totalAmount: r2(tot),
      effectiveMarginOnGross: r2(margin),
    };
  });

  // Mapeos de compatibilidad con código anterior (Proyectista y Socio Gestor)
  const pmResult = calculatedPartners[0] || {
    id: 'partner-pm',
    name: 'Proyectista',
    role: 'Técnico',
    pct: 100,
    immediateAmount: r2(partnerPoolImmediate),
    deferredAmount: r2(partnerPoolDeferred),
    totalAmount: r2(partnerPoolTotal),
    effectiveMarginOnGross: G.gt(0) ? r2(partnerPoolTotal.div(G).mul(100)) : 0,
  };

  const bpResult = calculatedPartners[1] || {
    id: 'partner-bp',
    name: 'Socio Gestor',
    role: 'Comercial',
    pct: 0,
    immediateAmount: 0,
    deferredAmount: 0,
    totalAmount: 0,
    effectiveMarginOnGross: 0,
  };

  // 11. Métricas de Resumen
  const governmentTotal = projectEffectiveTaxes.plus(nonRecoverableStatutory).plus(iueDeductedFromProject);
  const commercialFeesTotal = commissionAmount.plus(titularCompanyAmount);
  const teamNetProfitTotal = totalNetProfitPool;

  // 12. Enfoque Especial: Cooperativa / Inversión Minera Centrada en Capital del Inversionista
  let coopResult: CooperativeInvestmentResult | undefined = undefined;
  if (mode === 'COOPERATIVA_INVERSION' || input.cooperativeInvestment) {
    const ci = input.cooperativeInvestment || {
      investorCapital: 0,
      durationMonths: 12,
      investorSharePct: 70,
      cooperativeSharePct: 30,
      operatingCostsEstimated: directCostsTotal.toNumber(),
      canonComunalPct: input.statutoryDeductions.retentionRatePct || 5,
      targetInvestorRoiPct: 35,
      minCooperativeIncome: 0,
      projectedGrossRevenue: G.toNumber(),
    };

    const invCap = d(ci.investorCapital || 0);
    const durMonths = Decimal.max(1, d(ci.durationMonths || 12));
    const invPct = d(ci.investorSharePct !== undefined ? ci.investorSharePct : 70);
    const coopPct = d(ci.cooperativeSharePct !== undefined ? ci.cooperativeSharePct : 30);

    const opex = ci.operatingCostsEstimated !== undefined
      ? d(ci.operatingCostsEstimated)
      : directCostsTotal.plus(totalPersonnelCost);

    const canonPct = d(ci.canonComunalPct !== undefined ? ci.canonComunalPct : 5);

    const projectedGross = ci.projectedGrossRevenue !== undefined && ci.projectedGrossRevenue > 0
      ? d(ci.projectedGrossRevenue)
      : G;

    const canonAmount = projectedGross.mul(canonPct.div(100));
    const netSurplus = Decimal.max(0, projectedGross.minus(opex).minus(canonAmount));

    const invPayout = netSurplus.mul(invPct.div(100));
    const invNetProfit = invPayout.minus(invCap);
    const invRoi = invCap.gt(0) ? invNetProfit.div(invCap).mul(100) : d(0);
    const invMonthly = durMonths.gt(0) ? invPayout.div(durMonths) : d(0);

    let paybackMonths = d(999);
    if (invMonthly.gt(0)) {
      paybackMonths = invCap.div(invMonthly);
    } else if (invCap.isZero()) {
      paybackMonths = d(0);
    }

    const targetRoi = d(ci.targetInvestorRoiPct !== undefined ? ci.targetInvestorRoiPct : 35);
    let invStatus: ViabilityStatus = 'ROJO';
    let invStatusMsg = '';

    if (invNetProfit.lt(0)) {
      invStatus = 'ROJO';
      invStatusMsg = `Pérdida de capital (-${r2(invNetProfit.abs())} Bs). No recupera la inversión en ${durMonths.toNumber()} meses.`;
    } else if (invRoi.lt(targetRoi)) {
      invStatus = 'AMARILLO';
      invStatusMsg = `Recupera capital en ${r2(paybackMonths)} meses con ROI de ${r2(invRoi)}%, por debajo del objetivo (${r2(targetRoi)}%).`;
    } else {
      invStatus = 'VERDE';
      invStatusMsg = `Excelente retorno: ROI del ${r2(invRoi)}% (supera objetivo de ${r2(targetRoi)}%) con payback en ${r2(paybackMonths)} meses.`;
    }

    const coopPayout = netSurplus.mul(coopPct.div(100));
    const coopMonthly = durMonths.gt(0) ? coopPayout.div(durMonths) : d(0);
    const minCoop = d(ci.minCooperativeIncome || 0);

    let coopStatus: ViabilityStatus = 'ROJO';
    let coopStatusMsg = '';

    if (coopPayout.lte(0)) {
      coopStatus = 'ROJO';
      coopStatusMsg = 'Sin excedente generado para los socios de la cooperativa.';
    } else if (minCoop.gt(0) && coopPayout.lt(minCoop)) {
      coopStatus = 'AMARILLO';
      coopStatusMsg = `Genera ${r2(coopPayout)} Bs (${r2(coopMonthly)} Bs/mes), por debajo del mínimo esperado (${r2(minCoop)} Bs).`;
    } else {
      coopStatus = 'VERDE';
      coopStatusMsg = `Meta cumplida: Genera ${r2(coopPayout)} Bs (${r2(coopMonthly)} Bs/mes) para la cooperativa.`;
    }

    let overallStatus: ViabilityStatus = 'ROJO';
    let overallMsg = '';
    if (invStatus === 'ROJO' || coopStatus === 'ROJO') {
      overallStatus = 'ROJO';
      overallMsg = 'Trato Inviable: La producción o los costos actuales no cubren la inversión ni el mínimo operativo.';
    } else if (invStatus === 'AMARILLO' || coopStatus === 'AMARILLO') {
      overallStatus = 'AMARILLO';
      overallMsg = 'Zona de Tensión: Ambas partes tienen retornos positivos pero una está por debajo de sus expectativas.';
    } else {
      overallStatus = 'VERDE';
      overallMsg = 'Zona Verde: Acuerdo equilibrado y rentable para ambas partes. Listo para firma de acta.';
    }

    const targetInvestorReturn = invCap.mul(d(1).plus(targetRoi.div(100)));
    const reqSurplusInvestor = invPct.gt(0) ? targetInvestorReturn.div(invPct.div(100)) : d(0);
    const reqSurplusCoop = coopPct.gt(0) ? minCoop.div(coopPct.div(100)) : d(0);
    const maxReqSurplus = Decimal.max(reqSurplusInvestor, reqSurplusCoop);
    const canonFactor = Decimal.max(0.01, d(1).minus(canonPct.div(100)));
    const breakEvenGross = maxReqSurplus.plus(opex).div(canonFactor);

    coopResult = {
      investorCapital: r2(invCap),
      durationMonths: r2(durMonths),
      investorSharePct: r2(invPct),
      cooperativeSharePct: r2(coopPct),
      operatingCostsEstimated: r2(opex),
      canonComunalPct: r2(canonPct),
      canonComunalAmount: r2(canonAmount),
      projectedGrossRevenue: r2(projectedGross),
      netDistributableSurplus: r2(netSurplus),
      investorPayout: r2(invPayout),
      investorNetProfit: r2(invNetProfit),
      investorRoiPct: r2(invRoi),
      targetInvestorRoiPct: r2(targetRoi),
      investorPaybackMonths: r2(paybackMonths),
      investorMonthlyAverage: r2(invMonthly),
      investorStatus: invStatus,
      investorStatusMessage: invStatusMsg,
      minCooperativeIncome: r2(minCoop),
      cooperativePayout: r2(coopPayout),
      cooperativeMonthlyIncome: r2(coopMonthly),
      cooperativeStatus: coopStatus,
      cooperativeStatusMessage: coopStatusMsg,
      overallDealStatus: overallStatus,
      overallDealMessage: overallMsg,
      breakEvenRevenueRequired: r2(breakEvenGross),
      cooperativePayoutAtBreakEven: r2(maxReqSurplus.mul(coopPct.div(100))),
      investorPayoutAtBreakEven: r2(maxReqSurplus.mul(invPct.div(100))),
    };
  }

  return {
    contractGrossAmount: r2(G),
    negotiationMode: mode,
    guarantees: {
      bidBondAmountAfianzado: r2(bidAmountAfianzado),
      bidBondCost: r2(bidCost),
      performanceBondAmountAfianzado: r2(perfAmountAfianzado),
      performanceBondCost: r2(perfCost),
      advanceBondAmountAfianzado: r2(advAmountAfianzado),
      advanceBondCost: r2(advCost),
      totalGuaranteesCost: r2(totalGuaranteesCost),
    },
    taxes: {
      type: input.taxScenario.type,
      nominalRatePct: r2(nominalTaxRate),
      effectiveRatePct: r2(effectiveTaxRate),
      taxAmount: r2(effectiveTaxAmount),
      taxCreditSavings: r2(taxCreditSavings),
    },
    iue: {
      enabled: !!iueConfig.enabled,
      ratePct: r2(d(iueConfig.ratePct || 25)),
      payer: iueConfig.payer || 'EXENTO',
      deductibleExpensesTotal: r2(deductibleExpenses),
      nonDeductibleExpensesTotal: r2(nonDeductibleExpenses),
      taxableProfitBase: r2(taxableProfitBase),
      estimatedIueAmount: r2(estimatedIue),
      deductedFromProjectPool: r2(iueDeductedFromProject),
      companyAbsorbedIue: r2(companyAbsorbedIue),
    },
    statutoryDeduction: {
      ratePct: r2(retentionRate),
      amount: r2(statutoryAmount),
      isRecoverable: isRecoverableRetention,
    },
    commission: {
      amount: r2(commissionAmount),
      effectivePctOfGross: r2(commissionEffectivePct),
    },
    titularCompany: {
      enabled: isTitularEnabled,
      name: titularConfig.name,
      amount: r2(titularCompanyAmount),
      effectivePctOfGross: r2(titularEffectivePct),
      absorbsTaxes: titularAbsorbsTaxes,
      absorbsGuaranteesCost: !!titularConfig.absorbsGuaranteesCost,
      absorbsAdminExpenses: !!titularConfig.absorbsAdminExpenses,
      varianceAnalysis,
    },
    staffing: {
      totalPersonnelCost: r2(totalPersonnelCost),
      directSitePersonnelCost: r2(directSitePersonnelCost),
      administrativePersonnelCost: r2(adminPersonnelCost),
      assignmentsCount: assignments.length,
    },
    directCosts: {
      total: r2(directCostsTotal),
      items: directCostsItems,
    },
    totalNonRecoverableExpenses: r2(totalNonRecoverableExpenses),
    immediateDistributablePool: r2(immediateDistributablePool),
    deferredRetentionPool: r2(deferredRetentionPool),
    totalNetProfitPool: r2(totalNetProfitPool),
    distribution: {
      partners: calculatedPartners,
      projectManager: pmResult,
      businessPartner: bpResult,
      contingencyFund: {
        pct: r2(contingencyPct),
        amount: r2(contingencyAmount),
      },
    },
    summaryMetrics: {
      grossAmount: r2(G),
      governmentAndTaxesTotal: r2(governmentTotal),
      financialGuaranteesTotal: r2(totalGuaranteesCost),
      commercialFeesTotal: r2(commercialFeesTotal),
      personnelCostsTotal: r2(totalPersonnelCost),
      directOperatingCostsTotal: r2(directCostsTotal),
      teamNetProfitTotal: r2(teamNetProfitTotal),
      effectiveTakeRates: {
        governmentPct: G.gt(0) ? r2(governmentTotal.div(G).mul(100)) : 0,
        guaranteesPct: G.gt(0) ? r2(totalGuaranteesCost.div(G).mul(100)) : 0,
        commercialFeesPct: G.gt(0) ? r2(commercialFeesTotal.div(G).mul(100)) : 0,
        personnelPct: G.gt(0) ? r2(totalPersonnelCost.div(G).mul(100)) : 0,
        directCostsPct: G.gt(0) ? r2(directCostsTotal.div(G).mul(100)) : 0,
        teamNetProfitPct: G.gt(0) ? r2(teamNetProfitTotal.div(G).mul(100)) : 0,
      },
    },
    cooperativeInvestment: coopResult,
  };
}
