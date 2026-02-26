import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Square, LayoutGrid, Grid2x2, Grid3x3, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnSelectorProps {
  columns: number;
  onColumnsChange: (columns: number) => void;
}

export function ColumnSelector({ columns, onColumnsChange }: ColumnSelectorProps) {
  const options = [
    { value: 1, icon: Square, label: 'Single Column' },
    { value: 2, icon: Grid2x2, label: 'Two Columns' },
    { value: 3, icon: Grid3x3, label: 'Three Columns' },
    { value: 4, icon: LayoutGrid, label: 'Four Columns' },
  ];

  const currentOption = options.find(opt => opt.value === columns) || options[2];
  const CurrentIcon = currentOption.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <CurrentIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{currentOption.label}</span>
          <span className="sm:hidden">{currentOption.value}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = columns === option.value;

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onColumnsChange(option.value)}
              className={cn(
                'cursor-pointer',
                isActive && 'bg-accent'
              )}
            >
              <Icon className="h-4 w-4 mr-2" />
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
