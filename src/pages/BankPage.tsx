import { useState, useEffect } from 'react';
import { getRouteApi, useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  Upload,
  Building2,
  ArrowUpDown,
  Wand2,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import { useBank } from '@/context/BankContext';
import { useRevenue } from '@/context/RevenueContext';
import { BankAccountCard } from '@/components/BankAccountCard';
import { BankTransactionTable } from '@/components/BankTransactionTable';
import { TransactionMappingModal } from '@/components/TransactionMappingModal';
import { MappingRulesTable } from '@/components/MappingRulesTable';
import { OFXImportModal } from '@/components/OFXImportModal';
import { formatCurrency } from '@/utils/format';
import type { BankTransaction } from '@/types';

const bankRouteApi = getRouteApi('/bank');

export function BankPage() {
  const { accounts, transactions, getUnmappedTransactions } = useBank();
  const { config } = useRevenue();
  const { account: accountParam } = bankRouteApi.useSearch();
  const navigate = useNavigate();

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [activeTab, setActiveTab] = useState(accountParam ? 'transactions' : 'accounts');
  const [accountFilter, setAccountFilter] = useState<string>(accountParam || 'all');

  // Sync account filter with URL param
  useEffect(() => {
    if (accountParam) {
      setAccountFilter(accountParam);
      setActiveTab('transactions');
    }
  }, [accountParam]);

  const unmappedTransactions = getUnmappedTransactions();

  // Calculate overall stats for the current year
  const yearTransactions = transactions.filter(tx => tx.year === config.year);
  const yearCredits = yearTransactions.reduce((sum, tx) => sum + (tx.amount > 0 ? tx.amount : 0), 0);
  const yearDebits = yearTransactions.reduce((sum, tx) => sum + (tx.amount < 0 ? Math.abs(tx.amount) : 0), 0);

  return (
    <div className="space-y-6 fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bank Import</h1>
          <p className="text-muted-foreground">
            Import and manage bank transactions from OFX files.
          </p>
        </div>
        <Button onClick={() => setIsImportModalOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Import OFX
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bank Accounts</p>
                <p className="text-2xl font-bold text-foreground">{accounts.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{config.year} Credits</p>
                <p className="text-2xl font-bold variance-positive">
                  +{formatCurrency(yearCredits, false)}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{config.year} Debits</p>
                <p className="text-2xl font-bold variance-negative">
                  -{formatCurrency(yearDebits, false)}
                </p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-full">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={unmappedTransactions.length > 0 ? 'border-warning' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unmapped Revenue</p>
                <p className="text-2xl font-bold text-foreground">{unmappedTransactions.length}</p>
              </div>
              <div className={cn(
                "p-3 rounded-full",
                unmappedTransactions.length > 0 ? "bg-warning/10" : "bg-muted"
              )}>
                <AlertCircle className={cn(
                  "h-5 w-5",
                  unmappedTransactions.length > 0 ? "text-warning" : "text-muted-foreground"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Accounts ({accounts.length})
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            Transactions ({yearTransactions.length})
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Wand2 className="h-4 w-4" />
            Mapping Rules
          </TabsTrigger>
        </TabsList>

        {/* Accounts tab */}
        <TabsContent value="accounts" className="space-y-4">
          {accounts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No Bank Accounts
                </h3>
                <p className="text-muted-foreground mb-4">
                  Import an OFX file from your bank to get started.
                </p>
                <Button onClick={() => setIsImportModalOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import OFX File
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {accounts.map(account => (
                <BankAccountCard
                  key={account.id}
                  account={account}
                  onSelect={() => {
                    navigate({
                      to: '/bank',
                      search: { account: account.id.toString() },
                    });
                  }}
                />
              ))}
              <Card
                className="border-dashed cursor-pointer hover:border-primary transition-colors"
                onClick={() => setIsImportModalOpen(true)}
              >
                <CardContent className="py-12 text-center">
                  <Plus className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Import another account</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Transactions tab */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpDown className="h-5 w-5" />
                Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BankTransactionTable
                year={config.year}
                initialAccountFilter={accountFilter}
                onAccountFilterChange={(newFilter) => {
                  setAccountFilter(newFilter);
                  navigate({
                    to: '/bank',
                    search: newFilter === 'all' ? {} : { account: newFilter },
                  });
                }}
                onMapTransaction={(tx) => setSelectedTransaction(tx)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rules tab */}
        <TabsContent value="rules">
          <Card>
            <CardContent className="pt-6">
              <MappingRulesTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <OFXImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <TransactionMappingModal
        isOpen={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
