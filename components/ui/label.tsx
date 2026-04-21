import * as React from 'react';
import { cn } from '@/lib/utils';

const Label = React.forwardRef<
    HTMLLabelElement,
    React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, htmlFor, ...props }, ref) => (
    <label
        ref={ref}
        htmlFor={htmlFor}
        className={cn(
            'block text-sm font-semibold text-muted-foreground mb-1.5 tracking-wide',
            className
        )}
        {...props}
    />
));
Label.displayName = 'Label';

export { Label };
