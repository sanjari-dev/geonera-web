// src/components/geonera/prediction-details-panel.tsx
"use client";

import type { PredictionLogItem, PipsPredictionOutcome, NotificationMessage } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, Info, Loader2, Target, TrendingUp, TrendingDown, PauseCircle, HelpCircle, Landmark, LogIn, LogOut, ArrowUpCircle, ArrowDownCircle, BarChart3, Briefcase, Brain, TrendingUpIcon, TrendingDownIcon, Menu as MenuIcon, BellRing, List, Filter, AlertCircle as AlertTriangleIcon } from "lucide-react"; // Added AlertTriangleIcon alias
import { format as formatDateFns } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { useState, useEffect } from 'react'; // Removed useState, useEffect
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { MIN_EXPIRATION_SECONDS, MAX_EXPIRATION_SECONDS } from '@/types';


export type ActiveDetailsView = 'about' | 'details' | 'notifications';

interface PredictionDetailsPanelProps {
  selectedPrediction: PredictionLogItem | null;
  maxPredictionLogs: number; 
  notifications: NotificationMessage[];
  activeView: ActiveDetailsView;
  onActiveViewChange: (view: ActiveDetailsView) => void;
}


// New component for rendering the list of notifications
const NotificationListItem: React.FC<{ notification: NotificationMessage }> = ({ notification }) => {
  let IconComponent;
  let iconColorClass = "";
  let titleColorClass = "text-foreground";

  switch (notification.variant) {
    case "destructive":
      IconComponent = AlertTriangleIcon; // Use alias
      iconColorClass = "text-destructive";
      titleColorClass = "text-destructive";
      break;
    case "success":
      IconComponent = CheckCircle2;
      iconColorClass = "text-green-500";
      titleColorClass = "text-green-600";
      break;
    default: // 'default' or undefined
      IconComponent = Info;
      iconColorClass = "text-blue-500";
      titleColorClass = "text-foreground"; // or a specific color for default info
      break;
  }

  return (
    <div className="py-1.5 border-b border-border/50 last:border-b-0 text-xs" role="listitem">
      <div className="flex items-start space-x-1.5">
        <IconComponent className={cn("h-4 w-4 mt-0.5 flex-shrink-0", iconColorClass)} aria-hidden="true" />
        <div className="flex-grow">
          <p className={cn("font-semibold", titleColorClass)}>{notification.title}</p>
          <p className="text-muted-foreground text-[0.7rem] leading-tight">{notification.description}</p>
           {notification.timestamp && (
            <div className="flex items-center text-[0.65rem] text-muted-foreground/80 mt-0.5">
              <Clock className="h-2.5 w-2.5 mr-1" aria-hidden="true" />
              <span>{formatDateFns(new Date(notification.timestamp), "yyyy-MM-dd HH:mm:ss XXX")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const NotificationHistoryView: React.FC<{ notifications: NotificationMessage[] }> = ({ notifications }) => {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-xs">
        <BellRing className="h-8 w-8 mb-2 opacity-50" />
        <p>No notifications yet.</p>
      </div>
    );
  }
  return (
    <div className="space-y-0 p-1.5 pr-2">
        {notifications.map((notification) => (
            <NotificationListItem key={notification.id} notification={notification} />
        ))}
    </div>
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

const SignalIcon: React.FC<{ signal?: PipsPredictionOutcome["tradingSignal"] }> = ({ signal }) => {
  if (!signal) return <HelpCircle className="h-4 w-4" />;
  switch (signal) {
    case "BUY": return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "SELL": return <TrendingDown className="h-4 w-4 text-red-500" />;
    case "HOLD": return <PauseCircle className="h-4 w-4 text-yellow-500" />;
    case "WAIT": return <Clock className="h-4 w-4 text-blue-500" />;
    case "N/A": return <HelpCircle className="h-4 w-4 text-gray-500" />;
    default: return <HelpCircle className="h-4 w-4" />;
  }
};

const StatusIcon: React.FC<{ status: PredictionLogItem["status"] }> = ({ status }) => {
  switch (status) {
    case "PENDING": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case "SUCCESS": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "ERROR": return <AlertCircle className="h-4 w-4 text-red-500" />;
    default: return <Info className="h-4 w-4 text-gray-400" />; 
  }
};

const formatPrice = (price?: number, currencyPair?: PredictionLogItem["currencyPair"]) => {
  if (price === undefined || price === null) return "N/A";
  let fractionDigits = 2;
  if (currencyPair === "BTC/USD") fractionDigits = 2; 
  else if (currencyPair && currencyPair.includes("JPY")) fractionDigits = 3; 
  else if (currencyPair === "XAU/USD") fractionDigits = 2; 
  else fractionDigits = 5; 

  return price.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
};

const formatVolume = (volume?: number) => {
  if (volume === undefined || volume === null) return "N/A";
  return volume.toLocaleString();
};


export function PredictionDetailsPanel({ selectedPrediction, maxPredictionLogs, notifications, activeView, onActiveViewChange }: PredictionDetailsPanelProps) {
  
  const marketOhlcData = selectedPrediction?.predictionOutcome;
  const marketDataAvailable = selectedPrediction && marketOhlcData && (
    marketOhlcData.openPrice !== undefined ||
    marketOhlcData.closePrice !== undefined ||
    marketOhlcData.highPrice !== undefined ||
    marketOhlcData.lowPrice !== undefined ||
    marketOhlcData.volume !== undefined
  );
  
  let cardTitle = "About Geonera";
  let cardDescription = "Mock Forex Prediction Insights";

  if (activeView === 'details') {
    cardTitle = "Prediction Details";
    cardDescription = selectedPrediction ? `Details for ${selectedPrediction.currencyPair}` : "Select a prediction to see details";
  } else if (activeView === 'notifications') {
    cardTitle = "Notification History";
    cardDescription = "Last 100 notifications";
  }


  return (
    <Card className="shadow-xl h-full grid grid-rows-[auto_1fr]" aria-labelledby="details-panel-title">
      <CardHeader className="bg-primary/10 p-2 rounded-t-lg">
        <div className="flex justify-between items-center">
            <CardTitle id="details-panel-title" className="text-lg font-semibold text-primary dark:text-foreground whitespace-nowrap">
                {cardTitle}
            </CardTitle>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 p-1" aria-label="View options for details panel">
                        <MenuIcon className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onActiveViewChange('about')} className="text-xs">
                        <Info className="mr-2 h-3.5 w-3.5" /> About Geonera
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onSelect={() => onActiveViewChange('details')} 
                        disabled={!selectedPrediction} 
                        className="text-xs"
                    >
                        <List className="mr-2 h-3.5 w-3.5" /> Prediction Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onActiveViewChange('notifications')} className="text-xs">
                        <BellRing className="mr-2 h-3.5 w-3.5" /> Notification History
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          {cardDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-grow flex flex-col min-h-0"> {/* Changed p-2 to p-0 for ScrollArea */}
        <ScrollArea className="h-full w-full">
            {activeView === 'about' && (
              <div className="space-y-1.5 p-1.5 pr-2 text-foreground text-xs">
                <div className="flex items-center space-x-1.5 text-sm font-semibold text-primary mb-1">
                  <Brain className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>Welcome to Geonera!</span>
                </div>
                <p className="leading-relaxed">
                  Geonera is a platform designed to provide mock real-time insights and trading signals for forex currency pairs. Here’s how to get started:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-3 leading-relaxed">
                  <li>
                    Use the <strong>PIPS Targets</strong> and <strong>Currency Pair(s)</strong> selection in the header to define your parameters.
                  </li>
                  <li>
                    Once parameters are set, predictions will automatically generate and appear in the <strong>Prediction Logs</strong> to your left, updating every 30 seconds.
                  </li>
                  <li>
                    Each prediction has a unique expiration time (randomly between {MIN_EXPIRATION_SECONDS} and {MAX_EXPIRATION_SECONDS} seconds) and will be categorized into Active or Expired tables. Max log size for each table can be configured via its filter settings, with a system cap of {maxPredictionLogs} total.
                  </li>
                  <li>
                    Click on any row in the Prediction Logs to view its detailed analysis in this panel.
                  </li>
                  <li>
                    Utilize the <strong>Filter <Filter className="inline h-3 w-3" /></strong> controls within each log table and the <strong>Date Range</strong> filter in the Prediction Logs header to narrow down results. You can also sort columns by clicking their headers.
                  </li>
                  <li>
                    Use the <MenuIcon className="inline h-3 w-3" /> icon at the top-right of this panel to switch between this guide, selected prediction's details, or notification history.
                  </li>
                </ul>
                <p className="text-[0.7rem] italic pt-1 text-muted-foreground">
                  Please note: All data and predictions provided by Geonera are for informational and demonstration purposes only. They should not be considered as financial advice.
                </p>
                {activeView === 'about' && !selectedPrediction && (
                  <p className="text-xs text-center pt-1 text-accent">
                    When predictions are available, select one from the logs to see its details or switch view using the menu.
                  </p>
                )}
              </div>
            )}
            {activeView === 'details' && selectedPrediction && (
              <div className="space-y-1 p-1.5 pr-2"> {/* Added p-1.5 for padding inside scroll area */}
                <div className="flex items-center space-x-1.5">
                  <Landmark className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                  <span className="font-medium text-xs whitespace-nowrap">Currency Pair:</span>
                  <span className="text-xs whitespace-nowrap">{selectedPrediction.currencyPair}</span>
                </div>

                <div className="flex items-start space-x-1.5">
                  <Target className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex flex-col">
                      <div className="flex items-center">
                          <TrendingUpIcon className="h-3.5 w-3.5 text-green-500 mr-1 flex-shrink-0" aria-hidden="true" />
                          <span className="font-medium text-xs whitespace-nowrap">Max Profit PIPS:</span>
                          <span className="text-xs whitespace-nowrap ml-1">{selectedPrediction.pipsSettings.profitPips.max}</span>
                      </div>
                      <div className="flex items-center">
                          <TrendingDownIcon className="h-3.5 w-3.5 text-red-500 mr-1 flex-shrink-0" aria-hidden="true" />
                          <span className="font-medium text-xs whitespace-nowrap">Max Loss PIPS:</span>
                          <span className="text-xs whitespace-nowrap ml-1">{selectedPrediction.pipsSettings.lossPips.max}</span>
                      </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <Clock className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                  <span className="font-medium text-xs whitespace-nowrap">Timestamp:</span>
                  <span className="text-xs whitespace-nowrap">{formatDateFns(new Date(selectedPrediction.timestamp), "yyyy-MM-dd HH:mm:ss XXX")}</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="flex items-center justify-center h-4 w-4 flex-shrink-0" aria-hidden="true">
                    <StatusIcon status={selectedPrediction.status} />
                  </div>
                  <span className="font-medium text-xs whitespace-nowrap">Status:</span>
                  <Badge 
                    className="text-[10px] px-1.5 py-0.5" 
                    variant={
                    selectedPrediction.status === "SUCCESS" ? "default" :
                    selectedPrediction.status === "ERROR" ? "destructive" :
                    "secondary" 
                  }>
                    {selectedPrediction.status}
                  </Badge>
                </div>

                {marketDataAvailable && marketOhlcData && (
                  <div className="space-y-0.5 pt-0.5 mt-0.5 border-t border-border">
                    <div className="flex items-center space-x-1.5">
                       <Briefcase className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                       <span className="font-semibold text-primary text-xs whitespace-nowrap">Market Data:</span>
                    </div>
                    <div className="pl-2 space-y-0.5">
                      {marketOhlcData.openPrice !== undefined && (
                        <div className="flex items-center space-x-1.5">
                          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center" aria-hidden="true">
                             <LogIn className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="font-medium whitespace-nowrap text-[11px]">Open:</span>
                          <span className="text-[11px] whitespace-nowrap">
                             {formatPrice(marketOhlcData.openPrice, selectedPrediction.currencyPair)}
                          </span>
                        </div>
                      )}
                      {marketOhlcData.highPrice !== undefined && (
                        <div className="flex items-center space-x-1.5">
                          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center" aria-hidden="true">
                            <ArrowUpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          </div>
                          <span className="font-medium whitespace-nowrap text-[11px]">High:</span>
                          <span className="text-[11px] whitespace-nowrap">
                            {formatPrice(marketOhlcData.highPrice, selectedPrediction.currencyPair)}
                          </span>
                        </div>
                      )}
                      {marketOhlcData.lowPrice !== undefined && (
                         <div className="flex items-center space-x-1.5">
                           <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center" aria-hidden="true">
                             <ArrowDownCircle className="h-3.5 w-3.5 text-muted-foreground" />
                           </div>
                           <span className="font-medium whitespace-nowrap text-[11px]">Low:</span>
                           <span className="text-[11px] whitespace-nowrap">
                             {formatPrice(marketOhlcData.lowPrice, selectedPrediction.currencyPair)}
                           </span>
                         </div>
                      )}
                      {marketOhlcData.closePrice !== undefined && (
                         <div className="flex items-center space-x-1.5">
                           <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center" aria-hidden="true">
                             <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
                           </div>
                           <span className="font-medium whitespace-nowrap text-[11px]">Close:</span>
                           <span className="text-[11px] whitespace-nowrap">
                              {formatPrice(marketOhlcData.closePrice, selectedPrediction.currencyPair)}
                           </span>
                         </div>
                      )}
                      {marketOhlcData.volume !== undefined && (
                         <div className="flex items-center space-x-1.5">
                           <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center" aria-hidden="true">
                             <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                           </div>
                           <span className="font-medium whitespace-nowrap text-[11px]">Volume:</span>
                           <span className="text-[11px] whitespace-nowrap">
                             {formatVolume(marketOhlcData.volume)}
                           </span>
                         </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedPrediction.expiresAt && (
                  <div className="flex items-center space-x-1.5 pt-0.5 mt-0.5 border-t border-border">
                    <Clock className="h-4 w-4 text-orange-500 flex-shrink-0" aria-hidden="true" />
                    <span className="font-medium text-xs whitespace-nowrap">Expires At:</span>
                    <span className="text-xs whitespace-nowrap">{formatDateFns(new Date(selectedPrediction.expiresAt), "yyyy-MM-dd HH:mm:ss XXX")}</span>
                  </div>
                )}
                
                {selectedPrediction.status === "SUCCESS" && selectedPrediction.predictionOutcome && (
                  <>
                    <div className="flex items-center space-x-1.5 pt-0.5 mt-0.5 border-t border-border"> 
                        <div className="flex items-center justify-center h-4 w-4 flex-shrink-0" aria-hidden="true">
                        <SignalIcon signal={selectedPrediction.predictionOutcome.tradingSignal} />
                        </div>
                      <span className="font-medium text-xs whitespace-nowrap">Trading Signal:</span>
                      <Badge 
                        className="text-[10px] px-1.5 py-0.5" 
                        variant={getSignalBadgeVariant(selectedPrediction.predictionOutcome.tradingSignal)}
                      >
                        {selectedPrediction.predictionOutcome.tradingSignal}
                      </Badge>
                    </div>
                    <div className="space-y-0.5"> 
                      <span className="font-medium text-primary text-xs block whitespace-nowrap">Signal Details:</span>
                      <p className="text-[11px] bg-muted/50 p-1 rounded leading-relaxed">{selectedPrediction.predictionOutcome.signalDetails}</p> 
                    </div>
                    <div className="space-y-0.5"> 
                      <span className="font-medium text-primary text-xs block whitespace-nowrap">Reasoning:</span>
                      <p className="text-[11px] bg-muted/50 p-1 rounded leading-relaxed">{selectedPrediction.predictionOutcome.reasoning}</p> 
                    </div>
                  </>
                )}

                {selectedPrediction.status === "ERROR" && selectedPrediction.error && (
                  <div className="space-y-0.5 pt-0.5 mt-0.5 border-t border-border"> 
                    <span className="font-medium text-destructive text-xs block whitespace-nowrap">Error:</span>
                    <p className="text-[11px] bg-destructive/10 text-destructive p-1 rounded leading-relaxed">{selectedPrediction.error}</p> 
                  </div>
                )}
                
                {selectedPrediction.status === "PENDING" && (
                    <div className="flex items-center space-x-1.5 text-muted-foreground pt-0.5 mt-0.5 border-t border-border" role="status" aria-live="polite"> 
                      <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" aria-hidden="true" />
                      <span className="text-xs whitespace-nowrap">Awaiting analysis...</span>
                    </div>
                )}
              </div>
            )}
            {activeView === 'notifications' && (
                <NotificationHistoryView notifications={notifications} />
            )}
             {activeView === 'details' && !selectedPrediction && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-xs">
                    <List className="h-8 w-8 mb-2 opacity-50" />
                    <p>Select a prediction from the logs to view its details.</p>
                </div>
            )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

type VariantProps<T extends (...args: any) => any> = Parameters<T>[0] extends undefined ? {} : Parameters<T>[0];



