'use client';

import React, { useState, useEffect } from 'react';
import { DataType, VisualizationType } from '../types/dashboard';
import { DATA_TYPES, getSuitableVisualizations } from '../config/elementTypes';
import styles from './AddElementModal.module.css';

interface AddElementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onElementCreate: (dataType: DataType, visualizationType: VisualizationType) => void;
}

type ModalStep = 'data-type' | 'visualization';

export default function AddElementModal({ isOpen, onClose, onElementCreate }: AddElementModalProps) {
  const [currentStep, setCurrentStep] = useState<ModalStep>('data-type');
  const [selectedDataType, setSelectedDataType] = useState<DataType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('data-type');
      setSelectedDataType(null);
      setSelectedCategory(null);
    }
  }, [isOpen]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDataTypeSelect = (dataType: DataType) => {
    setSelectedDataType(dataType);
    setCurrentStep('visualization');
  };

  const handleVisualizationSelect = (visualizationType: VisualizationType) => {
    if (selectedDataType) {
      onElementCreate(selectedDataType, visualizationType);
      onClose();
    }
  };

  const handleBackToDataType = () => {
    setCurrentStep('data-type');
    setSelectedDataType(null);
  };

  const categories = Array.from(new Set(DATA_TYPES.map(type => type.category)));
  const filteredDataTypes = selectedCategory 
    ? DATA_TYPES.filter(type => type.category === selectedCategory)
    : DATA_TYPES;

  const suitableVisualizations = selectedDataType 
    ? getSuitableVisualizations(selectedDataType.id)
    : [];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {currentStep === 'data-type' ? 'Select Data Type' : 'Select Visualization'}
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className={styles.stepIndicator}>
          <div className={`${styles.step} ${currentStep === 'data-type' ? styles.active : styles.completed}`}>
            <span className={styles.stepNumber}>1</span>
            <span className={styles.stepLabel}>Data Type</span>
          </div>
          <div className={styles.stepConnector}></div>
          <div className={`${styles.step} ${currentStep === 'visualization' ? styles.active : ''}`}>
            <span className={styles.stepNumber}>2</span>
            <span className={styles.stepLabel}>Visualization</span>
          </div>
        </div>

        <div className={styles.modalBody}>
          {currentStep === 'data-type' && (
            <>
              <div className={styles.categoryFilter}>
                <button
                  className={`${styles.categoryButton} ${selectedCategory === null ? styles.active : ''}`}
                  onClick={() => setSelectedCategory(null)}
                >
                  All Categories
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    className={`${styles.categoryButton} ${selectedCategory === category ? styles.active : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </button>
                ))}
              </div>

              <div className={styles.optionsGrid}>
                {filteredDataTypes.map(dataType => (
                  <button
                    key={dataType.id}
                    className={styles.optionCard}
                    onClick={() => handleDataTypeSelect(dataType)}
                  >
                    <span className={styles.optionIcon}>{dataType.icon}</span>
                    <div className={styles.optionContent}>
                      <h3 className={styles.optionName}>{dataType.name}</h3>
                      <p className={styles.optionDescription}>{dataType.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {currentStep === 'visualization' && selectedDataType && (
            <>
              <div className={styles.selectedDataType}>
                <span className={styles.selectedIcon}>{selectedDataType.icon}</span>
                <div>
                  <h3 className={styles.selectedName}>{selectedDataType.name}</h3>
                  <p className={styles.selectedDescription}>Choose how to visualize this data</p>
                </div>
                <button className={styles.backButton} onClick={handleBackToDataType}>
                  ← Back
                </button>
              </div>

              <div className={styles.optionsGrid}>
                {suitableVisualizations.map(visualization => (
                  <button
                    key={visualization.id}
                    className={styles.optionCard}
                    onClick={() => handleVisualizationSelect(visualization)}
                  >
                    <span className={styles.optionIcon}>{visualization.icon}</span>
                    <div className={styles.optionContent}>
                      <h3 className={styles.optionName}>{visualization.name}</h3>
                      <p className={styles.optionDescription}>{visualization.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
