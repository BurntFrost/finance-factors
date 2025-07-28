'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { DashboardElement } from '../types/dashboard';
import { dashboardLayouts, chartDimensions } from '../utils/localStorage';
import { useDashboard } from '../context/DashboardContext';
import { useIsEditMode } from '../context/ViewModeContext';
import styles from './DashboardLayoutManager.module.css';

interface DashboardLayout {
  id: string;
  name: string;
  elements: Array<{
    id: string;
    type: string;
    dataType: string;
    title: string;
    position: { row: number; col: number };
    size: { width: number; height: number };
    config?: Record<string, unknown>;
  }>;
  gridColumns: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DashboardLayoutManagerProps {
  currentElements: DashboardElement[];
  onLayoutLoad: (elements: DashboardElement[]) => void;
  onLayoutSave?: (layoutName: string) => void;
}

export default function DashboardLayoutManager({
  currentElements,
  onLayoutLoad,
  onLayoutSave,
}: DashboardLayoutManagerProps) {
  const isEditMode = useIsEditMode();
  const [savedLayouts, setSavedLayouts] = useState<Array<{ id: string; name: string; updatedAt: Date }>>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);

  // Load saved layouts on mount
  useEffect(() => {
    const layouts = dashboardLayouts.getLayoutNames();
    setSavedLayouts(layouts);
  }, []);

