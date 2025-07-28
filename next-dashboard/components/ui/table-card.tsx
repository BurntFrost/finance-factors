"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./card"
import { ModernStatusPill, DataStatus } from "./modern-status-pill"
import { Button } from "./button"
import { X, Search } from "lucide-react"
import { Input } from "./input"
import { cn } from "@/lib/utils"

interface TableCardProps {
  title: string
  status?: DataStatus
  lastUpdated?: Date | string
  isEditable?: boolean
  onRemove?: () => void
  className?: string
  children: React.ReactNode
  headerActions?: React.ReactNode
  footerContent?: React.ReactNode
  showFooter?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  showSearch?: boolean
}

export function TableCard({
  title,
  status,
  lastUpdated,
  isEditable = false,
  onRemove,
  className,
  children,
  headerActions,
  footerContent,
  showFooter = true,
  searchValue,
  onSearchChange,
  showSearch = false,
}: TableCardProps) {
  return (
    <Card 
      className={cn(
        "relative transition-all duration-200 hover:shadow-md h-full flex flex-col",
        className
      )}
    >
      <CardHeader className="flex flex-col space-y-4 pb-4">
        <div className="flex flex-row items-center justify-between space-y-0">
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
            {isEditable && onRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={onRemove}
                aria-label="Remove table"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {showSearch && onSearchChange && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search table data..."
              value={searchValue || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <div className="h-full overflow-auto">
          {children}
        </div>
      </CardContent>

      {showFooter && footerContent && (
        <CardFooter className="pt-4 pb-4 px-6 border-t">
          {footerContent}
        </CardFooter>
      )}
    </Card>
  )
}
