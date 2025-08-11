'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { Button } from './button'
import { MoreHorizontal, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  change?: {
    value: string
    trend: 'up' | 'down' | 'neutral'
    label?: string
  }
  icon?: React.ReactNode
  gradient?: 'blue' | 'green' | 'purple' | 'orange' | 'red'
  onClick?: () => void
  className?: string
}

export function StatsCard({
  title,
  value,
  description,
  change,
  icon,
  gradient = 'blue',
  onClick,
  className
}: StatsCardProps) {
  const gradientClasses = {
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500',
    orange: 'from-orange-500 to-red-500',
    red: 'from-red-500 to-rose-500'
  }

  const changeColor = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-muted-foreground'
  }

  const TrendIcon = change?.trend === 'up' ? TrendingUp : change?.trend === 'down' ? TrendingDown : Minus

  return (
    <Card 
      className={cn(
        'card-elevated interactive overflow-hidden group cursor-pointer',
        onClick && 'hover:scale-105',
        className
      )}
      onClick={onClick}
    >
      <div className={cn(
        'absolute top-0 left-0 w-full h-1 bg-gradient-to-r',
        gradientClasses[gradient]
      )} />
      
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className={cn(
                'p-2 rounded-xl bg-gradient-to-br shadow-sm',
                gradientClasses[gradient]
              )}>
                <div className="text-white">
                  {icon}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {title}
              </p>
              {description && (
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          {change && (
            <div className={cn('flex items-center gap-1 text-sm font-medium', changeColor[change.trend])}>
              <TrendIcon className="h-4 w-4" />
              <span>{change.value}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {change?.label && (
            <p className="text-xs text-muted-foreground">{change.label}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  status?: 'active' | 'inactive' | 'pending'
  className?: string
  children?: React.ReactNode
}

export function FeatureCard({
  title,
  description,
  icon,
  action,
  status = 'active',
  className,
  children
}: FeatureCardProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800'
  }

  return (
    <Card className={cn('card-elevated group hover:shadow-xl transition-all duration-300', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
              {icon}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {title}
              </CardTitle>
              <CardDescription className="text-balance">
                {description}
              </CardDescription>
            </div>
          </div>
          
          <Badge className={statusColors[status]} variant="secondary">
            {status}
          </Badge>
        </div>
      </CardHeader>
      
      {children && (
        <CardContent>
          {children}
        </CardContent>
      )}
      
      {action && (
        <CardContent className="pt-0">
          <Button 
            onClick={action.onClick}
            className="w-full group-hover:shadow-md transition-shadow"
          >
            {action.label}
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

interface ProjectCardProps {
  name: string
  description?: string
  status: string
  progress?: number
  dueDate?: string
  team?: Array<{
    name: string
    avatar?: string
    initials: string
  }>
  priority?: 'low' | 'medium' | 'high' | 'critical'
  onClick?: () => void
  className?: string
}

export function ProjectCard({
  name,
  description,
  status,
  progress,
  dueDate,
  team = [],
  priority = 'medium',
  onClick,
  className
}: ProjectCardProps) {
  const statusColors = {
    'active': 'bg-green-100 text-green-800 border-green-200',
    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'completed': 'bg-blue-100 text-blue-800 border-blue-200',
    'on-hold': 'bg-gray-100 text-gray-800 border-gray-200',
    'cancelled': 'bg-red-100 text-red-800 border-red-200'
  }

  const priorityColors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500'
  }

  return (
    <Card 
      className={cn(
        'card-elevated interactive cursor-pointer group overflow-hidden',
        className
      )}
      onClick={onClick}
    >
      <div className={cn('absolute top-0 left-0 w-full h-1', priorityColors[priority])} />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
              {name}
            </CardTitle>
            {description && (
              <CardDescription className="line-clamp-2 text-balance">
                {description}
              </CardDescription>
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Badge 
              className={cn('text-xs', statusColors[status as keyof typeof statusColors])}
              variant="secondary"
            >
              {status}
            </Badge>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {typeof progress === 'number' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary/80 to-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          {dueDate && (
            <div className="text-sm text-muted-foreground">
              Due: {dueDate}
            </div>
          )}
          
          {team.length > 0 && (
            <div className="flex -space-x-2">
              {team.slice(0, 3).map((member, index) => (
                <div
                  key={index}
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-background flex items-center justify-center text-xs font-medium text-primary"
                  title={member.name}
                >
                  {member.initials}
                </div>
              ))}
              {team.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
                  +{team.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  subValue?: string
  change?: {
    value: string
    period: string
    trend: 'up' | 'down' | 'neutral'
  }
  chart?: React.ReactNode
  className?: string
}

export function MetricCard({
  title,
  value,
  subValue,
  change,
  chart,
  className
}: MetricCardProps) {
  const TrendIcon = change?.trend === 'up' ? TrendingUp : change?.trend === 'down' ? TrendingDown : Minus
  const trendColor = change?.trend === 'up' ? 'text-green-600' : change?.trend === 'down' ? 'text-red-600' : 'text-muted-foreground'

  return (
    <Card className={cn('card-elevated', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </h3>
          {change && (
            <div className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
              <TrendIcon className="h-4 w-4" />
              <span>{change.value}</span>
            </div>
          )}
        </div>
        
        <div className="space-y-1 mb-4">
          <div className="text-2xl font-bold text-foreground">{value}</div>
          {subValue && (
            <div className="text-sm text-muted-foreground">{subValue}</div>
          )}
          {change && (
            <div className="text-xs text-muted-foreground">vs {change.period}</div>
          )}
        </div>
        
        {chart && (
          <div className="mt-4">
            {chart}
          </div>
        )}
      </CardContent>
    </Card>
  )
}