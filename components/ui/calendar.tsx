'use client'

import * as React from 'react'
import { DayPicker, getDefaultClassNames } from 'react-day-picker'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  formatters,
  ...props
}: CalendarProps) {
  const defaultClassNames = getDefaultClassNames()
  
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-4', className)}
      classNames={{
        root: `${defaultClassNames.root}`,
        months: `${defaultClassNames.months}`,
        month: `${defaultClassNames.month}`,
        month_caption: `${defaultClassNames.month_caption} flex justify-center items-center relative mb-4`,
        caption_label: `${defaultClassNames.caption_label} text-base font-semibold`,
        nav: `${defaultClassNames.nav} absolute inset-x-0 flex justify-between px-1`,
        button_previous: `${defaultClassNames.button_previous} h-8 w-8 bg-transparent p-0 hover:bg-muted rounded-full inline-flex items-center justify-center`,
        button_next: `${defaultClassNames.button_next} h-8 w-8 bg-transparent p-0 hover:bg-muted rounded-full inline-flex items-center justify-center`,
        month_grid: `${defaultClassNames.month_grid} w-full border-collapse`,
        weekdays: `${defaultClassNames.weekdays}`,
        weekday: `${defaultClassNames.weekday} text-muted-foreground font-medium text-xs w-9 h-9`,
        week: `${defaultClassNames.week}`,
        day: `${defaultClassNames.day} h-9 w-9 text-center text-sm p-0`,
        day_button: `${defaultClassNames.day_button} h-9 w-9 p-0 font-normal rounded-lg hover:bg-muted`,
        selected: `${defaultClassNames.selected} bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground rounded-lg`,
        today: `${defaultClassNames.today} bg-muted font-medium`,
        outside: `${defaultClassNames.outside} text-muted-foreground/50`,
        disabled: `${defaultClassNames.disabled} text-muted-foreground/50`,
        hidden: `${defaultClassNames.hidden} invisible`,
        ...classNames,
      }}
      formatters={{
        formatWeekdayName: (date) => {
          const days = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
          return days[date.getDay()]
        },
        ...formatters,
      }}
      components={{
        Chevron: ({ orientation, ...props }) => {
          if (orientation === 'left') {
            return <ChevronLeft className="h-4 w-4" {...props} />
          }
          return <ChevronRight className="h-4 w-4" {...props} />
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = 'Calendar'

export { Calendar }
