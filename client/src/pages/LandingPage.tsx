import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
    Menu,
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const headerRef = useRef<HTMLElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMobileMenuOpen && headerRef.current && !headerRef.current.contains(event.target as Node)) {
                setIsMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMobileMenuOpen]);

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

    // Close mobile menu on scroll
    useEffect(() => {
        const handleScroll = () => {
            if (isMobileMenuOpen) {
                setIsMobileMenuOpen(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMobileMenuOpen]);

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

    const calendarWeeks = useMemo(() => {
        const weeks = [];
        
        const sortedEvents = [...events].sort((a, b) => {
            const durA = a.endTime.getTime() - a.startTime.getTime();
            const durB = b.endTime.getTime() - b.startTime.getTime();
            if (durA !== durB) return durB - durA; // Longest first
            return a.startTime.getTime() - b.startTime.getTime();
        });

        for (let i = 0; i < calendarDays.length; i += 7) {
            const weekDays = calendarDays.slice(i, i + 7);
            const weekStart = weekDays.find(d => d !== null);
            const weekEnd = [...weekDays].reverse().find(d => d !== null);
            
            if (!weekStart || !weekEnd) {
                weeks.push({ days: weekDays, events: [], maxSlots: 0 });
                continue;
            }

            // Boundary dates for this week
            const ws = new Date(weekStart); ws.setHours(0,0,0,0);
            const we = new Date(weekEnd); we.setHours(23,59,59,999);

            // Filter events that touch this week
            const eventsThisWeek = sortedEvents.filter(event => {
                const es = new Date(event.startTime); es.setHours(0,0,0,0);
                const ee = new Date(event.endTime); ee.setHours(23,59,59,999);
                return (es <= we && ee >= ws);
            });

            // Assign slots
            const slots: PublicEvent[][] = [];
            const weekEventsRender = [];

            eventsThisWeek.forEach(event => {
                const es = new Date(event.startTime); es.setHours(0,0,0,0);
                const ee = new Date(event.endTime); ee.setHours(23,59,59,999);

                // Find start and end indices within THIS week
                let startCol = 0;
                let endCol = 6;
                weekDays.forEach((day, idx) => {
                    if (!day) return;
                    const d = new Date(day); d.setHours(12,0,0,0);
                    if (isSameDay(d, event.startTime) || (idx === 0 && d > es)) {
                        startCol = idx;
                    }
                    if (isSameDay(d, event.endTime) || (idx === 6 && d < ee)) {
                        endCol = idx;
                    }
                });

                // Find free slot
                let slot = 0;
                while (true) {
                    if (!slots[slot]) slots[slot] = new Array(7).fill(null);
                    let free = true;
                    for (let c = startCol; c <= endCol; c++) {
                        if (slots[slot][c]) { free = false; break; }
                    }
                    if (free) break;
                    slot++;
                }

                // Fill slot and record render info
                for (let c = startCol; c <= endCol; c++) {
                    slots[slot][c] = event;
                }

                weekEventsRender.push({
                    event,
                    slot,
                    startCol: startCol + 1, // CSS grid is 1-indexed
                    span: endCol - startCol + 1,
                    isStart: isSameDay(event.startTime, weekDays[startCol] || new Date()),
                    isEnd: isSameDay(event.endTime, weekDays[endCol] || new Date())
                });
            });

            weeks.push({
                days: weekDays,
                events: weekEventsRender,
                maxSlots: slots.length
            });
        }
        
        return weeks;
    }, [calendarDays, events]);

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
        <div className="min-h-screen relative overflow-clip bg-bgMain">
            {/* ====== Header ====== */}
            <header ref={headerRef} className="sticky top-0 z-30 bg-bgMain/80 backdrop-blur-xl border-b border-borderSoft/40">
                <div className="flex items-center justify-between px-3 sm:px-6 py-3 max-w-7xl mx-auto">
                    {/* Left: Logo & Nav Links */}
                    <div className="flex items-center gap-3 sm:gap-6 min-w-0">
                        <div className="shrink-0">
                            <Logo size="md" />
                        </div>
                        
                        {/* Desktop Nav Links */}
                        <div className="hidden md:flex items-center gap-1 sm:gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/')}
                                className="rounded-xl h-10 px-2.5 sm:px-4 font-semibold text-brand bg-brand/5 hover:bg-brand/10 transition-all text-xs sm:text-sm"
                            >
                                Home
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/about-sbg')}
                                className="rounded-xl h-10 px-2.5 sm:px-4 font-semibold text-textSecondary hover:text-textPrimary hover:bg-hoverSoft transition-all text-xs sm:text-sm"
                            >
                                About SBG
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/clubs-committees')}
                                className="rounded-xl h-10 px-2.5 sm:px-4 font-semibold text-textSecondary hover:text-textPrimary hover:bg-hoverSoft transition-all text-xs sm:text-sm"
                            >
                                <span className="hidden sm:inline">Clubs & Committees</span>
                                <span className="sm:hidden">Clubs</span>
                            </Button>
                        </div>
                    </div>

                    {/* Right: Utilities */}
                    <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
                        <ThemeToggle />
                        
                        {/* Sign In (Desktop Only) */}
                        <div className="hidden md:block">
                            <Button
                                onClick={onGoToLogin}
                                className="rounded-xl h-10 px-3 sm:px-6 font-semibold bg-brand text-white hover:bg-brandLink transition-all shadow-md shadow-brand/20 hover:shadow-lg hover:shadow-brand/30 gap-1 text-xs sm:text-sm"
                            >
                                <span>Sign In</span>
                                <ArrowRight size={14} className="hidden sm:inline" />
                            </Button>
                        </div>

                        {/* Mobile Hamburger Button */}
                        <Button
                            variant="ghost"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-xl border border-borderSoft/40 bg-hoverSoft/20 text-textPrimary hover:bg-hoverSoft/40 transition-all"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </Button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="md:hidden border-t border-borderSoft/40 bg-bgMain/95 backdrop-blur-xl overflow-hidden"
                        >
                            <div className="flex flex-col gap-2 p-4">
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        navigate('/');
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="justify-start rounded-xl h-11 px-4 font-semibold text-brand bg-brand/5 hover:bg-brand/10 transition-all text-sm w-full"
                                >
                                    Home
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        navigate('/about-sbg');
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="justify-start rounded-xl h-11 px-4 font-semibold text-textSecondary hover:text-textPrimary hover:bg-hoverSoft transition-all text-sm w-full"
                                >
                                    About SBG
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        navigate('/clubs-committees');
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="justify-start rounded-xl h-11 px-4 font-semibold text-textSecondary hover:text-textPrimary hover:bg-hoverSoft transition-all text-sm w-full"
                                >
                                    Clubs & Committees
                                </Button>
                                <Button
                                    onClick={() => {
                                        onGoToLogin();
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="justify-center rounded-xl h-11 px-4 font-semibold bg-brand text-white hover:bg-brandLink transition-all shadow-md shadow-brand/20 hover:shadow-lg hover:shadow-brand/30 gap-1.5 text-sm w-full mt-2"
                                >
                                    <span>Sign In</span>
                                    <ArrowRight size={16} />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
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
                        <div className="flex flex-col border-x border-borderSoft/30">
                            {calendarWeeks.map((week, wIdx) => (
                                <div key={wIdx} className="relative grid grid-cols-7 border-b border-borderSoft/30 last:border-b-0 min-h-[80px] sm:min-h-[120px]">
                                    
                                    {/* Background Day Cells */}
                                    {week.days.map((day, dIdx) => {
                                        if (!day) {
                                            return (
                                                <div
                                                    key={`blank-${dIdx}`}
                                                    className="border-r border-borderSoft/20 last:border-r-0 bg-hoverSoft/20"
                                                />
                                            );
                                        }

                                        const isToday = isSameDay(day, today);
                                        const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                                        const maxVisible = 2;
                                        
                                        // Count events on this day using week slots
                                        const actualEventsCount = week.events.filter(we => we.startCol <= dIdx + 1 && we.startCol + we.span - 1 >= dIdx + 1).length;
                                        const overflow = actualEventsCount > maxVisible ? actualEventsCount - maxVisible : 0;

                                        return (
                                            <div
                                                key={day.toISOString()}
                                                className={`
                                                    p-1 sm:p-2 border-r border-borderSoft/20 last:border-r-0
                                                    transition-colors cursor-default flex flex-col
                                                    ${isToday ? 'bg-brand/4 dark:bg-brand/6' : ''}
                                                    ${!isCurrentMonth ? 'opacity-40' : ''}
                                                    hover:bg-hoverSoft/40
                                                `}
                                            >
                                                <div className="flex justify-between mb-1">
                                                    <span
                                                        className={`
                                                            inline-flex items-center justify-center text-xs sm:text-sm font-semibold z-20 relative
                                                            ${isToday
                                                                ? 'h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-brand text-white shadow-sm shadow-brand/30'
                                                                : 'text-textPrimary'
                                                            }
                                                        `}
                                                    >
                                                        {day.getDate()}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex-1" />
                                                
                                                {overflow > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            const dayEvents = week.events.filter(we => we.startCol <= dIdx + 1 && we.startCol + we.span - 1 >= dIdx + 1).map(we => we.event);
                                                            setSelectedDayEvents(dayEvents);
                                                        }}
                                                        className="w-full text-left text-[10px] sm:text-xs font-semibold text-brand hover:text-brandLink transition-colors px-1.5 z-20 relative mt-1"
                                                    >
                                                        +{overflow} more
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Foreground Event Overlays */}
                                    <div className="absolute top-[28px] sm:top-[36px] left-0 right-0 bottom-0 pointer-events-none grid grid-cols-7 gap-y-1 content-start z-10">
                                        {week.events.filter(we => we.slot < 2).map((we, eIdx) => {
                                            const c = getColor(we.event.eventType);
                                            return (
                                                <button
                                                    key={`${we.event.id}-${eIdx}`}
                                                    onClick={() => setSelectedEvent(we.event)}
                                                    className={`
                                                        pointer-events-auto block text-left h-[22px] sm:h-[26px] px-1.5 sm:px-2 text-[9px] sm:text-xs font-medium truncate
                                                        transition-all hover:brightness-95 border
                                                        ${c.bg} ${c.text} ${c.border}
                                                        ${we.isStart ? 'rounded-l-md ml-1 sm:ml-2' : 'rounded-l-none border-l-0 ml-0'}
                                                        ${we.isEnd ? 'rounded-r-md mr-1 sm:mr-2' : 'rounded-r-none border-r-0 mr-0'}
                                                    `}
                                                    style={{ 
                                                        gridColumn: `${we.startCol} / span ${we.span}`,
                                                        gridRow: we.slot + 1
                                                    }}
                                                    title={we.event.eventName}
                                                >
                                                    <span className="truncate block">
                                                        {(we.isStart || we.startCol === 1) && (
                                                            <>
                                                                <span className="hidden md:inline opacity-80 font-bold mr-1">{formatTime(we.event.startTime)}</span>
                                                                {we.event.eventName}
                                                            </>
                                                        )}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
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
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <p className="text-sm sm:text-base font-semibold text-textPrimary truncate">{event.eventName}</p>
                                                        {!isSameDay(event.startTime, event.endTime) && (
                                                            <span className="shrink-0 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">Multi-Day</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs sm:text-sm text-textSecondary truncate">
                                                        {event.clubName} · {event.venueName}
                                                    </p>
                                                    <p className="text-xs text-textMuted mt-1 flex items-center gap-1.5">
                                                        <Clock size={12} className="shrink-0" />
                                                        <span className="truncate">
                                                            {isSameDay(event.startTime, event.endTime) 
                                                                ? `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`
                                                                : `${formatDayLabel(event.startTime).split(',')[1].trim()} ${formatTime(event.startTime)} – ${formatDayLabel(event.endTime).split(',')[1].trim()} ${formatTime(event.endTime)}`
                                                            }
                                                        </span>
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
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
                        onClick={() => setSelectedEvent(null)}
                    >
                        <motion.div
                            initial={{ y: '20%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '20%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-borderSoft/80 overflow-hidden"
                        >
                            <div className={`h-1.5 ${getColor(selectedEvent.eventType).dot}`} />

                            <div className="p-5 sm:p-6 space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-bold text-textPrimary tracking-tight truncate flex items-center gap-2">
                                            <span className="truncate">{selectedEvent.eventName}</span>
                                            {!isSameDay(selectedEvent.startTime, selectedEvent.endTime) && (
                                                <span className="shrink-0 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-brand/10 text-brand border border-brand/20">Multi-Day</span>
                                            )}
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
                                                {isSameDay(selectedEvent.startTime, selectedEvent.endTime) 
                                                    ? selectedEvent.startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                                                    : `${selectedEvent.startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${selectedEvent.endTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                                }
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
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
                        onClick={() => setSelectedDayEvents(null)}
                    >
                        <motion.div
                            initial={{ y: '20%', opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: '20%', opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-borderSoft/80 overflow-hidden"
                        >
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
                    &copy; SBG {new Date().getFullYear()}
                </p>
                <div className="mt-4 flex justify-center">
                    <GdgFooterCredit />
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
