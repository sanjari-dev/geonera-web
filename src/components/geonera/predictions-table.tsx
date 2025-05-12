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
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Info, ArrowUp, ArrowDown, ChevronsUpDown, ListChecks, Zap, TrendingUpIcon, TrendingDownIcon, CalendarDays } from "lucide-react";
import type { PredictionLogItem, PredictionStatus, PipsPredictionOutcome, SortConfig, SortableColumnKey, DateRangeFilter } from '@/types';
import { format as formatDateFns, isValid } from 'date-fns';
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
  showExpired: boolean; // Prop to know if expired items are included in 'predictions'
}

const StatusIndicator: React.FC<{ status: PredictionStatus }> = ({ status }) => {
  const commonClass = "h-3.5 w-3.5";
  let iconElement;
  let tooltipContent;

  switch (status) {
    case "PENDING":
      iconElement = <Loader2 className={cn(commonClass, "animate-spin text-blue-500")} aria-label="Pending" />;
      tooltipContent = "Pending";
      break;
    case "SUCCESS":
      iconElement = <CheckCircle2 className={cn(commonClass, "text-green-500")} aria-label="Success" />;
      tooltipContent = "Success";
      break;
    case "ERROR":
      iconElement = <AlertCircle className={cn(commonClass, "text-red-500")} aria-label="Error" />;
      tooltipContent = "Error";
      break;
    case "IDLE": 
       iconElement = <Info className={cn(commonClass, "text-gray-400")} aria-label="Idle" />;
       tooltipContent = "Idle";
       break;
    default:
      return null;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild><div className="flex justify-center items-center h-full w-full">{iconElement}</div></TooltipTrigger>
      <TooltipContent><p>{tooltipContent}</p></TooltipContent>
    </Tooltip>
  );
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
  showExpired, // Used for footer text now
}: PredictionsTableProps) {

  const sortedPredictions = useMemo(() => {
    if (!sortConfig) return [...predictions]; 
    return [...predictions].sort((a, b) => {
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
  }, [predictions, sortConfig]);


  const renderSortableHeader = (label: string | React.ReactNode, columnKey: SortableColumnKey, tooltipContent: string, icon?: React.ReactNode, headerClassName?: string) => (
    <TableHead
      className={cn("px-1 py-1 text-center whitespace-nowrap cursor-pointer hover:bg-accent/50 transition-colors sticky top-0 bg-card z-10 text-xs h-auto", headerClassName)}
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

  const renderTableRows = (data: PredictionLogItem[]) => {
    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs">
            No predictions found for the selected date range and filters.
          </TableCell>
        </TableRow>
      );
    }
    return data.map((log) => (
      <TableRow 
        key={log.id}
        onClick={() => onRowClick(log)}
        className={cn(
          "cursor-pointer hover:bg-muted/50 transition-colors",
          selectedPredictionId === log.id && "bg-secondary text-secondary-foreground hover:bg-muted"
        )}
        aria-selected={selectedPredictionId === log.id}
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onRowClick(log); }}
      >
        <TableCell className="px-1 py-0.5 text-center whitespace-nowrap w-10">
          <StatusIndicator status={log.status} />
        </TableCell>
        <TableCell className="px-1 py-0.5 text-[10px] text-center whitespace-nowrap">
          {formatDateFns(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss XXX")}
        </TableCell>
        <TableCell className="px-1 py-0.5 font-medium text-center whitespace-nowrap text-[11px]">{log.currencyPair}</TableCell>
        <TableCell className="px-1 py-0.5 text-center whitespace-nowrap text-[11px]">
          <div className="flex flex-col items-center">
            <span className="text-green-500 flex items-center text-[10px]">
              <TrendingUpIcon className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />P: {log.pipsSettings.profitPips.min}-{log.pipsSettings.profitPips.max}
            </span>
            <span className="text-red-500 flex items-center text-[10px]">
              <TrendingDownIcon className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />L: {log.pipsSettings.lossPips.min}-{log.pipsSettings.lossPips.max}
            </span>
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
      {renderSortableHeader(<ListChecks className="h-3.5 w-3.5 mx-auto" aria-label="Status" />, "status", "Status", undefined, "w-10")}
      {renderSortableHeader(<CalendarDays className="h-3.5 w-3.5 mx-auto" aria-label="Time" />, "timestamp", "Timestamp")}
      {renderSortableHeader("Pair", "currencyPair", "Currency Pair")}
      {renderSortableHeader(
        "PIPS (P/L)", 
        "profitPipsMin", // Sorting by profitPipsMin as representative
        "Profit / Loss PIPS Range"
      )}
      {renderSortableHeader("Signal", "tradingSignal", "Trading Signal")}
      {renderSortableHeader(<Zap className="h-3.5 w-3.5 mx-auto" aria-label="Expires" />, "expiresAt", "Expires In")}
    </TableRow>
  );

  return (
    <TooltipProvider>
      <Card className="shadow-xl h-full grid grid-rows-[auto_1fr_auto]" aria-labelledby="prediction-log-title">
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
        
        <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full rounded-md border-0">
                <Table className="min-w-full table-fixed">
                    <TableHeader className="sticky top-0 bg-card z-10">{tableHeaders}</TableHeader>
                    <TableBody>{renderTableRows(sortedPredictions)}</TableBody>
                </Table>
            </ScrollArea>
        </div>
        
        <CardFooter className="p-2 text-[10px] text-muted-foreground border-t">
          Total Displayed: {sortedPredictions.length} (Max {maxLogs} overall stored). {showExpired ? "Showing expired logs." : "Expired logs hidden."}
          {sortedPredictions.length === 0 && (
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
