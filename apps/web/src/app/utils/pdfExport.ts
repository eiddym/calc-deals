import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { DealCalculationInput, DealCalculationResult } from '@calc/shared';

export async function generateDealPdf(
  input: DealCalculationInput,
  result: DealCalculationResult,
  currency: string
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 (puntos: 595 x 842)

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fmt = (val: number) => {
    return (
      new Intl.NumberFormat('es-BO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val || 0) + ` ${currency}`
    );
  };

  const { width, height } = page.getSize();
  let y = height - 40;

  // 1. BANNER DE CABECERA
  page.drawRectangle({
    x: 30,
    y: y - 50,
    width: width - 60,
    height: 60,
    color: rgb(0.04, 0.09, 0.18),
  });

  page.drawText('DICTAMEN FINANCIERO Y AUDITORÍA PRE-FIRMA', {
    x: 45,
    y: y - 20,
    size: 15,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('Mesa de Negociación, Peajes Tributarios y Reparto entre Socios (Bolivia)', {
    x: 45,
    y: y - 36,
    size: 9,
    font: fontRegular,
    color: rgb(0.6, 0.75, 0.98),
  });

  y -= 75;

  // 2. METADATOS DEL TRATO
  const dateStr = new Date().toLocaleDateString('es-BO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  page.drawText(`Fecha: ${dateStr}`, { x: 45, y, size: 9, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(`Modo: ${result.negotiationMode}`, { x: 200, y, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
  page.drawText(`Moneda: ${currency}`, { x: 400, y, size: 9, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });

  y -= 15;
  page.drawLine({
    start: { x: 45, y },
    end: { x: width - 45, y },
    thickness: 1,
    color: rgb(0.85, 0.85, 0.85),
  });

  y -= 20;

  // 3. TARJETAS DE SÍNTESIS EJECUTIVA (4 HERO NUMBERS)
  const cardWidth = (width - 90 - 30) / 4;
  const cards = [
    { title: 'CONTRATO BRUTO', val: fmt(result.contractGrossAmount), color: rgb(0.14, 0.38, 0.92) },
    { title: 'LÍQUIDO EN OBRA', val: fmt(result.immediateDistributablePool), color: rgb(0.06, 0.72, 0.5) },
    { title: 'RETENCIÓN CIERRE', val: fmt(result.deferredRetentionPool), color: rgb(0.96, 0.62, 0.05) },
    { title: 'UTILIDAD NETA TOTAL', val: fmt(result.totalNetProfitPool), color: rgb(0.05, 0.58, 0.4) },
  ];

  cards.forEach((card, idx) => {
    const cx = 45 + idx * (cardWidth + 10);
    page.drawRectangle({
      x: cx,
      y: y - 38,
      width: cardWidth,
      height: 40,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.85, 0.88, 0.92),
      borderWidth: 1,
    });
    page.drawText(card.title, { x: cx + 6, y: y - 12, size: 6.5, font: fontBold, color: rgb(0.4, 0.4, 0.5) });
    page.drawText(card.val, { x: cx + 6, y: y - 28, size: 8, font: fontBold, color: card.color });
  });

  y -= 55;

  // 4. TABLA DE LIQUIDACIÓN PRE-FIRMA (CENTAVO A CENTAVO)
  page.drawText('1. LIQUIDACIÓN FINANCIERA Y PEAJES DEDUCIBLES', {
    x: 45,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  y -= 15;

  const tableRows = [
    { concept: 'Monto Bruto Ofertado (100% Contrato)', rate: '100.0%', amount: fmt(result.contractGrossAmount), isTotal: false, isNeg: false },
    { concept: `(-) Carga Fiscal IVA/IT ${result.taxes.type}`, rate: `-${result.taxes.effectiveRatePct}%`, amount: `-${fmt(result.taxes.taxAmount)}`, isTotal: false, isNeg: true },
    ...(result.iue.enabled && result.iue.payer === 'PROYECTO'
      ? [{ concept: '(-) Previsión Anual IUE 25% (Proyecto)', rate: '25.0%', amount: `-${fmt(result.iue.deductedFromProjectPool)}`, isTotal: false, isNeg: true }]
      : []),
    { concept: '(-) Boletas y Pólizas Bancarias (Primas)', rate: `-${result.summaryMetrics.effectiveTakeRates.guaranteesPct}%`, amount: `-${fmt(result.guarantees.totalGuaranteesCost)}`, isTotal: false, isNeg: true },
    { concept: '(-) Diezmo / Comisión de Adjudicación', rate: `-${result.commission.effectivePctOfGross}%`, amount: `-${fmt(result.commission.amount)}`, isTotal: false, isNeg: true },
    { concept: '(-) Fee Empresa Titular (Presta-Nombre / NIT)', rate: `-${result.titularCompany.effectivePctOfGross}%`, amount: `-${fmt(result.titularCompany.amount)}`, isTotal: false, isNeg: true },
    { concept: '(-) Personal y Cargas Sociales (Staffing)', rate: `-${result.summaryMetrics.effectiveTakeRates.personnelPct}%`, amount: `-${fmt(result.staffing.totalPersonnelCost)}`, isTotal: false, isNeg: true },
    { concept: '(-) Gastos Operativos y Logística Directa', rate: `-${result.summaryMetrics.effectiveTakeRates.directCostsPct}%`, amount: `-${fmt(result.directCosts.total)}`, isTotal: false, isNeg: true },
    ...(!result.statutoryDeduction.isRecoverable && result.statutoryDeduction.amount > 0
      ? [{ concept: '(-) Aporte No Recuperable a Caja de Salud', rate: `-${result.statutoryDeduction.ratePct}%`, amount: `-${fmt(result.statutoryDeduction.amount)}`, isTotal: false, isNeg: true }]
      : []),
    { concept: '(=) UTILIDAD NETA DEL EQUIPO TÉCNICO', rate: `${result.summaryMetrics.effectiveTakeRates.teamNetProfitPct}%`, amount: fmt(result.totalNetProfitPool), isTotal: true, isNeg: false },
    ...(result.statutoryDeduction.isRecoverable && result.statutoryDeduction.amount > 0
      ? [{ concept: '(-) Retención Diferida (Cobro al Cierre / Acta Definitiva)', rate: `-${result.statutoryDeduction.ratePct}%`, amount: `-${fmt(result.deferredRetentionPool)}`, isTotal: false, isNeg: true }]
      : []),
    { concept: '(★) LÍQUIDO DISPONIBLE EN EJECUCIÓN', rate: `${result.contractGrossAmount > 0 ? ((result.immediateDistributablePool / result.contractGrossAmount) * 100).toFixed(1) : 0}%`, amount: fmt(result.immediateDistributablePool), isTotal: true, isNeg: false },
  ];

  tableRows.forEach((row, i) => {
    if (row.isTotal) {
      page.drawRectangle({
        x: 43,
        y: y - 3,
        width: width - 86,
        height: 15,
        color: rgb(0.92, 0.96, 0.94),
      });
    }

    page.drawText(row.concept, {
      x: 45,
      y,
      size: row.isTotal ? 7.5 : 7,
      font: row.isTotal ? fontBold : fontRegular,
      color: row.isTotal ? rgb(0.05, 0.45, 0.3) : rgb(0.2, 0.2, 0.2),
    });

    page.drawText(row.rate, {
      x: 380,
      y,
      size: 7,
      font: fontRegular,
      color: row.isNeg ? rgb(0.85, 0.15, 0.15) : rgb(0.3, 0.3, 0.3),
    });

    page.drawText(row.amount, {
      x: 470,
      y,
      size: row.isTotal ? 8 : 7,
      font: row.isTotal ? fontBold : fontRegular,
      color: row.isTotal ? rgb(0.05, 0.45, 0.3) : row.isNeg ? rgb(0.85, 0.15, 0.15) : rgb(0.1, 0.1, 0.1),
    });

    y -= 14;
  });

  y -= 15;

  // 5. ANÁLISIS DE VARIANZA DE EMPRESA PRESTA-NOMBRE
  if (result.titularCompany.enabled) {
    page.drawText('2. ANÁLISIS DE VARIANZA: EMPRESA PRESTA-NOMBRE', {
      x: 45,
      y,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    y -= 15;

    const varBoxY = y - 35;
    page.drawRectangle({
      x: 45,
      y: varBoxY,
      width: width - 90,
      height: 38,
      color: rgb(0.97, 0.98, 1),
      borderColor: rgb(0.7, 0.8, 0.95),
      borderWidth: 1,
    });

    const v = result.titularCompany.varianceAnalysis;
    const condText = result.titularCompany.absorbsTaxes
      ? 'Condición Actual: La Empresa Titular ABSORBE los impuestos (IVA/IT e IUE).'
      : 'Condición Actual: El Equipo Técnico ABSORBE los impuestos del contrato.';

    page.drawText(condText, { x: 55, y: varBoxY + 25, size: 7.5, font: fontBold, color: rgb(0.1, 0.25, 0.6) });
    page.drawText(
      `Si Titular Asume: Ganancia Equipo = ${fmt(v.ifTitularAbsorbsTaxes.teamNetGain)} (${v.ifTitularAbsorbsTaxes.effectiveMargin}%) | Si Equipo Asume: ${fmt(v.ifTeamAbsorbsTaxes.teamNetGain)} (${v.ifTeamAbsorbsTaxes.effectiveMargin}%)`,
      { x: 55, y: varBoxY + 12, size: 7, font: fontRegular, color: rgb(0.3, 0.3, 0.3) }
    );
    page.drawText(
      `Varianza / Diferencia en juego en la negociación: ${fmt(v.taxBurdenDifference)}`,
      { x: 55, y: varBoxY + 2, size: 7, font: fontBold, color: rgb(0.85, 0.2, 0.2) }
    );

    y -= 50;
  }

  // 6. CUADRO DE REPARTO DE UTILIDADES ENTRE SOCIOS
  page.drawText('3. ACUERDO DE REPARTO DE GANANCIAS ENTRE SOCIOS', {
    x: 45,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  y -= 15;

  // Cabecera tabla de socios
  page.drawRectangle({
    x: 43,
    y: y - 3,
    width: width - 86,
    height: 14,
    color: rgb(0.2, 0.25, 0.35),
  });

  page.drawText('Socio / Participante', { x: 48, y, size: 7, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Rol', { x: 190, y, size: 7, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('%', { x: 290, y, size: 7, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Líquido en Obra', { x: 335, y, size: 7, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Cobro al Cierre', { x: 420, y, size: 7, font: fontBold, color: rgb(1, 1, 1) });
  page.drawText('Total Ganancia', { x: 495, y, size: 7, font: fontBold, color: rgb(1, 1, 1) });

  y -= 15;

  result.distribution.partners.forEach((partner) => {
    page.drawText(partner.name, { x: 48, y, size: 7, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(partner.role, { x: 190, y, size: 6.5, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    page.drawText(`${partner.pct}%`, { x: 290, y, size: 7, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(fmt(partner.immediateAmount), { x: 335, y, size: 7, font: fontRegular, color: rgb(0.06, 0.5, 0.35) });
    page.drawText(fmt(partner.deferredAmount), { x: 420, y, size: 7, font: fontRegular, color: rgb(0.8, 0.5, 0.05) });
    page.drawText(fmt(partner.totalAmount), { x: 495, y, size: 7, font: fontBold, color: rgb(0.05, 0.45, 0.3) });

    y -= 14;
  });

  if (result.distribution.contingencyFund.amount > 0) {
    page.drawText(`Fondo de Reserva e Imprevistos (${result.distribution.contingencyFund.pct}%): ${fmt(result.distribution.contingencyFund.amount)}`, {
      x: 48,
      y,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 14;
  }

  y -= 25;

  // 7. FIRMAS DE CONFORMIDAD
  page.drawText('4. FIRMAS DE CONFORMIDAD Y RATIFICACIÓN PRE-FIRMA', {
    x: 45,
    y,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  y -= 15;

  const partnerCount = Math.min(4, result.distribution.partners.length);
  const sigBoxWidth = (width - 90 - (partnerCount - 1) * 15) / partnerCount;

  result.distribution.partners.slice(0, 4).forEach((partner, idx) => {
    const sx = 45 + idx * (sigBoxWidth + 15);
    const sy = y - 45;

    page.drawLine({
      start: { x: sx, y: sy + 15 },
      end: { x: sx + sigBoxWidth, y: sy + 15 },
      thickness: 1,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawText(partner.name, {
      x: sx,
      y: sy + 2,
      size: 7,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText(`C.I. / NIT: _______________`, {
      x: sx,
      y: sy - 10,
      size: 6,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
  });

  // Guardar y descargar
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Dictamen_Pre_Firma_Contrato_${Date.now()}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
