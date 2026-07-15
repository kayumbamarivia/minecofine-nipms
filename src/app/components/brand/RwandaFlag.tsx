import { cn } from '../ui/utils';

interface RwandaFlagProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-11 w-[4.125rem]',
  md: 'h-14 w-[5.25rem]',
  lg: 'h-16 w-24',
};

/**
 * Renders the real Rwanda national flag from /public/rwanda-flag.svg
 * (Wikimedia Commons). PNG fallback: /rwanda-flag.png
 */
export function RwandaFlag({ size = 'sm', className }: RwandaFlagProps) {
  return (
    <img
      src="/rwanda-flag.svg"
      alt="Flag of Rwanda"
      width={900}
      height={600}
      className={cn(
        'shrink-0 rounded-lg border border-white/20 object-cover shadow-lg',
        sizeClasses[size],
        className,
      )}
    />
  );
}
