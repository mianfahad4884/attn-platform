import React from 'react';

export interface Column<T> {
  name: string;
  key: string;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
}

export function Table<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-divider">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-2 px-3 text-xs uppercase tracking-wider font-medium text-text-secondary text-${col.align || 'left'}`}
              >
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-divider ${i % 2 === 1 ? 'bg-bg' : ''} ${onRowClick ? 'cursor-pointer hover:bg-divider/30' : ''}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-2 px-3 text-text-primary ${col.mono ? 'font-tabular' : ''} text-${col.align || 'left'}`}
                >
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-text-secondary text-sm"
              >
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
