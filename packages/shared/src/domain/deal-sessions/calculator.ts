import Decimal from 'decimal.js';
import {
  DealCalculationInput,
  DealCalculationResult,
  DealNegotiationMode,
} from './types';

function d(val: number | string | undefined | null): Decimal {
  if (val === undefined || val === null || val === '') return new Decimal(0);
  try {
    return new Decimal(val);
  } catch {
    return new Decimal(0);
  }
}

function r2(dec: Decimal): number {
  return dec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

export function calculateDeal(input: DealCalculationInput): DealCalculationResult {
  const mode: DealNegotiationMode = input.negotiationMode || 'FORMAL_LICITACION';
  const G = d(input.contractGrossAmount);

  // 1. Garantías y Pólizas (Costos no recuperables)
  const hasBid = !!input.guarantees.hasBidBond;
  const bidCoverage = d(input.guarantees.bidBondCoveragePct ?? 1.5);
  const bidAmountAfianzado = hasBid ? G.mul(bidCoverage.div(100)) : d(0);
  const bidCost = hasBid
    ? input.guarantees.bidBondFixedCost !== undefined && input.guarantees.bidBondFixedCost > 0
      ? d(input.guarantees.bidBondFixedCost)
      : bidAmountAfianzado.mul(d(input.guarantees.bidBondPremiumPct ?? 2.0).div(100))
    : d(0);

  const hasPerf = !!input.guarantees.hasPerformanceBond;
  const perfCoverage = d(input.guarantees.performanceBondCoveragePct ?? 7.0);
  const perfAmountAfianzado = hasPerf ? G.mul(perfCoverage.div(100)) : d(0);
  const perfCost = hasPerf
    ? input.guarantees.performanceBondFixedCost !== undefined && input.guarantees.performanceBondFixedCost > 0
      ? d(input.guarantees.performanceBondFixedCost)
      : perfAmountAfianzado.mul(d(input.guarantees.performanceBondPremiumPct ?? 2.5).div(100))
    : d(0);

  const hasAdv = !!input.guarantees.hasAdvanceBond;
  const advCoverage = d(input.guarantees.advancePct ?? 20.0);
  const advAmountAfianzado = hasAdv ? G.mul(advCoverage.div(100)) : d(0);
  const advCost = hasAdv
    ? input.guarantees.advanceBondFixedCost !== undefined && input.guarantees.advanceBondFixedCost > 0
      ? d(input.guarantees.advanceBondFixedCost)
      : advAmountAfianzado.mul(d(input.guarantees.advanceBondPremiumPct ?? 2.5).div(100))
    : d(0);

  const totalGuaranteesCost = bidCost.plus(perfCost).plus(advCost);

  // 2. Impuestos Mensuales (IVA + IT)
  let nominalTaxRate = d(0);
  let effectiveTaxRate = d(0);
  const taxCreditPct = Decimal.max(0, Decimal.min(100, d(input.taxScenario.taxCreditPct ?? 0)));

  switch (input.taxScenario.type) {
    case 'CON_FACTURA': {
      // 13% IVA + 3% IT = 16% nominal
      nominalTaxRate = d(16.0);
      // Descargo IVA con compras: solo reduce el 13%, el IT 3% no se compensa con compras
      const ivaNet = d(13.0).mul(d(1).minus(taxCreditPct.div(100)));
      effectiveTaxRate = ivaNet.plus(d(3.0));
      break;
    }
    case 'RETENCION_LEY': {
      nominalTaxRate = d(15.5);
      effectiveTaxRate = d(15.5);
      break;
    }
    case 'SIN_FACTURA': {
      nominalTaxRate = d(0);
      effectiveTaxRate = d(0);
      break;
    }
    case 'PERSONALIZADO': {
      nominalTaxRate = d(input.taxScenario.customRatePct ?? 0);
      effectiveTaxRate = nominalTaxRate;
      break;
    }
  }

  const nominalTaxAmount = G.mul(nominalTaxRate.div(100));
  const effectiveTaxAmount = G.mul(effectiveTaxRate.div(100));
  const taxCreditSavings = Decimal.max(0, nominalTaxAmount.minus(effectiveTaxAmount));

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

  // 7. Fee Empresa Titular (Presta-Nombre / Maquila)
  let titularCompanyAmount = d(0);
  if (input.titularCompany.type === 'FIXED') {
    titularCompanyAmount = d(input.titularCompany.value || 0);
  } else if (input.titularCompany.type === 'PERCENTAGE_NET') {
    const netBase = Decimal.max(0, G.minus(effectiveTaxAmount).minus(totalGuaranteesCost));
    titularCompanyAmount = netBase.mul(d(input.titularCompany.value || 0).div(100));
  } else {
    titularCompanyAmount = G.mul(d(input.titularCompany.value || 0).div(100));
  }

  if (input.titularCompany.absorbsGuaranteesCost) {
    titularCompanyAmount = Decimal.max(0, titularCompanyAmount.minus(totalGuaranteesCost));
  }
  const titularEffectivePct = G.gt(0) ? titularCompanyAmount.div(G).mul(100) : d(0);

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

    if (iueConfig.payer === 'PROYECTO') {
      iueDeductedFromProject = estimatedIue;
    } else if (iueConfig.payer === 'EMPRESA_TITULAR') {
      companyAbsorbedIue = estimatedIue;
    }
  }

  // 9. Cálculo de Gastos No Recuperables y Bolsas de Ganancia
  const nonRecoverableStatutory = isRecoverableRetention ? d(0) : statutoryAmount;

  const totalNonRecoverableExpenses = effectiveTaxAmount
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

  // 10. Repartición de Utilidad Neta
  const dist = input.distribution || {
    projectManagerPct: 100,
    businessPartnerPct: 0,
    contingencyFundPct: 0,
  };

  const contingencyPct = Decimal.max(0, Decimal.min(100, d(dist.contingencyFundPct || 0)));
  const contingencyAmount = totalNetProfitPool.mul(contingencyPct.div(100));

  const partnerPoolTotal = Decimal.max(0, totalNetProfitPool.minus(contingencyAmount));
  const partnerPoolImmediate = Decimal.max(0, immediateDistributablePool.mul(d(1).minus(contingencyPct.div(100))));
  const partnerPoolDeferred = deferredRetentionPool;

  const totalShares = d(dist.projectManagerPct || 0).plus(d(dist.businessPartnerPct || 0));
  const pmRatio = totalShares.gt(0) ? d(dist.projectManagerPct || 0).div(totalShares) : d(1);
  const bpRatio = totalShares.gt(0) ? d(dist.businessPartnerPct || 0).div(totalShares) : d(0);

  const pmImmediate = partnerPoolImmediate.mul(pmRatio);
  const pmDeferred = partnerPoolDeferred.mul(pmRatio);
  const pmTotal = pmImmediate.plus(pmDeferred);
  const pmMargin = G.gt(0) ? pmTotal.div(G).mul(100) : d(0);

  const bpImmediate = partnerPoolImmediate.mul(bpRatio);
  const bpDeferred = partnerPoolDeferred.mul(bpRatio);
  const bpTotal = bpImmediate.plus(bpDeferred);
  const bpMargin = G.gt(0) ? bpTotal.div(G).mul(100) : d(0);

  // 11. Métricas de Resumen
  const governmentTotal = effectiveTaxAmount.plus(nonRecoverableStatutory).plus(iueDeductedFromProject);
  const commercialFeesTotal = commissionAmount.plus(titularCompanyAmount);
  const teamNetProfitTotal = pmTotal.plus(bpTotal).plus(contingencyAmount);

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
      amount: r2(titularCompanyAmount),
      effectivePctOfGross: r2(titularEffectivePct),
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
      projectManager: {
        pct: dist.projectManagerPct,
        immediateAmount: r2(pmImmediate),
        deferredAmount: r2(pmDeferred),
        totalAmount: r2(pmTotal),
        effectiveMarginOnGross: r2(pmMargin),
      },
      businessPartner: {
        pct: dist.businessPartnerPct,
        immediateAmount: r2(bpImmediate),
        deferredAmount: r2(bpDeferred),
        totalAmount: r2(bpTotal),
        effectiveMarginOnGross: r2(bpMargin),
      },
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
  };
}
