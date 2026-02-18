import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock,
  MapPin,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"
import { AnimatePresence, motion } from "framer-motion"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

interface CalendarEvent {
  eventName: string 
  clubName: string
  date: string
  startTime: string
  endTime: string
  venueName?: string
  status?: string
}

type EventsByDateMap = Map<string, CalendarEvent[]>

const CalendarEventsContext = React.createContext<EventsByDateMap>(new Map())

function makeDateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  events,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  events?: CalendarEvent[]
}) {
  const defaultClassNames = getDefaultClassNames()
  const calendarRef = React.useRef<HTMLDivElement>(null)

  const eventsByDate = React.useMemo(() => {
    const map: EventsByDateMap = new Map()
    for (const event of events || []) {
      const d = new Date(event.date)
      const key = makeDateKey(d)
      const existing = map.get(key) || []
      existing.push(event)
      map.set(key, existing)
    }
    return map
  }, [events])

  return (
    <CalendarEventsContext.Provider value={eventsByDate}>
    <div ref={calendarRef}>
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar p-6 rounded-xl [--cell-size:2.75rem] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row",
          defaultClassNames.months
        ),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] w-[--cell-size] select-none p-0 rounded-lg text-textMuted hover:text-textPrimary hover:bg-hoverSoft aria-disabled:opacity-50",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "h-[--cell-size] w-[--cell-size] select-none p-0 rounded-lg text-textMuted hover:text-textPrimary hover:bg-hoverSoft aria-disabled:opacity-50",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-[--cell-size] w-full items-center justify-center px-[--cell-size]",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "flex h-[--cell-size] w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "has-focus:border-brand border-borderSoft has-focus:ring-2 has-focus:ring-brand/30 relative rounded-lg",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "bg-popover absolute inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-semibold text-textPrimary",
          captionLayout === "label"
            ? "text-base"
            : "[&>svg]:text-textMuted flex h-8 items-center gap-1 rounded-lg pl-2 pr-1 text-sm [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: "w-full border-collapse",
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(
          "text-textMuted flex-1 select-none rounded-lg text-xs font-medium uppercase tracking-wider",
          defaultClassNames.weekday
        ),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn(
          "w-[--cell-size] select-none",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-textMuted select-none text-xs",
          defaultClassNames.week_number
        ),
        day: cn(
          "group/day relative aspect-square h-full w-full select-none p-0 text-center",
          defaultClassNames.day
        ),
        range_start: cn(
          "bg-brand/10 rounded-l-lg",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none bg-brand/5", defaultClassNames.range_middle),
        range_end: cn("bg-brand/10 rounded-r-lg", defaultClassNames.range_end),
        today: cn(
          "bg-brand/5 text-brand font-semibold rounded-lg border-2 border-brand/30 data-[selected=true]:bg-brand data-[selected=true]:text-white data-[selected=true]:border-brand data-[selected=true]:rounded-lg",
          defaultClassNames.today
        ),
        outside: cn(
          "text-textMuted/70 aria-selected:text-textMuted/70",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-textMuted/50 opacity-60 cursor-not-allowed",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <motion.div
              data-slot="calendar"
              ref={rootRef}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          const Icon = orientation === "left" ? ChevronLeftIcon
            : orientation === "right" ? ChevronRightIcon
            : ChevronDownIcon
          return (
            <motion.span
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.85 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="inline-flex"
            >
              <Icon className={cn("size-4", className)} {...props} />
            </motion.span>
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-[--cell-size] items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
    </div>
    <EventHoverCard containerRef={calendarRef} eventsByDate={eventsByDate} />
    </CalendarEventsContext.Provider>
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()
  const eventsByDate = React.useContext(CalendarEventsContext)

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const isSelected = modifiers.selected && 
    !modifiers.range_start && 
    !modifiers.range_end && 
    !modifiers.range_middle
  const isRangeStart = modifiers.range_start
  const isRangeEnd = modifiers.range_end
  const isRangeMiddle = modifiers.range_middle
  const isDisabled = modifiers.disabled || modifiers.outside
  const isToday = modifiers.today

  const key = makeDateKey(day.date)
  const hasEvents = (eventsByDate.get(key) || []).length > 0
  const canAnimate = !isDisabled && !isSelected && !isRangeStart && !isRangeEnd

  return (
    <motion.div
      data-date-key={hasEvents ? key : undefined}
      whileHover={canAnimate ? (
        hasEvents ? {
          scale: 1.15,
          transition: { type: "spring", stiffness: 400, damping: 20, mass: 0.8 }
        } : {
          scale: 1.05,
          transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] }
        }
      ) : {}}
      whileTap={canAnimate ? {
        scale: 0.93,
        transition: { duration: 0.1 }
      } : {}}
      className={cn(
        "w-full h-full flex items-center justify-center rounded-xl transition-shadow duration-300",
        hasEvents && !isDisabled && "cursor-pointer hover:shadow-[0_6px_24px_-4px_rgba(99,102,241,0.4)] dark:hover:shadow-[0_6px_24px_-4px_rgba(129,140,248,0.35)]"
      )}
    >
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        data-day={day.date.toLocaleDateString()}
        data-selected-single={isSelected}
        data-range-start={isRangeStart}
        data-range-end={isRangeEnd}
        data-range-middle={isRangeMiddle}
        className={cn(
          "flex aspect-square h-auto w-full min-w-[--cell-size] flex-col gap-0.5 font-medium leading-none rounded-xl transition-all duration-200 relative text-textPrimary",
          "data-[selected-single=true]:bg-brand data-[selected-single=true]:text-white data-[selected-single=true]:font-semibold data-[selected-single=true]:shadow-sm",
          "data-[range-middle=true]:bg-brand/10 data-[range-middle=true]:text-brand data-[range-middle=true]:rounded-none",
          "data-[range-start=true]:bg-brand data-[range-start=true]:text-white data-[range-start=true]:font-semibold data-[range-start=true]:rounded-l-lg data-[range-start=true]:shadow-sm",
          "data-[range-end=true]:bg-brand data-[range-end=true]:text-white data-[range-end=true]:font-semibold data-[range-end=true]:rounded-r-lg data-[range-end=true]:shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:z-10",
          !isSelected && !isRangeStart && !isRangeEnd && !isDisabled && "hover:bg-hoverSoft hover:text-textPrimary",
          hasEvents && !isSelected && !isDisabled && "ring-1 ring-brand/20 hover:ring-brand/40",
          isToday && !isSelected && "border-2 border-brand/50 bg-brand/5",
          isDisabled && "opacity-50",
          "[&>span]:text-[10px] [&>span]:opacity-80 data-[selected-single=true]:[&>span]:opacity-100 data-[selected-single=true]:[&>span]:font-semibold",
          defaultClassNames.day,
          className
        )}
        {...props}
      />
    </motion.div>
  )
}

