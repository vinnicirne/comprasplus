import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ open, onOpenChange, title, icon, children }) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] -translate-x-1/2 bottom-0 sm:bottom-auto sm:top-[50%] sm:-translate-y-1/2 z-[200] w-full max-w-[600px] bg-surface rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 pb-safe sm:pb-5 flex flex-col gap-4 outline-none border border-outline-variant/30 max-h-[90vh] overflow-y-auto">
          <div className="w-12 h-1.5 bg-outline/20 rounded-full mx-auto -mt-2 mb-1 sm:hidden"></div>
          <div className="flex items-center justify-between mb-1 shrink-0">
            <div className="flex items-center gap-2">
              {icon}
              <Dialog.Title className="font-headline-sm text-on-surface font-bold text-lg">
                {title}
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all outline-none">
                <X size={20} />
                <span className="sr-only">Close</span>
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
