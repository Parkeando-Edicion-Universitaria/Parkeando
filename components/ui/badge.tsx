import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
    {
        variants: {
            variant: {
                default: 'border-transparent bg-primary/20 text-primary',
                secondary: 'border-transparent bg-secondary text-secondary-foreground',
                destructive: 'border-transparent bg-destructive/20 text-red-400 border-red-500/30',
                outline: 'text-foreground border-border',
                success: 'border-transparent bg-green-500/20 text-green-400 border-green-500/30',
                warning: 'border-transparent bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                admin: 'border-transparent bg-gradient-to-r from-panama-red/30 to-panama-blue/30 text-foreground border-white/10',
            },
        },
        defaultVariants: { variant: 'default' },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
