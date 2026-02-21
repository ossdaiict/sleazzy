import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    Users,
    ArrowRight,
    Sparkles,
    X,
} from 'lucide-react';
import { apiRequest, type ApiBooking } from '../lib/api';
import { GradientBackground } from '../components/gradient-background';
import { ThemeToggle } from '../components/theme-toggle';
import { Button } from '../components/ui/button';

/* ------------------------------------------------------------------ */
/*  Types & helpers                                                    */
/* ------------------------------------------------------------------ */

interface PublicEvent {
    id: string;
    eventName: string;
    clubName: string;
    venueName: string;
    startTime: Date;
    endTime: Date;
    eventType?: string;
    batchId?: string;
}

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    co_curricular: { bg: 'bg-indigo-500/15 dark:bg-indigo-400/20', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-300/40 dark:border-indigo-500/30', dot: 'bg-indigo-500' },
    open_all: { bg: 'bg-emerald-500/15 dark:bg-emerald-400/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300/40 dark:border-emerald-500/30', dot: 'bg-emerald-500' },
    closed_club: { bg: 'bg-amber-500/15 dark:bg-amber-400/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300/40 dark:border-amber-500/30', dot: 'bg-amber-500' },
};

const DEFAULT_COLOR = { bg: 'bg-brand/10', text: 'text-brand', border: 'border-brand/20', dot: 'bg-brand' };

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(date: Date) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatEventType(t?: string) {
    if (!t) return '';
    return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface LandingPageProps {
    onGoToLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
    const [events, setEvents] = useState<PublicEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
    const [selectedDayEvents, setSelectedDayEvents] = useState<PublicEvent[] | null>(null);

    // Fetch public bookings
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setLoading(true);
                const bookings = await apiRequest<ApiBooking[]>('/api/public-bookings');

                // Deduplicate by batchId (multi-venue events)
                const seen = new Set<string>();
                const parsed: PublicEvent[] = [];

                for (const b of bookings) {
                    if (b.batch_id && seen.has(b.batch_id)) continue;
                    if (b.batch_id) seen.add(b.batch_id);

                    parsed.push({
                        id: b.id,
                        eventName: b.event_name,
                        clubName: b.clubs?.name || 'Unknown Club',
                        venueName: b.venues?.name || 'TBD',
                        startTime: new Date(b.start_time),
                        endTime: new Date(b.end_time),
                        eventType: b.event_type,
                        batchId: b.batch_id,
                    });
                }

                setEvents(parsed);
            } catch (err) {
                console.error('Failed to fetch public events:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    // Build calendar grid
    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDow = firstDay.getDay(); // 0=Sun

        const days: (Date | null)[] = [];
        // Leading blanks
        for (let i = 0; i < startDow; i++) days.push(null);
        // Actual days
        for (let d = 1; d <= lastDay.getDate(); d++) {
            days.push(new Date(year, month, d));
        }
        // Trailing blanks to fill last row
        while (days.length % 7 !== 0) days.push(null);

        return days;
    }, [currentMonth]);

    const eventsForDay = useCallback(
        (day: Date) => events.filter(e => isSameDay(e.startTime, day)),
        [events],
    );

    const today = useMemo(() => new Date(), []);

    const goToPrevMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    };

    const getColor = (type?: string) => EVENT_TYPE_COLORS[type || ''] || DEFAULT_COLOR;

    return (
        <div className="min-h-screen relative overflow-hidden bg-bgMain dark:bg-transparent">
            <GradientBackground />

            {/* Top bar */}
            <header className="relative z-20 flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    <div className="h-10 w-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
                        <CalendarIcon size={20} className="text-brand" />
                    </div>
                    <span className="text-xl font-bold text-textPrimary tracking-tight">Sleazzy</span>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    <ThemeToggle />
                    <Button
                        onClick={onGoToLogin}
                        className="rounded-xl h-10 px-6 font-semibold bg-gradient-to-r from-brand to-brandLink text-white shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30 transition-all"
                    >
                        Sign In
                        <ArrowRight size={16} className="ml-1" />
                    </Button>
                </motion.div>
            </header>

            {/* Hero */}
            <section className="relative z-10 text-center px-6 pt-10 pb-8 max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/20 mb-6"
                >
                    <Sparkles size={14} className="text-brand" />
                    <span className="text-sm font-semibold text-brand">Campus Event Calendar</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tighter bg-gradient-to-r from-brand via-purple-500 to-pink-500 bg-clip-text text-transparent leading-tight"
                >
                    Discover What's
                    <br />
                    Happening on Campus
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-6 text-lg text-textSecondary max-w-2xl mx-auto leading-relaxed"
                >
                    Browse upcoming events from clubs across campus.
                    Find something you love, or sign in to book your own venue.
                </motion.p>
            </section>

            {/* Legend */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative z-10 flex flex-wrap items-center justify-center gap-4 mb-6 px-6"
            >
                {[
                    { key: 'co_curricular', label: 'Co-Curricular' },
                    { key: 'open_all', label: 'Open for All' },
                    { key: 'closed_club', label: 'Closed Club' },
                ].map(({ key, label }) => {
                    const c = EVENT_TYPE_COLORS[key];
                    return (
                        <div key={key} className="flex items-center gap-2">
                            <div className={`h-3 w-3 rounded-full ${c.dot}`} />
                            <span className="text-xs font-medium text-textSecondary">{label}</span>
                        </div>
                    );
                })}
            </motion.div>

            {/* Calendar */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-16"
            >
                <div className="rounded-2xl border border-borderSoft/60 bg-white/70 dark:bg-white/5 backdrop-blur-xl shadow-2xl shadow-brand/5 overflow-hidden">
                    {/* Calendar header */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-borderSoft/40 bg-white/50 dark:bg-white/[0.03]">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={goToToday} className="rounded-lg text-xs font-semibold h-8">
                                Today
                            </Button>
                            <div className="flex items-center">
                                <Button variant="ghost" size="sm" onClick={goToPrevMonth} className="h-8 w-8 p-0 rounded-lg">
                                    <ChevronLeft size={18} />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={goToNextMonth} className="h-8 w-8 p-0 rounded-lg">
                                    <ChevronRight size={18} />
                                </Button>
                            </div>
                        </div>

                        <h2 className="text-lg sm:text-xl font-bold text-textPrimary tracking-tight">
                            {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </h2>

                        <div className="hidden sm:flex items-center gap-2 text-xs text-textMuted font-medium">
                            <CalendarIcon size={14} />
                            {events.length} events
                        </div>
                    </div>

                    {/* Day-of-week headers */}
                    <div className="grid grid-cols-7 border-b border-borderSoft/30">
                        {DAY_HEADERS.map(d => (
                            <div
                                key={d}
                                className="py-2.5 text-center text-xs font-bold uppercase tracking-wider text-textMuted border-r last:border-r-0 border-borderSoft/20"
                            >
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Calendar grid */}
                    {loading ? (
                        <div className="flex items-center justify-center py-32">
                            <div className="h-8 w-8 border-3 border-brand/30 border-t-brand rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-7">
                            {calendarDays.map((day, idx) => {
                                if (!day) {
                                    return (
                                        <div
                                            key={`blank-${idx}`}
                                            className="min-h-[100px] sm:min-h-[120px] border-r border-b border-borderSoft/20 last:border-r-0 bg-hoverSoft/20"
                                        />
                                    );
                                }

                                const dayEvents = eventsForDay(day);
                                const isToday = isSameDay(day, today);
                                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                                const maxVisible = 2;
                                const overflow = dayEvents.length - maxVisible;

                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={`
                      min-h-[100px] sm:min-h-[120px] p-1.5 sm:p-2 border-r border-b border-borderSoft/20 last:border-r-0 
                      transition-colors cursor-default relative group
                      ${isToday ? 'bg-brand/[0.04] dark:bg-brand/[0.08]' : ''}
                      ${!isCurrentMonth ? 'opacity-40' : ''}
                      hover:bg-hoverSoft/40
                    `}
                                    >
                                        {/* Date number */}
                                        <div className="flex items-center justify-between mb-1">
                                            <span
                                                className={`
                          inline-flex items-center justify-center text-xs sm:text-sm font-semibold
                          ${isToday
                                                        ? 'h-7 w-7 rounded-full bg-brand text-white shadow-md shadow-brand/30'
                                                        : 'text-textPrimary'
                                                    }
                        `}
                                            >
                                                {day.getDate()}
                                            </span>
                                        </div>

                                        {/* Event chips */}
                                        <div className="space-y-0.5 sm:space-y-1">
                                            {dayEvents.slice(0, maxVisible).map(event => {
                                                const c = getColor(event.eventType);
                                                return (
                                                    <button
                                                        key={event.id}
                                                        onClick={() => setSelectedEvent(event)}
                                                        className={`
                              w-full text-left rounded-md px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-medium truncate
                              border transition-all hover:scale-[1.02] hover:shadow-sm
                              ${c.bg} ${c.text} ${c.border}
                            `}
                                                        title={event.eventName}
                                                    >
                                                        <span className="hidden sm:inline">{formatTime(event.startTime)} </span>
                                                        {event.eventName}
                                                    </button>
                                                );
                                            })}
                                            {overflow > 0 && (
                                                <button
                                                    onClick={() => setSelectedDayEvents(dayEvents)}
                                                    className="w-full text-left text-[10px] sm:text-xs font-semibold text-brand hover:text-brandLink transition-colors px-1.5"
                                                >
                                                    +{overflow} more
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Event Detail Modal */}
            <AnimatePresence>
                {selectedEvent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSelectedEvent(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-borderSoft/60 overflow-hidden"
                        >
                            {/* Color bar */}
                            <div className={`h-2 ${getColor(selectedEvent.eventType).dot}`} />

                            <div className="p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-bold text-textPrimary tracking-tight truncate">
                                            {selectedEvent.eventName}
                                        </h3>
                                        <p className="text-sm text-textSecondary mt-1">{selectedEvent.clubName}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedEvent(null)}
                                        className="p-1.5 rounded-lg hover:bg-hoverSoft transition-colors text-textMuted ml-2 shrink-0"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                                            <Clock size={16} className="text-brand" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-textPrimary">
                                                {selectedEvent.startTime.toLocaleDateString('en-US', {
                                                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                                                })}
                                            </p>
                                            <p className="text-xs text-textSecondary">
                                                {formatTime(selectedEvent.startTime)} – {formatTime(selectedEvent.endTime)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                                            <MapPin size={16} className="text-brand" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-textPrimary">{selectedEvent.venueName}</p>
                                            <p className="text-xs text-textSecondary">Venue</p>
                                        </div>
                                    </div>

                                    {selectedEvent.eventType && (
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                                                <Users size={16} className="text-brand" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-textPrimary">{formatEventType(selectedEvent.eventType)}</p>
                                                <p className="text-xs text-textSecondary">Event type</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* "Day view" Modal for +N more */}
            <AnimatePresence>
                {selectedDayEvents && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSelectedDayEvents(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-borderSoft/60 overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-textPrimary">
                                        {selectedDayEvents[0]?.startTime.toLocaleDateString('en-US', {
                                            weekday: 'long', month: 'short', day: 'numeric',
                                        })}
                                    </h3>
                                    <button
                                        onClick={() => setSelectedDayEvents(null)}
                                        className="p-1.5 rounded-lg hover:bg-hoverSoft transition-colors text-textMuted"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                                    {selectedDayEvents.map(event => {
                                        const c = getColor(event.eventType);
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={() => {
                                                    setSelectedDayEvents(null);
                                                    setSelectedEvent(event);
                                                }}
                                                className={`w-full text-left rounded-xl p-3 border transition-all hover:shadow-md ${c.bg} ${c.border}`}
                                            >
                                                <p className={`font-semibold text-sm ${c.text}`}>{event.eventName}</p>
                                                <p className="text-xs text-textSecondary mt-1">
                                                    {formatTime(event.startTime)} – {formatTime(event.endTime)} · {event.venueName}
                                                </p>
                                                <p className="text-xs text-textMuted mt-0.5">{event.clubName}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <footer className="relative z-10 text-center py-8 text-xs text-textMuted">
                <p>© {new Date().getFullYear()} Sleazzy · Campus Venue Booking</p>
            </footer>
        </div>
    );
};

export default LandingPage;
