'use client';

import React, { useMemo, useCallback } from 'react';
import { SummaryCardData, VisualizationType } from '@/shared/types/dashboard';
import { getDataStatus } from './DataStatusPill';
import { useIsEditMode } from '@/frontend/context/ViewModeContext';
import VisualizationTypeSwitcher from './VisualizationTypeSwitcher';
import { FinancialCard } from './ui/financial-card';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ModernStatusPill } from './ui/modern-status-pill';
import { Button } from './ui/button';
import { X } from 'lucide-react';

interface SummaryCardProps {
  title: string;
  data: SummaryCardData;
  onRemove?: () => void;
}

// Memoized value formatter to prevent recalculation
const formatValue = (value: string | number): string => {
  if (typeof value === 'number') {
    // Format large numbers with appropriate suffixes
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  }
  return value;
};

const SummaryCard = React.memo(function SummaryCard({ title: _title, data, onRemove }: SummaryCardProps) {
  const isEditMode = useIsEditMode();

  // Memoize formatted value to prevent recalculation
  const formattedValue = useMemo(() => formatValue(data.value), [data.value]);

  // Memoize data status to prevent recalculation
  const dataStatus = useMemo(() => getDataStatus(data.lastUpdated, data.isRealData), [data.lastUpdated, data.isRealData]);

  // Memoize change data to prevent object recreation
  const changeData = useMemo(() =>
    data.change ? {
      value: data.change.value,
      period: data.change.period,
      type: data.change.type
    } : undefined,
    [data.change]
  );

  return (
    <FinancialCard
      title={data.title}
      value={formattedValue}
      change={changeData}
      status={dataStatus}
      lastUpdated={data.lastUpdated}
      icon={data.icon}
      color={data.color}
      isEditable={isEditMode}
      onRemove={onRemove}
    />
  );
});

export default SummaryCard;

// Grid container for multiple summary cards
interface SummaryCardGridProps {
  title: string;
  cards: SummaryCardData[];
  dataType?: string;
  onRemove?: () => void;
  onVisualizationChange?: (newType: VisualizationType) => void;
  isChangingVisualization?: boolean;
}

export const SummaryCardGrid = React.memo(function SummaryCardGrid({
  title,
  cards,
  dataType,
  onRemove,
  onVisualizationChange,
  isChangingVisualization = false
}: SummaryCardGridProps) {
  const isEditMode = useIsEditMode();

  // Memoize expensive calculations
  const hasRealData = useMemo(() => cards.some(card => card.isRealData), [cards]);

  const latestUpdate = useMemo(() =>
    cards.reduce((latest, card) => {
      if (!card.lastUpdated) return latest;
      if (!latest) return card.lastUpdated;
      return card.lastUpdated > latest ? card.lastUpdated : latest;
    }, undefined as Date | undefined),
    [cards]
  );

  const dataStatus = useMemo(() => getDataStatus(latestUpdate, hasRealData), [latestUpdate, hasRealData]);

  // Memoize remove handler to prevent recreation
  const handleRemove = useCallback(() => {
    onRemove?.();
  }, [onRemove]);

  return (
    <Card className="relative transition-all duration-200 hover:shadow-md h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-3">
          <CardTitle className="text-lg font-semibold text-foreground">
            {title}
          </CardTitle>
          <ModernStatusPill
            status={dataStatus}
            lastUpdated={latestUpdate}
            size="sm"
            showTimestamp={false}
          />
        </div>

        <div className="flex items-center space-x-2">
          {dataType && onVisualizationChange && (
            <VisualizationTypeSwitcher
              dataType={dataType}
              currentVisualizationType="summary-card"
              onVisualizationChange={onVisualizationChange}
              size="small"
              showLabels={false}
              showIcons={true}
              disabled={isChangingVisualization}
              isLoading={isChangingVisualization}
            />
          )}
          {onRemove && isEditMode && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleRemove}
              aria-label="Remove card grid"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-6 pt-0">
        <div className="relative">
          {isChangingVisualization && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin text-2xl">⟳</div>
                <div className="text-sm text-muted-foreground">Switching visualization...</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((cardData, index) => (
              <SummaryCard
                key={index}
                title={cardData.title}
                data={cardData}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
