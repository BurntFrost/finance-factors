'use client';

import React, { useState, useCallback } from 'react';
import { DashboardElement } from '../types/dashboard';
import { useDashboard } from '../context/DashboardContext';
import { useIsEditMode } from '../context/ViewModeContext';
import { userPreferences } from '../utils/localStorage';
import styles from './DashboardCustomizationPanel.module.css';

interface DashboardSettings {
  enableDragDrop: boolean;
  enableRealTime: boolean;
  visibleCharts: string[];
}

interface DashboardCustomizationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: Partial<DashboardSettings>) => void;
  currentSettings?: Partial<DashboardSettings>;
}

interface DataSourceOption {
  id: string;
  name: string;
  description: string;
  category: 'economic' | 'financial' | 'housing' | 'employment';
  isAvailable: boolean;
}

const AVAILABLE_DATA_SOURCES: DataSourceOption[] = [
  {
    id: 'house-prices',
    name: 'House Price Index',
    description: 'Federal Housing Finance Agency house price data',
    category: 'housing',
    isAvailable: true,
  },
  {
    id: 'salary-income',
    name: 'Average Hourly Earnings',
    description: 'Bureau of Labor Statistics wage data',
    category: 'employment',
    isAvailable: true,
  },
  {
    id: 'inflation-cpi',
    name: 'Consumer Price Index',
    description: 'Bureau of Labor Statistics inflation data',
    category: 'economic',
    isAvailable: true,
  },
  {
    id: 'unemployment-rate',
    name: 'Unemployment Rate',
    description: 'Bureau of Labor Statistics unemployment data',
    category: 'employment',
    isAvailable: true,
  },
  {
    id: 'gdp-growth',
    name: 'GDP Growth Rate',
    description: 'Bureau of Economic Analysis GDP data',
    category: 'economic',
    isAvailable: true,
  },
  {
    id: 'stock-market',
    name: 'Stock Market Index',
    description: 'Alpha Vantage stock market data',
    category: 'financial',
    isAvailable: true,
  },
  {
    id: 'interest-rates',
    name: 'Federal Interest Rates',
    description: 'Federal Reserve interest rate data',
    category: 'financial',
    isAvailable: false, // Coming soon
  },
];

