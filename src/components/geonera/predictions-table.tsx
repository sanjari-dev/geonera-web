// src/components/geonera/predictions-table.tsx
"use client";

import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Info, ArrowUp, ArrowDown, ChevronsUpDown, ListChecks, History, Zap, CalendarDays, TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import type { PredictionLogItem, PredictionStatus, PipsPredictionOutcome, SortConfig, SortableColumnKey, DateRangeFilter } from '@/types';
import { format as formatDateFns, isValid } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CountdownTimer } from "./countdown-timer";
import { ScrollArea } from "../ui/scroll-area";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


interface PredictionsTableProps {
  predictions: PredictionLogItem[];
  onRowClick: (log: PredictionLogItem) => void;
  selectedPredictionId?: string | null;
  maxLogs: number; 
  sortConfig: SortConfig | null;
  onSort: (key: SortableColumnKey) => void;
  dateRangeFilter: DateRangeFilter;
  onDateRangeChange: (newRange: DateRangeFilter) => void;
  showExpired: boolean; // Added prop
}

const StatusIndicator: React.FC<{ status: PredictionStatus }> = ({ status }) => {
  const commonClass = "h-3.5 w-3.5";
  switch (status) {
    case "PENDING":
      return <Tooltip><TooltipTrigger asChild><Loader2 className={cn(commonClass, "animate-spin text-blue-500")} /></TooltipTrigger><TooltipContent><p>Pending</p></TooltipContent></Tooltip>;
    case "SUCCESS":
      return <Tooltip><TooltipTrigger asChild><CheckCircle2 className={cn(commonClass, "text-green-500")} /></TooltipTrigger><TooltipContent><p>Success</p></TooltipContent></Tooltip>;
    case "ERROR":
      return <Tooltip><TooltipTrigger asChild><AlertCircle className={cn(commonClass, "text-red-500")} /></TooltipTrigger><TooltipContent><p>Error</p></TooltipContent></Tooltip>;
    case "IDLE": 
       return <Tooltip><TooltipTrigger asChild><Info className={cn(commonClass, "text-gray-400")} /></TooltipTrigger><TooltipContent><p>Idle</p></TooltipContent></Tooltip>;
    default:
      return null;
  }
};

const getSignalBadgeVariant = (signal?: PipsPredictionOutcome["tradingSignal"]): VariantProps<typeof Badge>["variant"] => {
  if (!signal) return "secondary";
  switch (signal) {
    case "BUY": return "default"; 
    case "SELL": return "destructive"; 
    case "HOLD": return "secondary"; 
    case "WAIT": return "outline"; 
    case "N/A": return "secondary";
    default: return "secondary";
  }
};

const SortIndicator: React.FC<{ sortConfig: SortConfig | null, columnKey: SortableColumnKey }> = ({ sortConfig, columnKey }) => {
  if (!sortConfig || sortConfig.key !== columnKey) {
    return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" aria-hidden="true" />;
  }
  return sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" aria-label="Sorted ascending" /> : <ArrowDown className="ml-1 h-3 w-3" aria-label="Sorted descending" />;
};

const getSortableValue = (log: PredictionLogItem, key: SortableColumnKey): string | number | Date | undefined => {
  switch (key) {
    case 'status': return log.status;
    case 'timestamp': return log.timestamp;
    case 'currencyPair': return log.currencyPair;
    case 'profitPipsMin': return log.pipsSettings.profitPips.min;
    case 'lossPipsMin': return log.pipsSettings.lossPips.min;
    case 'tradingSignal': return log.predictionOutcome?.tradingSignal;
    case 'expiresAt': return log.expiresAt;
    default: return undefined;
  }
};

const formatDateToDateTimeLocal = (date: Date | null): string => {
  if (!date || !isValid(date)) return '';
  // Format: "yyyy-MM-ddTHH:mm:ss" (without timezone offset for datetime-local input)
  return formatDateFns(date, "yyyy-MM-dd'T'HH:mm:ss");
};


