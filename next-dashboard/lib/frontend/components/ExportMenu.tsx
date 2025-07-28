'use client';

import React, { useState, useRef, useCallback } from 'react';
import { ChartData, TableData, SummaryCardData, DashboardElement } from '@/shared/types/dashboard';
import { exportToCSV, exportToJSON, exportToPDF, ExportOptions, ExportData } from '@/shared/utils/dataExport';
import styles from './ExportMenu.module.css';

interface ExportMenuProps {
  element: DashboardElement;
  chartRef?: React.RefObject<HTMLElement>;
  onExportStart?: () => void;
  onExportComplete?: (format: string) => void;
  onExportError?: (error: Error) => void;
}

export default function ExportMenu({
  element,
  chartRef,
  onExportStart,
  onExportComplete,
  onExportError,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeMetadata: true,
    dateFormat: 'locale',
    includeChartImage: true,
    imageFormat: 'png',
    imageQuality: 0.95,
    pdfOrientation: 'portrait',
    csvDelimiter: ',',
  });

  const menuRef = useRef<HTMLDivElement>(null);

  const createExportData = useCallback((): ExportData => {
    return {
      title: element.title,
      type: element.type.includes('chart') ? 'chart' : 
            element.type === 'data-table' ? 'table' : 'summary',
      data: element.data as ChartData | TableData | SummaryCardData[],
      metadata: {
        dataSource: element.dataSource,
        lastUpdated: element.lastUpdated,
        isRealData: element.isRealData || false,
        exportedAt: new Date(),
      },
    };
  }, [element]);

  const handleExport = useCallback(async (format: 'csv' | 'json' | 'pdf') => {
    if (isExporting) return;

    setIsExporting(true);
    onExportStart?.();

    try {
      const exportData = createExportData();
      const filename = `${element.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

      switch (format) {
        case 'csv':
          await exportToCSV(exportData, {
            ...exportOptions,
            filename: `${filename}.csv`,
          });
          break;

        case 'json':
          await exportToJSON(exportData, {
            ...exportOptions,
            filename: `${filename}.json`,
          });
          break;

        case 'pdf':
          await exportToPDF(exportData, chartRef?.current || null, {
            ...exportOptions,
            filename: `${filename}.pdf`,
          });
          break;
      }

      onExportComplete?.(format);
      setIsOpen(false);
    } catch (error) {
      console.error(`Export to ${format} failed:`, error);
      onExportError?.(error as Error);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, createExportData, element.title, exportOptions, chartRef, onExportStart, onExportComplete, onExportError]);

  const handleOptionChange = useCallback((key: keyof ExportOptions, value: any) => {
    setExportOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.exportMenu} ref={menuRef}>
      <button
        className={styles.exportButton}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        title="Export data"
      >
        {isExporting ? '⏳' : '📤'} Export
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownHeader}>
            <h4>Export {element.title}</h4>
            <button
              className={styles.optionsToggle}
              onClick={() => setShowOptions(!showOptions)}
              title="Export options"
            >
              ⚙️
            </button>
          </div>

          {showOptions && (
            <div className={styles.optionsPanel}>
              <div className={styles.optionGroup}>
                <label className={styles.optionLabel}>
                  <input
                    type="checkbox"
                    checked={exportOptions.includeMetadata}
                    onChange={(e) => handleOptionChange('includeMetadata', e.target.checked)}
                  />
                  Include metadata
                </label>
              </div>

              <div className={styles.optionGroup}>
                <label className={styles.optionLabel}>Date format:</label>
                <select
                  value={exportOptions.dateFormat}
                  onChange={(e) => handleOptionChange('dateFormat', e.target.value)}
                  className={styles.optionSelect}
                >
                  <option value="locale">Locale format</option>
                  <option value="iso">ISO format</option>
                  <option value="timestamp">Timestamp</option>
                </select>
              </div>

              {element.type.includes('chart') && (
                <>
                  <div className={styles.optionGroup}>
                    <label className={styles.optionLabel}>
                      <input
                        type="checkbox"
                        checked={exportOptions.includeChartImage}
                        onChange={(e) => handleOptionChange('includeChartImage', e.target.checked)}
                      />
                      Include chart image (PDF)
                    </label>
                  </div>

                  <div className={styles.optionGroup}>
                    <label className={styles.optionLabel}>Image format:</label>
                    <select
                      value={exportOptions.imageFormat}
                      onChange={(e) => handleOptionChange('imageFormat', e.target.value)}
                      className={styles.optionSelect}
                      disabled={!exportOptions.includeChartImage}
                    >
                      <option value="png">PNG</option>
                      <option value="jpeg">JPEG</option>
                    </select>
                  </div>
                </>
              )}

              <div className={styles.optionGroup}>
                <label className={styles.optionLabel}>PDF orientation:</label>
                <select
                  value={exportOptions.pdfOrientation}
                  onChange={(e) => handleOptionChange('pdfOrientation', e.target.value)}
                  className={styles.optionSelect}
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>

              <div className={styles.optionGroup}>
                <label className={styles.optionLabel}>CSV delimiter:</label>
                <select
                  value={exportOptions.csvDelimiter}
                  onChange={(e) => handleOptionChange('csvDelimiter', e.target.value)}
                  className={styles.optionSelect}
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                </select>
              </div>
            </div>
          )}

          <div className={styles.exportButtons}>
            <button
              className={styles.formatButton}
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              title="Export as CSV"
            >
              📊 CSV
            </button>

            <button
              className={styles.formatButton}
              onClick={() => handleExport('json')}
              disabled={isExporting}
              title="Export as JSON"
            >
              📄 JSON
            </button>

            <button
              className={styles.formatButton}
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              title="Export as PDF"
            >
              📑 PDF
            </button>
          </div>

          {isExporting && (
            <div className={styles.exportingIndicator}>
              <div className={styles.spinner} />
              <span>Exporting...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Bulk export menu for multiple elements
 */
interface BulkExportMenuProps {
  elements: DashboardElement[];
  chartRefs?: React.RefObject<HTMLElement>[];
  onExportStart?: () => void;
  onExportComplete?: (format: string, count: number) => void;
  onExportError?: (error: Error) => void;
}

export function BulkExportMenu({
  elements,
  chartRefs = [],
  onExportStart,
  onExportComplete,
  onExportError,
}: BulkExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleElementToggle = useCallback((elementId: string) => {
    setSelectedElements(prev => 
      prev.includes(elementId)
        ? prev.filter(id => id !== elementId)
        : [...prev, elementId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedElements(elements.map(el => el.id));
  }, [elements]);

  const handleSelectNone = useCallback(() => {
    setSelectedElements([]);
  }, []);

  const handleBulkExport = useCallback(async (format: 'csv' | 'json' | 'pdf') => {
    if (isExporting || selectedElements.length === 0) return;

    setIsExporting(true);
    onExportStart?.();

    try {
      const selectedElementsData = elements.filter(el => selectedElements.includes(el.id));
      
      if (format === 'pdf') {
        // Export all to single PDF
        const _exportDataList = selectedElementsData.map(element => ({
          title: element.title,
          type: element.type.includes('chart') ? 'chart' as const : 
                element.type === 'data-table' ? 'table' as const : 'summary' as const,
          data: element.data as ChartData | TableData | SummaryCardData[],
          metadata: {
            dataSource: element.dataSource,
            lastUpdated: element.lastUpdated,
            isRealData: element.isRealData || false,
            exportedAt: new Date(),
          },
        }));

        const _chartElements = selectedElementsData.map((_, index) =>
          chartRefs[index]?.current || null
        );

        // Use the multiple export function from dataExport utils
        // await exportMultipleToPDF(exportDataList, chartElements);
      } else {
        // Export each element separately
        for (const element of selectedElementsData) {
          const exportData = {
            title: element.title,
            type: element.type.includes('chart') ? 'chart' as const : 
                  element.type === 'data-table' ? 'table' as const : 'summary' as const,
            data: element.data as ChartData | TableData | SummaryCardData[],
            metadata: {
              dataSource: element.dataSource,
              lastUpdated: element.lastUpdated,
              isRealData: element.isRealData || false,
              exportedAt: new Date(),
            },
          };

          const filename = `${element.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

          if (format === 'csv') {
            await exportToCSV(exportData, { filename: `${filename}.csv` });
          } else if (format === 'json') {
            await exportToJSON(exportData, { filename: `${filename}.json` });
          }
        }
      }

      onExportComplete?.(format, selectedElements.length);
      setIsOpen(false);
    } catch (error) {
      console.error(`Bulk export to ${format} failed:`, error);
      onExportError?.(error as Error);
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, selectedElements, elements, chartRefs, onExportStart, onExportComplete, onExportError]);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={styles.bulkExportMenu} ref={menuRef}>
      <button
        className={styles.bulkExportButton}
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        title="Bulk export"
      >
        {isExporting ? '⏳' : '📦'} Bulk Export
      </button>

      {isOpen && (
        <div className={styles.bulkDropdown}>
          <div className={styles.dropdownHeader}>
            <h4>Bulk Export</h4>
            <div className={styles.selectionControls}>
              <button onClick={handleSelectAll} className={styles.selectButton}>
                Select All
              </button>
              <button onClick={handleSelectNone} className={styles.selectButton}>
                Select None
              </button>
            </div>
          </div>

          <div className={styles.elementList}>
            {elements.map(element => (
              <label key={element.id} className={styles.elementCheckbox}>
                <input
                  type="checkbox"
                  checked={selectedElements.includes(element.id)}
                  onChange={() => handleElementToggle(element.id)}
                />
                <span>{element.title}</span>
                <span className={styles.elementType}>({element.type})</span>
              </label>
            ))}
          </div>

          <div className={styles.bulkExportButtons}>
            <button
              className={styles.formatButton}
              onClick={() => handleBulkExport('csv')}
              disabled={isExporting || selectedElements.length === 0}
              title={`Export ${selectedElements.length} items as CSV`}
            >
              📊 CSV ({selectedElements.length})
            </button>

            <button
              className={styles.formatButton}
              onClick={() => handleBulkExport('json')}
              disabled={isExporting || selectedElements.length === 0}
              title={`Export ${selectedElements.length} items as JSON`}
            >
              📄 JSON ({selectedElements.length})
            </button>

            <button
              className={styles.formatButton}
              onClick={() => handleBulkExport('pdf')}
              disabled={isExporting || selectedElements.length === 0}
              title={`Export ${selectedElements.length} items as PDF report`}
            >
              📑 PDF Report ({selectedElements.length})
            </button>
          </div>

          {isExporting && (
            <div className={styles.exportingIndicator}>
              <div className={styles.spinner} />
              <span>Exporting {selectedElements.length} items...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
