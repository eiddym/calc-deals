import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CALC Deals — Calculadora de Negociación y Reparto de Proyectos',
  description:
    'Simulación de contratos, deducción de impuestos, boletas de garantía, retenciones del 5%, comisiones de adjudicación y margen real del proyectista.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body style={{ background: '#0b111e', color: '#f1f5f9' }}>{children}</body>
    </html>
  );
}