export function PredictionsTable({ 
  predictions, 
  onRowClick, 
  selectedPredictionId, 
  maxLogs, 
  sortConfig, 
  onSort,
  dateRangeFilter,
  onDateRangeChange,
  showExpired,
}: PredictionsTableProps) {
  const now = new Date();

  const sortLogs = (logs: PredictionLogItem[]) => {
    if (!sortConfig) return [...logs]; 
    return [...logs].sort((a, b) => {
      const valA = getSortableValue(a, sortConfig.key);
      const valB = getSortableValue(b, sortConfig.key);
      if (valA === undefined && valB === undefined) return 0;
      if (valA === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
      if (valB === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
      else if (valA instanceof Date && valB instanceof Date) comparison = valA.getTime() - valB.getTime();
      else if (typeof valA === 'string' && typeof valB === 'string') comparison = valA.localeCompare(valB);
      else comparison = String(valA).localeCompare(String(valB));
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  };

  const activePredictions = useMemo(() => {
    const filtered = predictions.filter(log => {
        if (!showExpired && log.status === "SUCCESS" && log.expiresAt && new Date(log.expiresAt) <= now) {
            return false; // Skip if it's expired and we are not showing expired
        }
        return log.status === "PENDING" || log.status === "ERROR" || (log.status === "SUCCESS" && (!log.expiresAt || new Date(log.expiresAt) > now));
    });
    return sortLogs(filtered);
  }, [predictions, now, sortConfig, showExpired]); 

  const expiredPredictions = useMemo(() => {
    // Only include in this list if showExpired is true
    if (!showExpired) return [];
    const filtered = predictions.filter(log => log.status === "SUCCESS" && log.expiresAt && new Date(log.expiresAt) <= now);
    return sortLogs(filtered);
  }, [predictions, now, sortConfig, showExpired]);


  const renderSortableHeader = (label: string | React.ReactNode, columnKey: SortableColumnKey, tooltipContent: string, icon?: React.ReactNode) => (
    <TableHead
      className="px-1 py-1 text-center whitespace-nowrap cursor-pointer hover:bg-accent/50 transition-colors sticky top-0 bg-card z-10 text-xs h-auto"
      onClick={() => onSort(columnKey)}
      aria-sort={sortConfig?.key === columnKey ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <Tooltip>
        <TooltipTrigger className="cursor-pointer flex items-center justify-center w-full">
          {icon || label} <SortIndicator sortConfig={sortConfig} columnKey={columnKey} />
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TableHead>
  );

  const renderTableRows = (data: PredictionLogItem[], listType: 'active' | 'expired') => {
    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-xs">
            No {listType} predictions found for the selected date range and filters.
          </TableCell>
        </TableRow>
      );
    }
    return data.map((log) => (
      <TableRow 
        key={`${listType}-${log.id}`}
        onClick={() => onRowClick(log)}
        className={cn(
          "cursor-pointer hover:bg-muted/50 transition-colors",
          selectedPredictionId === log.id && "bg-secondary text-secondary-foreground hover:bg-muted"
        )}
        aria-selected={selectedPredictionId === log.id}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onRowClick(log); }}
      >
        <TableCell className="px-1 py-0.5 text-center whitespace-nowrap">
          <div className="flex justify-center">
            <StatusIndicator status={log.status} />
          </div>
        </TableCell>
        <TableCell className="px-1 py-0.5 text-[10px] text-center whitespace-nowrap">
          {formatDateFns(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss XXX")}
        </TableCell>
        <TableCell className="px-1 py-0.5 font-medium text-center whitespace-nowrap text-[11px]">{log.currencyPair}</TableCell>
        <TableCell className="px-1 py-0.5 text-center whitespace-nowrap text-[11px]">
          <div className="flex flex-col items-center">
            <Badge variant={selectedPredictionId === log.id ? "default" : "secondary"} className="px-1.5 py-0.5 text-[9px] mb-0.5 flex items-center gap-1">
              <TrendingUpIcon className="h-2.5 w-2.5 text-green-300" /> {log.pipsSettings.profitPips.min} - {log.pipsSettings.profitPips.max}
            </Badge>
            <Badge variant={selectedPredictionId === log.id ? "destructive" : "outline"} className="px-1.5 py-0.5 text-[9px] flex items-center gap-1">
             <TrendingDownIcon className="h-2.5 w-2.5 text-red-300" /> {log.pipsSettings.lossPips.min} - {log.pipsSettings.lossPips.max}
            </Badge>
          </div>
        </TableCell>
        <TableCell className="px-1 py-0.5 text-[11px] text-center whitespace-nowrap">
          {log.status === "SUCCESS" && log.predictionOutcome?.tradingSignal ? (
            <Badge 
              variant={getSignalBadgeVariant(log.predictionOutcome.tradingSignal)}
              className={cn("whitespace-nowrap px-1.5 py-0.5 text-[9px]", selectedPredictionId === log.id ? "bg-primary-foreground text-primary" : "")}
            >
              {log.predictionOutcome.tradingSignal}
            </Badge>
          ) : log.status === "PENDING" ? (
            <span className="text-muted-foreground">...</span>
          ) : (
            <span className="text-muted-foreground">N/A</span>
          )}
        </TableCell>
        <TableCell className="px-1 py-0.5 text-[10px] text-center whitespace-nowrap">
          {log.expiresAt && log.status === "SUCCESS" ? (
            <CountdownTimer expiresAt={log.expiresAt} className="text-[10px]" />
          ) : (
            <span className="text-muted-foreground">-- --:--:--</span>
          )}
        </TableCell>
      </TableRow>
    ));
  };
  
  const tableHeaders = (
    <TableRow className="h-auto">
      {renderSortableHeader(<ListChecks className="h-3.5 w-3.5 mx-auto" />, "status", "Status")}
      {renderSortableHeader("Time", "timestamp", "Timestamp")}
      {renderSortableHeader("Pair", "currencyPair", "Currency Pair")}
      {renderSortableHeader(
        "PIPS (P/L)", 
        "profitPipsMin", 
        "Profit / Loss PIPS Range"
      )}
      {renderSortableHeader("Signal", "tradingSignal", "Trading Signal")}
      {renderSortableHeader("Expires", "expiresAt", "Expires In")}
    </TableRow>
  );

  const renderTableSection = (data: PredictionLogItem[], listType: 'active' | 'expired', tabValue: string) => (
      <TabsContent value={tabValue} className="m-0 p-0 h-full">
          <div className="flex flex-col min-h-0 h-full">
              <ScrollArea className="flex-grow rounded-md border-0 overflow-hidden">
                  <Table className="min-w-full table-fixed">
                      <TableHeader className="sticky top-0 bg-card z-10">{tableHeaders}</TableHeader>
                      <TableBody>{renderTableRows(data, listType)}</TableBody>
                  </Table>
              </ScrollArea>
          </div>
      </TabsContent>
  );


  return (
    <TooltipProvider>
      <Card className="shadow-xl h-full grid grid-rows-[auto_auto_1fr_auto]" aria-labelledby="prediction-log-title">
        <CardHeader className="bg-primary/10 p-2 rounded-t-lg flex flex-row items-center justify-between">
          <CardTitle id="prediction-log-title" className="text-lg font-semibold text-primary">Prediction Log</CardTitle>
           <div className="flex items-end gap-1.5">
            <div>
              <Label htmlFor="date-filter-start" className="text-xs font-medium text-primary/80 block mb-0.5">From:</Label>
              <Input
                type="datetime-local"
                id="date-filter-start"
                value={formatDateToDateTimeLocal(dateRangeFilter.start)}
                onChange={(e) => {
                  const newStart = e.target.value ? new Date(e.target.value) : null;
                  if (newStart && isValid(newStart)) {
                    onDateRangeChange({ ...dateRangeFilter, start: newStart });
                  } else if (!e.target.value) {
                     onDateRangeChange({ ...dateRangeFilter, start: null });
                  }
                }}
                className="h-8 text-xs py-1"
                aria-label="Filter start date and time"
              />
            </div>
            <div>
              <Label htmlFor="date-filter-end" className="text-xs font-medium text-primary/80 block mb-0.5">To:</Label>
              <Input
                type="datetime-local"
                id="date-filter-end"
                value={formatDateToDateTimeLocal(dateRangeFilter.end)}
                onChange={(e) => {
                  const newEnd = e.target.value ? new Date(e.target.value) : null;
                   if (newEnd && isValid(newEnd)) {
                    onDateRangeChange({ ...dateRangeFilter, end: newEnd });
                  } else if (!e.target.value) {
                    onDateRangeChange({ ...dateRangeFilter, end: null });
                  }
                }}
                className="h-8 text-xs py-1"
                aria-label="Filter end date and time"
              />
            </div>
          </div>
        </CardHeader>
        
        <Tabs defaultValue="active" className="p-1 flex flex-col min-h-0 h-full">
            <TabsList className="grid w-full grid-cols-2 mb-1 h-auto p-0.5">
                <TabsTrigger value="active" className="text-xs py-1 h-auto data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                    <Zap className="h-3.5 w-3.5 mr-1.5" /> Active ({activePredictions.length})
                </TabsTrigger>
                <TabsTrigger value="expired" className="text-xs py-1 h-auto data-[state=active]:bg-muted data-[state=active]:text-foreground" disabled={!showExpired}>
                    <History className="h-3.5 w-3.5 mr-1.5" /> Expired ({expiredPredictions.length})
                </TabsTrigger>
            </TabsList>
            {renderTableSection(activePredictions, 'active', "active")}
            {showExpired && renderTableSection(expiredPredictions, 'expired', "expired")}
        </Tabs>
        
        <CardFooter className="p-2 text-[10px] text-muted-foreground border-t">
          Total Displayed: {activePredictions.length + (showExpired ? expiredPredictions.length : 0)} (Max {maxLogs} overall)
          {(activePredictions.length + (showExpired ? expiredPredictions.length : 0)) === 0 && (
            <span className="ml-2 flex items-center">
                 <Info className="h-3 w-3 mr-1 text-muted-foreground" aria-hidden="true" />
                No predictions found. Set parameters or adjust filters.
            </span>
        )}
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}

// Define VariantProps type locally if not globally available or for clarity
type VariantProps<T extends (...args: any) => any> = Parameters<T>[0] extends undefined ? {} : Parameters<T>[0];

