import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wand2 } from 'lucide-react';
import { MappingRulesTable } from '@/components/MappingRulesTable';

export function BankMappingRulesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Mapping Rules
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MappingRulesTable />
      </CardContent>
    </Card>
  );
}
