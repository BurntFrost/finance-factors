"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./card"
import { ModernStatusPill, DataStatus } from "./modern-status-pill"
import { Button } from "./button"
import { X, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChartCardProps {
  title: string
  subtitle?: string
  status?: DataStatus
  lastUpdated?: Date | string
  isEditable?: boolean
  onRemove?: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
  className?: string
  children: React.ReactNode
  headerActions?: React.ReactNode
  footerContent?: React.ReactNode
  showFooter?: boolean
}

export function ChartCard({
  title,
  subtitle,
  status,
  lastUpdated,
  isEditable = false,
  onRemove,
  onRefresh,
  isRefreshing = false,
  className,
  children,
  headerActions,
  footerContent,
  showFooter = true,
}: ChartCardProps) {
  return (
    <Card 
      className={cn(
        "relative transition-all duration-200 hover:shadow-md h-full flex flex-col",
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <CardTitle className="text-lg font-semibold tracking-tight text-foreground leading-tight">
            {title}
          </CardTitle>
          {subtitle && (
            <p className="text-sm text-muted-foreground leading-snug mt-0.5" title={subtitle}>
              {subtitle}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {status && (
              <ModernStatusPill
                status={status}
                lastUpdated={lastUpdated}
                size="sm"
                showTimestamp={false}
              />
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 shrink-0">
          {headerActions}
          {onRefresh && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh chart data"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          )}
          {isEditable && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              aria-label="Remove chart"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-6 pt-0">
        <div className="h-full min-h-[300px] relative">
          {children}
        </div>
      </CardContent>

      {showFooter && footerContent && (
        <CardFooter className="pt-0 pb-4 px-6">
          {footerContent}
        </CardFooter>
      )}
    </Card>
  )
}
