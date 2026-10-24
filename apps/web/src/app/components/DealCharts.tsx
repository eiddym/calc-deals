'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { DealCalculationResult } from '@calc/shared';

interface DealChartsProps {
  result: DealCalculationResult;
  currency: string;
}

export function DealCharts({ result, currency }: DealChartsProps) {
  const waterfallRef = useRef<HTMLDivElement>(null);
  const donutRef = useRef<HTMLDivElement>(null);
  const waterfallInstance = useRef<echarts.ECharts | null>(null);
  const donutInstance = useRef<echarts.ECharts | null>(null);

  const fmt = (val: number) => {
    return (
      new Intl.NumberFormat('es-BO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(val || 0)) + ` ${currency}`
    );
  };

  // 1. Gráfico de Cascada (Waterfall)
  useEffect(() => {
    if (!waterfallRef.current) return;

    if (!waterfallInstance.current) {
      waterfallInstance.current = echarts.init(waterfallRef.current, 'dark');
    }

    const chart = waterfallInstance.current;
    const gross = result.contractGrossAmount;
    if (gross <= 0) {
      chart.clear();
      return;
    }

    const taxes = result.taxes.taxAmount + result.iue.deductedFromProjectPool;
    const guarantees = result.guarantees.totalGuaranteesCost;
    const fees = result.commission.amount + result.titularCompany.amount;
    const staff = result.staffing.totalPersonnelCost;
    const directCosts = result.directCosts.total;
    const netProfit = result.totalNetProfitPool;

    // Categorías del flujo
    const categories = [
      'Contrato Bruto',
      'Impuestos/IUE',
      'Boletas/Pólizas',
      'Diezmo/Titular',
      'Personal/Staff',
      'Gastos Obra',
      'Utilidad Neta',
    ];

    // Cálculo de la base invisible para simular la cascada descendente
    // [gross, gross-taxes, gross-taxes-guarantees, ...]
    const helper: number[] = [
      0, // Bruto parte de 0
      gross - taxes,
      gross - taxes - guarantees,
      gross - taxes - guarantees - fees,
      gross - taxes - guarantees - fees - staff,
      gross - taxes - guarantees - fees - staff - directCosts,
      0, // Utilidad neta parte de 0
    ];

    const values: Array<{ value: number; itemStyle: { color: string } }> = [
      { value: gross, itemStyle: { color: '#3b82f6' } },
      { value: taxes, itemStyle: { color: '#ef4444' } },
      { value: guarantees, itemStyle: { color: '#a855f7' } },
      { value: fees, itemStyle: { color: '#f43f5e' } },
      { value: staff, itemStyle: { color: '#fb923c' } },
      { value: directCosts, itemStyle: { color: '#64748b' } },
      { value: netProfit, itemStyle: { color: '#10b981' } },
    ];

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const tar = params[1] || params[0];
          return `<div style="font-size:12px;padding:4px">
            <strong>${tar.name}</strong><br/>
            Monto: <span style="color:#38bdf8">${fmt(tar.value)}</span>
          </div>`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '8%',
        top: '12%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10,
          interval: 0,
          rotate: 20,
        },
        axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#94a3b8',
          formatter: (v: number) => {
            if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
            if (v >= 1000) return (v / 1000).toFixed(0) + 'k';
            return v.toString();
          },
        },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      },
      series: [
        {
          name: 'Placeholder',
          type: 'bar',
          stack: 'Total',
          itemStyle: {
            borderColor: 'transparent',
            color: 'transparent',
          },
          emphasis: {
            itemStyle: {
              borderColor: 'transparent',
              color: 'transparent',
            },
          },
          data: helper,
        },
        {
          name: 'Flujo',
          type: 'bar',
          stack: 'Total',
          label: {
            show: true,
            position: 'top',
            color: '#f8fafc',
            fontSize: 10,
            formatter: (p: any) => {
              const val = p.value;
              if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
              if (val >= 1000) return (val / 1000).toFixed(0) + 'k';
              return val.toString();
            },
          },
          data: values,
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [result, currency]);

  // 2. Gráfico Donut ("Quién se come el contrato")
  useEffect(() => {
    if (!donutRef.current) return;

    if (!donutInstance.current) {
      donutInstance.current = echarts.init(donutRef.current, 'dark');
    }

    const chart = donutInstance.current;
    const gross = result.contractGrossAmount;
    if (gross <= 0) {
      chart.clear();
      return;
    }

    const rates = result.summaryMetrics.effectiveTakeRates;
    const donutData = [
      { value: result.taxes.taxAmount + result.iue.deductedFromProjectPool, name: `Impuestos/IUE (${rates.governmentPct}%)`, itemStyle: { color: '#2563eb' } },
      { value: result.guarantees.totalGuaranteesCost, name: `Boletas (${rates.guaranteesPct}%)`, itemStyle: { color: '#9333ea' } },
      { value: result.commission.amount + result.titularCompany.amount, name: `Diezmo/Titular (${rates.commercialFeesPct}%)`, itemStyle: { color: '#f43f5e' } },
      { value: result.staffing.totalPersonnelCost, name: `Personal (${rates.personnelPct}%)`, itemStyle: { color: '#fb923c' } },
      { value: result.directCosts.total, name: `Gastos Obra (${rates.directCostsPct}%)`, itemStyle: { color: '#64748b' } },
      { value: result.totalNetProfitPool, name: `Ganancia Socios (${rates.teamNetProfitPct}%)`, itemStyle: { color: '#10b981' } },
    ].filter((item) => item.value > 0);

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          return `<div style="font-size:12px;padding:4px">
            <strong>${params.name}</strong><br/>
            Monto: <span style="color:#38bdf8">${fmt(params.value)}</span><br/>
            Proporción: <strong>${params.percent}%</strong>
          </div>`;
        },
      },
      legend: {
        orient: 'horizontal',
        bottom: '0',
        textStyle: { color: '#94a3b8', fontSize: 10 },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          name: 'Distribución',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '42%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#09111e',
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: '#34d399',
              formatter: '{d}%\n{b}',
            },
          },
          data: donutData,
        },
      ],
    });

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [result, currency]);

  if (result.contractGrossAmount <= 0) {
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
        Ingresa el monto del contrato para ver las gráficas interactivas de Cascada y Distribución.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', width: '100%' }}>
      {/* Gráfico 1: Cascada */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#60a5fa' }}>
            📉 Cascada Financiera (Waterfall)
          </span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Flujo descendente</span>
        </div>
        <div ref={waterfallRef} style={{ width: '100%', height: '240px' }} />
      </div>

      {/* Gráfico 2: Donut */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.7)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '0.85rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#34d399' }}>
            🥧 Quién se come el Contrato
          </span>
          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>100% Contrato</span>
        </div>
        <div ref={donutRef} style={{ width: '100%', height: '240px' }} />
      </div>
    </div>
  );
}
