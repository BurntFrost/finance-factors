'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { ChartData, DashboardElement } from '../types/dashboard';
import { useCrossfilter } from '../context/CrossfilterContext';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import EnhancedInteractiveChart from './EnhancedInteractiveChart';
import styles from './DataComparisonTool.module.css';

interface DataComparisonToolProps {
  elements: DashboardElement[];
  onElementSelect?: (elementIds: string[]) => void;
  onComparisonClose?: () => void;
}

interface ComparisonData {
  correlation: number;
  trend: 'positive' | 'negative' | 'neutral';
  strength: 'weak' | 'moderate' | 'strong';
  summary: string;
}

export default function DataComparisonTool({
  elements,
  onElementSelect,
  onComparisonClose,
}: DataComparisonToolProps) {
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [comparisonMode, setComparisonMode] = useState<'side-by-side' | 'overlay' | 'correlation'>('side-by-side');
  const [syncZoom, setSyncZoom] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const crossfilter = useCrossfilter();

  // Filter elements that have chart data
  const chartElements = useMemo(() => {
    return elements.filter(element => 
      ['line-chart', 'bar-chart', 'pie-chart', 'doughnut-chart'].includes(element.type)
    );
  }, [elements]);

  // Get selected element data
  const selectedElementsData = useMemo(() => {
    return selectedElements.map(id => 
      chartElements.find(element => element.id === id)
    ).filter(Boolean) as DashboardElement[];
  }, [selectedElements, chartElements]);

  // Calculate correlation and analysis
  const comparisonAnalysis = useMemo(() => {
    if (selectedElementsData.length < 2) return null;

    // Mock correlation calculation - in real app, this would analyze actual data
    const correlation = Math.random() * 2 - 1; // -1 to 1
    const absCorrelation = Math.abs(correlation);
    
    let strength: 'weak' | 'moderate' | 'strong';
    if (absCorrelation < 0.3) strength = 'weak';
    else if (absCorrelation < 0.7) strength = 'moderate';
    else strength = 'strong';

    const trend = correlation > 0.1 ? 'positive' : correlation < -0.1 ? 'negative' : 'neutral';

    const summary = `${selectedElementsData[0].title} and ${selectedElementsData[1].title} show a ${strength} ${trend} correlation (${correlation.toFixed(3)})`;

    return {
      correlation,
      trend,
      strength,
      summary,
    } as ComparisonData;
  }, [selectedElementsData]);

  const handleElementToggle = useCallback((elementId: string) => {
    setSelectedElements(prev => {
      const newSelection = prev.includes(elementId)
        ? prev.filter(id => id !== elementId)
        : [...prev, elementId].slice(0, 4); // Max 4 elements for comparison
      
      onElementSelect?.(newSelection);
      return newSelection;
    });
  }, [onElementSelect]);

  const handleClearSelection = useCallback(() => {
    setSelectedElements([]);
    onElementSelect?.([]);
  }, [onElementSelect]);

  const handleDataPointClick = useCallback((dataPoint: any, chartId: string) => {
    if (syncZoom) {
      // Apply filter to all selected charts
      selectedElements.forEach(elementId => {
        if (elementId !== chartId) {
          crossfilter.applyFilter(chartId, 'date', {
            dimensionId: 'date',
            range: [dataPoint.value.x, dataPoint.value.x],
          });
        }
      });
    }
  }, [syncZoom, selectedElements, crossfilter]);

  const renderSideBySideView = () => (
    <PanelGroup direction="horizontal" className={styles.comparisonPanels}>
      {selectedElementsData.map((element, index) => (
        <React.Fragment key={element.id}>
          <Panel defaultSize={100 / selectedElementsData.length} minSize={20}>
            <div className={styles.chartPanel}>
              <div className={styles.chartHeader}>
                <h4>{element.title}</h4>
                <button
                  className={styles.removeButton}
                  onClick={() => handleElementToggle(element.id)}
                  title="Remove from comparison"
                >
                  ✕
                </button>
              </div>
              <EnhancedInteractiveChart
                type={element.type as any}
                data={element.data as ChartData}
                title=""
                dataType={element.dataType}
                hideHeader={true}
                enableCrossfilter={syncZoom}
                onDataPointClick={(dataPoint) => handleDataPointClick(dataPoint, element.id)}
              />
            </div>
          </Panel>
          {index < selectedElementsData.length - 1 && (
            <PanelResizeHandle className={styles.resizeHandle} />
          )}
        </React.Fragment>
      ))}
    </PanelGroup>
  );

  const renderOverlayView = () => (
    <div className={styles.overlayChart}>
      <div className={styles.overlayHeader}>
        <h4>Overlay Comparison</h4>
        <div className={styles.overlayLegend}>
          {selectedElementsData.map((element, index) => (
            <div key={element.id} className={styles.legendItem}>
              <div 
                className={styles.legendColor}
                style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
              />
              <span>{element.title}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Overlay chart implementation would go here */}
      <div className={styles.overlayPlaceholder}>
        <p>Overlay chart visualization</p>
        <p>Combining {selectedElementsData.length} data series</p>
      </div>
    </div>
  );

  const renderCorrelationView = () => (
    <div className={styles.correlationView}>
      <div className={styles.correlationHeader}>
        <h4>Correlation Analysis</h4>
      </div>
      {comparisonAnalysis && (
        <div className={styles.correlationContent}>
          <div className={styles.correlationScore}>
            <div className={styles.scoreValue}>
              {comparisonAnalysis.correlation.toFixed(3)}
            </div>
            <div className={styles.scoreLabel}>Correlation Coefficient</div>
          </div>
          <div className={styles.correlationDetails}>
            <div className={`${styles.strengthBadge} ${styles[comparisonAnalysis.strength]}`}>
              {comparisonAnalysis.strength.toUpperCase()}
            </div>
            <div className={`${styles.trendBadge} ${styles[comparisonAnalysis.trend]}`}>
              {comparisonAnalysis.trend.toUpperCase()}
            </div>
          </div>
          <div className={styles.correlationSummary}>
            {comparisonAnalysis.summary}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.comparisonTool}>
      {/* Header Controls */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h3>Data Comparison Tool</h3>
          <div className={styles.selectionCount}>
            {selectedElements.length} of {chartElements.length} charts selected
          </div>
        </div>
        
        <div className={styles.headerControls}>
          <div className={styles.modeSelector}>
            <button
              className={`${styles.modeButton} ${comparisonMode === 'side-by-side' ? styles.active : ''}`}
              onClick={() => setComparisonMode('side-by-side')}
            >
              📊 Side by Side
            </button>
            <button
              className={`${styles.modeButton} ${comparisonMode === 'overlay' ? styles.active : ''}`}
              onClick={() => setComparisonMode('overlay')}
            >
              📈 Overlay
            </button>
            <button
              className={`${styles.modeButton} ${comparisonMode === 'correlation' ? styles.active : ''}`}
              onClick={() => setComparisonMode('correlation')}
            >
              🔗 Correlation
            </button>
          </div>

          <div className={styles.options}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={syncZoom}
                onChange={(e) => setSyncZoom(e.target.checked)}
              />
              Sync Interactions
            </label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={showAnalysis}
                onChange={(e) => setShowAnalysis(e.target.checked)}
              />
              Show Analysis
            </label>
          </div>

          <button
            className={styles.clearButton}
            onClick={handleClearSelection}
            disabled={selectedElements.length === 0}
          >
            Clear All
          </button>

          <button
            className={styles.closeButton}
            onClick={onComparisonClose}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Element Selection */}
      <div className={styles.elementSelection}>
        <div className={styles.selectionLabel}>Select charts to compare:</div>
        <div className={styles.elementGrid}>
          {chartElements.map(element => (
            <button
              key={element.id}
              className={`${styles.elementButton} ${
                selectedElements.includes(element.id) ? styles.selected : ''
              }`}
              onClick={() => handleElementToggle(element.id)}
              disabled={!selectedElements.includes(element.id) && selectedElements.length >= 4}
            >
              <div className={styles.elementIcon}>📊</div>
              <div className={styles.elementTitle}>{element.title}</div>
              <div className={styles.elementType}>{element.type.replace('-', ' ')}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Comparison Content */}
      {selectedElements.length > 0 && (
        <div className={styles.comparisonContent}>
          {comparisonMode === 'side-by-side' && renderSideBySideView()}
          {comparisonMode === 'overlay' && renderOverlayView()}
          {comparisonMode === 'correlation' && renderCorrelationView()}
        </div>
      )}

      {/* Analysis Panel */}
      {showAnalysis && selectedElements.length >= 2 && comparisonAnalysis && (
        <div className={styles.analysisPanel}>
          <h4>Analysis Results</h4>
          <div className={styles.analysisContent}>
            <div className={styles.analysisMetric}>
              <span className={styles.metricLabel}>Correlation:</span>
              <span className={styles.metricValue}>{comparisonAnalysis.correlation.toFixed(3)}</span>
            </div>
            <div className={styles.analysisMetric}>
              <span className={styles.metricLabel}>Strength:</span>
              <span className={`${styles.metricValue} ${styles[comparisonAnalysis.strength]}`}>
                {comparisonAnalysis.strength}
              </span>
            </div>
            <div className={styles.analysisMetric}>
              <span className={styles.metricLabel}>Trend:</span>
              <span className={`${styles.metricValue} ${styles[comparisonAnalysis.trend]}`}>
                {comparisonAnalysis.trend}
              </span>
            </div>
            <div className={styles.analysisSummary}>
              {comparisonAnalysis.summary}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {selectedElements.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📊</div>
          <h4>No charts selected</h4>
          <p>Select 2 or more charts above to start comparing data</p>
        </div>
      )}
    </div>
  );
}
