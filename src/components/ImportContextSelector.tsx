import { useState, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FolderPlus, Plus, X, Check, Loader2 } from 'lucide-react';

const CREATE_NEW_VALUE = '__create_new__';

interface ImportContextSelectorProps {
  selectedContextId: string | null;
  onContextChange: (contextId: string) => void;
}

export function ImportContextSelector({
  selectedContextId,
  onContextChange,
}: ImportContextSelectorProps) {
  const { contexts, createContext } = useApp();
  const [isCreating, setIsCreating] = useState(false);
  const [newContextName, setNewContextName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectChange = useCallback((value: string) => {
    if (value === CREATE_NEW_VALUE) {
      setIsCreating(true);
      setNewContextName('');
      setError(null);
    } else {
      onContextChange(value);
    }
  }, [onContextChange]);

  const handleCreateContext = useCallback(async () => {
    const trimmedName = newContextName.trim();
    if (!trimmedName) {
      setError('Context name is required');
      return;
    }

    // Check for duplicate names
    if (contexts.some((ctx) => ctx.name.toLowerCase() === trimmedName.toLowerCase())) {
      setError('A context with this name already exists');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newContext = await createContext(trimmedName);
      onContextChange(newContext.id);
      setIsCreating(false);
      setNewContextName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create context');
    } finally {
      setIsSubmitting(false);
    }
  }, [newContextName, contexts, createContext, onContextChange]);

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    setNewContextName('');
    setError(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateContext();
    } else if (e.key === 'Escape') {
      handleCancelCreate();
    }
  }, [handleCreateContext, handleCancelCreate]);

  const selectedContext = contexts.find((ctx) => ctx.id === selectedContextId);

  // No contexts exist - show create prompt
  if (contexts.length === 0 && !isCreating) {
    return (
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FolderPlus className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">No context available</p>
            <p className="text-sm text-muted-foreground">
              Create a context to organize your imported transactions
            </p>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="size-4" />
            Create Context
          </Button>
        </div>
      </div>
    );
  }

  // Creating a new context
  if (isCreating) {
    return (
      <div className="p-4 bg-muted rounded-lg">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <FolderPlus className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Create new context</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Context name (e.g., Personal, Business)"
              value={newContextName}
              onChange={(e) => {
                setNewContextName(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              autoFocus
            />
            <Button
              size="icon"
              onClick={handleCreateContext}
              disabled={isSubmitting || !newContextName.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Check className="size-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={handleCancelCreate}
              disabled={isSubmitting}
            >
              <X className="size-4" />
            </Button>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // Normal selection view
  return (
    <div className="p-4 bg-muted rounded-lg">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Import to context</span>
        </div>
        <Select value={selectedContextId || ''} onValueChange={handleSelectChange}>
          <SelectTrigger className="w-full bg-background">
            <SelectValue placeholder="Select a context">
              {selectedContext?.name}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {contexts.map((ctx) => (
              <SelectItem key={ctx.id} value={ctx.id}>
                {ctx.name}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value={CREATE_NEW_VALUE}>
              <Plus className="size-4" />
              Create new context
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
