import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from './utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4 shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-rw-blue/40 focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-rw-blue text-white hover:bg-rw-blue-dark shadow-xs',
        destructive: 'bg-red-700 text-white hover:bg-red-800 shadow-xs',
        outline: 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900',
        success: 'bg-rw-green-dark text-white hover:bg-rw-green shadow-xs',
        warning: 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3 text-sm',
        lg: 'h-11 px-5',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
