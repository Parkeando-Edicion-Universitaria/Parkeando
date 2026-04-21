import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground shadow hover:opacity-90 active:scale-95',
                destructive:
                    'bg-destructive text-destructive-foreground shadow hover:opacity-90 active:scale-95',
                outline:
                    'border border-border bg-transparent hover:bg-secondary text-foreground active:scale-95',
                secondary:
                    'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-95',
                ghost: 'hover:bg-secondary text-foreground active:scale-95',
                link: 'text-primary underline-offset-4 hover:underline',
                panama:
                    'bg-gradient-to-r from-panama-red to-panama-blue text-white shadow-lg hover:opacity-90 hover:shadow-xl hover:scale-[1.02] active:scale-95 font-bold',
                'panama-yellow':
                    'bg-panama-yellow text-[#1a1a2e] shadow-lg hover:opacity-90 hover:shadow-xl hover:scale-[1.02] active:scale-95 font-bold',
                'panama-green':
                    'bg-panama-green text-white shadow-lg hover:opacity-90 hover:shadow-xl hover:scale-[1.02] active:scale-95 font-bold',
                'panama-red':
                    'bg-panama-red text-white shadow-lg hover:opacity-90 hover:shadow-xl hover:scale-[1.02] active:scale-95 font-bold',
                glass:
                    'bg-white/5 border border-white/10 text-foreground backdrop-blur-sm hover:bg-white/10 active:scale-95',
            },
            size: {
                default: 'h-10 px-5 py-2',
                sm: 'h-8 px-3 text-xs',
                lg: 'h-12 px-8 text-base',
                xl: 'h-14 px-10 text-lg',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> { }

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
