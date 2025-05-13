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
import { AlertCircle, CheckCircle2, Loader2, Info, ArrowUp, ArrowDown, ChevronsUpDown, ListChecks, Zap, TrendingUpIcon, TrendingDownIcon, CalendarDays, Coins, Settings, Filter, Save, Sigma, HelpCircle, TrendingUp, TrendingDown, PauseCircle, Clock, ListFilter } from "lucide-react";
import type { PredictionLogItem, PredictionStatus, PipsPredictionOutcome, SortConfig, SortableColumnKey, StatusFilterType, SignalFilterType } from '@/types';
import { STATUS_FILTER_OPTIONS, SIGNAL_FILTER_OPTIONS, DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT, DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT, MAX_PREDICTION_LOGS_CONFIG } from '@/types';
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
import { Progress } from "@/components/ui/progress";
import { getSortableValue } from '@/lib/table-utils';


interface PredictionsTableProps {
  title: string;
  titleIcon?: React.ReactNode;
  predictions: PredictionLogItem[];
  onRowClick: (log: PredictionLogItem) => void;
  selectedPredictionId?: string | null;
  sortConfig: SortConfig | null;
  onSort: (key: SortableColumnKey) => void;
  filterStatus: StatusFilterType;
  onFilterStatusChange: (value: StatusFilterType) => void;
  filterSignal: SignalFilterType;
  onFilterSignalChange: (value: SignalFilterType) => void;
  displayLimit: number;
  onDisplayLimitChange: (value: number) => void;
  totalAvailableForDisplay: number; 
  maxLogs: number; 
}


const StatusIndicator: React.FC<{ status: PredictionStatus }> = ({ status }) => {
  const commonClass = "h-3.5 w-3.5 mx-auto";
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
      return <div className="flex justify-center items-center h-full w-full" aria-label="Unknown status"><HelpCircle className={cn(commonClass, "text-gray-400")} /></div>;
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild><div className="flex justify-center items-center h-full w-full">{iconElement}</div></TooltipTrigger>
      <TooltipContent><p>{tooltipContent}</p></TooltipContent>
    </Tooltip>
  );
};


const SignalIconDisplay: React.FC<{ signal?: PipsPredictionOutcome["tradingSignal"], className?: string }> = ({ signal, className }) => {
  const iconCommonClass = "h-3.5 w-3.5 mx-auto";
  let iconElement: React.ReactNode;
  let tooltipText: string = "N/A";

  if (!signal) {
     iconElement = <HelpCircle className={cn(iconCommonClass, "text-gray-400", className)} aria-label="Not Available" />;
     tooltipText = "N/A";
  } else {
    switch (signal) {
      case "BUY":
        iconElement = <TrendingUp className={cn(iconCommonClass, "text-green-500", className)} aria-label="Buy Signal" />;
        tooltipText = "BUY";
        break;
      case "SELL":
        iconElement = <TrendingDown className={cn(iconCommonClass, "text-red-500", className)} aria-label="Sell Signal" />;
        tooltipText = "SELL";
        break;
      case "HOLD":
        iconElement = <PauseCircle className={cn(iconCommonClass, "text-yellow-500", className)} aria-label="Hold Signal" />;
        tooltipText = "HOLD";
        break;
      case "WAIT":
        iconElement = <Clock className={cn(iconCommonClass, "text-blue-500", className)} aria-label="Wait Signal" />;
        tooltipText = "WAIT";
        break;
      case "N/A":
      default:
        iconElement = <HelpCircle className={cn(iconCommonClass, "text-gray-500", className)} aria-label="Signal Not Available" />;
        tooltipText = "N/A";
        break;
    }
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild><div className="flex justify-center items-center h-full w-full">{iconElement}</div></TooltipTrigger>
      <TooltipContent><p>{tooltipText}</p></TooltipContent>
    </Tooltip>
  );
};


const SortIndicator: React.FC<{ sortConfig: SortConfig | null, columnKey: SortableColumnKey }> = ({ sortConfig, columnKey }) => {
  if (!sortConfig || sortConfig.key !== columnKey) {
    return <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" aria-hidden="true" />;
  }
  return sortConfig.direction === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" aria-label="Sorted ascending" /> : <ArrowDown className="ml-1 h-3 w-3" aria-label="Sorted descending" />;
};


