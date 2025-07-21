'use client';

import React, { useState } from 'react';
import AddElementModal from './AddElementModal';
import { DataType, VisualizationType } from '../types/dashboard';
import styles from './AddElementDropdown.module.css';

// Legacy interface for backward compatibility
export interface ElementType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'chart' | 'data' | 'widget';
}

interface AddElementDropdownProps {
  onElementSelect?: (elementType: ElementType) => void; // Legacy support
  onElementCreate?: (dataType: DataType, visualizationType: VisualizationType) => void; // New two-step process
  disabled?: boolean;
}

export default function AddElementDropdown({
  onElementSelect,
  onElementCreate,
  disabled = false
}: AddElementDropdownProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleButtonClick = () => {
    if (!disabled) {
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleElementCreate = (dataType: DataType, visualizationType: VisualizationType) => {
    if (onElementCreate) {
      onElementCreate(dataType, visualizationType);
    } else if (onElementSelect) {
      // Legacy support - convert to old format
      const legacyElementType: ElementType = {
        id: visualizationType.id,
        name: visualizationType.name,
        description: visualizationType.description,
        icon: visualizationType.icon,
        category: visualizationType.category
      };
      onElementSelect(legacyElementType);
    }
    setIsModalOpen(false);
  };

  return (
    <>
      <button
        className={`${styles.dropdownButton} ${disabled ? styles.disabled : ''}`}
        onClick={handleButtonClick}
        disabled={disabled}
        aria-label="Add new dashboard element"
      >
        <span className={styles.buttonIcon}>➕</span>
        <span className={styles.buttonText}>Add Element</span>
      </button>

      <AddElementModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onElementCreate={handleElementCreate}
      />
    </>
  );
}
