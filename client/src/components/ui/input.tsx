import * as React from "react"

import { cn } from "@/lib/utils"
import { borderStyles } from "@/lib/border-styles"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full bg-background px-3 py-2 text-sm",
          borderStyles.input.border,
          borderStyles.input.radius,
          borderStyles.input.focus,
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Add error state via data-[state=error]:border-error-500
          "data-[state=error]:" + borderStyles.input.error,
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
