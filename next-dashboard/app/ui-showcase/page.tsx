"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { ModernRefreshButton } from '@/components/ui/modern-refresh-button'
import { ModernStatusPill } from '@/components/ui/modern-status-pill'
import { FinancialCard } from '@/components/ui/financial-card'
import { ModernToggle } from '@/components/ui/modern-toggle'
import { AlertCircle, CheckCircle, Info, TrendingUp, DollarSign, Home, Moon, Sun } from 'lucide-react'

export default function UIShowcasePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [progress, setProgress] = useState(33)

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => setIsLoading(false), 2000)
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">UI Component Showcase</h1>
        <p className="text-muted-foreground">
          Demonstrating the new shadcn/ui components integrated into the Finance Factors Dashboard
        </p>
      </div>

      {/* Buttons Section */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>Various button styles and states</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="info">Info</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon"><TrendingUp className="h-4 w-4" /></Button>
          </div>
          <div className="flex gap-2">
            <ModernRefreshButton onRefresh={handleRefresh} isLoading={isLoading} />
            <Button disabled>Disabled</Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>Status Indicators</CardTitle>
          <CardDescription>Data status pills and badges</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <ModernStatusPill status="recent" lastUpdated={new Date()} />
            <ModernStatusPill status="historical" lastUpdated={new Date(Date.now() - 86400000)} />
            <ModernStatusPill status="stale" lastUpdated={new Date(Date.now() - 604800000)} />
            <ModernStatusPill status="loading" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Financial Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Data Cards</CardTitle>
          <CardDescription>Specialized cards for financial metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FinancialCard
              title="House Price Index"
              value={425000}
              change={{ value: 2.5, period: "vs last month", type: "increase" }}
              status="recent"
              lastUpdated={new Date()}
              icon="🏠"
              color="#007bff"
              isEditable
              onRemove={() => console.log('Remove card')}
            />
            <FinancialCard
              title="Median Income"
              value="$68,700"
              change={{ value: -1.2, period: "vs last year", type: "decrease" }}
              status="historical"
              lastUpdated={new Date(Date.now() - 86400000)}
              icon="💰"
              color="#28a745"
            />
            <FinancialCard
              title="Interest Rate"
              value="6.75%"
              change={{ value: 0.0, period: "unchanged", type: "neutral" }}
              status="recent"
              lastUpdated={new Date()}
              icon="📊"
              color="#ffc107"
            />
          </div>
        </CardContent>
      </Card>

      {/* Form Elements */}
      <Card>
        <CardHeader>
          <CardTitle>Form Elements</CardTitle>
          <CardDescription>Input fields and controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Text Input</label>
              <Input placeholder="Enter value..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose option..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="option1">Option 1</SelectItem>
                  <SelectItem value="option2">Option 2</SelectItem>
                  <SelectItem value="option3">Option 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toggles and Switches */}
      <Card>
        <CardHeader>
          <CardTitle>Toggles and Switches</CardTitle>
          <CardDescription>Various toggle controls</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ModernToggle
            checked={darkMode}
            onCheckedChange={setDarkMode}
            label="Dark Mode"
            description="Toggle between light and dark themes"
            icon={darkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          />
          <ModernToggle
            checked={true}
            onCheckedChange={() => {}}
            label="Live Data"
            variant="button"
            size="sm"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      {/* Alerts and Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts and Notifications</CardTitle>
          <CardDescription>Different alert types</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Information</AlertTitle>
            <AlertDescription>
              This is an informational alert with additional context.
            </AlertDescription>
          </Alert>
          <Alert variant="success">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>
              Data has been successfully updated from the live API.
            </AlertDescription>
          </Alert>
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Using historical data due to API rate limiting.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to fetch data from the API. Please try again.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Loading States */}
      <Card>
        <CardHeader>
          <CardTitle>Loading States</CardTitle>
          <CardDescription>Progress indicators and skeletons</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Progress: {progress}%</label>
            <Progress value={progress} />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setProgress(Math.max(0, progress - 10))}>
                Decrease
              </Button>
              <Button size="sm" onClick={() => setProgress(Math.min(100, progress + 10))}>
                Increase
              </Button>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-sm font-medium">Skeleton Loading</label>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
