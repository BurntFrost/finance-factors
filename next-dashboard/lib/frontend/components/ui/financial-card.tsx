"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { ModernStatusPill, DataStatus } from "./modern-status-pill"
import { Button } from "./button"
import { X } from "lucide-react"
import { cn, formatFinancialNumber, formatPercentage, getChangeColorClass } from "@/lib/utils"

interface FinancialChange {
  value: number
  period: string
  type: 'increase' | 'decrease' | 'neutral'
}

interface FinancialCardProps {
  title: string
  value: string | number
  change?: FinancialChange
  status: DataStatus
  lastUpdated?: Date | string
  icon?: string
  color?: string
  isEditable?: boolean
  onRemove?: () => void
  className?: string
  children?: React.ReactNode
}

export function FinancialCard({
  title,
  value,
  change,
  status,
  lastUpdated,
  icon,
  color,
  isEditable = false,
  onRemove,
  className,
  children,
}: FinancialCardProps) {
  const formattedValue = typeof value === 'number' 
    ? formatFinancialNumber(value) 
    : value

  const getChangeIcon = (type: 'increase' | 'decrease' | 'neutral') => {
    switch (type) {
      case 'increase': return '📈'
      case 'decrease': return '📉'
      case 'neutral': return '➡️'
      default: return ''
    }
  }

  return (
    <Card 
      className={cn(
        "relative transition-all duration-200 hover:shadow-md",
        color && "border-l-4",
        className
      )}
      style={{
        borderLeftColor: color,
        backgroundColor: color ? `${color}08` : undefined,
      }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          {icon && (
            <span className="text-lg" role="img" aria-label="icon">
              {icon}
            </span>
          )}
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </div>
        
        <div className="flex items-center space-x-2">
          <ModernStatusPill
            status={status}
            lastUpdated={lastUpdated}
            size="sm"
            showTimestamp={false}
          />
          {isEditable && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={onRemove}
              aria-label="Remove card"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold text-foreground">
            {formattedValue}
          </div>

          {change && (
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-xs">
                {getChangeIcon(change.type)}
              </span>
              <span className={cn(
                "font-medium",
                getChangeColorClass(change.value)
              )}>
                {formatPercentage(change.value)}
              </span>
              <span className="text-muted-foreground">
                {change.period}
              </span>
            </div>
          )}

          {children && (
            <div className="mt-3">
              {children}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
