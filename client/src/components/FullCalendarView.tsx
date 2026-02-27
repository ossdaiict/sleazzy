import React from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { format } from 'date-fns'

// FullCalendar packages export CSS in ways that some bundlers (Vite/esbuild)
// may not resolve via deep imports. To avoid import-analysis errors we inject
// the official CDN stylesheet links at runtime instead of importing them.

interface PublicEvent {
  id: string
  eventName: string
  clubName: string
  venueName: string
  startTime: Date
  endTime: Date
  eventType?: string
}

const EVENT_CLASS: Record<string, string> = {
  co_curricular: 'fc-event-co',
  open_all: 'fc-event-open',
  closed_club: 'fc-event-closed',
}

export default function FullCalendarView({ events }: { events: PublicEvent[] }) {
  React.useEffect(() => {
    const version = '6.1.8'
    const urls = [
      `https://cdn.jsdelivr.net/npm/@fullcalendar/common@${version}/main.min.css`,
      `https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@${version}/main.min.css`,
      `https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@${version}/main.min.css`,
    ]

    const links: HTMLLinkElement[] = []
    for (const href of urls) {
      const existing = document.querySelector(`link[href="${href}"]`)
      if (existing) continue
      const l = document.createElement('link')
      l.rel = 'stylesheet'
      l.href = href
      document.head.appendChild(l)
      links.push(l)
    }

    return () => {
      for (const l of links) l.remove()
    }
  }, [])
  const fcEvents = events.map(e => ({
    id: e.id,
    title: e.eventName,
    start: e.startTime.toISOString(),
    end: e.endTime.toISOString(),
    extendedProps: {
      clubName: e.clubName,
      venueName: e.venueName,
      eventType: e.eventType,
    },
    className: EVENT_CLASS[e.eventType || ''] || 'fc-event-default',
  }))

  function renderEventContent(arg: any) {
    const start = format(new Date(arg.event.start), 'h:mm a')
    return (
      <div className="fc-custom-event" title={`${arg.event.title} • ${start}`}>
        <div className="fc-event-time text-[11px] font-medium">{start}</div>
        <div className="fc-event-title text-[12px] font-semibold truncate">{arg.event.title}</div>
      </div>
    )
  }

  return (
    <div className="p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' }}
        events={fcEvents}
        eventContent={renderEventContent}
        allDaySlot={false}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
        nowIndicator={true}
        height="auto"
      />

      <style>{`
        .fc-custom-event { display:flex; flex-direction:column; gap:2px; }
        .fc-event-time { color: rgba(0,0,0,0.6); }
        .fc-event-default { background: linear-gradient(90deg,#7c3aed33,#7c3aed22); border-left:4px solid #7c3aed; color:#1f2937 }
        .fc-event-co { background: linear-gradient(90deg,#4f46e533,#4f46e522); border-left:4px solid #4f46e5; color:#1f2937 }
        .fc-event-open { background: linear-gradient(90deg,#05966933,#05966922); border-left:4px solid #059669; color:#064e3b }
        .fc-event-closed { background: linear-gradient(90deg,#d9770633,#d9770622); border-left:4px solid #d97706; color:#744210 }
        /* Make event text smaller to fit blocks */
        .fc .fc-event-title, .fc .fc-event-time { font-size: 11px; line-height: 1 }
      `}</style>
    </div>
  )
}
