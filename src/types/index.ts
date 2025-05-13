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

export type RefreshIntervalValue = string; // e.g., "1m", "5m", "1h", "1D"
export interface RefreshIntervalOption {
  value: RefreshIntervalValue;
  label: string;
  milliseconds: number;
}

export const REFRESH_INTERVAL_OPTIONS: RefreshIntervalOption[] = [
  { value: '1m', label: '1 Min', milliseconds: 1 * 60 * 1000 },
  { value: '2m', label: '2 Min', milliseconds: 2 * 60 * 1000 },
  { value: '3m', label: '3 Min', milliseconds: 3 * 60 * 1000 },
  { value: '4m', label: '4 Min', milliseconds: 4 * 60 * 1000 },
  { value: '5m', label: '5 Min', milliseconds: 5 * 60 * 1000 },
  { value: '6m', label: '6 Min', milliseconds: 6 * 60 * 1000 },
  { value: '10m', label: '10 Min', milliseconds: 10 * 60 * 1000 },
  { value: '12m', label: '12 Min', milliseconds: 12 * 60 * 1000 },
  { value: '15m', label: '15 Min', milliseconds: 15 * 60 * 1000 },
  { value: '20m', label: '20 Min', milliseconds: 20 * 60 * 1000 },
  { value: '30m', label: '30 Min', milliseconds: 30 * 60 * 1000 },
  { value: '1h', label: '1 Hour', milliseconds: 1 * 60 * 60 * 1000 },
  { value: '2h', label: '2 Hours', milliseconds: 2 * 60 * 60 * 1000 },
  { value: '3h', label: '3 Hours', milliseconds: 3 * 60 * 60 * 1000 },
  { value: '4h', label: '4 Hours', milliseconds: 4 * 60 * 60 * 1000 },
  { value: '6h', label: '6 Hours', milliseconds: 6 * 60 * 60 * 1000 },
  { value: '8h', label: '8 Hours', milliseconds: 8 * 60 * 60 * 1000 },
  { value: '12h', label: '12 Hours', milliseconds: 12 * 60 * 60 * 1000 },
  { value: '1D', label: '1 Day', milliseconds: 1 * 24 * 60 * 60 * 1000 },
  { value: '2D', label: '2 Days', milliseconds: 2 * 24 * 60 * 60 * 1000 },
  { value: '3D', label: '3 Days', milliseconds: 3 * 24 * 60 * 60 * 1000 },
  { value: '4D', label: '4 Days', milliseconds: 4 * 24 * 60 * 60 * 1000 },
  { value: '5D', label: '5 Days', milliseconds: 5 * 24 * 60 * 60 * 1000 },
];

export const DEFAULT_REFRESH_INTERVAL_VALUE: RefreshIntervalValue = '1m';
export const DEFAULT_REFRESH_INTERVAL_MS = REFRESH_INTERVAL_OPTIONS.find(opt => opt.value === DEFAULT_REFRESH_INTERVAL_VALUE)?.milliseconds || 60000;


export const MIN_EXPIRATION_SECONDS = 10; // Minimum expiration time in seconds
export const MAX_EXPIRATION_SECONDS = 75; // Default maximum expiration time in seconds, will be user-configurable
export const MAX_PREDICTION_LOGS_CONFIG = 500; // Overall system cap for logs if needed, individual tables have their own limits.
export const DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT = MAX_PREDICTION_LOGS_CONFIG; 
export const DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT = 50;


