// src/components/geonera/predictions-table.tsx
"use client";

import React, { useState, useMemo } from 'react';
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
import { AlertCircle, CheckCircle2, Loader2, Info, ArrowUp, ArrowDown, ChevronsUpDown, ListChecks } from "lucide-react";
import type { PredictionLogItem, PredictionStatus, PipsPredictionOutcome, SortConfig, SortableColumnKey } from '@/types';
import { format as formatDateFns } from 'date-fns';
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


interface PredictionsTableProps {
  predictions: PredictionLogItem[];
  onRowClick: (log: PredictionLogItem) => void;
  selectedPredictionId?: string | null;
  maxLogs: number; 
  sortConfig: SortConfig | null;
  onSort: (key: SortableColumnKey) => void;
}

const StatusIndicator: React.FC<{ status: PredictionStatus }> = ({ status }) => {
  switch (status) {
    case "PENDING":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" aria-label="Pending" />;
    case "SUCCESS":
      return <CheckCircle2 className="h-4 w-4 text-green-500" aria-label="Success" />;
    case "ERROR":
      return <AlertCircle className="h-4 w-4 text-red-500" aria-label="Error" />;
    case "IDLE": 
       return <Info className="h-4 w-4 text-gray-400" aria-label="Idle" />;
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
    case 'pipsTargetMin': return log.pipsTarget.min;
    case 'tradingSignal': return log.predictionOutcome?.tradingSignal;
    case 'expiresAt': return log.expiresAt;
    default: return undefined;
  }
};


