import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from "../../utils/cn";
import type { LucideIcon } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: LucideIcon;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', icon: Icon, isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] shadow-md',
      secondary: 'bg-primary-fixed/30 text-primary border border-transparent hover:border-primary active:scale-[0.98]',
      ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface active:scale-95',
      danger: 'bg-error text-on-error hover:bg-error/90 active:scale-[0.98] shadow-md',
      outline: 'bg-transparent border border-outline-variant text-on-surface hover:bg-surface-container active:scale-[0.98]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs font-semibold rounded-lg',
      md: 'h-10 px-4 text-sm font-bold rounded-xl',
      lg: 'h-12 px-5 text-sm font-bold rounded-2xl',
      icon: 'h-10 w-10 flex items-center justify-center rounded-xl',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
        {!isLoading && Icon && <Icon size={18} />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
