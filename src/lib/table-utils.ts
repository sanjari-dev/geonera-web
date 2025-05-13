// src/lib/table-utils.ts
import type { PredictionLogItem, SortableColumnKey } from '@/types';

export const getSortableValue = (log: PredictionLogItem, key: SortableColumnKey): string | number | Date | undefined => {
  switch (key) {
    case 'status': return log.status;
    case 'timestamp': return log.timestamp;
    case 'currencyPair': return log.currencyPair;
    case 'profitPipsMax': return log.pipsSettings.profitPips.max;
    case 'lossPipsMax': return log.pipsSettings.lossPips.max;
    case 'tradingSignal': return log.predictionOutcome?.tradingSignal;
    case 'expiresAt': return log.expiresAt;
    default: return undefined;
  }
};
