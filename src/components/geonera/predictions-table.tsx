// src/components/geonera/predictions-table.tsx
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Info, ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import type { PredictionLogItem, PredictionStatus, PipsPredictionOutcome, SortConfig, SortableColumnKey } from '@/types';
import { format as formatDateFns } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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


export function PredictionsTable({ predictions, onRowClick, selectedPredictionId, maxLogs, sortConfig, onSort }: PredictionsTableProps) {
  if (predictions.length === 0) {
    return (
      <div className="p-2 bg-card shadow-lg rounded-lg border border-border min-h-[200px] flex flex-col items-center justify-center text-center h-full" role="status" aria-live="polite">
        <Info className="h-10 w-10 text-muted-foreground mb-3" aria-hidden="true" />
        <p className="text-lg text-muted-foreground">No active predictions.</p>
        <p className="text-sm text-muted-foreground">Set parameters or adjust filters to see predictions. They will appear here and be removed upon expiration.</p>
      </div>
    );
  }

  const renderSortableHeader = (label: string, columnKey: SortableColumnKey, tooltipContent: string) => (
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

  return (
    <TooltipProvider>
      <Card className="shadow-xl h-full grid grid-rows-[auto_1fr_auto]" aria-labelledby="prediction-log-title">
        <CardHeader className="bg-primary/10 p-2 rounded-t-lg">
          <CardTitle id="prediction-log-title" className="text-xl font-semibold text-primary">Prediction Log</CardTitle>
          <CardDescription className="text-sm text-primary/80">Tracks active predictions. Click a row to see details. Expired predictions are automatically removed.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex-grow min-h-0">
          <ScrollArea className="h-full w-full rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  {renderSortableHeader("Status", "status", "Indicates the current state of the prediction (Pending, Success, Error). Click to sort.")}
                  {renderSortableHeader("Timestamp", "timestamp", "The date and time when the prediction was generated. Click to sort.")}
                  {renderSortableHeader("Pair", "currencyPair", "The currency pair for which the prediction is made (e.g., XAU/USD). Click to sort.")}
                  {renderSortableHeader("PIPS Target", "pipsTargetMin", "The desired PIPS movement range (Min - Max) for the prediction. Sorted by Min PIPS. Click to sort.")}
                  {renderSortableHeader("Signal (MT5)", "tradingSignal", "The recommended trading action based on the prediction (e.g., BUY, SELL, HOLD). Click to sort.")}
                  {renderSortableHeader("Expires In", "expiresAt", "Time remaining until this prediction expires (DD HH:mm:ss). Click to sort.")}
                </TableRow>
              </TableHeader>
              <TableBody>
                {predictions.map((log) => ( 
                  <TableRow 
                    key={log.id} 
                    onClick={() => onRowClick(log)}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50 transition-colors",
                      selectedPredictionId === log.id && "bg-secondary text-secondary-foreground hover:bg-muted"
                    )}
                    aria-selected={selectedPredictionId === log.id}
                    tabIndex={0} // Make row focusable
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
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
        {predictions.length > 0 && (
          <CardFooter className="p-3 text-xs text-muted-foreground border-t">
            Displaying {predictions.length} active prediction log(s). Max {maxLogs} logs.
          </CardFooter>
        )}
      </Card>
    </TooltipProvider>
  );
}

// Define VariantProps type locally if not globally available or for clarity
type VariantProps<T extends (...args: any) => any> = Parameters<T>[0] extends undefined ? {} : Parameters<T>[0];
