"use client"

import * as React from "react"
import { Switch } from "./switch"
import { Button } from "./button"
import { cn } from "@/lib/utils"

interface ModernToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label?: string
  description?: string
  size?: "sm" | "default" | "lg"
  variant?: "switch" | "button"
  icon?: React.ReactNode
  checkedIcon?: React.ReactNode
  uncheckedIcon?: React.ReactNode
  className?: string
  disabled?: boolean
}

export function ModernToggle({
  checked,
  onCheckedChange,
  label,
  description,
  size = "default",
  variant = "switch",
  icon,
  checkedIcon,
  uncheckedIcon,
  className,
  disabled = false,
}: ModernToggleProps) {
  if (variant === "button") {
    const sizeClasses = {
      sm: "h-8 px-3 text-xs",
      default: "h-10 px-4 text-sm",
      lg: "h-11 px-6 text-base",
    }

    return (
      <Button
        variant={checked ? "default" : "outline"}
        size={size}
        onClick={() => onCheckedChange(!checked)}
        disabled={disabled}
        className={cn(
          "gap-2 transition-all duration-200",
          sizeClasses[size],
          className
        )}
      >
        {icon && (
          <span className="flex-shrink-0">
            {checked && checkedIcon ? checkedIcon : uncheckedIcon ? uncheckedIcon : icon}
          </span>
        )}
        {label}
      </Button>
    )
  }

  return (
    <div className={cn("flex items-center space-x-3", className)}>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          size === "sm" && "scale-75",
          size === "lg" && "scale-125"
        )}
      />
      {(label || description) && (
        <div className="space-y-1">
          {label && (
            <label className={cn(
              "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
              size === "sm" && "text-xs",
              size === "lg" && "text-base"
            )}>
              {icon && <span className="mr-2">{icon}</span>}
              {label}
            </label>
          )}
          {description && (
            <p className={cn(
              "text-xs text-muted-foreground",
              size === "lg" && "text-sm"
            )}>
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
