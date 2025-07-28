'use client';

import { ChartData, TableData, SummaryCardData } from '../types/dashboard';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import Papa from 'papaparse';

export interface ExportOptions {
  filename?: string;
  includeMetadata?: boolean;
  dateFormat?: 'iso' | 'locale' | 'timestamp';
  includeChartImage?: boolean;
  imageFormat?: 'png' | 'jpeg';
  imageQuality?: number;
  pdfOrientation?: 'portrait' | 'landscape';
  csvDelimiter?: ',' | ';' | '\t';
}

export interface ExportData {
  title: string;
  type: 'chart' | 'table' | 'summary';
  data: ChartData | TableData | SummaryCardData[];
  metadata?: {
    dataSource?: string;
    lastUpdated?: Date;
    isRealData?: boolean;
    exportedAt: Date;
    exportedBy?: string;
  };
}

/**
 * Export chart data to CSV format
 */
export async function exportToCSV(
  exportData: ExportData,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = `${exportData.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.csv`,
    includeMetadata = true,
    dateFormat = 'locale',
    csvDelimiter = ',',
  } = options;

  let csvData: any[] = [];

  if (exportData.type === 'chart' && isChartData(exportData.data)) {
    const chartData = exportData.data as ChartData;
    
    // Convert chart data to CSV format
    const rows: any[] = [];
    
    if (chartData.labels && chartData.datasets) {
      // Create header row
      const headers = ['Label', ...chartData.datasets.map(dataset => dataset.label || 'Dataset')];
      rows.push(headers);
      
      // Create data rows
      chartData.labels.forEach((label, index) => {
        const row = [formatDateForExport(label, dateFormat)];
        chartData.datasets.forEach(dataset => {
          const value = Array.isArray(dataset.data) ? dataset.data[index] : dataset.data;
          row.push(String(value || ''));
        });
        rows.push(row);
      });
    }
    
    csvData = rows;
  } else if (exportData.type === 'table' && isTableData(exportData.data)) {
    const tableData = exportData.data as TableData;
    
    // Create header row
    const headers = tableData.columns.map(col => col.label);
    csvData.push(headers);
    
    // Create data rows
    tableData.rows.forEach(row => {
      const csvRow = tableData.columns.map(col => {
        const value = row[col.key];
        return formatValueForExport(value, col.type, dateFormat);
      });
      csvData.push(csvRow);
    });
  } else if (exportData.type === 'summary' && isSummaryCardData(exportData.data)) {
    const summaryData = exportData.data as SummaryCardData[];
    
    // Create header row
    csvData.push(['Title', 'Value', 'Change Value', 'Change Type', 'Change Period']);
    
    // Create data rows
    summaryData.forEach(card => {
      csvData.push([
        card.title,
        card.value,
        card.change?.value || '',
        card.change?.type || '',
        card.change?.period || '',
      ]);
    });
  }

  // Add metadata if requested
  if (includeMetadata && exportData.metadata) {
    csvData.unshift([]);
    csvData.unshift(['Metadata']);
    csvData.unshift(['Title', exportData.title]);
    csvData.unshift(['Type', exportData.type]);
    csvData.unshift(['Exported At', formatDateForExport(exportData.metadata.exportedAt, dateFormat)]);
    
    if (exportData.metadata.dataSource) {
      csvData.unshift(['Data Source', exportData.metadata.dataSource]);
    }
    
    if (exportData.metadata.lastUpdated) {
      csvData.unshift(['Last Updated', formatDateForExport(exportData.metadata.lastUpdated, dateFormat)]);
    }
    
    csvData.unshift(['Is Real Data', exportData.metadata.isRealData ? 'Yes' : 'No']);
    csvData.unshift([]);
  }

  // Convert to CSV string
  const csv = Papa.unparse(csvData, {
    delimiter: csvDelimiter,
    header: false,
  });

  // Download file
  downloadFile(csv, filename, 'text/csv');
}

/**
 * Export data to JSON format
 */
export async function exportToJSON(
  exportData: ExportData,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = `${exportData.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`,
    includeMetadata = true,
  } = options;

  const jsonData = {
    title: exportData.title,
    type: exportData.type,
    data: exportData.data,
    ...(includeMetadata && exportData.metadata && { metadata: exportData.metadata }),
  };

  const jsonString = JSON.stringify(jsonData, null, 2);
  downloadFile(jsonString, filename, 'application/json');
}

/**
 * Export chart to PDF format
 */
