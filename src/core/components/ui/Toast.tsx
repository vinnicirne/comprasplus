import { useEffect, useState } from 'react';
import { X, Bell } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ToastProps {
  id: string;
  title: string;
  body: string;
  link?: string;
  onClose: (id: string) => void;
  onClick?: (link: string) => void;
}

export function Toast({ id, title, body, link, onClose, onClick }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(id), 300); // Wait for fade out animation
  };

  return (
    <div
      className={twMerge(
        clsx(
          "pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg bg-background shadow-lg ring-1 ring-black/5 transition-all duration-300",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        )
      )}
    >
      <div className="p-4 cursor-pointer" onClick={() => link && onClick?.(link)}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Bell className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
          <div className="ml-4 flex flex-shrink-0">
            <button
              type="button"
              className="inline-flex rounded-md bg-background text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
