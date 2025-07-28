'use client';

import React, { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DashboardElement } from '../types/dashboard';
import { useDashboard } from '../context/DashboardContext';
import { useIsEditMode } from '../context/ViewModeContext';
import DynamicElementRenderer from './DynamicElementRenderer';
import styles from './DragDropDashboard.module.css';

interface DragDropDashboardProps {
  elements: DashboardElement[];
  onElementsReorder: (newElements: DashboardElement[]) => void;
  onElementRemove: (elementId: string) => void;
  gridColumns?: number;
  gap?: number;
}

interface SortableItemProps {
  id: string;
  element: DashboardElement;
  onRemove: (id: string) => void;
  isDragging?: boolean;
}

function SortableItem({ id, element, onRemove, isDragging = false }: SortableItemProps) {
  const isEditMode = useIsEditMode();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.sortableItem} ${
        isSortableDragging ? styles.dragging : ''
      } ${isEditMode ? styles.editMode : ''}`}
      {...attributes}
    >
      {/* Drag handle - only visible in edit mode */}
      {isEditMode && (
        <div className={styles.dragHandle} {...listeners}>
          <div className={styles.dragIcon}>⋮⋮</div>
        </div>
      )}

      {/* Element content */}
      <div className={styles.elementContent}>
        <DynamicElementRenderer
          element={element}
          onRemove={onRemove}
        />
      </div>

      {/* Overlay for dragging state */}
      {isSortableDragging && <div className={styles.dragOverlay} />}
    </div>
  );
}

function DragOverlayContent({ element }: { element: DashboardElement | null }) {
  if (!element) return null;

  return (
    <div className={styles.dragOverlayContent}>
      <div className={styles.dragPreview}>
        <div className={styles.dragPreviewHeader}>
          <h4>{element.title}</h4>
          <span className={styles.dragPreviewType}>
            {element.type.replace('-', ' ').toUpperCase()}
          </span>
        </div>
        <div className={styles.dragPreviewBody}>
          <div className={styles.dragPreviewPlaceholder}>
            📊 Chart Preview
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DragDropDashboard({
  elements,
  onElementsReorder,
  onElementRemove,
  gridColumns = 2,
  gap = 24,
}: DragDropDashboardProps) {
  const isEditMode = useIsEditMode();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [draggedElement, setDraggedElement] = useState<DashboardElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id);
    
    const element = elements.find(el => el.id === active.id);
    setDraggedElement(element || null);
  }, [elements]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = elements.findIndex(el => el.id === active.id);
      const newIndex = elements.findIndex(el => el.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newElements = arrayMove(elements, oldIndex, newIndex);
        onElementsReorder(newElements);
      }
    }

    setActiveId(null);
    setDraggedElement(null);
  }, [elements, onElementsReorder]);

  const handleElementRemove = useCallback((elementId: string) => {
    onElementRemove(elementId);
  }, [onElementRemove]);

  // Create grid layout styles
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
    gap: `${gap}px`,
    padding: `${gap}px`,
  };

  // Responsive grid columns
  const getResponsiveColumns = () => {
    if (typeof window === 'undefined') return gridColumns;
    
    const width = window.innerWidth;
    if (width < 768) return 1;
    if (width < 1200) return 2;
    if (width < 1600) return Math.min(3, gridColumns);
    return Math.min(4, gridColumns);
  };

  const responsiveColumns = getResponsiveColumns();

  return (
    <div className={`${styles.dashboard} ${isEditMode ? styles.editMode : ''}`}>
      {isEditMode && (
        <div className={styles.editModeHeader}>
          <div className={styles.editModeIndicator}>
            <span className={styles.editIcon}>✏️</span>
            <span>Edit Mode - Drag to reorder charts</span>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={elements.map(el => el.id)} strategy={rectSortingStrategy}>
          <div
            className={styles.grid}
            style={{
              ...gridStyle,
              gridTemplateColumns: `repeat(${responsiveColumns}, 1fr)`,
            }}
          >
            {elements.map((element) => (
              <SortableItem
                key={element.id}
                id={element.id}
                element={element}
                onRemove={handleElementRemove}
                isDragging={activeId === element.id}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          <DragOverlayContent element={draggedElement} />
        </DragOverlay>
      </DndContext>

      {/* Empty state */}
      {elements.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>📊</div>
          <h3>No charts added yet</h3>
          <p>Add your first chart to get started with your dashboard</p>
        </div>
      )}

      {/* Grid guidelines in edit mode */}
      {isEditMode && elements.length > 0 && (
        <div className={styles.gridGuidelines}>
          <div className={styles.gridInfo}>
            <span>Grid: {responsiveColumns} columns</span>
            <span>Gap: {gap}px</span>
            <span>Items: {elements.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing dashboard layout state
 */
export function useDashboardLayout() {
  const { state, dispatch } = useDashboard();
  const [layoutHistory, setLayoutHistory] = useState<DashboardElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveLayoutToHistory = useCallback((elements: DashboardElement[]) => {
    const newHistory = layoutHistory.slice(0, historyIndex + 1);
    newHistory.push([...elements]);
    setLayoutHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [layoutHistory, historyIndex]);

  const reorderElements = useCallback((newElements: DashboardElement[]) => {
    saveLayoutToHistory(state.elements);
    dispatch({
      type: 'REORDER_ELEMENTS',
      payload: newElements,
    });
  }, [state.elements, dispatch, saveLayoutToHistory]);

  const undoLayout = useCallback(() => {
    if (historyIndex > 0) {
      const previousLayout = layoutHistory[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      dispatch({
        type: 'REORDER_ELEMENTS',
        payload: previousLayout,
      });
    }
  }, [layoutHistory, historyIndex, dispatch]);

  const redoLayout = useCallback(() => {
    if (historyIndex < layoutHistory.length - 1) {
      const nextLayout = layoutHistory[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      dispatch({
        type: 'REORDER_ELEMENTS',
        payload: nextLayout,
      });
    }
  }, [layoutHistory, historyIndex, dispatch]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < layoutHistory.length - 1;

  return {
    elements: state.elements,
    reorderElements,
    undoLayout,
    redoLayout,
    canUndo,
    canRedo,
  };
}
