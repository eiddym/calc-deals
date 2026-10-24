import {
  DealCalculationInput,
  DealCalculationResult,
  TaxScenarioType,
} from './types';

export function calculateDeal(input: DealCalculationInput): DealCalculationResult {
  const G = Number(input.contractGrossAmount) || 0;

  // 1. Garantías y Pólizas
  const hasBid = !!input.guarantees.hasBidBond;
  const bidCoverage = input.guarantees.bidBondCoveragePct ?? 1.5;
  const bidAmountAfianzado = hasBid ? G * (bidCoverage / 100) : 0;
  const bidCost = hasBid
    ? input.guarantees.bidBondFixedCost !== undefined && input.guarantees.bidBondFixedCost > 0
      ? input.guarantees.bidBondFixedCost
      : bidAmountAfianzado * ((input.guarantees.bidBondPremiumPct ?? 2.0) / 100)
    : 0;

  const hasPerf = !!input.guarantees.hasPerformanceBond;
  const perfCoverage = input.guarantees.performanceBondCoveragePct ?? 7.0;
  const perfAmountAfianzado = hasPerf ? G * (perfCoverage / 100) : 0;
  const perfCost = hasPerf
    ? input.guarantees.performanceBondFixedCost !== undefined && input.guarantees.performanceBondFixedCost > 0
      ? input.guarantees.performanceBondFixedCost
      : perfAmountAfianzado * ((input.guarantees.performanceBondPremiumPct ?? 2.5) / 100)
    : 0;

  const hasAdv = !!input.guarantees.hasAdvanceBond;
  const advCoverage = input.guarantees.advancePct ?? 20.0;
  const advAmountAfianzado = hasAdv ? G * (advCoverage / 100) : 0;
  const advCost = hasAdv
    ? input.guarantees.advanceBondFixedCost !== undefined && input.guarantees.advanceBondFixedCost > 0
      ? input.guarantees.advanceBondFixedCost
      : advAmountAfianzado * ((input.guarantees.advanceBondPremiumPct ?? 2.5) / 100)
    : 0;

  const totalGuaranteesCost = round2(bidCost + perfCost + advCost);

  // 2. Impuestos
  let nominalTaxRate = 0;
  let effectiveTaxRate = 0;
  const taxCreditPct = Math.max(0, Math.min(100, input.taxScenario.taxCreditPct ?? 0));

  switch (input.taxScenario.type) {
    case 'CON_FACTURA': {
      // 13% IVA + 3% IT = 16% nominal
      nominalTaxRate = 16.0;
      // Si hay crédito fiscal del IVA, se reduce proporcionalmente el 13%
      const ivaNet = 13.0 * (1 - taxCreditPct / 100);
      effectiveTaxRate = ivaNet + 3.0; // IT no se descarga con facturas de compras
      break;
    }
    case 'RETENCION_LEY': {
      // 12.5% IUE + 3% IT = 15.5% para servicios
      nominalTaxRate = 15.5;
      effectiveTaxRate = 15.5;
      break;
    }
    case 'SIN_FACTURA': {
      nominalTaxRate = 0;
      effectiveTaxRate = 0;
      break;
    }
    case 'PERSONALIZADO': {
      nominalTaxRate = input.taxScenario.customRatePct ?? 0;
      effectiveTaxRate = nominalTaxRate;
      break;
    }
  }

  const nominalTaxAmount = round2(G * (nominalTaxRate / 100));
  const effectiveTaxAmount = round2(G * (effectiveTaxRate / 100));
  const taxCreditSavings = round2(nominalTaxAmount - effectiveTaxAmount);

  // 3. Deducciones Normativas / Retenciones en Planilla (ej. 5% de Caja de Salud o Garantía)
  const retentionRate = input.statutoryDeductions.retentionRatePct || 0;
  const statutoryAmount = round2(G * (retentionRate / 100));
  const isRecoverableRetention = !!input.statutoryDeductions.isRecoverable;

  // 4. Diezmo / Comisión de Adjudicación
  let commissionAmount = 0;
  if (input.adjudicationCommission.type === 'FIXED') {
    commissionAmount = input.adjudicationCommission.value || 0;
  } else {
    // PERCENTAGE_GROSS
    commissionAmount = round2(G * ((input.adjudicationCommission.value || 0) / 100));
  }
  const commissionEffectivePct = G > 0 ? round2((commissionAmount / G) * 100) : 0;

  // 5. Fee Empresa Titular (Presta-Nombre / Maquila)
  let titularCompanyAmount = 0;
  if (input.titularCompany.type === 'FIXED') {
    titularCompanyAmount = input.titularCompany.value || 0;
  } else if (input.titularCompany.type === 'PERCENTAGE_NET') {
    // Sobre el monto neto después de impuestos y boletas
    const netBase = Math.max(0, G - effectiveTaxAmount - totalGuaranteesCost);
    titularCompanyAmount = round2(netBase * ((input.titularCompany.value || 0) / 100));
  } else {
    // PERCENTAGE_GROSS por defecto
    titularCompanyAmount = round2(G * ((input.titularCompany.value || 0) / 100));
  }

  // Si la empresa titular acordó absorber los costos de las boletas:
  if (input.titularCompany.absorbsGuaranteesCost) {
    titularCompanyAmount = Math.max(0, titularCompanyAmount - totalGuaranteesCost);
  }
  const titularEffectivePct = G > 0 ? round2((titularCompanyAmount / G) * 100) : 0;

  // 6. Costos Operativos Directos
  const directCostsItems = input.directCosts?.items || [];
  const directCostsTotal = round2(
    directCostsItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0)
  );

  // 7. Cálculo de Gastos No Recuperables y Bolsas de Ganancia
  // Si la retención es NO recuperable (ej. aporte social o caja a fondo perdido), es gasto directo.
  // Si es recuperable (ej. 5% retención de garantía SICOES devuelta al final), no es gasto a fondo perdido sino flujo diferido.
  const nonRecoverableStatutory = isRecoverableRetention ? 0 : statutoryAmount;

  const totalNonRecoverableExpenses = round2(
    effectiveTaxAmount +
    totalGuaranteesCost +
    commissionAmount +
    titularCompanyAmount +
    directCostsTotal +
    nonRecoverableStatutory
  );

  // Utilidad neta global del proyecto (después de cobrar la retención final)
  const totalNetProfitPool = round2(Math.max(0, G - totalNonRecoverableExpenses));

  // Dinero retenido temporalmente por el cliente (a cobrar tras acta de recepción)
  const deferredRetentionPool = isRecoverableRetention ? statutoryAmount : 0;

  // Dinero líquido real disponible para distribuir durante la ejecución
  const immediateDistributablePool = round2(
    Math.max(0, totalNetProfitPool - deferredRetentionPool)
  );

  // 8. Repartición de la Utilidad Neta
  const dist = input.distribution || {
    projectManagerPct: 50,
    businessPartnerPct: 50,
    contingencyFundPct: 0,
  };

  const contingencyPct = Math.max(0, Math.min(100, dist.contingencyFundPct || 0));
  const contingencyAmount = round2(totalNetProfitPool * (contingencyPct / 100));

  const partnerPoolTotal = Math.max(0, totalNetProfitPool - contingencyAmount);
  const partnerPoolImmediate = Math.max(0, immediateDistributablePool * (1 - contingencyPct / 100));
  const partnerPoolDeferred = deferredRetentionPool;

  const totalPartnerShares = (dist.projectManagerPct || 0) + (dist.businessPartnerPct || 0);
  const pmShareRatio = totalPartnerShares > 0 ? dist.projectManagerPct / totalPartnerShares : 0.5;
  const bpShareRatio = totalPartnerShares > 0 ? dist.businessPartnerPct / totalPartnerShares : 0.5;

  const pmImmediate = round2(partnerPoolImmediate * pmShareRatio);
  const pmDeferred = round2(partnerPoolDeferred * pmShareRatio);
  const pmTotal = round2(pmImmediate + pmDeferred);
  const pmMargin = G > 0 ? round2((pmTotal / G) * 100) : 0;

  const bpImmediate = round2(partnerPoolImmediate * bpShareRatio);
  const bpDeferred = round2(partnerPoolDeferred * bpShareRatio);
  const bpTotal = round2(bpImmediate + bpDeferred);
  const bpMargin = G > 0 ? round2((bpTotal / G) * 100) : 0;

  // 9. Métricas y Desglose Visual
  const governmentTotal = round2(effectiveTaxAmount + nonRecoverableStatutory);
  const commercialFeesTotal = round2(commissionAmount + titularCompanyAmount);
  const teamNetProfitTotal = round2(pmTotal + bpTotal + contingencyAmount);

  return {
    contractGrossAmount: G,
    guarantees: {
      bidBondAmountAfianzado: round2(bidAmountAfianzado),
      bidBondCost: round2(bidCost),
      performanceBondAmountAfianzado: round2(perfAmountAfianzado),
      performanceBondCost: round2(perfCost),
      advanceBondAmountAfianzado: round2(advAmountAfianzado),
      advanceBondCost: round2(advCost),
      totalGuaranteesCost,
    },
    taxes: {
      type: input.taxScenario.type,
      nominalRatePct: round2(nominalTaxRate),
      effectiveRatePct: round2(effectiveTaxRate),
      taxAmount: effectiveTaxAmount,
      taxCreditSavings,
    },
    statutoryDeduction: {
      ratePct: retentionRate,
      amount: statutoryAmount,
      isRecoverable: isRecoverableRetention,
    },
    commission: {
      amount: commissionAmount,
      effectivePctOfGross: commissionEffectivePct,
    },
    titularCompany: {
      amount: titularCompanyAmount,
      effectivePctOfGross: titularEffectivePct,
    },
    directCosts: {
      total: directCostsTotal,
      items: directCostsItems,
    },
    totalNonRecoverableExpenses,
    immediateDistributablePool,
    deferredRetentionPool,
    totalNetProfitPool,
    distribution: {
      projectManager: {
        pct: dist.projectManagerPct,
        immediateAmount: pmImmediate,
        deferredAmount: pmDeferred,
        totalAmount: pmTotal,
        effectiveMarginOnGross: pmMargin,
      },
      businessPartner: {
        pct: dist.businessPartnerPct,
        immediateAmount: bpImmediate,
        deferredAmount: bpDeferred,
        totalAmount: bpTotal,
        effectiveMarginOnGross: bpMargin,
      },
      contingencyFund: {
        pct: contingencyPct,
        amount: contingencyAmount,
      },
    },
    summaryMetrics: {
      grossAmount: G,
      governmentAndTaxesTotal: governmentTotal,
      financialGuaranteesTotal: totalGuaranteesCost,
      commercialFeesTotal,
      directOperatingCostsTotal: directCostsTotal,
      teamNetProfitTotal,
      effectiveTakeRates: {
        governmentPct: G > 0 ? round2((governmentTotal / G) * 100) : 0,
        guaranteesPct: G > 0 ? round2((totalGuaranteesCost / G) * 100) : 0,
        commercialFeesPct: G > 0 ? round2((commercialFeesTotal / G) * 100) : 0,
        directCostsPct: G > 0 ? round2((directCostsTotal / G) * 100) : 0,
        teamNetProfitPct: G > 0 ? round2((teamNetProfitTotal / G) * 100) : 0,
      },
    },
  };
}

function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
