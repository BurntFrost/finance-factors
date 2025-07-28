'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { TableData, TableColumn, VisualizationType } from '@/shared/types/dashboard';
import { getDataStatus } from './DataStatusPill';
import { useIsEditMode } from '@/frontend/context/ViewModeContext';
import VisualizationTypeSwitcher from './VisualizationTypeSwitcher';
import { TableCard } from './ui/table-card';

interface DataTableProps {
  title: string;
  data: TableData;
  dataType?: string;
  onRemove?: () => void;
  onVisualizationChange?: (newType: VisualizationType) => void;
  maxRows?: number;
  isChangingVisualization?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

const DataTable = React.memo(function DataTable({
  title,
  data,
  dataType,
  onRemove,
  onVisualizationChange,
  maxRows = 10,
  isChangingVisualization = false
}: DataTableProps) {
  const isEditMode = useIsEditMode();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Memoize search term normalization
  const normalizedSearchTerm = useMemo(() => searchTerm.toLowerCase(), [searchTerm]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data.rows;

    return data.rows.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(normalizedSearchTerm)
      )
    );
  }, [data.rows, normalizedSearchTerm, searchTerm]);

  // Memoize sort function to prevent recreation
  const sortFunction = useMemo(() => {
    if (!sortColumn || !sortDirection) return null;

    return (a: any, b: any) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle different data types
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();

      if (sortDirection === 'asc') {
        return aString.localeCompare(bString);
      } else {
        return bString.localeCompare(aString);
      }
    };
  }, [sortColumn, sortDirection]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortFunction) return filteredData;
    return [...filteredData].sort(sortFunction);
  }, [filteredData, sortFunction]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * maxRows;
    return sortedData.slice(startIndex, startIndex + maxRows);
  }, [sortedData, currentPage, maxRows]);

  const totalPages = Math.ceil(sortedData.length / maxRows);

  // Memoize sort handler to prevent recreation
  const handleSort = useCallback((columnKey: string) => {
    const column = data.columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  }, [sortColumn, sortDirection, data.columns]);

  const formatCellValue = (value: unknown, column: TableColumn) => {
    if (value === null || value === undefined) return '-';

    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(Number(value));
      case 'percentage':
        return `${Number(value).toFixed(2)}%`;
      case 'number':
        return new Intl.NumberFormat('en-US').format(Number(value));
      default:
        return String(value);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Memoize data status to prevent recalculation
  const dataStatus = useMemo(() => getDataStatus(data.lastUpdated, data.isRealData), [data.lastUpdated, data.isRealData]);

  // Prepare header actions
  const headerActions = (
    <>
      {dataType && onVisualizationChange && (
        <VisualizationTypeSwitcher
          dataType={dataType}
          currentVisualizationType="data-table"
          onVisualizationChange={onVisualizationChange}
          size="small"
          showLabels={false}
          showIcons={true}
          disabled={isChangingVisualization}
          isLoading={isChangingVisualization}
        />
      )}
    </>
  );

  return (
    <TableCard
      title={title}
      status={dataStatus}
      lastUpdated={data.lastUpdated}
      isEditable={isEditMode}
      onRemove={onRemove}
      headerActions={headerActions}
      searchValue={searchTerm}
      onSearchChange={useCallback((value: string) => {
        setSearchTerm(value);
        setCurrentPage(1);
      }, [])}
      showSearch={true}
      footerContent={
        totalPages > 1 ? (
          <div className="flex justify-between items-center">
            <button
              className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({sortedData.length} total rows)
            </span>

            <button
              className="px-3 py-1 text-sm border rounded hover:bg-muted disabled:opacity-50"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        ) : null
      }
    >

      <div className="relative w-full">
        {isChangingVisualization && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin text-2xl">⟳</div>
              <div className="text-sm text-muted-foreground">Switching visualization...</div>
            </div>
          </div>
        )}
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              {data.columns.map((column) => (
                <th
                  key={column.key}
                  className={`text-left p-3 font-medium text-muted-foreground ${column.sortable ? 'cursor-pointer hover:text-foreground' : ''}`}
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center justify-between">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="ml-2 text-xs">
                        {getSortIcon(column.key)}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr key={index} className="border-b hover:bg-muted/50">
                {data.columns.map((column) => (
                  <td key={column.key} className="p-3 text-sm">
                    {formatCellValue(row[column.key], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedData.length === 0 && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p>No data found</p>
          </div>
        )}
      </div>
    </TableCard>
  );
});

export default DataTable;
