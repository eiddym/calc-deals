import { calculateDeal, DealCalculationInput } from '@calc/shared';

describe('Calculator in API integration', () => {
  it('ejecuta correctamente la cascada de deducciones y flujos en un contrato de 100k', () => {
    const input: DealCalculationInput = {
      contractGrossAmount: 100000,
      taxScenario: { type: 'CON_FACTURA' },
      guarantees: {
        hasBidBond: true,
        bidBondCoveragePct: 1.5,
        bidBondPremiumPct: 2.0,
        hasPerformanceBond: true,
        performanceBondCoveragePct: 7.0,
        performanceBondPremiumPct: 2.5,
        hasAdvanceBond: false,
      },
      statutoryDeductions: {
        retentionRatePct: 5.0,
        isRecoverable: true,
      },
      adjudicationCommission: {
        type: 'PERCENTAGE_GROSS',
        value: 10.0,
      },
      titularCompany: {
        type: 'PERCENTAGE_GROSS',
        value: 8.0,
      },
      directCosts: {
        items: [
          { id: '1', concept: 'Viáticos de campo', amount: 3000 },
          { id: '2', concept: 'Impresiones y trámites', amount: 500 },
        ],
      },
      distribution: {
        projectManagerPct: 60,
        businessPartnerPct: 40,
        contingencyFundPct: 5,
      },
    };

    const res = calculateDeal(input);

    expect(res.contractGrossAmount).toBe(100000);
    expect(res.taxes.taxAmount).toBe(16000);
    expect(res.guarantees.totalGuaranteesCost).toBe(205);
    expect(res.commission.amount).toBe(10000);
    expect(res.titularCompany.amount).toBe(8000);
    expect(res.directCosts.total).toBe(3500);
    expect(res.statutoryDeduction.amount).toBe(5000);
    expect(res.totalNonRecoverableExpenses).toBe(37705);
    expect(res.totalNetProfitPool).toBe(62295);
    expect(res.deferredRetentionPool).toBe(5000);
    expect(res.immediateDistributablePool).toBe(57295);
  });
});
