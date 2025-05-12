// src/components/geonera/predictions-table.tsx
"use client";

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Info, ArrowUp, ArrowDown, ChevronsUpDown, ListChecks, Zap, TrendingUpIcon, TrendingDownIcon, CalendarDays, Coins, Settings, PackageCheck, PackageOpen } from "lucide-react";
import type { PredictionLogItem, PredictionStatus, PipsPredictionOutcome, SortConfig, SortableColumnKey } from '@/types';
import { format as formatDateFns } from 'date-fns';
import { Card, CardHeader, CardTitle, CardFooter, CardContent } from "@/components/ui/card";
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
  title: string; // "Active Predictions" or "Expired Predictions"
  predictions: PredictionLogItem[];
  onRowClick: (log: PredictionLogItem) => void;
  selectedPredictionId?: string | null;
  maxLogs: number;
  sortConfig: SortConfig | null;
  onSort: (key: SortableColumnKey) => void;
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
      case 'profitPipsMin': return log.pipsSettings.profitPips.min; // Sorting by min, can be max or avg too
      case 'lossPipsMin': return log.pipsSettings.lossPips.min; // Sorting by min
      case 'tradingSignal': return log.predictionOutcome?.tradingSignal;
      case 'expiresAt': return log.expiresAt;
      default: return undefined;
    }
};


export function PredictionsTable({
  title,
  predictions,
  onRowClick,
  selectedPredictionId,
  maxLogs,
  sortConfig,
  onSort,
}: PredictionsTableProps) {

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
          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-xs">
            {title === "Active Predictions" ? "No active predictions found." : "No expired predictions found."}
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
        <TableCell className="px-1 py-0.5 text-center whitespace-nowrap text-[10px]">
            <span className="text-green-500 flex items-center justify-center">
              <TrendingUpIcon className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" /> {log.pipsSettings.profitPips.min}-{log.pipsSettings.profitPips.max}
            </span>
        </TableCell>
        <TableCell className="px-1 py-0.5 text-center whitespace-nowrap text-[10px]">
            <span className="text-red-500 flex items-center justify-center">
              <TrendingDownIcon className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" /> {log.pipsSettings.lossPips.min}-{log.pipsSettings.lossPips.max}
            </span>
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
      {renderSortableHeader(<ListChecks className="h-3.5 w-3.5 mx-auto" aria-label="Status" />, "status", "Prediction Status", undefined, "w-10")}
      {renderSortableHeader(<CalendarDays className="h-3.5 w-3.5 mx-auto" aria-label="Time" />, "timestamp", "Prediction Timestamp")}
      {renderSortableHeader(<Coins className="h-3.5 w-3.5 mx-auto" aria-label="Pair" />, "currencyPair", "Currency Pair")}
      {renderSortableHeader(<TrendingUpIcon className="h-3.5 w-3.5 mx-auto text-green-500" aria-label="Profit PIPS" />, "profitPipsMin", "Profit PIPS Range (Min-Max)")}
      {renderSortableHeader(<TrendingDownIcon className="h-3.5 w-3.5 mx-auto text-red-500" aria-label="Loss PIPS" />, "lossPipsMin", "Loss PIPS Range (Min-Max)")}
      {renderSortableHeader("Signal", "tradingSignal", "Trading Signal")}
      {renderSortableHeader(<Zap className="h-3.5 w-3.5 mx-auto" aria-label="Expires" />, "expiresAt", "Expires In (DD HH:MM:SS)")}
    </TableRow>
  );

  return (
    <TooltipProvider>
      <Card className="shadow-xl h-full grid grid-rows-[auto_1fr_auto]" aria-labelledby={`${title.toLowerCase().replace(/\s+/g, '-')}-title`}>
        <CardHeader className="bg-primary/10 p-2 rounded-t-lg flex flex-row items-center justify-between">
          <CardTitle id={`${title.toLowerCase().replace(/\s+/g, '-')}-title`} className="text-base font-semibold text-primary flex items-center">
            {title === "Active Predictions" ? <PackageCheck className="h-4 w-4 mr-1.5" /> : <PackageOpen className="h-4 w-4 mr-1.5" />}
            {title}
          </CardTitle>
          {(title === "Active Predictions" || title === "Expired Predictions") && (
             <Tooltip>
                <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 p-1" aria-label={`${title} Settings`}>
                        <Settings className="h-4 w-4 text-primary/80" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Settings for {title} (e.g., Filter/Sort - not implemented yet)</p>
                </TooltipContent>
            </Tooltip>
          )}
        </CardHeader>

        <CardContent className="p-0 flex-grow overflow-hidden">
            <ScrollArea className="h-full rounded-md border-0">
                <Table className="min-w-full table-fixed">
                    <TableHeader className="sticky top-0 bg-card z-10">{tableHeaders}</TableHeader>
                    <TableBody>{renderTableRows(predictions)}</TableBody>
                </Table>
            </ScrollArea>
        </CardContent>

        <CardFooter className="p-1.5 text-[10px] text-muted-foreground border-t">
          Displayed: {predictions.length}. (Overall Max: {maxLogs}).
          {predictions.length === 0 && (
            <span className="ml-2 flex items-center">
                 <Info className="h-3 w-3 mr-1 text-muted-foreground" aria-hidden="true" />
                {title === "Active Predictions" ? "No active logs. Set parameters or adjust filters." : "No expired logs found for the current filters."}
            </span>
        )}
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}

// Define VariantProps type locally if not globally available or for clarity
type VariantProps<T extends (...args: any) => any> = Parameters<T>[0] extends undefined ? {} : Parameters<T>[0];
