// src/components/geonera/prediction-details-panel.tsx
"use client";

import type { PredictionLogItem, PipsPredictionOutcome, NotificationMessage } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Info, Loader2, Target, TrendingUp, TrendingDown, PauseCircle, HelpCircle, Landmark, LogIn, LogOut, ArrowUpCircle, ArrowDownCircle, BarChart3, Briefcase, Brain, TrendingUpIcon, TrendingDownIcon, Menu as MenuIcon, BellRing, List, Filter, AlertCircle as AlertTriangleIcon, Settings as SettingsIcon } from "lucide-react";
import { format as formatDateFns } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { MIN_EXPIRATION_SECONDS, REFRESH_INTERVAL_OPTIONS } from '@/types';


export type ActiveDetailsView = 'about' | 'details' | 'notifications';

interface PredictionDetailsPanelProps {
  selectedPrediction: PredictionLogItem | null;
  maxPredictionLogs: number;
  currentMaxPredictionLifetime: number; // Added prop
  notifications: NotificationMessage[];
  activeView: ActiveDetailsView;
  onActiveViewChange: (view: ActiveDetailsView) => void;
  className?: string; 
}


// New component for rendering the list of notifications
const NotificationListItem: React.FC<{ notification: NotificationMessage }> = ({ notification }) => {
  let IconComponent;
  let iconColorClass = "";
  let titleColorClass = "text-foreground";

  switch (notification.variant) {
    case "destructive":
      IconComponent = AlertTriangleIcon; 
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
      titleColorClass = "text-foreground"; 
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
        <BellRing className="h-8 w-8 mb-2 opacity-50" aria-hidden="true" />
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
    case "BUY": return "default"; // Consider a "success" or greenish variant
    case "SELL": return "destructive";
    case "HOLD": return "secondary";
    case "WAIT": return "outline";
    case "N/A": return "secondary";
    default: return "secondary";
  }
};

const SignalIcon: React.FC<{ signal?: PipsPredictionOutcome["tradingSignal"] }> = ({ signal }) => {
  if (!signal) return <HelpCircle className="h-4 w-4" aria-label="Signal Not Available"/>;
  switch (signal) {
    case "BUY": return <TrendingUp className="h-4 w-4 text-green-500" aria-label="Buy Signal" />;
    case "SELL": return <TrendingDown className="h-4 w-4 text-red-500" aria-label="Sell Signal" />;
    case "HOLD": return <PauseCircle className="h-4 w-4 text-yellow-500" aria-label="Hold Signal" />;
    case "WAIT": return <Clock className="h-4 w-4 text-blue-500" aria-label="Wait Signal" />;
    case "N/A": return <HelpCircle className="h-4 w-4 text-gray-500" aria-label="Signal Not Available" />;
    default: return <HelpCircle className="h-4 w-4" aria-label="Signal Not Available" />;
  }
};

