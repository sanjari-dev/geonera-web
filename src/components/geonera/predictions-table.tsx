// src/components/geonera/predictions-table.tsx
"use client";

import React, { useState, useEffect } from 'react';
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
import { AlertCircle, CheckCircle2, Loader2, Info, ArrowUp, ArrowDown, ChevronsUpDown, ListChecks, Zap, TrendingUpIcon, TrendingDownIcon, CalendarDays, Coins, Settings, PackageCheck, PackageOpen, Filter, Save, Sigma } from "lucide-react";
import type { PredictionLogItem, PredictionStatus, PipsPredictionOutcome, SortConfig, SortableColumnKey, StatusFilterType, SignalFilterType } from '@/types';
import { STATUS_FILTER_OPTIONS, SIGNAL_FILTER_OPTIONS, DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT, DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT } from '@/types'; // Import filter options
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";


interface PredictionsTableProps {
  title: string; 
  predictions: PredictionLogItem[];
  onRowClick: (log: PredictionLogItem) => void;
  selectedPredictionId?: string | null;
  maxLogs: number; // Global storage max, still used for capping input
  sortConfig: SortConfig | null;
  onSort: (key: SortableColumnKey) => void;
  filterStatus: StatusFilterType;
  onFilterStatusChange: (value: StatusFilterType) => void;
  filterSignal: SignalFilterType;
  onFilterSignalChange: (value: SignalFilterType) => void;
  displayLimit?: number; // Max items to display in this table instance
  onDisplayLimitChange?: (value: number) => void; // Handler to change displayLimit
  totalAvailableForDisplay?: number; // Total items available before displayLimit slicing
}

