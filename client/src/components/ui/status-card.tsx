import * as React from "react"
import { cn } from "@/lib/utils"
import { borderStyles } from "@/lib/border-styles"

type Status = "active" | "pending" | "inactive"

interface StatusCardProps extends React.HTMLAttributes<HTMLDivElement> {
  status: Status;
  children: React.ReactNode;
}

/**
 * StatusCard component that applies appropriate border styling based on status
 */
export function StatusCard({ status, className, children, ...props }: StatusCardProps) {
  // Map status to proper border style
  const getBorderStyle = () => {
    switch (status) {
      case "active":
        return borderStyles.status.active
      case "pending":
        return borderStyles.status.pending
      case "inactive":
        return borderStyles.status.inactive
      default:
        return ""
    }
  }
  
  return (
    <div
      className={cn(
        "bg-card text-card-foreground",
        borderStyles.card.border,
        borderStyles.card.radius,
        borderStyles.card.shadow,
        getBorderStyle(),
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Status Badge component that provides a visual indicator of status
 */
export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const getStatusClasses = () => {
    switch (status) {
      case "active":
        return "bg-success-500 text-white"
      case "pending":
        return "bg-primary-blue-500 text-white"
      case "inactive":
        return "bg-error-500 text-white"
      default:
        return "bg-gray-300 text-white"
    }
  }
  
  return (
    <span 
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        getStatusClasses(),
        className
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}