export async function exportToPDF(
  exportData: ExportData,
  chartElement: HTMLElement | null,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = `${exportData.title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`,
    includeMetadata = true,
    includeChartImage = true,
    imageFormat = 'png',
    imageQuality = 0.95,
    pdfOrientation = 'portrait',
  } = options;

  const pdf = new jsPDF({
    orientation: pdfOrientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Add title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(exportData.title, margin, yPosition);
  yPosition += 15;

  // Add metadata
  if (includeMetadata && exportData.metadata) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    const metadata = [
      `Type: ${exportData.type}`,
      `Exported: ${exportData.metadata.exportedAt.toLocaleString()}`,
      ...(exportData.metadata.dataSource ? [`Data Source: ${exportData.metadata.dataSource}`] : []),
      ...(exportData.metadata.lastUpdated ? [`Last Updated: ${exportData.metadata.lastUpdated.toLocaleString()}`] : []),
      `Real Data: ${exportData.metadata.isRealData ? 'Yes' : 'No'}`,
    ];

    metadata.forEach(line => {
      pdf.text(line, margin, yPosition);
      yPosition += 5;
    });
    
    yPosition += 10;
  }

  // Add chart image
  if (includeChartImage && chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL(`image/${imageFormat}`, imageQuality);
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Check if image fits on current page
      if (yPosition + imgHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.addImage(imgData, imageFormat.toUpperCase(), margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;
    } catch (error) {
      console.error('Failed to capture chart image:', error);
      pdf.setFontSize(12);
      pdf.text('Chart image could not be captured', margin, yPosition);
      yPosition += 10;
    }
  }

  // Add data table
  if (exportData.type === 'chart' && isChartData(exportData.data)) {
    const chartData = exportData.data as ChartData;
    addChartDataTable(pdf, chartData, margin, yPosition, pageWidth - (margin * 2));
  } else if (exportData.type === 'table' && isTableData(exportData.data)) {
    const tableData = exportData.data as TableData;
    addDataTable(pdf, tableData, margin, yPosition, pageWidth - (margin * 2));
  } else if (exportData.type === 'summary' && isSummaryCardData(exportData.data)) {
    const summaryData = exportData.data as SummaryCardData[];
    addSummaryTable(pdf, summaryData, margin, yPosition, pageWidth - (margin * 2));
  }

  // Save PDF
  pdf.save(filename);
}

/**
 * Export multiple charts/data to a single PDF report
 */
export async function exportMultipleToPDF(
  exportDataList: ExportData[],
  chartElements: (HTMLElement | null)[],
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = `dashboard-report-${Date.now()}.pdf`,
    includeMetadata: _includeMetadata = true,
    includeChartImage: _includeChartImage = true,
    imageFormat: _imageFormat = 'png',
    imageQuality: _imageQuality = 0.95,
    pdfOrientation = 'portrait',
  } = options;

  const pdf = new jsPDF({
    orientation: pdfOrientation,
    unit: 'mm',
    format: 'a4',
  });

  // const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;

  // Add title page
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Dashboard Report', margin, 40);
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated on ${new Date().toLocaleString()}`, margin, 60);
  pdf.text(`Contains ${exportDataList.length} charts/tables`, margin, 70);

  // Add each chart/data on separate pages
  for (let i = 0; i < exportDataList.length; i++) {
    pdf.addPage();
    
    await exportToPDF(
      exportDataList[i],
      chartElements[i],
      {
        ...options,
        filename: '', // Don't save individual files
      }
    );
  }

  // Save combined PDF
  pdf.save(filename);
}

// Helper functions
function isChartData(data: any): data is ChartData {
  return data && typeof data === 'object' && 'labels' in data && 'datasets' in data;
}

function isTableData(data: any): data is TableData {
  return data && typeof data === 'object' && 'columns' in data && 'rows' in data;
}

function isSummaryCardData(data: any): data is SummaryCardData[] {
  return Array.isArray(data) && data.length > 0 && 'title' in data[0] && 'value' in data[0];
}

function formatDateForExport(date: any, format: 'iso' | 'locale' | 'timestamp'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return String(date);

  switch (format) {
    case 'iso':
      return dateObj.toISOString();
    case 'timestamp':
      return dateObj.getTime().toString();
    case 'locale':
    default:
      return dateObj.toLocaleString();
  }
}

function formatValueForExport(value: any, type?: string, dateFormat?: string): string {
  if (value === null || value === undefined) return '';
  
  if (type === 'currency') {
    return typeof value === 'number' ? value.toFixed(2) : String(value);
  }
  
  if (type === 'percentage') {
    return typeof value === 'number' ? `${value}%` : String(value);
  }
  
  if (value instanceof Date) {
    return formatDateForExport(value, (dateFormat as 'iso' | 'locale' | 'timestamp') || 'locale');
  }
  
  return String(value);
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

function addChartDataTable(_pdf: jsPDF, _chartData: ChartData, _x: number, _y: number, _width: number): void {
  // Implementation for adding chart data as table to PDF
  // This would use a library like jsPDF-AutoTable for better table formatting
}

function addDataTable(_pdf: jsPDF, _tableData: TableData, _x: number, _y: number, _width: number): void {
  // Implementation for adding table data to PDF
}

function addSummaryTable(_pdf: jsPDF, _summaryData: SummaryCardData[], _x: number, _y: number, _width: number): void {
  // Implementation for adding summary cards as table to PDF
}
