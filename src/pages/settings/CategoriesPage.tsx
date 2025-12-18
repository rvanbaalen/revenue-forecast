import { useState } from 'react';
import { useFinancialData } from '../../stores';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Subcategory } from '../../types';

export function CategoriesPage() {
  const {
    contextSubcategories: subcategories,
    addSubcategory,
    deleteSubcategory,
  } = useFinancialData();

  const [subcategoryDialog, setSubcategoryDialog] = useState<'add' | 'edit' | null>(null);
  const [subcategoryName, setSubcategoryName] = useState('');
  const [subcategoryCategory, setSubcategoryCategory] = useState<'income' | 'expense'>('expense');

  const openAddSubcategory = () => {
    setSubcategoryName('');
    setSubcategoryCategory('expense');
    setSubcategoryDialog('add');
  };

  const openEditSubcategory = (sub: Subcategory) => {
    setSubcategoryName(sub.name);
    setSubcategoryCategory(sub.type);
    setSubcategoryDialog('edit');
  };

  const saveSubcategory = async () => {
    if (!subcategoryName.trim()) return;

    if (subcategoryDialog === 'add') {
      await addSubcategory(subcategoryName.trim(), subcategoryCategory);
    }

    setSubcategoryDialog(null);
    setSubcategoryName('');
  };

  const handleDeleteSubcategory = async (sub: Subcategory) => {
    await deleteSubcategory(sub.id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Subcategories for income and expense transactions
        </p>
        <Button onClick={openAddSubcategory}>
          <Plus className="size-4" />
          Add Category
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subcategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No subcategories yet
                </TableCell>
              </TableRow>
            ) : (
              subcategories.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell className="font-medium">{sub.name}</TableCell>
                  <TableCell>
                    <Badge variant={sub.type === 'income' ? 'default' : 'secondary'}>
                      {sub.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditSubcategory(sub)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteSubcategory(sub)}
                          className="text-destructive"
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Subcategory Dialog */}
      <Dialog open={!!subcategoryDialog} onOpenChange={() => setSubcategoryDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {subcategoryDialog === 'add' ? 'Add Category' : 'Edit Category'}
            </DialogTitle>
            <DialogDescription>
              Categories help organize your income and expenses
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="subcategoryName">Name</Label>
              <Input
                id="subcategoryName"
                value={subcategoryName}
                onChange={(e) => setSubcategoryName(e.target.value)}
                placeholder="e.g., Salary, Utilities, Rent"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <Select
                value={subcategoryCategory}
                onValueChange={(v) => setSubcategoryCategory(v as 'income' | 'expense')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubcategoryDialog(null)}>
              Cancel
            </Button>
            <Button onClick={saveSubcategory} disabled={!subcategoryName.trim()}>
              {subcategoryDialog === 'add' ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
