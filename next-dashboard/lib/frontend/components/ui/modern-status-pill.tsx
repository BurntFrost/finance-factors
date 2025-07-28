"use client"

import * as React from "react"
import { Badge } from "./badge"
import { cn, formatDisplayDate, isRecentDate } from "@/lib/utils"

export type DataStatus = 'recent' | 'historical' | 'stale' | 'loading'

interface ModernStatusPillProps {
  status: DataStatus
  lastUpdated?: Date | string
  size?: "sm" | "default" | "lg"
  showTimestamp?: boolean
  className?: string
}

const statusConfig = {
  recent: {
    label: "Live",
    icon: "🟢",
    variant: "recent" as const,
  },
  historical: {
    label: "Historical",
    icon: "🟡",
    variant: "historical" as const,
  },
  stale: {
    label: "Stale",
    icon: "🔴",
    variant: "stale" as const,
  },
  loading: {
    label: "Loading",
    icon: "⏳",
    variant: "loading" as const,
  },
}

export function ModernStatusPill({
  status,
  lastUpdated,
  size = "default",
  showTimestamp = true,
  className,
}: ModernStatusPillProps) {
  const config = statusConfig[status]
  
  const getDisplayText = () => {
    if (status === 'loading') return config.label
    
    if (lastUpdated && showTimestamp) {
      const timestamp = formatDisplayDate(lastUpdated)
      return `${config.label} • ${timestamp}`
    }
    
    return config.label
  }

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    default: "text-sm px-2.5 py-1",
    lg: "text-sm px-3 py-1.5",
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium",
        sizeClasses[size],
        status === 'loading' && "animate-pulse",
        className
      )}
    >
      <span className="text-xs" role="img" aria-label={`${status} status`}>
        {config.icon}
      </span>
      <span>{getDisplayText()}</span>
    </Badge>
  )
}

// Helper function to determine status from data freshness
export function getDataStatus(lastUpdated?: Date | string, isRealData?: boolean): DataStatus {
  if (!lastUpdated) return 'loading'
  if (!isRealData) return 'historical'
  
  const updateDate = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated
  
  if (isRecentDate(updateDate)) return 'recent'
  
  const now = new Date()
  const diffInHours = (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours <= 168) return 'historical' // Within a week
  return 'stale'
}
