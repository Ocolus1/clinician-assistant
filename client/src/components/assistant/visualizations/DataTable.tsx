/**
 * Data Table Component
 * 
 * This component renders SQL query results as a clean, interactive table.
 */

import React, { useState } from 'react';
import { QueryResult } from '@shared/assistantTypes';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DataTableProps {
  data: QueryResult;
}

const DataTable: React.FC<DataTableProps> = ({ data }) => {
  const [page, setPage] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const rowsPerPage = 10;
  
  // Handle column sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  // Process the data with sorting and pagination
  const processedData = React.useMemo(() => {
    let processed = [...data.rows];
    
    // Apply sorting if a column is selected
    if (sortColumn) {
      processed.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        // Handle different data types for sorting
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        const aString = String(aValue || '').toLowerCase();
        const bString = String(bValue || '').toLowerCase();
        
        return sortDirection === 'asc' 
          ? aString.localeCompare(bString)
          : bString.localeCompare(aString);
      });
    }
    
    // Apply pagination
    const start = page * rowsPerPage;
    return processed.slice(start, start + rowsPerPage);
  }, [data.rows, sortColumn, sortDirection, page]);
  
  // Calculate total pages
  const totalPages = Math.ceil(data.rows.length / rowsPerPage);
  
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          {data.metadata?.queryText && (
            <TableCaption className="text-xs text-left py-2 px-4 bg-muted/40">
              {data.metadata.rowCount !== undefined && (
                <span className="mr-2">
                  {data.metadata.rowCount} {data.metadata.rowCount === 1 ? 'row' : 'rows'}
                </span>
              )}
              {data.metadata.executionTime !== undefined && (
                <span>
                  ({data.metadata.executionTime.toFixed(2)}ms)
                </span>
              )}
            </TableCaption>
          )}
          
          <TableHeader>
            <TableRow>
              {data.columns.map((column) => (
                <TableHead key={column}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 p-0 hover:bg-transparent hover:underline"
                    onClick={() => handleSort(column)}
                  >
                    {column}
                    {sortColumn === column && (
                      <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          
          <TableBody>
            {processedData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {data.columns.map((column) => (
                  <TableCell key={`${rowIndex}-${column}`}>
                    {row[column] !== null ? String(row[column]) : <span className="text-muted">NULL</span>}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/20">
          <div className="text-xs text-muted-foreground">
            Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, data.rows.length)} of {data.rows.length} results
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-xs px-2">
              Page {page + 1} of {totalPages}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page === totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;