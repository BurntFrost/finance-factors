'use client';

import React, { useState, useMemo } from 'react';
import { TableData, TableColumn } from '../types/dashboard';
import DataStatusPill, { getDataStatus } from './DataStatusPill';
import { useIsEditMode } from '../context/ViewModeContext';
import styles from './DataTable.module.css';

interface DataTableProps {
  title: string;
  data: TableData;
  onRemove?: () => void;
  maxRows?: number;
}

type SortDirection = 'asc' | 'desc' | null;

export default function DataTable({ title, data, onRemove, maxRows = 10 }: DataTableProps) {
  const isEditMode = useIsEditMode();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) return data.rows;
    
    return data.rows.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data.rows, searchTerm]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return filteredData;

    return [...filteredData].sort((a, b) => {
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
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * maxRows;
    return sortedData.slice(startIndex, startIndex + maxRows);
  }, [sortedData, currentPage, maxRows]);

  const totalPages = Math.ceil(sortedData.length / maxRows);

  const handleSort = (columnKey: string) => {
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
  };

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

  const dataStatus = getDataStatus(data.lastUpdated, data.isRealData);

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <div className={styles.titleSection}>
          <h2 className={styles.tableTitle}>{title}</h2>
          <DataStatusPill
            status={dataStatus}
            lastUpdated={data.lastUpdated}
            size="small"
          />
        </div>
        <div className={styles.tableControls}>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.searchInput}
          />
          {onRemove && isEditMode && (
            <button
              className={styles.removeButton}
              onClick={onRemove}
              aria-label="Remove table"
            >
              🗑️ Remove
            </button>
          )}
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {data.columns.map((column) => (
                <th
                  key={column.key}
                  className={`${styles.tableHeaderCell} ${column.sortable ? styles.sortable : ''}`}
                  onClick={() => handleSort(column.key)}
                >
                  <div className={styles.headerContent}>
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className={styles.sortIcon}>
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
              <tr key={index} className={styles.tableRow}>
                {data.columns.map((column) => (
                  <td key={column.key} className={styles.tableCell}>
                    {formatCellValue(row[column.key], column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {paginatedData.length === 0 && (
          <div className={styles.emptyState}>
            <p>No data found</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationButton}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          
          <span className={styles.paginationInfo}>
            Page {currentPage} of {totalPages} ({sortedData.length} total rows)
          </span>
          
          <button
            className={styles.paginationButton}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
