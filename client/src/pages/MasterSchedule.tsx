import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { apiRequest, ApiBooking, mapBooking } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Calendar, Clock, MapPin, Search, AlertTriangle, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, Eye, EyeOff, Pencil } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import EditBookingDialog from '../components/EditBookingDialog';

type SortField = 'date' | 'eventName' | 'status';
type SortDirection = 'asc' | 'desc';

const SORT_OPTIONS: { field: SortField; label: string }[] = [
    { field: 'date', label: 'Date' },
    { field: 'eventName', label: 'Event Name' },
    { field: 'status', label: 'Status' },
];

const MasterSchedule: React.FC = () => {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const [selectedVenue, setSelectedVenue] = useState<string>('all');
    const [selectedClub, setSelectedClub] = useState<string>('all');
    const [editBooking, setEditBooking] = useState<any | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiRequest<ApiBooking[]>('/api/admin/bookings', { auth: true });
            setBookings(data.map(mapBooking));
        } catch (err) {
            console.error('Failed to fetch schedule:', err);
            setError(getErrorMessage(err, 'Failed to load schedule.'));
            setBookings([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    const venueNames = useMemo(() => {
        const names = Array.from(new Set(bookings.map((b: any) => b.venueName as string)));
        return names.sort();
    }, [bookings]);

    const clubNames = useMemo(() => {
        const names = Array.from(new Set(bookings.map((b: any) => b.clubName as string)));
        return names.sort();
    }, [bookings]);

    const filteredBookings = bookings.filter(b => {
        const matchesSearch =
            b.eventName.toLowerCase().includes(search.toLowerCase()) ||
            b.clubName.toLowerCase().includes(search.toLowerCase()) ||
            b.venueName.toLowerCase().includes(search.toLowerCase());
        const matchesVenue = selectedVenue === 'all' || b.venueName === selectedVenue;
        const matchesClub = selectedClub === 'all' || b.clubName === selectedClub;
        return matchesSearch && matchesVenue && matchesClub;
    });

    const sortedBookings = useMemo(() => {
        const sorted = [...filteredBookings].sort((a, b) => {
            let cmp = 0;
            if (sortField === 'date') {
                cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
            } else {
                const aVal = (a[sortField] || '').toLowerCase();
                const bVal = (b[sortField] || '').toLowerCase();
                cmp = aVal.localeCompare(bVal);
            }
            return sortDirection === 'asc' ? cmp : -cmp;
        });
        return sorted;
    }, [filteredBookings, sortField, sortDirection]);

    const handleSortClick = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const getStatusVariant = (status: string): "success" | "destructive" | "pending" | "default" => {
        switch (status) {
            case 'approved': return 'success';
            case 'rejected': return 'destructive';
            case 'pending': return 'pending';
            default: return 'default';
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown size={14} className="opacity-40" />;
        return sortDirection === 'asc'
            ? <ArrowUp size={14} />
            : <ArrowDown size={14} />;
    };

    const toggleVisibility = async (bookingId: string, currentValue: boolean) => {
        // Optimistic update
        setBookings(prev =>
            prev.map(b => b.id === bookingId ? { ...b, isPublic: !currentValue } : b)
        );
        try {
            await apiRequest(`/api/admin/bookings/${bookingId}/visibility`, {
                method: 'PATCH',
                auth: true,
                body: { is_public: !currentValue },
            });
        } catch (err) {
            console.error('Failed to toggle visibility:', err);
            // Revert on failure
            setBookings(prev =>
                prev.map(b => b.id === bookingId ? { ...b, isPublic: currentValue } : b)
            );
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-6"
            >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Master Schedule</h1>
                        <p className="text-textMuted text-sm sm:text-base mt-1">View all venue bookings across the campus.</p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                        <div className="relative flex-1 sm:w-64">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-textMuted pointer-events-none" />
                            <Input
                                placeholder="Search events..."
                                className="pl-10 rounded-xl w-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <select
                                value={selectedVenue}
                                onChange={(e) => setSelectedVenue(e.target.value)}
                                className="
                                appearance-none rounded-xl
                                px-3 pr-8 py-2 text-sm cursor-pointer
                                bg-[var(--color-cardBg,#1e1e2e)] text-[var(--color-textPrimary,#e2e2e2)]
                                border border-[var(--color-borderSoft,#2a2a3a)]
                                focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand
                                transition-all duration-200
                                [&>option]:bg-[var(--color-cardBg,#1e1e2e)] [&>option]:text-[var(--color-textPrimary,#e2e2e2)]
                            "
                            >
                                <option value="all">All Venues</option>
                                {venueNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select
                                value={selectedClub}
                                onChange={(e) => setSelectedClub(e.target.value)}
                                className="
                                appearance-none rounded-xl
                                px-3 pr-8 py-2 text-sm cursor-pointer
                                bg-[var(--card)] text-[var(--textPrimary)]
                                border border-[var(--borderSoft)]
                                focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand
                                transition-all duration-200
                                [&>option]:bg-[var(--popover)] [&>option]:text-[var(--popover-foreground)]
                            "
                            >
                                <option value="all">All Clubs</option>
                                {clubNames.map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Sort controls */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-textMuted mr-1">Sort by:</span>
                    {SORT_OPTIONS.map(({ field, label }) => (
                        <button
                            key={field}
                            onClick={() => handleSortClick(field)}
                            className={`
                            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                            transition-all duration-200 border cursor-pointer
                            ${sortField === field
                                    ? 'bg-brand/15 text-brand border-brand/40 shadow-sm shadow-brand/10'
                                    : 'bg-hoverSoft text-textMuted border-borderSoft hover:border-brand/20 hover:text-textPrimary'
                                }
                        `}
                        >
                            {label}
                            <SortIcon field={field} />
                        </button>
                    ))}
                </div>

                {error && (
                    <Alert variant="destructive" className="rounded-xl mb-6">
                        <AlertTriangle size={16} />
                        <AlertTitle>Could not load schedule</AlertTitle>
                        <AlertDescription className="mt-1">{error}</AlertDescription>
                        <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={fetchBookings}>
                            <RefreshCw size={14} />
                            Retry
                        </Button>
                    </Alert>
                )}
                {loading ? (
                    <div className="grid gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <Skeleton key={i} className="h-28 sm:h-24 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {sortedBookings.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-12 sm:py-16 text-textMuted bg-hoverSoft rounded-xl border-2 border-dashed border-borderSoft"
                            >
                                <p className="font-medium">No bookings found matching your search.</p>
                            </motion.div>
                        ) : (
                            <div className="grid gap-4">
                                {sortedBookings.map((booking, index) => (
                                    <motion.div
                                        key={booking.id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                    >
                                        <Card className="rounded-2xl rounded-xl overflow-hidden hover:border-brand/30 transition-colors">
                                            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="font-semibold text-lg">{booking.eventName}</div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => toggleVisibility(booking.id, booking.isPublic)}
                                                                title={booking.isPublic ? 'Visible to public' : 'Hidden from public'}
                                                                className={`
                                                                p-1.5 rounded-lg transition-all duration-200 cursor-pointer
                                                                ${booking.isPublic
                                                                        ? 'text-success hover:bg-success/10'
                                                                        : 'text-textMuted hover:bg-hoverSoft'
                                                                    }
                                                            `}
                                                            >
                                                                {booking.isPublic ? <Eye size={16} /> : <EyeOff size={16} />}
                                                            </button>
                                                            <Badge variant={getStatusVariant(booking.status)}>
                                                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                            </Badge>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-textMuted">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin size={14} />
                                                            <span>{booking.venueName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Calendar size={14} />
                                                            <span>{new Date(booking.date).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Clock size={14} />
                                                            <span>{booking.startTime} - {booking.endTime}</span>
                                                        </div>
                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between">
                                                        <span className="text-xs font-medium text-primary">
                                                            Organized by {booking.clubName}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                setEditBooking(booking);
                                                                setEditDialogOpen(true);
                                                            }}
                                                            className="p-1.5 rounded-lg text-textMuted hover:text-brand hover:bg-brand/10 transition-all duration-200 cursor-pointer"
                                                            title="Edit event"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </motion.div>

            <EditBookingDialog
                booking={editBooking}
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                onSaved={fetchBookings}
                onDeleted={fetchBookings}
            />

        </>
    );
};

export default MasterSchedule;
