import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 text-sm flex gap-3 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:mt-0.5",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "border-destructive/40 text-destructive bg-destructive/5 [&>svg]:text-destructive",
        success:
          "border-success/40 text-success bg-success/5 [&>svg]:text-success",
        warning:
          "border-warning/50 text-warning-foreground bg-warning/10 [&>svg]:text-warning",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("font-medium leading-tight", className)} {...props} />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  );
}

export { Alert, AlertTitle, AlertDescription };
