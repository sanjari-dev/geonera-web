// src/hooks/use-log-display.ts
import {useMemo, useCallback, MutableRefObject} from 'react';
import type {
  PredictionLogItem,
  DateRangeFilter,
  CurrencyPair,
  StatusFilterType,
  SignalFilterType,
  SortConfig,
  SortableColumnKey,
} from '@/types';
import { isValid } from 'date-fns';
import { getSortableValue as defaultGetSortableValue } from '@/lib/table-utils'; // Assuming you moved it

interface UseLogDisplayProps {
  predictionLogs: PredictionLogItem[];
  dateRangeFilter: DateRangeFilter;
  currentTimeForFiltering: Date | null;
  latestSelectedCurrencyPairsRef: MutableRefObject<CurrencyPair[]>;
  activeTableFilterStatus: StatusFilterType;
  activeTableFilterSignal: SignalFilterType;
  expiredTableFilterStatus: StatusFilterType;
  expiredTableFilterSignal: SignalFilterType;
  sortConfigActive: SortConfig;
  sortConfigExpired: SortConfig;
  displayedActiveLogsCount: number;
  displayedExpiredLogsCount: number;
  getSortableValueCallback?: (log: PredictionLogItem, key: SortableColumnKey) => string | number | Date | undefined;
}

export function useLogDisplay({
  predictionLogs,
  dateRangeFilter,
  currentTimeForFiltering,
  latestSelectedCurrencyPairsRef,
  activeTableFilterStatus,
  activeTableFilterSignal,
  expiredTableFilterStatus,
  expiredTableFilterSignal,
  sortConfigActive,
  sortConfigExpired,
  displayedActiveLogsCount,
  displayedExpiredLogsCount,
  getSortableValueCallback = defaultGetSortableValue,
}: UseLogDisplayProps) {

  const baseFilteredLogs = useMemo(() => {
    return predictionLogs.filter(log => {
      if (!latestSelectedCurrencyPairsRef.current.includes(log.currencyPair)) return false;
      
      const logTimestamp = new Date(log.timestamp);
      if (dateRangeFilter.start && isValid(dateRangeFilter.start) && logTimestamp < dateRangeFilter.start) return false;
      return !(dateRangeFilter.end && isValid(dateRangeFilter.end) && logTimestamp > dateRangeFilter.end);
    });
  }, [predictionLogs, dateRangeFilter, latestSelectedCurrencyPairsRef]);

  const potentialActiveLogs = useMemo(() => {
    if (!currentTimeForFiltering) return [];
    return baseFilteredLogs.filter(log => !log.expiresAt || new Date(log.expiresAt) > currentTimeForFiltering);
  }, [baseFilteredLogs, currentTimeForFiltering]);
  
  const potentialExpiredLogs = useMemo(() => {
    if (!currentTimeForFiltering) return [];
    return baseFilteredLogs.filter(log => log.expiresAt && new Date(log.expiresAt) <= currentTimeForFiltering);
  }, [baseFilteredLogs, currentTimeForFiltering]);

  const activeLogs = useMemo(() => {
    return potentialActiveLogs.filter(log => {
      if (activeTableFilterStatus !== "ALL" && log.status !== activeTableFilterStatus) return false;
      return !(activeTableFilterSignal !== "ALL" && (!log.predictionOutcome || log.predictionOutcome.tradingSignal !== activeTableFilterSignal));
    });
  }, [potentialActiveLogs, activeTableFilterStatus, activeTableFilterSignal]);
  
  const fullyFilteredExpiredLogs = useMemo(() => {
    return potentialExpiredLogs.filter(log => {
      if (expiredTableFilterStatus !== "ALL" && log.status !== expiredTableFilterStatus) return false;
      return !(expiredTableFilterSignal !== "ALL" && (!log.predictionOutcome || log.predictionOutcome.tradingSignal !== expiredTableFilterSignal));
    });
  }, [potentialExpiredLogs, expiredTableFilterStatus, expiredTableFilterSignal]);

  const sortLogs = useCallback((logs: PredictionLogItem[], config: SortConfig) => {
    return [...logs].sort((a, b) => {
      const valA = getSortableValueCallback(a, config.key);
      const valB = getSortableValueCallback(b, config.key);

      if (valA === undefined && valB === undefined) return 0;
      if (valA === undefined) return config.direction === 'asc' ? 1 : -1;
      if (valB === undefined) return config.direction === 'asc' ? -1 : 1;

      let comparison: number;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (valA instanceof Date && valB instanceof Date) {
        comparison = valA.getTime() - valB.getTime();
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }
      return config.direction === 'asc' ? comparison : -comparison;
    });
  }, [getSortableValueCallback]);

  const sortedActiveLogsData = useMemo(() => sortLogs(activeLogs, sortConfigActive), [activeLogs, sortConfigActive, sortLogs]);
  const displayedSortedActiveLogs = useMemo(() => sortedActiveLogsData.slice(0, displayedActiveLogsCount), [sortedActiveLogsData, displayedActiveLogsCount]);
  
  const sortedAndLimitedExpiredLogs = useMemo(() => {
    const sorted = sortLogs(fullyFilteredExpiredLogs, sortConfigExpired);
    return sorted.slice(0, displayedExpiredLogsCount);
  }, [fullyFilteredExpiredLogs, sortConfigExpired, displayedExpiredLogsCount, sortLogs]);

  return {
    displayedSortedActiveLogs,
    sortedAndLimitedExpiredLogs,
    totalActiveLogsCount: activeLogs.length,
    totalExpiredLogsCount: fullyFilteredExpiredLogs.length,
  };
}