const StatusIndicator: React.FC<{ status: PredictionStatus }> = ({ status }) => {
  const commonClass = "h-3.5 w-3.5 mx-auto"; // Added mx-auto for centering
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
      return <div className="flex justify-center items-center h-full w-full">?</div>;
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


export function PredictionsTable({
  title,
  predictions,
  onRowClick,
  selectedPredictionId,
  maxLogs, // Global storage max, still used for capping input
  sortConfig,
  onSort,
  filterStatus,
  onFilterStatusChange,
  filterSignal,
  onFilterSignalChange,
  displayLimit,
  onDisplayLimitChange,
  totalAvailableForDisplay,
}: PredictionsTableProps) {
  const [viewMode, setViewMode] = useState<'table' | 'filter'>('table');
  const [tempFilterStatus, setTempFilterStatus] = useState<StatusFilterType>(filterStatus);
  const [tempFilterSignal, setTempFilterSignal] = useState<SignalFilterType>(filterSignal);
  const [tempDisplayLimit, setTempDisplayLimit] = useState<number>(displayLimit ?? (title === "Active Predictions" ? DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT : DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT));

  useEffect(() => {
    setTempFilterStatus(filterStatus);
  }, [filterStatus]);

  useEffect(() => {
    setTempFilterSignal(filterSignal);
  }, [filterSignal]);

  useEffect(() => {
    setTempDisplayLimit(displayLimit ?? (title === "Active Predictions" ? DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT : DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT));
  }, [displayLimit, title]);


  const handleApplyFilters = () => {
    onFilterStatusChange(tempFilterStatus);
    onFilterSignalChange(tempFilterSignal);
    if (onDisplayLimitChange) {
      let newLimit = parseInt(String(tempDisplayLimit), 10);
      const defaultLimit = title === "Active Predictions" ? DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT : DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT;
      if (Number.isNaN(newLimit) || newLimit <= 0) {
        newLimit = defaultLimit; 
      } else if (newLimit > maxLogs) { 
        newLimit = maxLogs;
      }
      onDisplayLimitChange(newLimit);
    }
    setViewMode('table');
  };

  const handleCancelFilters = () => {
    setTempFilterStatus(filterStatus); 
    setTempFilterSignal(filterSignal);
    setTempDisplayLimit(displayLimit ?? (title === "Active Predictions" ? DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT : DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT));
    setViewMode('table');
  };

  const handleGearClick = () => {
    setTempFilterStatus(filterStatus); 
    setTempFilterSignal(filterSignal);
    setTempDisplayLimit(displayLimit ?? (title === "Active Predictions" ? DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT : DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT));
    setViewMode('filter');
  };


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

  const tableHeaders = (
    <TableRow className="h-auto">
      {renderSortableHeader(<ListChecks className="h-3.5 w-3.5 mx-auto" aria-label="Status" />, "status", "Prediction Status", undefined, "w-10")}
      {renderSortableHeader("Time", "timestamp", "Prediction Timestamp", <CalendarDays className="h-3.5 w-3.5 mx-auto" />)}
      {renderSortableHeader("Pair", "currencyPair", "Currency Pair", <Coins className="h-3.5 w-3.5 mx-auto" />)}
      {renderSortableHeader("P.Min", "profitPipsMin", "Min Profit PIPS", <TrendingUpIcon className="h-3.5 w-3.5 mx-auto text-green-500" />)}
      {renderSortableHeader("P.Max", "profitPipsMax", "Max Profit PIPS", <TrendingUpIcon className="h-3.5 w-3.5 mx-auto text-green-500" />)}
      {renderSortableHeader("L.Min", "lossPipsMin", "Min Loss PIPS", <TrendingDownIcon className="h-3.5 w-3.5 mx-auto text-red-500" />)}
      {renderSortableHeader("L.Max", "lossPipsMax", "Max Loss PIPS", <TrendingDownIcon className="h-3.5 w-3.5 mx-auto text-red-500" />)}
      {renderSortableHeader("Signal", "tradingSignal", "Trading Signal")}
      {renderSortableHeader("Expires", "expiresAt", "Expires In (DD HH:MM:SS)", <Zap className="h-3.5 w-3.5 mx-auto" />)}
    </TableRow>
  );
  
  const renderTableRows = (data: PredictionLogItem[]) => {
    if (data.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={9} className="h-24 text-center text-muted-foreground text-xs">
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
             {log.pipsSettings.profitPips.min}
        </TableCell>
         <TableCell className="px-1 py-0.5 text-center whitespace-nowrap text-[10px]">
             {log.pipsSettings.profitPips.max}
        </TableCell>
        <TableCell className="px-1 py-0.5 text-center whitespace-nowrap text-[10px]">
            {log.pipsSettings.lossPips.min}
        </TableCell>
        <TableCell className="px-1 py-0.5 text-center whitespace-nowrap text-[10px]">
            {log.pipsSettings.lossPips.max}
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


  return (
    <TooltipProvider>
      <Card className="shadow-xl h-full grid grid-rows-[auto_1fr_auto]" aria-labelledby={`${title.toLowerCase().replace(/\s+/g, '-')}-title`}>
        <CardHeader className="bg-primary/10 p-2 rounded-t-lg flex flex-row items-center justify-between">
          <CardTitle id={`${title.toLowerCase().replace(/\s+/g, '-')}-title`} className="text-base font-semibold text-primary flex items-center">
            {title === "Active Predictions" ? <PackageCheck className="h-4 w-4 mr-1.5" /> : <PackageOpen className="h-4 w-4 mr-1.5" />}
            {title}
          </CardTitle>
          <Tooltip>
              <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-1" aria-label={`Filter ${title}`} onClick={handleGearClick}>
                      <Filter className="h-4 w-4 text-primary/80" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent>
                  <p>Filter {title}</p>
              </TooltipContent>
          </Tooltip>
        </CardHeader>

        <CardContent className="p-0 flex-grow overflow-hidden">
          {viewMode === 'table' ? (
            <ScrollArea className="h-full rounded-md border-0">
                <Table className="min-w-full table-fixed">
                    <TableHeader className="sticky top-0 bg-card z-10">{tableHeaders}</TableHeader>
                    <TableBody>{renderTableRows(predictions)}</TableBody>
                </Table>
            </ScrollArea>
          ) : (
            <div className="p-3 space-y-3">
              <h4 className="text-sm font-medium text-primary">Filter {title}</h4>
              <div className="space-y-1">
                <Label htmlFor={`${title}-filter-status`} className="text-xs">Status</Label>
                <Select
                  value={tempFilterStatus}
                  onValueChange={(value) => setTempFilterStatus(value as StatusFilterType)}
                >
                  <SelectTrigger id={`${title}-filter-status`} className="w-full text-xs py-1 h-8">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-xs py-1">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${title}-filter-signal`} className="text-xs">Signal</Label>
                <Select
                  value={tempFilterSignal}
                  onValueChange={(value) => setTempFilterSignal(value as SignalFilterType)}
                >
                  <SelectTrigger id={`${title}-filter-signal`} className="w-full text-xs py-1 h-8">
                    <SelectValue placeholder="Select signal" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIGNAL_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-xs py-1">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {onDisplayLimitChange && ( 
                <div className="space-y-1">
                  <Label htmlFor={`${title}-display-limit`} className="text-xs flex items-center">
                    <Sigma className="h-3 w-3 mr-1" /> Max Logs to Display
                  </Label>
                  <Input
                    id={`${title}-display-limit`}
                    type="number"
                    value={String(tempDisplayLimit)}
                    onChange={(e) => setTempDisplayLimit(parseInt(e.target.value, 10))}
                    min="1"
                    max={maxLogs} 
                    className="w-full text-xs py-1 h-8"
                    placeholder={`e.g., ${title === "Active Predictions" ? DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT : DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT} (max ${maxLogs})`}
                    aria-label={`Maximum logs to display for ${title}`}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleCancelFilters} className="text-xs">Cancel</Button>
                <Button size="sm" onClick={handleApplyFilters} className="text-xs">
                  <Save className="h-3.5 w-3.5 mr-1" /> Apply Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-1.5 text-[10px] text-muted-foreground border-t">
          Displayed: {predictions.length}
          {totalAvailableForDisplay !== undefined ? ` of ${totalAvailableForDisplay}` : ''}.
          {displayLimit !== undefined ? ` (Display limit: ${displayLimit}).` : ''}
          {predictions.length === 0 && viewMode === 'table' && (
            <span className="ml-2 flex items-center">
                 <Info className="h-3 w-3 mr-1 text-muted-foreground" aria-hidden="true" />
                {title === "Active Predictions" ? "No active logs. Set parameters or adjust filters." : "No expired logs found for current filters."}
            </span>
           )}
           {viewMode === 'filter' && (
            <span className="ml-2 flex items-center italic">
                Adjust filters and click Apply.
            </span>
           )}
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}

// Define VariantProps type locally if not globally available or for clarity
type VariantProps<T extends (...args: any) => any> = Parameters<T>[0] extends undefined ? {} : Parameters<T>[0];