const StatusIcon: React.FC<{ status: PredictionLogItem["status"] }> = ({ status }) => {
  switch (status) {
    case "PENDING": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" aria-label="Pending" />;
    case "SUCCESS": return <CheckCircle2 className="h-4 w-4 text-green-500" aria-label="Success" />;
    case "ERROR": return <AlertCircle className="h-4 w-4 text-red-500" aria-label="Error" />; 
    default: return <Info className="h-4 w-4 text-gray-400" aria-label="Idle" />;
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


export function PredictionDetailsPanel({ selectedPrediction, maxPredictionLogs, currentMaxPredictionLifetime, notifications, activeView, onActiveViewChange, className }: PredictionDetailsPanelProps) {

  const marketOhlcData = selectedPrediction?.predictionOutcome;
  const marketDataAvailable = selectedPrediction && marketOhlcData && (
    marketOhlcData.openPrice !== undefined ||
    marketOhlcData.closePrice !== undefined ||
    marketOhlcData.highPrice !== undefined ||
    marketOhlcData.lowPrice !== undefined ||
    marketOhlcData.volume !== undefined
  );

  let cardTitle = "About Geonera";
  let cardDescription = "Forex Prediction Insights";

  if (activeView === 'details') {
    cardTitle = "Prediction Details";
    cardDescription = selectedPrediction ? `Details for ${selectedPrediction.currencyPair}` : "Select a prediction to see details";
  } else if (activeView === 'notifications') {
    cardTitle = "Notification History";
    cardDescription = `Last ${notifications.length > 0 ? Math.min(notifications.length, MAX_NOTIFICATIONS_HISTORY) : 0} notifications`;
  }


  return (
    <Card className={cn("shadow-xl h-full grid grid-rows-[auto_1fr]", className)} aria-labelledby="details-panel-title">
      <CardHeader className="bg-primary/10 p-2 rounded-t-lg">
        <div className="flex justify-between items-center">
            <CardTitle id="details-panel-title" className="text-lg font-semibold text-primary dark:text-foreground whitespace-nowrap">
                {cardTitle}
            </CardTitle>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 p-1" aria-label="View options for details panel">
                        <MenuIcon className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onActiveViewChange('about')} className="text-xs">
                        <Info className="mr-2 h-3.5 w-3.5" aria-hidden="true" /> About Geonera
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => onActiveViewChange('details')}
                        disabled={!selectedPrediction && activeView !== 'details'}
                        className="text-xs"
                    >
                        <List className="mr-2 h-3.5 w-3.5" aria-hidden="true" /> Prediction Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onActiveViewChange('notifications')} className="text-xs">
                        <BellRing className="mr-2 h-3.5 w-3.5" aria-hidden="true" /> Notification History
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          {cardDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-grow flex flex-col min-h-0">
        <ScrollArea className="h-full w-full">
            {activeView === 'about' && (
              <div className="space-y-1.5 p-1.5 pr-2 text-foreground text-xs">
                <div className="flex items-center space-x-1.5 text-sm font-semibold text-primary mb-1">
                  <Brain className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>Welcome to Geonera!</span>
                </div>
                <p className="leading-relaxed">
                  Geonera is your platform for simulated Forex insights and mock trading signals. Here’s a guide to its features:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-3 leading-relaxed">
                  <li>
                    <strong>Parameter Setup:</strong> Use the <strong>Currency Pair(s)</strong> selector in the header and the <strong>PIPS & Lifetime Settings</strong> (accessible via the <SettingsIcon className="inline h-3 w-3" aria-label="Settings" /> icon on the "Prediction Logs" card) to define your prediction parameters. This includes setting ranges for your target profit, acceptable loss in PIPS, and max prediction lifetime.
                  </li>
                  <li>
                    <strong>Automatic Predictions:</strong> Once parameters are set (valid currency pairs selected, PIPS settings, and lifetime defined), predictions will automatically generate. The frequency of these updates can be set using the interval selector (e.g., {REFRESH_INTERVAL_OPTIONS.find(opt => opt.value === '1m')?.label || '1 Min'}, {REFRESH_INTERVAL_OPTIONS.find(opt => opt.value === '5m')?.label || '5 Min'}) in the header. Invalid PIPS or lifetime settings (e.g., min &gt; max, or zero/negative values for PIPS; lifetime too short) will pause updates.
                  </li>
                  <li>
                    <strong>Prediction Logs:</strong> Generated predictions appear in the "Prediction Logs" area, split into <strong>Active Predictions</strong> and <strong>Expired Predictions</strong> tables.
                  </li>
                  <li>
                    <strong>Expiration:</strong> Each prediction has a unique expiration time, randomly set between {MIN_EXPIRATION_SECONDS} and {currentMaxPredictionLifetime} seconds (approximately {Math.round(MIN_EXPIRATION_SECONDS/60)} to {Math.round(currentMaxPredictionLifetime/60)} minutes, based on your settings). Once expired, it moves to the "Expired Predictions" table.
                  </li>
                  <li>
                    <strong>Log Management:</strong> You can configure the maximum number of logs to display in each table using their respective <Filter className="inline h-3 w-3" aria-label="Filter Settings" /> icon. The system has an overall cap of {maxPredictionLogs} total logs.
                  </li>
                  <li>
                    <strong>Viewing Details:</strong> Click on any row in the Prediction Logs to view its detailed analysis (including market data like Open, High, Low, Close, Volume) in this panel. The first log in the "Active Predictions" table is selected by default if available.
                  </li>
                  <li>
                    <strong>Filtering & Sorting:</strong> Use the <Filter className="inline h-3 w-3" aria-label="Filter Settings" /> icon in each table's header to filter by status or signal, and set display limits. Click on column headers to sort the data. The <strong>Date Range</strong> filter (accessible via the <SettingsIcon className="inline h-3 w-3" aria-label="Date Range Settings"/> icon on the "Prediction Logs" card) allows you to view logs from a specific period.
                  </li>
                   <li>
                    <strong>Navigation:</strong> Use the <MenuIcon className="inline h-3 w-3" aria-label="Panel Menu" /> icon at the top-right of this panel to switch between this "About" guide, the "Prediction Details" for a selected log, or the "Notification History".
                  </li>
                </ul>
                <p className="text-[0.7rem] italic pt-1 text-muted-foreground">
                  Disclaimer: All data and predictions provided by Geonera are for informational and demonstration purposes only using mock data. They should not be considered as financial advice.
                </p>
                {activeView === 'about' && !selectedPrediction && (
                  <p className="text-xs text-center pt-1 text-accent">
                    When predictions are available, select one from the logs to see its details, or switch views using the menu.
                  </p>
                )}
              </div>
            )}
            {activeView === 'details' && selectedPrediction && (
              <div className="space-y-1 p-1.5 pr-2">
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
                             <LogIn className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
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
                            <ArrowUpCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
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
                             <ArrowDownCircle className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
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
                             <LogOut className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
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
                             <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
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
                    <List className="h-8 w-8 mb-2 opacity-50" aria-hidden="true" />
                    <p>Select a prediction from the logs to view its details.</p>
                </div>
            )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

type VariantProps<T extends (...args: any) => any> = Parameters<T>[0] extends undefined ? {} : Parameters<T>[0];

// Constant for Notification History display
const MAX_NOTIFICATIONS_HISTORY = 100;