  const handleSaveLayout = useCallback(() => {
    if (!newLayoutName.trim()) return;

    const layoutId = `layout-${Date.now()}`;
    const layout: DashboardLayout = {
      id: layoutId,
      name: newLayoutName.trim(),
      elements: currentElements.map((element, index) => {
        const dimensions = chartDimensions.load(element.id);
        return {
          id: element.id,
          type: element.type,
          dataType: element.dataType,
          title: element.title,
          position: element.position || { row: Math.floor(index / 2), col: index % 2 },
          size: dimensions || { width: 400, height: 300 },
          config: element.config,
        };
      }),
      gridColumns: 2, // Default grid columns
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dashboardLayouts.save(layout);
    setSavedLayouts(dashboardLayouts.getLayoutNames());
    setNewLayoutName('');
    setShowSaveDialog(false);
    onLayoutSave?.(newLayoutName.trim());
  }, [currentElements, newLayoutName, onLayoutSave]);

  const handleLoadLayout = useCallback(() => {
    if (!selectedLayoutId) return;

    const layout = dashboardLayouts.load(selectedLayoutId);
    if (!layout) return;

    // Convert saved layout back to DashboardElement format
    const elements: DashboardElement[] = layout.elements.map((savedElement) => ({
      id: savedElement.id,
      type: savedElement.type as any,
      dataType: savedElement.dataType,
      title: savedElement.title,
      position: savedElement.position,
      config: savedElement.config,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Restore chart dimensions
    layout.elements.forEach((element) => {
      chartDimensions.save(element.id, element.size.width, element.size.height);
    });

    onLayoutLoad(elements);
    setSelectedLayoutId(null);
    setShowLoadDialog(false);
  }, [selectedLayoutId, onLayoutLoad]);

  const handleDeleteLayout = useCallback((layoutId: string) => {
    if (confirm('Are you sure you want to delete this layout?')) {
      dashboardLayouts.delete(layoutId);
      setSavedLayouts(dashboardLayouts.getLayoutNames());
      if (selectedLayoutId === layoutId) {
        setSelectedLayoutId(null);
      }
    }
  }, [selectedLayoutId]);

  const handleExportLayout = useCallback(() => {
    if (!selectedLayoutId) return;

    const layout = dashboardLayouts.load(selectedLayoutId);
    if (!layout) return;

    const dataStr = JSON.stringify(layout, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `dashboard-layout-${layout.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [selectedLayoutId]);

  const handleImportLayout = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const layout = JSON.parse(e.target?.result as string) as DashboardLayout;
        
        // Generate new ID to avoid conflicts
        layout.id = `layout-${Date.now()}`;
        layout.name = `${layout.name} (Imported)`;
        layout.updatedAt = new Date();

        dashboardLayouts.save(layout);
        setSavedLayouts(dashboardLayouts.getLayoutNames());
      } catch (_error) {
        alert('Failed to import layout. Please check the file format.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  }, []);

  if (!isEditMode) {
    return null;
  }

  return (
    <div className={styles.layoutManager}>
      <div className={styles.controls}>
        <button
          className={styles.controlButton}
          onClick={() => setShowSaveDialog(true)}
          disabled={currentElements.length === 0}
          title="Save current layout"
        >
          💾 Save Layout
        </button>
        
        <button
          className={styles.controlButton}
          onClick={() => setShowLoadDialog(true)}
          disabled={savedLayouts.length === 0}
          title="Load saved layout"
        >
          📂 Load Layout
        </button>

        <label className={styles.importButton}>
          📥 Import
          <input
            type="file"
            accept=".json"
            onChange={handleImportLayout}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Save Dashboard Layout</h3>
            <input
              type="text"
              placeholder="Enter layout name..."
              value={newLayoutName}
              onChange={(e) => setNewLayoutName(e.target.value)}
              className={styles.input}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewLayoutName('');
                }}
              >
                Cancel
              </button>
              <button
                className={styles.saveButton}
                onClick={handleSaveLayout}
                disabled={!newLayoutName.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Dialog */}
      {showLoadDialog && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Load Dashboard Layout</h3>
            <div className={styles.layoutList}>
              {savedLayouts.map((layout) => (
                <div
                  key={layout.id}
                  className={`${styles.layoutItem} ${
                    selectedLayoutId === layout.id ? styles.selected : ''
                  }`}
                  onClick={() => setSelectedLayoutId(layout.id)}
                >
                  <div className={styles.layoutInfo}>
                    <div className={styles.layoutName}>{layout.name}</div>
                    <div className={styles.layoutDate}>
                      {new Date(layout.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={styles.layoutActions}>
                    <button
                      className={styles.exportButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        const tempSelectedId = selectedLayoutId;
                        setSelectedLayoutId(layout.id);
                        setTimeout(() => {
                          handleExportLayout();
                          setSelectedLayoutId(tempSelectedId);
                        }, 0);
                      }}
                      title="Export layout"
                    >
                      📤
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLayout(layout.id);
                      }}
                      title="Delete layout"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setShowLoadDialog(false);
                  setSelectedLayoutId(null);
                }}
              >
                Cancel
              </button>
              <button
                className={styles.loadButton}
                onClick={handleLoadLayout}
                disabled={!selectedLayoutId}
              >
                Load
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing dashboard layout persistence
 */
export function useDashboardLayoutPersistence() {
  const { state, dispatch } = useDashboard();

  const saveCurrentLayout = useCallback((name: string) => {
    const layoutId = `layout-${Date.now()}`;
    const layout = {
      id: layoutId,
      name,
      elements: state.elements.map((element, index) => {
        const dimensions = chartDimensions.load(element.id);
        return {
          id: element.id,
          type: element.type,
          dataType: element.dataType,
          title: element.title,
          position: element.position || { row: Math.floor(index / 2), col: index % 2 },
          size: dimensions || { width: 400, height: 300 },
          config: element.config,
        };
      }),
      gridColumns: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dashboardLayouts.save(layout);
    return layoutId;
  }, [state.elements]);

  const loadLayout = useCallback((layoutId: string) => {
    const layout = dashboardLayouts.load(layoutId);
    if (!layout) return false;

    const elements: DashboardElement[] = layout.elements.map((savedElement) => ({
      id: savedElement.id,
      type: savedElement.type as any,
      dataType: savedElement.dataType,
      title: savedElement.title,
      position: savedElement.position,
      config: savedElement.config,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Restore chart dimensions
    layout.elements.forEach((element) => {
      chartDimensions.save(element.id, element.size.width, element.size.height);
    });

    dispatch({ type: 'REORDER_ELEMENTS', payload: elements });
    return true;
  }, [dispatch]);

  const getSavedLayouts = useCallback(() => {
    return dashboardLayouts.getLayoutNames();
  }, []);

  const deleteLayout = useCallback((layoutId: string) => {
    dashboardLayouts.delete(layoutId);
  }, []);

  return {
    saveCurrentLayout,
    loadLayout,
    getSavedLayouts,
    deleteLayout,
  };
}
