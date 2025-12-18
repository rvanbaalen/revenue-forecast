/**
 * Transaction UI Constants
 *
 * Shared styling constants for transaction components.
 */

import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  HelpCircle,
  Scale,
} from 'lucide-react';
import type { TransactionCategory } from '../../types';

export const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  income: 'bg-green-500/10 text-green-700 dark:text-green-400',
  expense: 'bg-red-500/10 text-red-700 dark:text-red-400',
  transfer: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  uncategorized: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  adjustment: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
};

export const CATEGORY_ICONS: Record<TransactionCategory, React.ReactNode> = {
  income: <TrendingUp className="size-3" />,
  expense: <TrendingDown className="size-3" />,
  transfer: <ArrowLeftRight className="size-3" />,
  uncategorized: <HelpCircle className="size-3" />,
  adjustment: <Scale className="size-3" />,
};
