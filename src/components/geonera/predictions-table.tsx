// src/components/geonera/predictions-table.tsx
"use client";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, Info } from "lucide-react";
import type { PredictionLogItem, PredictionStatus } from '@/types';
import { format } from 'date-fns';

interface PredictionsTableProps {
  predictions: PredictionLogItem[];
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

export function PredictionsTable({ predictions }: PredictionsTableProps) {
  if (predictions.length === 0) {
    return (
      <div className="p-6 bg-card shadow-lg rounded-lg border border-border min-h-[200px] flex flex-col items-center justify-center text-center">
        <Info className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-lg text-muted-foreground">No predictions generated yet.</p>
        <p className="text-sm text-muted-foreground">Use the form above to generate your first AI-powered pips prediction.</p>
      </div>
    );
  }

  return (
    <Card className="shadow-xl overflow-hidden">
      <CardHeader className="bg-primary/10 p-4 rounded-t-lg">
         <CardTitle className="text-xl font-semibold text-primary">Prediction Log</CardTitle>
         <CardDescription className="text-sm text-primary/80">Tracks AI predictions based on your parameters.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] md:h-[500px]"> {/* Adjust height as needed */}
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[50px]">Status</TableHead>
                <TableHead className="w-[150px]">Timestamp</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead className="text-right">Pips Target</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Reasoning / Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {predictions.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="p-3">
                    <StatusIndicator status={log.status} />
                  </TableCell>
                  <TableCell className="p-3 text-xs">
                    {format(log.timestamp, "yyyy-MM-dd HH:mm:ss")}
                  </TableCell>
                  <TableCell className="p-3 font-medium">{log.currencyPair}</TableCell>
                  <TableCell className="p-3 text-right">
                    <Badge variant="secondary">{log.pipsTarget}</Badge>
                  </TableCell>
                  <TableCell className="p-3 text-sm">
                    {log.status === "SUCCESS" && log.predictionOutcome?.outcome
                      ? log.predictionOutcome.outcome
                      : log.status === "PENDING"
                      ? "Awaiting AI..."
                      : "N/A"}
                  </TableCell>
                  <TableCell className="p-3 text-xs max-w-xs truncate hover:whitespace-normal hover:max-w-none hover:overflow-visible" title={log.status === "SUCCESS" ? log.predictionOutcome?.reasoning : log.error}>
                    {log.status === "SUCCESS" && log.predictionOutcome?.reasoning
                      ? log.predictionOutcome.reasoning
                      : log.status === "ERROR"
                      ? log.error
                      : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
       {predictions.length > 0 && (
        <CardFooter className="p-3 text-xs text-muted-foreground border-t">
          Displaying {predictions.length} prediction log(s). Hover over reasoning for full text.
        </CardFooter>
      )}
    </Card>
  );
}

// Need to import Card components if not already globally available
// For now, assuming they are or will be added.
// If not, let's define basic stubs or use divs.
// Using divs for now as Card was not explicitly requested for this component,
// but it's good practice for consistency with ShadCN.
// UPDATE: Added Card imports and structure for better styling.

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
