import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const statCardVariants = cva(
  "flex items-center gap-4 p-4 bg-card border border-border rounded-lg",
  {
    variants: {
      variant: {
        default: "",
        success: "border-success/20",
        warning: "border-warning/50",
        destructive: "border-destructive/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const statCardIconVariants = cva(
  "flex items-center justify-center p-2 rounded-lg",
  {
    variants: {
      variant: {
        default: "bg-secondary text-foreground",
        primary: "bg-primary/10 text-primary",
        success: "bg-success-muted text-success",
        warning: "bg-warning-muted text-warning",
        destructive: "bg-destructive/10 text-destructive",
        muted: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface StatCardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof statCardVariants> {}

function StatCard({ className, variant, ...props }: StatCardProps) {
  return (
    <div
      data-slot="stat-card"
      className={cn(statCardVariants({ variant }), className)}
      {...props}
    />
  )
}

interface StatCardIconProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof statCardIconVariants> {}

function StatCardIcon({ className, variant, ...props }: StatCardIconProps) {
  return (
    <div
      data-slot="stat-card-icon"
      className={cn(statCardIconVariants({ variant }), className)}
      {...props}
    />
  )
}

function StatCardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="stat-card-content"
      className={cn("flex-1 min-w-0", className)}
      {...props}
    />
  )
}

function StatCardLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="stat-card-label"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

const statCardValueVariants = cva(
  "text-xl font-semibold tabular-nums",
  {
    variants: {
      variant: {
        default: "text-foreground",
        positive: "variance-positive",
        negative: "variance-negative",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface StatCardValueProps
  extends React.ComponentProps<"p">,
    VariantProps<typeof statCardValueVariants> {}

function StatCardValue({ className, variant, ...props }: StatCardValueProps) {
  return (
    <p
      data-slot="stat-card-value"
      className={cn(statCardValueVariants({ variant }), className)}
      {...props}
    />
  )
}

export {
  StatCard,
  StatCardIcon,
  StatCardContent,
  StatCardLabel,
  StatCardValue,
}
