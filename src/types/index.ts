import type { AnalyzeInfluencesOutput } from '@/ai/flows/analyze-influences';

export type CurrencyPair = "XAU/USD" | "BTC/USD";

export type PredictionData = AnalyzeInfluencesOutput;

export interface CurrencyOption {
  value: CurrencyPair;
  label: string;
  icon?: React.ElementType;
}
