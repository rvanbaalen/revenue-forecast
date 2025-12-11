import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-sky-500/20 text-sky-400",
        secondary:
          "border-transparent bg-slate-700 text-slate-300",
        destructive:
          "border-transparent bg-red-500/20 text-red-400",
        success:
          "border-transparent bg-emerald-500/20 text-emerald-400",
        warning:
          "border-transparent bg-amber-500/20 text-amber-400",
        outline:
          "border-slate-600 text-slate-300",
        current:
          "border-sky-500/50 bg-sky-500/20 text-sky-300 animate-pulse",
        future:
          "border-violet-500/50 bg-violet-500/10 text-violet-300",
        past:
          "border-slate-600/50 bg-slate-700/30 text-slate-500",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
