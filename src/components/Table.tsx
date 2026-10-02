import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '', containerClassName = '', ...props }) => (
  <div className={`w-full overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs ${containerClassName}`}>
    <div className="w-full overflow-x-auto">
      <table className={`w-full text-right text-xs border-collapse ${className}`} {...props}>
        {children}
      </table>
    </div>
  </div>
);

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <thead
    className={`bg-gray-50 dark:bg-gray-900/90 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 font-bold select-none ${className}`}
    {...props}
  >
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <tbody className={`divide-y divide-gray-100 dark:divide-gray-800/80 ${className}`} {...props}>
    {children}
  </tbody>
);

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  isSelected?: boolean;
}

export const TableRow: React.FC<TableRowProps> = ({
  children,
  className = '',
  isSelected = false,
  ...props
}) => (
  <tr
    className={`transition-colors ${
      isSelected
        ? 'bg-orange-50 dark:bg-orange-950/20'
        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
    } ${className}`}
    {...props}
  >
    {children}
  </tr>
);

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <th
    className={`py-3 px-4 font-bold text-gray-500 dark:text-gray-400 ${className}`}
    {...props}
  >
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <td className={`py-3 px-4 text-gray-900 dark:text-gray-100 ${className}`} {...props}>
    {children}
  </td>
);

export const TableEmpty: React.FC<{ colSpan: number; message?: string }> = ({
  colSpan,
  message = 'موردی جهت نمایش یافت نشد.',
}) => (
  <tr>
    <td colSpan={colSpan} className="py-12 text-center text-gray-400 dark:text-gray-500">
      {message}
    </td>
  </tr>
);
