// src/components/ui/Table.tsx
import React from "react";
import { cn } from "./cn";

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  children: React.ReactNode;
};

export function Table({ children, className, ...rest }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl">
      <table className={cn("w-full text-sm", className)} {...rest}>
        {children}
      </table>
    </div>
  );
}

type THeadProps = React.HTMLAttributes<HTMLTableSectionElement> & {
  children: React.ReactNode;
};

export function THead({ children, className, ...rest }: THeadProps) {
  return (
    <thead className={cn("border-b border-white/[0.06]", className)} {...rest}>
      {children}
    </thead>
  );
}

type TBodyProps = React.HTMLAttributes<HTMLTableSectionElement> & {
  children: React.ReactNode;
};

export function TBody({ children, className, ...rest }: TBodyProps) {
  return (
    <tbody className={cn("divide-y divide-white/[0.04]", className)} {...rest}>
      {children}
    </tbody>
  );
}

type TRProps = React.HTMLAttributes<HTMLTableRowElement> & {
  children: React.ReactNode;
};

export function TR({ children, className, ...rest }: TRProps) {
  return (
    <tr
      className={cn(
        "transition-colors duration-150",
        "hover:bg-white/[0.02]",
        className
      )}
      {...rest}
    >
      {children}
    </tr>
  );
}

type THProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  children?: React.ReactNode;
};

export function TH({ children, className, ...rest }: THProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-white/50",
        className
      )}
      {...rest}
    >
      {children}
    </th>
  );
}

type TDProps = React.TdHTMLAttributes<HTMLTableCellElement> & {
  children?: React.ReactNode;
};

export function TD({ children, className, ...rest }: TDProps) {
  return (
    <td
      className={cn("px-4 py-3 text-white/80", className)}
      {...rest}
    >
      {children}
    </td>
  );
}
