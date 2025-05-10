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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Info, Timer } from "lucide-react";
import type { PredictionLogItem, PredictionStatus, PipsPredictionOutcome } from '@/types';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CountdownTimer } from "./countdown-timer";


interface PredictionsTableProps {
  predictions: PredictionLogItem[];
  onRowClick: (log: PredictionLogItem) => void;
  selectedPredictionId?: string | null;
  maxLogs: number; // Add maxLogs prop
}

const StatusIndicator: React.FC<{ status: PredictionStatus }> = ({ status }) => {
  switch (status) {
    case "PENDING":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case "SUCCESS":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "ERROR":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "IDLE":
       return <Info className="h-4 w-4 text-gray-400" />;
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


export function PredictionsTable({ predictions, onRowClick, selectedPredictionId, maxLogs }: PredictionsTableProps) {
  if (predictions.length === 0) {
    return (
      <div className="p-6 bg-card shadow-lg rounded-lg border border-border min-h-[200px] flex flex-col items-center justify-center text-center h-full">
        <Info className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-lg text-muted-foreground">No active predictions.</p>
        <p className="text-sm text-muted-foreground">Set parameters to start generating predictions. They will appear here and be removed upon expiration.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Card className="shadow-xl overflow-hidden h-full">
        <CardHeader className="bg-primary/10 p-4 rounded-t-lg">
           <CardTitle className="text-xl font-semibold text-primary">Prediction Log</CardTitle>
           <CardDescription className="text-sm text-primary/80">Tracks active predictions. Click a row to see details. Expired predictions are automatically removed.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100%-theme(spacing.24)+40px)] md:h-[420px]"> {/* Adjusted height */}
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-[50px] p-3 text-center whitespace-nowrap">
                    <Tooltip>
                      <TooltipTrigger className="cursor-default">Status</TooltipTrigger>
                      <TooltipContent>
                        <p>Indicates the current state of the prediction (Pending, Success, Error).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="w-[150px] p-3 text-center whitespace-nowrap">
                    <Tooltip>
                      <TooltipTrigger className="cursor-default">Timestamp</TooltipTrigger>
                      <TooltipContent>
                        <p>The date and time when the prediction was generated.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="p-3 text-center whitespace-nowrap">
                    <Tooltip>
                      <TooltipTrigger className="cursor-default">Pair</TooltipTrigger>
                      <TooltipContent>
                        <p>The currency pair for which the prediction is made (e.g., XAU/USD).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="p-3 text-center whitespace-nowrap">
                    <Tooltip>
                      <TooltipTrigger className="cursor-default">PIPS Target</TooltipTrigger>
                      <TooltipContent>
                        <p>The desired PIPS movement range (Min - Max) for the prediction.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="p-3 text-center whitespace-nowrap">
                     <Tooltip>
                      <TooltipTrigger className="cursor-default">Signal (MT5)</TooltipTrigger>
                      <TooltipContent>
                        <p>The recommended trading action based on the prediction (e.g., BUY, SELL, HOLD).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="w-[130px] p-3 text-center whitespace-nowrap"> {/* Adjusted width for DD HH:MM:SS + icon */}
                    <Tooltip>
                      <TooltipTrigger className="cursor-default flex items-center justify-center">
                        <Timer className="h-4 w-4 mr-1"/> Expires In
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Time remaining until this prediction expires (DD HH:mm:ss).</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
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
                  >
                    <TableCell className="p-3 text-center whitespace-nowrap">
                      <div className="flex justify-center">
                        <StatusIndicator status={log.status} />
                      </div>
                    </TableCell>
                    <TableCell className="p-3 text-xs text-center whitespace-nowrap">
                      {format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell className="p-3 font-medium text-center whitespace-nowrap">{log.currencyPair}</TableCell>
                    <TableCell className="p-3 text-center whitespace-nowrap">
                      <Badge variant={selectedPredictionId === log.id ? "default" : "secondary"}>
                        {log.pipsTarget.min} - {log.pipsTarget.max}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-3 text-sm text-center whitespace-nowrap">
                      {log.status === "SUCCESS" && log.predictionOutcome?.tradingSignal ? (
                        <Badge 
                          variant={getSignalBadgeVariant(log.predictionOutcome.tradingSignal)}
                          className={cn("whitespace-nowrap", selectedPredictionId === log.id ? "bg-primary-foreground text-primary" : "")}
                        >
                          {log.predictionOutcome.tradingSignal}
                        </Badge>
                      ) : log.status === "PENDING" ? (
                        "..."
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell className="p-3 text-xs text-center whitespace-nowrap">
                      {log.expiresAt && log.status === "SUCCESS" ? (
                        <CountdownTimer expiresAt={log.expiresAt} />
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
