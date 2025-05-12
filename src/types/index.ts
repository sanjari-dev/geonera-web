import type { LucideIcon } from 'lucide-react';

export type CurrencyPair = "XAU/USD" | "BTC/USD" | "EUR/USD" | "GBP/USD" | "USD/JPY" | "AUD/USD" | "USD/CAD"; // Add more as needed

export interface CurrencyOption {
  value: CurrencyPair;
  label: string;
  icon?: LucideIcon;
}

export type PipsValue = number;
export interface PipsRange {
  min: PipsValue;
  max: PipsValue;
}

export interface PipsSettings {
  profitPips: PipsRange;
  lossPips: PipsRange;
}

export type PredictionStatus = "IDLE" | "PENDING" | "SUCCESS" | "ERROR";

// This will be the output structure from the AI flow or mock generator
export interface PipsPredictionOutcome {
  tradingSignal: "BUY" | "SELL" | "HOLD" | "WAIT" | "N/A"; 
  signalDetails: string; 
  reasoning: string; 
  openPrice?: number;
  closePrice?: number;
  highPrice?: number;
  lowPrice?: number;
  volume?: number;
}

// This will represent an item in our prediction log table
export interface PredictionLogItem {
  id: string;
  timestamp: Date;
  currencyPair: CurrencyPair; 
  pipsSettings: PipsSettings; 
  status: PredictionStatus;
  predictionOutcome?: PipsPredictionOutcome;
  error?: string;
  expiresAt?: Date;
}

// This will be the input for the AI flow (or mock generator)
export interface AnalyzePipsInfluenceInput {
  currencyPair: CurrencyPair; 
  pipsSettings: PipsSettings; 
}

export interface User {
  id: string;
  username: string;
  initials: string;
}

// Types for filtering and sorting
export type AllFilterType = "ALL";
export type StatusFilterType = PredictionStatus | AllFilterType;
export type SignalFilterType = PipsPredictionOutcome["tradingSignal"] | AllFilterType;

export type SortableColumnKey = 'status' | 'timestamp' | 'currencyPair' | 'profitPipsMax' | 'lossPipsMax' | 'tradingSignal' | 'expiresAt';

export interface SortConfig {
  key: SortableColumnKey;
  direction: 'asc' | 'desc';
}

export interface NotificationMessage {
  id: string; // Added for unique key prop in lists
  title: string;
  description: string;
  variant?: 'destructive' | 'default' | 'success';
  timestamp?: Date;
}

export interface DateRangeFilter {
  start: Date | null;
  end: Date | null;
}

// Constants for filter options
export const STATUS_FILTER_OPTIONS: { value: StatusFilterType; label: string }[] = [
  { value: "ALL", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "SUCCESS", label: "Success" },
  { value: "ERROR", label: "Error" },
];

export const SIGNAL_FILTER_OPTIONS: { value: SignalFilterType; label: string }[] = [
  { value: "ALL", label: "All Signals" },
  { value: "BUY", label: "Buy" },
  { value: "SELL", label: "Sell" },
  { value: "HOLD", label: "Hold" },
  { value: "WAIT", label: "Wait" },
  { value: "N/A", label: "N/A" },
];

export const MAX_PREDICTION_LOGS_CONFIG = 500;
export const DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT = MAX_PREDICTION_LOGS_CONFIG;
export const DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT = 50;