function EventHoverCard({
  containerRef,
  eventsByDate,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>
  eventsByDate: EventsByDateMap
}) {
  const [card, setCard] = React.useState<{
    dateKey: string
    events: CalendarEvent[]
    x: number
    y: number
    above: boolean
    dateLabel: string
  } | null>(null)

  const showTimer = React.useRef<ReturnType<typeof setTimeout>>()
  const hideTimer = React.useRef<ReturnType<typeof setTimeout>>()
  const hoveredKey = React.useRef<string | null>(null)
  const overPopup = React.useRef(false)

  const hide = React.useCallback(() => {
    clearTimeout(showTimer.current)
    hideTimer.current = setTimeout(() => {
      if (!overPopup.current) setCard(null)
    }, 150)
  }, [])

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onMove(e: PointerEvent) {
      const hit = (e.target as HTMLElement).closest("[data-date-key]") as HTMLElement | null

      if (!hit) {
        if (hoveredKey.current) {
          hoveredKey.current = null
          clearTimeout(showTimer.current)
          if (!overPopup.current) {
            hideTimer.current = setTimeout(() => {
              if (!overPopup.current) setCard(null)
            }, 150)
          }
        }
        return
      }

      const key = hit.getAttribute("data-date-key")!
      if (key === hoveredKey.current) return

      hoveredKey.current = key
      clearTimeout(showTimer.current)
      clearTimeout(hideTimer.current)

      const events = eventsByDate.get(key) || []
      if (events.length === 0) { setCard(null); return }

      showTimer.current = setTimeout(() => {
        const rect = hit.getBoundingClientRect()
        const above = rect.top > 280
        const parts = key.split("-")
        const date = new Date(+parts[0], +parts[1], +parts[2])

        setCard({
          dateKey: key,
          events,
          x: Math.max(160, Math.min(window.innerWidth - 160, rect.left + rect.width / 2)),
          y: above ? rect.top - 10 : rect.bottom + 10,
          above,
          dateLabel: date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
        })
      }, 200)
    }

    function onLeave() {
      hoveredKey.current = null
      clearTimeout(showTimer.current)
      if (!overPopup.current) {
        hideTimer.current = setTimeout(() => {
          if (!overPopup.current) setCard(null)
        }, 150)
      }
    }

    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerleave", onLeave)
    return () => {
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerleave", onLeave)
      clearTimeout(showTimer.current)
      clearTimeout(hideTimer.current)
    }
  }, [containerRef, eventsByDate, hide])

  return createPortal(
    <AnimatePresence>
      {card && (
        <motion.div
          key="event-hover-card"
          initial={{ opacity: 0, y: card.above ? 10 : -10, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: card.above ? 6 : -6, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.8 }}
          style={{
            position: "fixed",
            left: card.x,
            ...(card.above
              ? { bottom: window.innerHeight - card.y }
              : { top: card.y }),
            zIndex: 9999,
            x: "-50%",
            transformOrigin: card.above ? "bottom center" : "top center",
          }}
          onPointerEnter={() => {
            overPopup.current = true
            clearTimeout(hideTimer.current)
          }}
          onPointerLeave={() => {
            overPopup.current = false
            hideTimer.current = setTimeout(() => setCard(null), 120)
          }}
        >
          <div className="w-[300px] rounded-2xl border border-border/40 bg-popover backdrop-blur-2xl shadow-[0_24px_80px_-16px_rgba(0,0,0,0.2),0_8px_20px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_24px_80px_-16px_rgba(0,0,0,0.6),0_8px_20px_-4px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="h-[3px] bg-gradient-to-r from-primary/80 via-primary to-primary/60" />

            <div key={card.dateKey}>
              <div className="px-4 pt-3 pb-2.5">
                <div className="text-[13px] font-semibold text-foreground tracking-tight">
                  {card.dateLabel}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                  {card.events.length} event{card.events.length !== 1 ? "s" : ""} scheduled
                </div>
              </div>

              <div className="h-px bg-border/40 mx-3.5" />

              <div className="p-2.5 space-y-1 max-h-[280px] overflow-y-auto">
                {card.events.slice(0, 4).map((event, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.04, duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="flex gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors group"
                  >
                    <div className="w-[3px] shrink-0 rounded-full bg-primary my-0.5 group-hover:scale-y-110 transition-transform" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[13px] text-foreground leading-snug truncate">
                        {event.eventName}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-muted-foreground">
                        <Clock size={11} className="shrink-0 text-primary/50" />
                        <span>{event.startTime} – {event.endTime}</span>
                      </div>
                      {event.venueName && (
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                          <MapPin size={11} className="shrink-0 text-primary/50" />
                          <span className="truncate">{event.venueName}</span>
                        </div>
                      )}
                      <div className="text-[11px] text-primary font-medium mt-1">
                        {event.clubName}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {card.events.length > 4 && (
                  <div className="text-center text-[11px] text-muted-foreground py-2 font-medium">
                    +{card.events.length - 4} more event{card.events.length - 4 !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export { Calendar, CalendarDayButton, type CalendarEvent }
