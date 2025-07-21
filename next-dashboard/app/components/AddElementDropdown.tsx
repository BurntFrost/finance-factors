'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './AddElementDropdown.module.css';

export interface ElementType {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'chart' | 'data' | 'widget';
}

export const ELEMENT_TYPES: ElementType[] = [
  {
    id: 'line-chart',
    name: 'Line Chart',
    description: 'Visualize trends over time',
    icon: '📈',
    category: 'chart'
  },
  {
    id: 'bar-chart',
    name: 'Bar Chart',
    description: 'Compare values across categories',
    icon: '📊',
    category: 'chart'
  },
  {
    id: 'pie-chart',
    name: 'Pie Chart',
    description: 'Show proportional data',
    icon: '🥧',
    category: 'chart'
  },
  {
    id: 'doughnut-chart',
    name: 'Doughnut Chart',
    description: 'Display proportional data with center space',
    icon: '🍩',
    category: 'chart'
  },
  {
    id: 'data-table',
    name: 'Data Table',
    description: 'Display data in tabular format',
    icon: '📋',
    category: 'data'
  },
  {
    id: 'summary-card',
    name: 'Summary Card',
    description: 'Show key metrics and statistics',
    icon: '📄',
    category: 'widget'
  }
];

interface AddElementDropdownProps {
  onElementSelect: (elementType: ElementType) => void;
  disabled?: boolean;
}

export default function AddElementDropdown({ onElementSelect, disabled = false }: AddElementDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedCategory(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSelectedCategory(null);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSelectedCategory(null);
    }
  };

  const handleElementSelect = (elementType: ElementType) => {
    onElementSelect(elementType);
    setIsOpen(false);
    setSelectedCategory(null);
  };

  const categories = Array.from(new Set(ELEMENT_TYPES.map(type => type.category)));
  const filteredElements = selectedCategory 
    ? ELEMENT_TYPES.filter(type => type.category === selectedCategory)
    : ELEMENT_TYPES;

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <button
        className={`${styles.dropdownButton} ${disabled ? styles.disabled : ''}`}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Add new dashboard element"
      >
        <span className={styles.buttonIcon}>➕</span>
        <span className={styles.buttonText}>Add Element</span>
        <span className={`${styles.chevron} ${isOpen ? styles.chevronUp : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu} role="menu">
          <div className={styles.menuHeader}>
            <h3 className={styles.menuTitle}>Add Dashboard Element</h3>
            <div className={styles.categoryFilter}>
              <button
                className={`${styles.categoryButton} ${selectedCategory === null ? styles.active : ''}`}
                onClick={() => setSelectedCategory(null)}
              >
                All
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
          </div>

          <div className={styles.menuItems}>
            {filteredElements.map(elementType => (
              <button
                key={elementType.id}
                className={styles.menuItem}
                onClick={() => handleElementSelect(elementType)}
                role="menuitem"
              >
                <span className={styles.itemIcon}>{elementType.icon}</span>
                <div className={styles.itemContent}>
                  <span className={styles.itemName}>{elementType.name}</span>
                  <span className={styles.itemDescription}>{elementType.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
