/**
 * useEntityDialog - Generic hook for entity CRUD dialogs
 *
 * Consolidates the repeated dialog state pattern used across SettingsPage.
 * Reduces ~150 lines of duplicated state management.
 */

import { useState, useCallback } from 'react';

interface UseEntityDialogOptions<T> {
  onSave: (item: T, isEditing: boolean) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

interface UseEntityDialogReturn<T> {
  // Dialog state
  isOpen: boolean;
  editing: T | null;
  isSubmitting: boolean;

  // Actions
  openCreate: () => void;
  openEdit: (item: T) => void;
  close: () => void;
  save: (item: T) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useEntityDialog<T extends { id: string }>(
  options: UseEntityDialogOptions<T>
): UseEntityDialogReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openCreate = useCallback(() => {
    setEditing(null);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setEditing(item);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditing(null);
  }, []);

  const save = useCallback(
    async (item: T) => {
      setIsSubmitting(true);
      try {
        await options.onSave(item, editing !== null);
        close();
      } finally {
        setIsSubmitting(false);
      }
    },
    [options, editing, close]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!options.onDelete) return;
      setIsSubmitting(true);
      try {
        await options.onDelete(id);
      } finally {
        setIsSubmitting(false);
      }
    },
    [options]
  );

  return {
    isOpen,
    editing,
    isSubmitting,
    openCreate,
    openEdit,
    close,
    save,
    remove,
  };
}
