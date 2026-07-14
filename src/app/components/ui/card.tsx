import * as React from 'react';
import { cn } from './utils';

function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm', className)} {...props} />;
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-6 pt-6', className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('text-lg font-semibold', className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-6 pb-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-6 pb-6', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardContent, CardFooter };
