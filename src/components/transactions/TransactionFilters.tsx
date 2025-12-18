/**
 * TransactionFilters - Unified filter component
 *
 * Responsive component that shows inline filters on desktop
 * and a filter drawer on mobile.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Search, Filter, SlidersHorizontal, X } from 'lucide-react';
import type { TransactionCategory, BankAccount } from '../../types';

interface TransactionFiltersProps {
  // Filter state
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: TransactionCategory | 'all';
  onCategoryChange: (value: TransactionCategory | 'all') => void;
  accountFilter: string;
  onAccountChange: (value: string) => void;

  // Pagination
  pageSize: number;
  onPageSizeChange: (value: number) => void;

  // Data
  accounts: BankAccount[];

  // Computed
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function TransactionFilters({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  accountFilter,
  onAccountChange,
  pageSize,
  onPageSizeChange,
  accounts,
  hasActiveFilters,
  onClearFilters,
}: TransactionFiltersProps) {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const handleClear = () => {
    onClearFilters();
    setFilterDrawerOpen(false);
  };

  return (
    <>
      {/* Desktop Filters */}
      <div className="hidden md:flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={categoryFilter}
          onValueChange={(v) => onCategoryChange(v as TransactionCategory | 'all')}
        >
          <SelectTrigger className="w-40">
            <Filter className="size-4 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="transfer">Transfer</SelectItem>
            <SelectItem value="uncategorized">Uncategorized</SelectItem>
          </SelectContent>
        </Select>

        {accounts.length > 1 && (
          <Select value={accountFilter} onValueChange={onAccountChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Mobile Filters */}
      <div className="flex md:hidden items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Sheet open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative shrink-0">
              <SlidersHorizontal className="size-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 size-2 bg-primary rounded-full" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label>Category</Label>
                <Select
                  value={categoryFilter}
                  onValueChange={(v) => onCategoryChange(v as TransactionCategory | 'all')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {accounts.length > 1 && (
                <div className="flex flex-col gap-2">
                  <Label>Account</Label>
                  <Select value={accountFilter} onValueChange={onAccountChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label>Results per page</Label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(v) => onPageSizeChange(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                {hasActiveFilters && (
                  <Button variant="outline" onClick={handleClear} className="flex-1">
                    <X className="size-4" />
                    Clear Filters
                  </Button>
                )}
                <Button onClick={() => setFilterDrawerOpen(false)} className="flex-1">
                  Apply
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
