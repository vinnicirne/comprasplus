import React, { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import type { LucideIcon } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  error?: string;
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon: Icon, error, label, id, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={id} className="font-label-sm text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {Icon && (
            <div className="absolute left-3 text-on-surface-variant">
              <Icon size={18} />
            </div>
          )}
          <input
            id={id}
            ref={ref}
            className={cn(
              "w-full h-12 bg-surface-container text-on-surface font-body-md text-sm border border-outline-variant/40 rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-outline",
              Icon ? "pl-10 pr-4" : "px-4",
              error && "border-error focus:border-error focus:ring-error",
              className
            )}
            {...props}
          />
        </div>
        {error && <span className="text-error text-xs font-semibold mt-1">{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
