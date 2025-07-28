"use client"

import * as React from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface ModernRefreshButtonProps {
  onRefresh: () => void
  isLoading?: boolean
  size?: "sm" | "default" | "lg"
  variant?: "default" | "outline" | "ghost"
  className?: string
  children?: React.ReactNode
}

export function ModernRefreshButton({
  onRefresh,
  isLoading = false,
  size = "default",
  variant = "outline",
  className,
  children,
}: ModernRefreshButtonProps) {
  return (
    <Button
      onClick={onRefresh}
      disabled={isLoading}
      size={size}
      variant={variant}
      className={cn("gap-2", className)}
    >
      <RefreshCw 
        className={cn(
          "h-4 w-4",
          isLoading && "animate-spin"
        )} 
      />
      {children || (isLoading ? "Refreshing..." : "Refresh")}
    </Button>
  )
}
