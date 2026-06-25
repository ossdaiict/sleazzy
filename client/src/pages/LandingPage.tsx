import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    Users,
    ArrowRight,
    X,
    Sparkles,
} from 'lucide-react';
import { apiRequest, type ApiBooking, type ApiVenue, mapBooking, groupBookings } from '../lib/api';
import { getSocket, SOCKET_EVENTS } from '../lib/socket';
import { ThemeToggle } from '../components/theme-toggle';
import { Button } from '../components/ui/button';
import { Logo } from '../components/Logo';
import { GdgFooterCredit } from '../components/GdgFooterCredit';

interface PublicEvent {
    id: string;
    ids: string[];
    eventName: string;
    clubName: string;
    venueName: string;
    startTime: Date;
    endTime: Date;
    eventType?: string;
    batchId?: string;
    status: string;
}

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    co_curricular: { bg: 'bg-blue-500/15 dark:bg-blue-400/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300/40 dark:border-blue-500/30', dot: 'bg-blue-500' },
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

function formatDayLabel(date: Date) {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface LandingPageProps {
    onGoToLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin }) => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<PublicEvent[]>([]);
    const [publicMembers, setPublicMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [venues, setVenues] = useState<ApiVenue[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);
    const [selectedDayEvents, setSelectedDayEvents] = useState<PublicEvent[] | null>(null);

    const fetchEvents = useCallback(async () => {
        try {
            setLoading(true);
            const [eventsData, membersData] = await Promise.all([
                apiRequest<any[]>('/api/events/public'),
                apiRequest<any[]>('/api/club-members/public').catch(() => []),
            ]);
            setPublicMembers(membersData);

            const finalParsed: PublicEvent[] = eventsData.map(e => {
                return {
                    id: e.id,
                    ids: [e.id],
                    eventName: e.name,
                    clubName: e.clubs?.name || 'Unknown Club',
                    venueName: e.venue || 'No Venue Specified',
                    startTime: new Date(e.date),
                    endTime: new Date(e.end_date || e.date),
                    eventType: e.event_type,
                    status: 'approved',
                };
            });

            setEvents(finalParsed);
        } catch (err) {
            console.error('Failed to fetch public events:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;

        const handleRefresh = () => { fetchEvents(); };

        socket.on(SOCKET_EVENTS.EVENTS_UPDATED, handleRefresh);
        socket.on(SOCKET_EVENTS.BOOKING_STATUS_CHANGED, handleRefresh);
        socket.on(SOCKET_EVENTS.BOOKING_NEW, handleRefresh);

        return () => {
            socket.off(SOCKET_EVENTS.EVENTS_UPDATED, handleRefresh);
            socket.off(SOCKET_EVENTS.BOOKING_STATUS_CHANGED, handleRefresh);
            socket.off(SOCKET_EVENTS.BOOKING_NEW, handleRefresh);
        };
    }, [fetchEvents]);

    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDow = firstDay.getDay();

        const days: (Date | null)[] = [];
        for (let i = 0; i < startDow; i++) days.push(null);
        for (let d = 1; d <= lastDay.getDate(); d++) {
            days.push(new Date(year, month, d));
        }
        while (days.length % 7 !== 0) days.push(null);
        return days;
    }, [currentMonth]);

    const eventsForDay = useCallback(
        (day: Date) => events.filter(e => isSameDay(e.startTime, day)),
        [events],
    );

    const upcomingEvents = useMemo(
        () => [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
        [events],
    );

    const today = useMemo(() => new Date(), []);

    const groupedCommittees = useMemo(() => {
        const groups: Record<string, any[]> = {};
        for (const m of publicMembers) {
            const clubName = m.club_name;
            if (!groups[clubName]) {
                groups[clubName] = [];
            }
            groups[clubName].push(m);
        }
        return groups;
    }, [publicMembers]);

    const formatTenure = (start?: string, end?: string) => {
        if (!start && !end) return 'Not Specified';
        const sStr = start ? new Date(start).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'N/A';
        const eStr = end ? new Date(end).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }) : 'Present';
        return `${sStr} – ${eStr}`;
    };

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
        <div className="min-h-screen relative overflow-hidden bg-bgMain">
            {/* ====== Header ====== */}
            <header className="sticky top-0 z-30 bg-bgMain/80 backdrop-blur-xl border-b border-borderSoft/40">
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <Logo size="md" />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 sm:gap-4"
                    >
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/')}
                            className="rounded-xl h-10 px-4 font-semibold text-brand bg-brand/5 hover:bg-brand/10 transition-all"
                        >
                            Home
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => navigate('/clubs-committees')}
                            className="rounded-xl h-10 px-4 font-semibold text-textSecondary hover:text-textPrimary hover:bg-hoverSoft transition-all"
                        >
                            Clubs & Committees
                        </Button>
                        <ThemeToggle />
                        <Button
                            onClick={onGoToLogin}
                            className="rounded-xl h-10 px-5 sm:px-6 font-semibold bg-brand text-white hover:bg-brandLink transition-all shadow-md shadow-brand/20 hover:shadow-lg hover:shadow-brand/30"
                        >
                            Sign In
                            <ArrowRight size={16} className="ml-1" />
                        </Button>
                    </motion.div>
                </div>
            </header>

            {/* ====== Hero ====== */}
            <section className="relative z-10 text-center px-4 sm:px-6 pt-12 sm:pt-20 pb-10 sm:pb-14 max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-brand/20 bg-brand/5 mb-6 sm:mb-8"
                >
                    <Sparkles size={14} className="text-brand" />
                    <span className="text-sm font-semibold text-brand">Campus Event Calendar</span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter text-textPrimary leading-[1.08] pb-2"
                >
                    Discover What's
                    <br />
                    <span className="bg-clip-text text-transparent bg-linear-to-r from-brand via-[#E84E36] to-[#FDC02F]">
                        Happening on Campus
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mt-6 sm:mt-8 text-base sm:text-lg text-textSecondary max-w-xl mx-auto leading-relaxed font-medium"
                >
                    Browse upcoming events from clubs across campus.
                    Find something you love, or sign in to book your own venue.
                </motion.p>
            </section>

            {/* ====== Legend ====== */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative z-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-6 px-4"
            >
                {[
                    { key: 'co_curricular', label: 'Co-Curricular' },
                    { key: 'open_all', label: 'Open for All' },
                ].map(({ key, label }) => {
                    const c = EVENT_TYPE_COLORS[key];
                    return (
                        <div key={key} className="flex items-center gap-2">
                            <div className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />
                            <span className="text-xs font-semibold text-textSecondary">{label}</span>
                        </div>
                    );
                })}
            </motion.div>

            {/* ====== Calendar ====== */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-8 sm:pb-16"
            >
                <div className="rounded-2xl border border-borderSoft bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
                    {/* Calendar header */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-borderSoft bg-hoverSoft/30">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={goToToday} className="rounded-lg text-xs font-semibold h-8 bg-card shadow-sm">
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

                        <h2 className="text-base sm:text-lg font-bold text-textPrimary tracking-tight">
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
                                className="py-2.5 text-center text-[11px] sm:text-xs font-bold uppercase tracking-wider text-textMuted border-r last:border-r-0 border-borderSoft/20"
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
                                            className="min-h-[72px] sm:min-h-[110px] border-r border-b border-borderSoft/20 last:border-r-0 bg-hoverSoft/20"
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
                                            min-h-[72px] sm:min-h-[110px] p-1 sm:p-2 border-r border-b border-borderSoft/20 last:border-r-0
                                            transition-colors cursor-default relative group
                                            ${isToday ? 'bg-brand/4 dark:bg-brand/6' : ''}
                                            ${!isCurrentMonth ? 'opacity-40' : ''}
                                            hover:bg-hoverSoft/40
                                        `}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span
                                                className={`
                                                    inline-flex items-center justify-center text-xs sm:text-sm font-semibold
                                                    ${isToday
                                                        ? 'h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-brand text-white shadow-sm shadow-brand/30'
                                                        : 'text-textPrimary'
                                                    }
                                                `}
                                            >
                                                {day.getDate()}
                                            </span>
                                        </div>

                                        <div className="space-y-0.5 sm:space-y-1">
                                            {dayEvents.slice(0, maxVisible).map(event => {
                                                const c = getColor(event.eventType);
                                                return (
                                                    <button
                                                        key={event.id}
                                                        onClick={() => setSelectedEvent(event)}
                                                        className={`
                                                            w-full text-left rounded-md px-1 py-0.5 sm:px-2 sm:py-1 text-[9px] sm:text-xs font-medium truncate
                                                            border transition-all hover:scale-[1.02] hover:shadow-sm active:scale-[0.98]
                                                            ${c.bg} ${c.text} ${c.border}
                                                        `}
                                                        title={event.eventName}
                                                    >
                                                        <span className="hidden md:inline">{formatTime(event.startTime)} </span>
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

                {/* ====== Upcoming Events ====== */}
                <div className="mt-8 rounded-2xl border border-borderSoft bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
                    <div className="px-4 sm:px-6 py-4 border-b border-borderSoft bg-hoverSoft/30">
                        <h3 className="text-base sm:text-lg font-bold text-textPrimary tracking-tight">Upcoming Events</h3>
                        <p className="text-xs sm:text-sm text-textSecondary mt-0.5">
                            Browse all scheduled public events in chronological order.
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-10">
                            <div className="h-7 w-7 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                        </div>
                    ) : upcomingEvents.length === 0 ? (
                        <div className="px-4 sm:px-6 py-14 text-center">
                            <CalendarIcon size={40} className="mx-auto text-textMuted/30 mb-3" />
                            <p className="text-sm text-textSecondary font-medium">No public events are scheduled yet.</p>
                        </div>
                    ) : (
                        <div className="max-h-[480px] overflow-y-auto">
                            {upcomingEvents.map((event, index) => {
                                const showDateHeader = index === 0 || !isSameDay(event.startTime, upcomingEvents[index - 1].startTime);
                                const c = getColor(event.eventType);

                                return (
                                    <div key={`${event.id}-${event.startTime.toISOString()}`}>
                                        {showDateHeader && (
                                            <div className="sticky top-0 z-10 px-4 sm:px-6 py-2 text-xs font-semibold text-textMuted bg-card/95 backdrop-blur border-y border-borderSoft/30">
                                                {formatDayLabel(event.startTime)}
                                            </div>
                                        )}

                                        <button
                                            onClick={() => setSelectedEvent(event)}
                                            className="w-full text-left px-4 sm:px-6 py-3.5 border-b border-borderSoft/20 hover:bg-hoverSoft/50 transition-colors active:bg-hoverSoft"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm sm:text-base font-semibold text-textPrimary truncate">{event.eventName}</p>
                                                    <p className="text-xs sm:text-sm text-textSecondary mt-0.5 truncate">
                                                        {event.clubName} · {event.venueName}
                                                    </p>
                                                    <p className="text-xs text-textMuted mt-1 flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {formatTime(event.startTime)} – {formatTime(event.endTime)}
                                                    </p>
                                                </div>

                                                {event.eventType && (
                                                    <span className={`shrink-0 text-[10px] sm:text-xs font-semibold px-2 py-1 rounded-lg border ${c.bg} ${c.text} ${c.border}`}>
                                                        {formatEventType(event.eventType)}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </motion.div>

            {/* ====== Event Detail Modal ====== */}
            <AnimatePresence>
                {selectedEvent && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSelectedEvent(null)}
                    >
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl border border-borderSoft overflow-hidden"
                        >
                            <div className={`h-1.5 ${getColor(selectedEvent.eventType).dot}`} />

                            {/* Drag handle for mobile */}
                            <div className="flex justify-center pt-2 pb-1 sm:hidden">
                                <div className="w-10 h-1 rounded-full bg-borderSoft" />
                            </div>

                            <div className="p-5 sm:p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-bold text-textPrimary tracking-tight truncate">
                                            {selectedEvent.eventName}
                                        </h3>
                                        <p className="text-sm text-textSecondary mt-1">{selectedEvent.clubName}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedEvent(null)}
                                        className="p-2 rounded-xl hover:bg-hoverSoft transition-colors text-textMuted ml-2 shrink-0"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-hoverSoft/50">
                                        <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                                            <Clock size={18} className="text-brand" />
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

                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-hoverSoft/50">
                                        <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                                            <MapPin size={18} className="text-brand" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-textPrimary">{selectedEvent.venueName}</p>
                                            <p className="text-xs text-textSecondary">Venue</p>
                                        </div>
                                    </div>

                                    {selectedEvent.eventType && (
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-hoverSoft/50">
                                            <div className="h-10 w-10 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                                                <Users size={18} className="text-brand" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-textPrimary">{formatEventType(selectedEvent.eventType)}</p>
                                                <p className="text-xs text-textSecondary">Event type</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Mobile safe area padding */}
                            <div className="pb-safe sm:pb-0" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ====== "Day view" Modal ====== */}
            <AnimatePresence>
                {selectedDayEvents && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm"
                        onClick={() => setSelectedDayEvents(null)}
                    >
                        <motion.div
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '100%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl border border-borderSoft overflow-hidden"
                        >
                            <div className="flex justify-center pt-2 pb-1 sm:hidden">
                                <div className="w-10 h-1 rounded-full bg-borderSoft" />
                            </div>

                            <div className="p-5 sm:p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-textPrimary">
                                        {selectedDayEvents[0]?.startTime.toLocaleDateString('en-US', {
                                            weekday: 'long', month: 'short', day: 'numeric',
                                        })}
                                    </h3>
                                    <button
                                        onClick={() => setSelectedDayEvents(null)}
                                        className="p-2 rounded-xl hover:bg-hoverSoft transition-colors text-textMuted"
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
                                                className={`w-full text-left rounded-xl p-3.5 border transition-all hover:shadow-md active:scale-[0.98] ${c.bg} ${c.border}`}
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

                            <div className="pb-safe sm:pb-0" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ====== Footer ====== */}
            <footer className="relative z-10 px-4 py-10 text-center text-xs text-textMuted">
                <p className="font-medium text-textSecondary">
                    &copy; {new Date().getFullYear()} SBG &middot; Campus Venue Booking
                </p>
                <div className="mt-4 flex justify-center">
                    <GdgFooterCredit />
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