export function PredictionsTable({ predictions, onRowClick, selectedPredictionId, maxLogs, sortConfig, onSort }: PredictionsTableProps) {
  const [activeTab, setActiveTab] = useState("active");

  const now = new Date();


  const sortLogs = (logs: PredictionLogItem[]) => {
    return [...logs].sort((a, b) => {
      if (!sortConfig) return 0;
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
    const filtered = predictions.filter(log => log.status === "PENDING" || log.status === "ERROR" || (log.status === "SUCCESS" && (!log.expiresAt || new Date(log.expiresAt) > now)));
    return sortLogs(filtered);
  }, [predictions, now, sortConfig]); 

  const expiredPredictions = useMemo(() => {
    const filtered = predictions.filter(log => log.status === "SUCCESS" && log.expiresAt && new Date(log.expiresAt) <= now);
    return sortLogs(filtered);
  }, [predictions, now, sortConfig]); 


  const renderSortableHeader = (label: string | React.ReactNode, columnKey: SortableColumnKey, tooltipContent: string) => (
    <TableHead
      className="px-1 py-2 text-center whitespace-nowrap cursor-pointer hover:bg-accent/50 transition-colors sticky top-0 bg-card z-10"
      onClick={() => onSort(columnKey)}
      aria-sort={sortConfig?.key === columnKey ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <Tooltip>
        <TooltipTrigger className="cursor-pointer flex items-center justify-center w-full">
          {label} <SortIndicator sortConfig={sortConfig} columnKey={columnKey} />
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TableHead>
  );

  const renderTableContent = (data: PredictionLogItem[]) => {
    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
            No {activeTab === "active" ? "active" : "expired"} predictions found.
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
        <TableCell className="px-1 py-0.5 text-center whitespace-nowrap">
          <div className="flex justify-center">
            <StatusIndicator status={log.status} />
          </div>
        </TableCell>
        <TableCell className="px-1 py-0.5 text-xs text-center whitespace-nowrap">
          {formatDateFns(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss XXX")}
        </TableCell>
        <TableCell className="px-1 py-0.5 font-medium text-center whitespace-nowrap text-xs">{log.currencyPair}</TableCell>
        <TableCell className="px-1 py-0.5 text-center whitespace-nowrap text-xs">
          <Badge variant={selectedPredictionId === log.id ? "default" : "secondary"} className="px-1.5 py-0.5 text-[10px]">
            {log.pipsTarget.min} - {log.pipsTarget.max}
          </Badge>
        </TableCell>
        <TableCell className="px-1 py-0.5 text-xs text-center whitespace-nowrap">
          {log.status === "SUCCESS" && log.predictionOutcome?.tradingSignal ? (
            <Badge 
              variant={getSignalBadgeVariant(log.predictionOutcome.tradingSignal)}
              className={cn("whitespace-nowrap px-1.5 py-0.5 text-[10px]", selectedPredictionId === log.id ? "bg-primary-foreground text-primary" : "")}
            >
              {log.predictionOutcome.tradingSignal}
            </Badge>
          ) : log.status === "PENDING" ? (
            "..."
          ) : (
            "N/A"
          )}
        </TableCell>
        <TableCell className="px-1 py-0.5 text-xs text-center whitespace-nowrap">
          {log.expiresAt && log.status === "SUCCESS" ? (
            <CountdownTimer expiresAt={log.expiresAt} className="text-[11px]" />
          ) : (
            "-- --:--:--"
          )}
        </TableCell>
      </TableRow>
    ));
  };
  
  const displayedPredictions = activeTab === 'active' ? activePredictions : expiredPredictions;
  const tableHeaders = (
    <TableRow>
      {renderSortableHeader(<ListChecks className="h-4 w-4" aria-label="Status" />, "status", "Prediction status (Pending, Success, Error). Click to sort.")}
      {renderSortableHeader("Time", "timestamp", "Prediction generation time. Click to sort.")}
      {renderSortableHeader("Pair", "currencyPair", "Currency pair. Click to sort.")}
      {renderSortableHeader("PIPS", "pipsTargetMin", "PIPS target range (Min - Max). Sorted by Min PIPS. Click to sort.")}
      {renderSortableHeader("Signal", "tradingSignal", "Trading action (BUY, SELL, HOLD). Click to sort.")}
      {renderSortableHeader("Expires", "expiresAt", "Time until prediction expires. Click to sort.")}
    </TableRow>
  );

  return (
    <TooltipProvider>
      <Card className="shadow-xl h-full grid grid-rows-[auto_auto_1fr_auto]" aria-labelledby="prediction-log-title">
        <CardHeader className="bg-primary/10 p-2 rounded-t-lg">
          <CardTitle id="prediction-log-title" className="text-xl font-semibold text-primary">Prediction Log</CardTitle>
        </CardHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col min-h-0 flex-grow">
          <TabsList className="grid w-full grid-cols-2 mx-2 mt-1 mb-0.5 self-start max-w-[calc(100%-1rem)]">
            <TabsTrigger value="active" aria-controls="active-predictions-content">Active ({activePredictions.length})</TabsTrigger>
            <TabsTrigger value="expired" aria-controls="expired-predictions-content">Expired ({expiredPredictions.length})</TabsTrigger>
          </TabsList>
          <CardContent className="p-0 flex-grow min-h-0">
            <TabsContent value="active" id="active-predictions-content" className="m-0 p-0 h-full w-full">
              <ScrollArea className="h-full w-full rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>{tableHeaders}</TableHeader>
                  <TableBody>{renderTableContent(activePredictions)}</TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="expired" id="expired-predictions-content" className="m-0 p-0 h-full w-full">
               <ScrollArea className="h-full w-full rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>{tableHeaders}</TableHeader>
                  <TableBody>{renderTableContent(expiredPredictions)}</TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </CardContent>
        </Tabs>
        { (activePredictions.length > 0 || expiredPredictions.length > 0) && (
          <CardFooter className="p-3 text-xs text-muted-foreground border-t">
            Displaying {displayedPredictions.length} {activeTab} prediction log(s). Total logs tracked: {predictions.length} (Max {maxLogs}).
          </CardFooter>
        )}
         { predictions.length === 0 && (
            <CardFooter className="p-3 text-xs text-muted-foreground border-t flex items-center justify-center">
                 <Info className="h-4 w-4 mr-2 text-muted-foreground" aria-hidden="true" />
                No predictions available. Set parameters or adjust filters.
            </CardFooter>
        )}
      </Card>
    </TooltipProvider>
  );
}

// Define VariantProps type locally if not globally available or for clarity
type VariantProps<T extends (...args: any) => any> = Parameters<T>[0] extends undefined ? {} : Parameters<T>[0];

