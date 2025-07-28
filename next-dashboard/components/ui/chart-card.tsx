"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./card"
import { ModernStatusPill, DataStatus } from "./modern-status-pill"
import { Button } from "./button"
import { X, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChartCardProps {
  title: string
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center space-x-3">
          <CardTitle className="text-lg font-semibold text-foreground">
            {title}
          </CardTitle>
          {status && (
            <ModernStatusPill
              status={status}
              lastUpdated={lastUpdated}
              size="sm"
              showTimestamp={false}
            />
          )}
        </div>
        
        <div className="flex items-center space-x-2">
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
