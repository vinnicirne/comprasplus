import React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: '1' | '2' | '3' | '4';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, elevation = '1', children, ...props }, ref) => {
    const elevations = {
      '1': 'shadow-[0_1px_3px_rgba(15,23,42,0.03),0_1px_2px_rgba(15,23,42,0.02)]',
      '2': 'shadow-[0_8px_24px_-4px_rgba(5,150,105,0.08),0_4px_8px_-2px_rgba(15,23,42,0.04)]',
      '3': 'shadow-[0_12px_28px_-6px_rgba(5,150,105,0.28),0_6px_12px_-4px_rgba(15,23,42,0.08)]',
      '4': 'shadow-[0_20px_40px_-10px_rgba(15,23,42,0.16)]',
    };

    return (
      <div
        ref={ref}
        className={cn(
          "bg-surface-container-lowest rounded-2xl border border-outline-variant/30",
          elevations[elevation],
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
