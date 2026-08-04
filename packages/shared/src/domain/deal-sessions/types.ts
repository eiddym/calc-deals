export type DealSessionStatus =
  | "borrador"
  | "en_negociacion"
  | "acordado"
  | "caido"
  | "suspendido";

export type ScenarioType = "con_factura" | "sin_factura";

export interface DealSession {
  id: string;
  name: string;
  status: DealSessionStatus;
  contractGrossAmount: number;
  companyPct: number;
  externalPct: number;
  createdAt: string;
  updatedAt: string;
}