export function PredictionsTable({
  title,
  titleIcon,
  predictions,
  onRowClick,
  selectedPredictionId,
  sortConfig,
  onSort,
  filterStatus,
  onFilterStatusChange,
  filterSignal,
  onFilterSignalChange,
  displayLimit,
  onDisplayLimitChange,
  totalAvailableForDisplay,
  maxLogs,
}: PredictionsTableProps) {
  const [viewMode, setViewMode] = useState<'table' | 'filter'>('table');
  const [tempFilterStatus, setTempFilterStatus] = useState<StatusFilterType>(filterStatus);
  const [tempFilterSignal, setTempFilterSignal] = useState<SignalFilterType>(filterSignal);
  const [tempDisplayLimit, setTempDisplayLimit] = useState<number>(displayLimit);

  useEffect(() => {
    setTempFilterStatus(filterStatus);
  }, [filterStatus]);

  useEffect(() => {
    setTempFilterSignal(filterSignal);
  }, [filterSignal]);

  useEffect(() => {
    setTempDisplayLimit(displayLimit);
  }, [displayLimit]);


  const handleApplyFilters = () => {
    onFilterStatusChange(tempFilterStatus);
    onFilterSignalChange(tempFilterSignal);

    let newLimit = parseInt(String(tempDisplayLimit), 10);
    const defaultLimit = title === "Active Predictions" ? DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT : DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT;
    if (Number.isNaN(newLimit) || newLimit <= 0) {
      newLimit = defaultLimit;
    } else if (newLimit > MAX_PREDICTION_LOGS_CONFIG) {
      newLimit = MAX_PREDICTION_LOGS_CONFIG;
    }
    onDisplayLimitChange(newLimit);
    setViewMode('table');
  };

  const handleCancelFilters = () => {
    setTempFilterStatus(filterStatus);
    setTempFilterSignal(filterSignal);
    setTempDisplayLimit(displayLimit);
    setViewMode('table');
  };

  const handleGearClick = () => {
    setTempFilterStatus(filterStatus);
    setTempFilterSignal(filterSignal);
    setTempDisplayLimit(displayLimit);
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
      {renderSortableHeader("Time", "timestamp", "Prediction Timestamp", <CalendarDays className="h-3.5 w-3.5 mx-auto" aria-hidden="true" />)}
      {renderSortableHeader("Pair", "currencyPair", "Currency Pair", <Coins className="h-3.5 w-3.5 mx-auto" aria-hidden="true" />)}
      {renderSortableHeader("P.Max", "profitPipsMax", "Max Profit PIPS", <TrendingUpIcon className="h-3.5 w-3.5 mx-auto text-[hsl(var(--chart-2))]" aria-hidden="true" />)}
      {renderSortableHeader("L.Max", "lossPipsMax", "Max Loss PIPS", <TrendingDownIcon className="h-3.5 w-3.5 mx-auto text-[hsl(var(--chart-1))]" aria-hidden="true" />)}
      {renderSortableHeader(<Sigma className="h-3.5 w-3.5 mx-auto" aria-label="Trading Signal" />, "tradingSignal", "Trading Signal")}
      {renderSortableHeader("Expires", "expiresAt", "Expires In (DD HH:MM:SS)", <Zap className="h-3.5 w-3.5 mx-auto" aria-hidden="true" />)}
    </TableRow>
  );

  const renderTableRows = (data: PredictionLogItem[]) => {
    if (data.length === 0 && totalAvailableForDisplay === 0) { // Adjusted condition
      return (
        <TableRow>
          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-xs">
            {/* This part will be handled by the footer logic now */}
          </TableCell>
        </TableRow>
      );
    }
     if (data.length === 0 && totalAvailableForDisplay > 0) { // If no data to display but some are available (e.g. due to displayLimit)
      return (
        <TableRow>
          <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-xs">
            No predictions match current display settings. Adjust limit or filters.
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
         <TableCell className="px-1 py-0.5 text-center whitespace-nowrap text-[10px] text-[hsl(var(--chart-2))]">
             {log.pipsSettings.profitPips.max}
        </TableCell>
        <TableCell className="px-1 py-0.5 text-center whitespace-nowrap text-[10px] text-[hsl(var(--chart-1))]">
            {log.pipsSettings.lossPips.max}
        </TableCell>
        <TableCell className="px-1 py-0.5 text-[11px] text-center whitespace-nowrap">
          {log.status === "SUCCESS" && log.predictionOutcome?.tradingSignal ? (
            <SignalIconDisplay signal={log.predictionOutcome.tradingSignal} />
          ) : log.status === "PENDING" ? (
            <span className="text-muted-foreground">...</span>
          ) : (
             <SignalIconDisplay signal={undefined} />
          )}
        </TableCell>
        <TableCell className="px-1 py-0.5 text-[10px] text-center whitespace-nowrap">
          {log.expiresAt && log.status === "SUCCESS" && title === "Active Predictions" ? (
            <div className="flex flex-col items-center justify-center">
              <CountdownTimer expiresAt={log.expiresAt} className="text-[10px]" />
              {(() => {
                const totalDuration = new Date(log.expiresAt).getTime() - new Date(log.timestamp).getTime();
                if (totalDuration <= 0) return null;
                const timeNow = typeof window !== 'undefined' ? new Date().getTime() : Date.now(); 
                const elapsedSinceStart = timeNow - new Date(log.timestamp).getTime();
                let progressValue = (elapsedSinceStart / totalDuration) * 100;
                const remainingPercent = Math.max(0, 100 - progressValue);

                return (
                  <Progress
                    value={remainingPercent}
                    className="h-1 w-[60px] mt-0.5"
                    aria-label={`Time remaining ${Math.round(remainingPercent)}%`}
                  />
                );
              })()}
            </div>
          ) : log.expiresAt && log.status === "SUCCESS" && title === "Expired Predictions" ? (
             <span className="text-muted-foreground/70">Expired</span>
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
            {titleIcon || (title === "Active Predictions" ? <ListFilter className="h-4 w-4 mr-1.5" aria-hidden="true" /> : <ListFilter className="h-4 w-4 mr-1.5" aria-hidden="true" />)}
            {title}
          </CardTitle>
          <Tooltip>
              <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 p-1" aria-label={`Settings for ${title}`} onClick={handleGearClick}>
                      <Filter className="h-4 w-4 text-primary/80" aria-hidden="true" />
                  </Button>
              </TooltipTrigger>
              <TooltipContent>
                  <p>Settings for {title}</p>
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
              <h4 className="text-sm font-medium text-primary">Settings for {title}</h4>
              <div className="space-y-1">
                <Label htmlFor={`${title}-filter-status`} className="text-xs">Status</Label>
                <Select
                  value={tempFilterStatus}
                  onValueChange={(value) => setTempFilterStatus(value as StatusFilterType)}
                >
                  <SelectTrigger id={`${title}-filter-status`} className="w-full text-xs py-1 h-8" aria-label={`Filter by status for ${title}`}>
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
                  <SelectTrigger id={`${title}-filter-signal`} className="w-full text-xs py-1 h-8" aria-label={`Filter by signal for ${title}`}>
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
              <div className="space-y-1">
                <Label htmlFor={`${title}-display-limit`} className="text-xs flex items-center">
                  <Sigma className="h-3 w-3 mr-1" aria-hidden="true" /> Max Logs to Display
                </Label>
                <Input
                  id={`${title}-display-limit`}
                  type="number"
                  value={String(tempDisplayLimit)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setTempDisplayLimit(isNaN(val) ? 0 : val); 
                  }}
                  min="1"
                  max={maxLogs}
                  className="w-full text-xs py-1 h-8"
                  placeholder={`e.g., ${title === "Active Predictions" ? DEFAULT_ACTIVE_LOGS_DISPLAY_COUNT : DEFAULT_EXPIRED_LOGS_DISPLAY_COUNT} (max ${maxLogs})`}
                  aria-label={`Maximum logs to display for ${title}`}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={handleCancelFilters} className="text-xs">Cancel</Button>
                <Button size="sm" onClick={handleApplyFilters} className="text-xs">
                  <Save className="h-3.5 w-3.5 mr-1" aria-hidden="true" /> Apply Settings
                </Button>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="p-1.5 text-[10px] text-muted-foreground border-t">
          {viewMode === 'table' ? (
            (predictions.length === 0 && totalAvailableForDisplay === 0) ? (
              <span className="flex items-center">
                <Info className="h-3 w-3 mr-1 text-muted-foreground" aria-hidden="true" />
                {title === "Active Predictions" ? "No active logs. Set parameters or adjust filters." : "No expired logs found for current filters."}
              </span>
            ) : (
              <>
                Displayed: {predictions.length}
                {` of ${totalAvailableForDisplay} matching filters.`}
                {` (Limit: ${displayLimit})`}
              </>
            )
          ) : ( 
            <span className="flex items-center italic">
              Adjust settings and click Apply.
            </span>
          )}
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}

type VariantProps<T extends (...args: any) => any> = Parameters<T>[0] extends undefined ? {} : Parameters<T>[0];