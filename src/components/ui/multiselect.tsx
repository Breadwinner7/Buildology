'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'

interface MultiSelectProps {
  options: string[]
  selected: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options',
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const toggleOption = (value: string) => {
    const updated = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    onChange(updated)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
        >
          {selected.length > 0
            ? selected.join(', ')
            : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandGroup>
            {options.map((option) => (
              <CommandItem
                key={option}
                onSelect={() => toggleOption(option)}
              >
                <div
                  className={cn(
                    'mr-2 h-4 w-4 border rounded-sm flex items-center justify-center',
                    selected.includes(option)
                      ? 'bg-primary text-white'
                      : 'border-muted'
                  )}
                >
                  {selected.includes(option) && (
                    <Check className="h-4 w-4" />
                  )}
                </div>
                {option}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