export default function DashboardCustomizationPanel({
  isOpen,
  onClose,
  onSettingsChange,
  currentSettings = {},
}: DashboardCustomizationPanelProps) {
  const { state, dispatch } = useDashboard();
  const isEditMode = useIsEditMode();
  const [activeTab, setActiveTab] = useState<'data-sources' | 'time-ranges' | 'preferences'>('data-sources');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState({
    start: '',
    end: '',
    preset: '1year',
  });
  const [preferences, setPreferences] = useState(() => {
    const saved = userPreferences.load();
    return {
      theme: saved.theme || 'auto',
      refreshInterval: saved.refreshInterval || 300000, // 5 minutes
      showDataStatus: true, // Default to true since it's not in the saved preferences type
      enableAnimations: true, // Default to true
      compactMode: false, // Default to false
      defaultChartType: 'line-chart', // Default chart type
      enableDragDrop: currentSettings.enableDragDrop ?? true,
      enableRealTime: currentSettings.enableRealTime ?? false,
    };
  });

  const handleAddDataSource = useCallback((dataSourceId: string) => {
    const dataSource = AVAILABLE_DATA_SOURCES.find(ds => ds.id === dataSourceId);
    if (!dataSource || !dataSource.isAvailable) return;

    const newElement: DashboardElement = {
      id: `element-${Date.now()}`,
      type: preferences.defaultChartType as 'line-chart' | 'bar-chart' | 'pie-chart' | 'doughnut-chart' | 'data-table' | 'summary-card',
      dataType: dataSourceId,
      title: dataSource.name,
      position: { row: 0, col: 0 },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dispatch({ type: 'ADD_ELEMENT', payload: newElement });
  }, [dispatch, preferences.defaultChartType]);

  const handleRemoveDataSource = useCallback((elementId: string) => {
    dispatch({ type: 'REMOVE_ELEMENT', payload: elementId });
  }, [dispatch]);

  const handleTimeRangeChange = useCallback((field: string, value: string) => {
    setTimeRange(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleApplyTimeRange = useCallback(() => {
    // Apply time range to all charts
    // This would integrate with the data fetching logic
    console.log('Applying time range:', timeRange);
  }, [timeRange]);

  const handlePreferenceChange = useCallback((key: string, value: any) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, [key]: value };
      userPreferences.save(newPrefs);

      // Notify parent of settings changes for advanced features
      if ((key === 'enableDragDrop' || key === 'enableRealTime') && onSettingsChange) {
        onSettingsChange({ [key]: value });
      }

      return newPrefs;
    });
  }, [onSettingsChange]);

  const filteredDataSources = AVAILABLE_DATA_SOURCES.filter(ds => 
    selectedCategory === 'all' || ds.category === selectedCategory
  );

  const currentDataSources = state.elements.map(el => el.dataType);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2>Dashboard Customization</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'data-sources' ? styles.active : ''}`}
            onClick={() => setActiveTab('data-sources')}
          >
            📊 Data Sources
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'time-ranges' ? styles.active : ''}`}
            onClick={() => setActiveTab('time-ranges')}
          >
            📅 Time Ranges
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'preferences' ? styles.active : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            ⚙️ Preferences
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'data-sources' && (
            <div className={styles.dataSourcesTab}>
              <div className={styles.categoryFilter}>
                <label>Category:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={styles.select}
                >
                  <option value="all">All Categories</option>
                  <option value="economic">Economic</option>
                  <option value="financial">Financial</option>
                  <option value="housing">Housing</option>
                  <option value="employment">Employment</option>
                </select>
              </div>

              <div className={styles.currentSources}>
                <h3>Current Data Sources ({currentDataSources.length})</h3>
                <div className={styles.sourceList}>
                  {state.elements.map(element => (
                    <div key={element.id} className={styles.sourceItem}>
                      <div className={styles.sourceInfo}>
                        <div className={styles.sourceName}>{element.title}</div>
                        <div className={styles.sourceType}>{element.type}</div>
                      </div>
                      {isEditMode && (
                        <button
                          className={styles.removeButton}
                          onClick={() => handleRemoveDataSource(element.id)}
                          title="Remove data source"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                  {state.elements.length === 0 && (
                    <div className={styles.emptyState}>
                      No data sources added yet
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.availableSources}>
                <h3>Available Data Sources</h3>
                <div className={styles.sourceGrid}>
                  {filteredDataSources.map(dataSource => {
                    const isAdded = currentDataSources.includes(dataSource.id);
                    return (
                      <div
                        key={dataSource.id}
                        className={`${styles.sourceCard} ${
                          !dataSource.isAvailable ? styles.unavailable : ''
                        } ${isAdded ? styles.added : ''}`}
                      >
                        <div className={styles.sourceHeader}>
                          <h4>{dataSource.name}</h4>
                          <span className={`${styles.categoryBadge} ${styles[dataSource.category]}`}>
                            {dataSource.category}
                          </span>
                        </div>
                        <p className={styles.sourceDescription}>
                          {dataSource.description}
                        </p>
                        <div className={styles.sourceActions}>
                          {dataSource.isAvailable ? (
                            <button
                              className={`${styles.addButton} ${isAdded ? styles.added : ''}`}
                              onClick={() => handleAddDataSource(dataSource.id)}
                              disabled={isAdded || !isEditMode}
                            >
                              {isAdded ? '✓ Added' : '+ Add'}
                            </button>
                          ) : (
                            <span className={styles.comingSoon}>Coming Soon</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'time-ranges' && (
            <div className={styles.timeRangesTab}>
              <div className={styles.timeRangeSection}>
                <h3>Global Time Range</h3>
                <p>Set the time range for all charts in the dashboard</p>

                <div className={styles.presetButtons}>
                  {[
                    { value: '1month', label: '1 Month' },
                    { value: '3months', label: '3 Months' },
                    { value: '6months', label: '6 Months' },
                    { value: '1year', label: '1 Year' },
                    { value: '2years', label: '2 Years' },
                    { value: '5years', label: '5 Years' },
                    { value: 'custom', label: 'Custom' },
                  ].map(preset => (
                    <button
                      key={preset.value}
                      className={`${styles.presetButton} ${
                        timeRange.preset === preset.value ? styles.active : ''
                      }`}
                      onClick={() => handleTimeRangeChange('preset', preset.value)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {timeRange.preset === 'custom' && (
                  <div className={styles.customRange}>
                    <div className={styles.dateInputs}>
                      <div className={styles.inputGroup}>
                        <label>Start Date:</label>
                        <input
                          type="date"
                          value={timeRange.start}
                          onChange={(e) => handleTimeRangeChange('start', e.target.value)}
                          className={styles.dateInput}
                        />
                      </div>
                      <div className={styles.inputGroup}>
                        <label>End Date:</label>
                        <input
                          type="date"
                          value={timeRange.end}
                          onChange={(e) => handleTimeRangeChange('end', e.target.value)}
                          className={styles.dateInput}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  className={styles.applyButton}
                  onClick={handleApplyTimeRange}
                >
                  Apply Time Range
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className={styles.preferencesTab}>
              <div className={styles.preferenceSection}>
                <h3>Appearance</h3>
                <div className={styles.preferenceGroup}>
                  <label>Theme:</label>
                  <select
                    value={preferences.theme}
                    onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                    className={styles.select}
                  >
                    <option value="auto">Auto (System)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
                <div className={styles.preferenceGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={preferences.compactMode}
                      onChange={(e) => handlePreferenceChange('compactMode', e.target.checked)}
                    />
                    Compact Mode
                  </label>
                </div>
                <div className={styles.preferenceGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={preferences.enableAnimations}
                      onChange={(e) => handlePreferenceChange('enableAnimations', e.target.checked)}
                    />
                    Enable Animations
                  </label>
                </div>
              </div>

              <div className={styles.preferenceSection}>
                <h3>Data & Updates</h3>
                <div className={styles.preferenceGroup}>
                  <label>Refresh Interval:</label>
                  <select
                    value={preferences.refreshInterval}
                    onChange={(e) => handlePreferenceChange('refreshInterval', parseInt(e.target.value))}
                    className={styles.select}
                  >
                    <option value={60000}>1 minute</option>
                    <option value={300000}>5 minutes</option>
                    <option value={600000}>10 minutes</option>
                    <option value={1800000}>30 minutes</option>
                    <option value={3600000}>1 hour</option>
                  </select>
                </div>
                <div className={styles.preferenceGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={preferences.enableRealTime}
                      onChange={(e) => handlePreferenceChange('enableRealTime', e.target.checked)}
                    />
                    Enable Real-time Updates
                  </label>
                  <small className={styles.preferenceDescription}>
                    Connect to WebSocket for live data updates
                  </small>
                </div>
              </div>

              <div className={styles.preferenceSection}>
                <h3>Interactive Features</h3>
                <div className={styles.preferenceGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={preferences.enableDragDrop}
                      onChange={(e) => handlePreferenceChange('enableDragDrop', e.target.checked)}
                    />
                    Enable Drag & Drop
                  </label>
                  <small className={styles.preferenceDescription}>
                    Allow reordering dashboard elements by dragging
                  </small>
                </div>
                <div className={styles.preferenceGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={preferences.showDataStatus}
                      onChange={(e) => handlePreferenceChange('showDataStatus', e.target.checked)}
                    />
                    Show Data Status Indicators
                  </label>
                </div>
              </div>

              <div className={styles.preferenceSection}>
                <h3>Default Chart Settings</h3>
                <div className={styles.preferenceGroup}>
                  <label>Default Chart Type:</label>
                  <select
                    value={preferences.defaultChartType}
                    onChange={(e) => handlePreferenceChange('defaultChartType', e.target.value)}
                    className={styles.select}
                  >
                    <option value="line-chart">Line Chart</option>
                    <option value="bar-chart">Bar Chart</option>
                    <option value="pie-chart">Pie Chart</option>
                    <option value="doughnut-chart">Doughnut Chart</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.saveButton} onClick={onClose}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
