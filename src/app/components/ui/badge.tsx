import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from './utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium transition-all',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-800 border-transparent',
        secondary: 'bg-slate-200 text-slate-900 border-transparent',
        outline: 'border border-slate-200 text-slate-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({ className, variant, asChild = false, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';
  return <Comp className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge };
