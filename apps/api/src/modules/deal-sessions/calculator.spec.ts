import { calculateDeal, DealCalculationInput } from '@calc/shared';

describe('Calculator in API integration', () => {
  it('ejecuta correctamente la cascada de deducciones y flujos en un contrato de 100k', () => {
    const input: DealCalculationInput = {
      contractGrossAmount: 100000,
      negotiationMode: 'FORMAL_LICITACION',
      taxScenario: { type: 'CON_FACTURA' },
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
      staffing: {
        assignments: [
          {
            id: 'staff-1',
            role: 'Ingeniero Residente',
            quantity: 1,
            durationMonths: 2,
            monthlySalary: 5000,
            laborBurdenPct: 20, // 5000 * 1.2 = 6000 * 2 = 12000
            isDirectSiteCost: true,
            hasFormalPayroll: true,
          },
        ],
      },
      directCosts: {
        items: [
          { id: '1', concept: 'Viáticos de campo', amount: 3000, isTaxDeductible: true },
          { id: '2', concept: 'Impresiones y trámites', amount: 500, isTaxDeductible: true },
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
    expect(res.staffing.totalPersonnelCost).toBe(12000);
    expect(res.directCosts.total).toBe(3500);
    expect(res.statutoryDeduction.amount).toBe(5000);
    expect(res.iue.enabled).toBe(true);
    expect(res.totalNetProfitPool).toBeGreaterThan(0);
    expect(res.deferredRetentionPool).toBe(5000);
  });

  it('calcula la distribución dinámica para múltiples socios personalizados', () => {
    const input: DealCalculationInput = {
      contractGrossAmount: 100000,
      taxScenario: { type: 'SIN_FACTURA' },
      iueTax: { enabled: false, ratePct: 25, payer: 'EXENTO' },
      guarantees: { hasBidBond: false, hasPerformanceBond: false, hasAdvanceBond: false },
      statutoryDeductions: { retentionRatePct: 0, isRecoverable: true },
      adjudicationCommission: { type: 'PERCENTAGE_GROSS', value: 0 },
      titularCompany: { type: 'PERCENTAGE_GROSS', value: 0, enabled: false },
      staffing: { assignments: [] },
      directCosts: { items: [{ id: '1', concept: 'Gastos', amount: 20000 }] },
      distribution: {
        contingencyFundPct: 0,
        partners: [
          { id: 'p1', name: 'Proyectista Jefe', role: 'Director Técnico', pct: 50 },
          { id: 'p2', name: 'Socio Comercial', role: 'Gestor', pct: 30 },
          { id: 'p3', name: 'Inversionista', role: 'Financista', pct: 20 },
        ],
      },
    };

    const res = calculateDeal(input);
    expect(res.totalNetProfitPool).toBe(80000);
    expect(res.distribution.partners).toHaveLength(3);
    expect(res.distribution.partners[0].totalAmount).toBe(40000);
    expect(res.distribution.partners[1].totalAmount).toBe(24000);
    expect(res.distribution.partners[2].totalAmount).toBe(16000);
    expect(res.distribution.partners[0].effectiveMarginOnGross).toBe(40);
  });

  it('calcula el análisis de varianza cuando la empresa titular asume impuestos', () => {
    const input: DealCalculationInput = {
      contractGrossAmount: 100000,
      taxScenario: { type: 'CON_FACTURA' }, // 16,000 Bs
      iueTax: { enabled: false, ratePct: 25, payer: 'EXENTO' },
      guarantees: { hasBidBond: false, hasPerformanceBond: false, hasAdvanceBond: false },
      statutoryDeductions: { retentionRatePct: 0, isRecoverable: true },
      adjudicationCommission: { type: 'PERCENTAGE_GROSS', value: 0 },
      titularCompany: {
        enabled: true,
        type: 'PERCENTAGE_GROSS',
        value: 10, // 10,000 Bs
        absorbsTaxes: true,
      },
      staffing: { assignments: [] },
      directCosts: { items: [] },
      distribution: { contingencyFundPct: 0, projectManagerPct: 100, businessPartnerPct: 0 },
    };

    const res = calculateDeal(input);
    expect(res.titularCompany.enabled).toBe(true);
    expect(res.titularCompany.amount).toBe(10000);
    expect(res.titularCompany.absorbsTaxes).toBe(true);
    // Como la titular asume los 16,000 de impuestos, la ganancia del equipo es 100k - 10k fee = 90k
    expect(res.totalNetProfitPool).toBe(90000);
    expect(res.titularCompany.varianceAnalysis.taxBurdenDifference).toBe(16000);
    expect(res.titularCompany.varianceAnalysis.ifTeamAbsorbsTaxes.teamNetGain).toBe(74000);
  });

  it('calcula la negociación cooperativa centrada en capital del inversionista, payback y semáforo', () => {
    const input: DealCalculationInput = {
      contractGrossAmount: 800000, // Proyección de venta de mineral
      negotiationMode: 'COOPERATIVA_INVERSION',
      taxScenario: { type: 'SIN_FACTURA' },
      iueTax: { enabled: false, ratePct: 25, payer: 'EXENTO' },
      guarantees: { hasBidBond: false, hasPerformanceBond: false, hasAdvanceBond: false },
      statutoryDeductions: { retentionRatePct: 5, isRecoverable: false }, // Canon comunal 5%
      adjudicationCommission: { type: 'PERCENTAGE_GROSS', value: 0 },
      titularCompany: { type: 'PERCENTAGE_GROSS', value: 0, enabled: false },
      staffing: { assignments: [] },
      directCosts: { items: [{ id: '1', concept: 'Combustible y explosivos', amount: 100000 }] },
      distribution: { contingencyFundPct: 0 },
      cooperativeInvestment: {
        investorCapital: 350000,
        durationMonths: 18,
        investorSharePct: 70,
        cooperativeSharePct: 30,
        operatingCostsEstimated: 100000,
        canonComunalPct: 5, // 5% de 800k = 40,000 Bs
        targetInvestorRoiPct: 40,
        minCooperativeIncome: 100000,
        projectedGrossRevenue: 800000,
      },
    };

    const res = calculateDeal(input);
    expect(res.cooperativeInvestment).toBeDefined();
    const ci = res.cooperativeInvestment!;

    expect(ci.investorCapital).toBe(350000);
    expect(ci.durationMonths).toBe(18);
    expect(ci.canonComunalAmount).toBe(40000);
    // Excedente neto: 800,000 - 100,000 (OPEX) - 40,000 (Canon) = 660,000 Bs
    expect(ci.netDistributableSurplus).toBe(660000);
    // Inversionista 70%: 660,000 * 0.70 = 462,000 Bs
    expect(ci.investorPayout).toBe(462000);
    // Ganancia neta: 462,000 - 350,000 = 112,000 Bs
    expect(ci.investorNetProfit).toBe(112000);
    // ROI: (112,000 / 350,000) * 100 = 32%
    expect(ci.investorRoiPct).toBe(32);
    // Cooperativa 30%: 660,000 * 0.30 = 198,000 Bs
    expect(ci.cooperativePayout).toBe(198000);
    expect(ci.cooperativeMonthlyIncome).toBe(11000);
    expect(ci.cooperativeStatus).toBe('VERDE');
    // Como 32% < 40% target, inversionista en AMARILLO
    expect(ci.investorStatus).toBe('AMARILLO');
    expect(ci.overallDealStatus).toBe('AMARILLO');
    // Ingreso de equilibrio calculado para que inversionista logre su 40% (490k retorno):
    expect(ci.breakEvenRevenueRequired).toBeGreaterThan(800000);
  });
});
