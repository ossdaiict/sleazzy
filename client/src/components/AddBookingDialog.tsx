import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { TimePicker } from './ui/time-picker';
import { apiRequest, ApiVenue } from '../lib/api';
import { Loader2, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type Club = {
    id: string;
    name: string;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void;
};

const EVENT_TYPES = [
    { value: 'co_curricular', label: 'Co-Curricular' },
    { value: 'open_all', label: 'Open for All' },
    { value: 'closed_club', label: 'Closed Club' },
];

const AddBookingDialog: React.FC<Props> = ({ open, onOpenChange, onCreated }) => {
    const [eventName, setEventName] = useState('');
    const [sbgClubId, setSbgClubId] = useState<string | null>(null);
    const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [eventType, setEventType] = useState('');
    const [expectedAttendees, setExpectedAttendees] = useState('');
    const [isPublic, setIsPublic] = useState(false);

    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const [venues, setVenues] = useState<ApiVenue[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coCurricularWarning, setCoCurricularWarning] = useState('');

    // Load venues and clubs
    useEffect(() => {
        if (open) {
            apiRequest<ApiVenue[]>('/api/venues')
                .then(setVenues)
                .catch(() => setVenues([]));
            // Auto-resolve SBG club
            apiRequest<Club[]>('/api/clubs')
                .then((clubs) => {
                    const sbg = clubs.find((c) =>
                        c.name.toLowerCase().includes('sbg') ||
                        c.name.toLowerCase().includes('student body')
                    );
                    setSbgClubId(sbg?.id || null);
                })
                .catch(() => setSbgClubId(null));
        }
    }, [open]);

    // Reset form when opened
    useEffect(() => {
        if (open) {
            setEventName('');
            setSelectedVenues([]);
            setDate(undefined);
            setStartTime('');
            setEndTime('');
            setEventType('');
            setExpectedAttendees('');
            setIsPublic(false);
            setError(null);
            setCoCurricularWarning('');
        }
    }, [open]);

    // Co-curricular limit check
    useEffect(() => {
        if (eventType !== 'co_curricular' || !sbgClubId) {
            setCoCurricularWarning('');
            return;
        }

        apiRequest<{ count: number; limit: number }>(
            `/api/bookings/co-curricular-count?clubId=${sbgClubId}`,
            { auth: true }
        )
            .then(({ count, limit }) => {
                if (count >= limit) {
                    setCoCurricularWarning(
                        `SBG has already booked ${limit} co-curricular events this semester. No more are allowed.`
                    );
                } else if (count === limit - 1) {
                    setCoCurricularWarning(
                        `Warning: This will be the last co-curricular event allowed this semester (${count}/${limit} used).`
                    );
                } else {
                    setCoCurricularWarning('');
                }
            })
            .catch(() => setCoCurricularWarning(''));
    }, [eventType, sbgClubId]);

    const toggleVenue = (venueId: string) => {
        setSelectedVenues((prev) =>
            prev.includes(venueId)
                ? prev.filter((v) => v !== venueId)
                : [...prev, venueId]
        );
    };

    const handleCreate = async () => {
        if (!eventName.trim()) {
            setError('Event name is required');
            return;
        }
        if (!sbgClubId) {
            setError('SBG club not found. Please ensure it exists in the system.');
            return;
        }
        if (selectedVenues.length === 0) {
            setError('Please select at least one venue');
            return;
        }
        if (!date || !startTime || !endTime) {
            setError('Date, start time, and end time are required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateString = `${year}-${month}-${day}`;

            const startDateTime = new Date(`${dateString}T${startTime}:00`);
            const endDateTime = new Date(`${dateString}T${endTime}:00`);

            await apiRequest('/api/admin/bookings', {
                method: 'POST',
                auth: true,
                body: {
                    club_id: sbgClubId,
                    venue_ids: selectedVenues,
                    event_name: eventName.trim(),
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    event_type: eventType || undefined,
                    expected_attendees: expectedAttendees
                        ? parseInt(expectedAttendees)
                        : undefined,
                    is_public: isPublic,
                },
            });
            onCreated();
            onOpenChange(false);
        } catch (err: any) {
            setError(err?.message || 'Failed to create event');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Add New Event</DialogTitle>
                    <DialogDescription>
                        Create a new event directly. It will be auto-approved.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="text-sm text-error bg-error/10 border border-error/20 rounded-md px-3 py-2">
                        {error}
                    </div>
                )}

                <div className="grid gap-4 py-2">
                    {/* Event Name */}
                    <div className="grid gap-2">
                        <Label htmlFor="add-event-name">Event Name</Label>
                        <Input
                            id="add-event-name"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            placeholder="Enter event name"
                            className="bg-card border-borderSoft"
                        />
                    </div>

                    {/* Club (fixed to SBG) */}
                    <div className="grid gap-2">
                        <Label>Organizing Club</Label>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-borderSoft bg-hoverSoft/50 text-sm text-textPrimary">
                            <span className="font-medium">SBG</span>
                            <span className="text-textMuted text-xs">(Student Body Government)</span>
                        </div>
                        {!sbgClubId && (
                            <p className="text-xs text-warning">SBG club not found in system — event creation won't work until it's added.</p>
                        )}
                    </div>

                    {/* Venues */}
                    <div className="grid gap-2">
                        <Label>Venues</Label>
                        <div className="max-h-36 overflow-y-auto rounded-md border border-borderSoft p-2 space-y-1 bg-card">
                            {venues.length === 0 ? (
                                <p className="text-xs text-textMuted py-2 text-center">Loading venues...</p>
                            ) : (
                                venues.map((v) => (
                                    <label
                                        key={v.id}
                                        className={`
                                            flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors
                                            ${selectedVenues.includes(v.id)
                                                ? 'bg-brand/10 text-brand font-medium'
                                                : 'hover:bg-hoverSoft text-textPrimary'
                                            }
                                        `}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedVenues.includes(v.id)}
                                            onChange={() => toggleVenue(v.id)}
                                            className="accent-[var(--brand)] rounded"
                                        />
                                        {v.name}
                                        {v.capacity && (
                                            <span className="text-xs text-textMuted ml-auto">
                                                Cap: {v.capacity}
                                            </span>
                                        )}
                                    </label>
                                ))
                            )}
                        </div>
                        {selectedVenues.length > 0 && (
                            <p className="text-xs text-textMuted">
                                {selectedVenues.length} venue{selectedVenues.length > 1 ? 's' : ''} selected
                            </p>
                        )}
                    </div>

                    {/* Date / Time */}
                    <div className="grid gap-2">
                        <Label>Schedule</Label>
                        <div className="grid gap-3 p-3 rounded-md border border-borderSoft bg-card">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-textSecondary">Date</Label>
                                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full h-10 justify-start text-left font-medium border-borderSoft hover:bg-hoverSoft transition-all bg-card text-textPrimary rounded-md shadow-sm",
                                                !date && "text-textMuted"
                                            )}
                                            onClick={() => setDatePickerOpen(true)}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 text-brand opacity-70" />
                                            {date ? (
                                                <span>
                                                    {date.toLocaleDateString('en-US', {
                                                        weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
                                                    })}
                                                </span>
                                            ) : (
                                                <span>Pick a date</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-3" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={(d) => { setDate(d); setDatePickerOpen(false); }}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-textSecondary">Start Time</Label>
                                    <TimePicker
                                        value={startTime}
                                        onChange={setStartTime}
                                        className="h-10 rounded-md"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-textSecondary">End Time</Label>
                                    <TimePicker
                                        value={endTime}
                                        onChange={setEndTime}
                                        className="h-10 rounded-md"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Event Type */}
                    <div className="grid gap-2">
                        <Label>Event Type</Label>
                        <Select value={eventType} onValueChange={setEventType}>
                            <SelectTrigger className="bg-card">
                                <SelectValue placeholder="Select type (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                {EVENT_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {coCurricularWarning && (
                        <div className={`text-sm rounded-md px-3 py-2 border ${coCurricularWarning.startsWith('SBG has already')
                            ? 'text-error bg-error/10 border-error/20'
                            : 'text-warning bg-warning/10 border-warning/20'
                            }`}>
                            {coCurricularWarning}
                        </div>
                    )}

                    {/* Expected Attendees */}
                    <div className="grid gap-2">
                        <Label htmlFor="add-attendees">Expected Attendees</Label>
                        <Input
                            id="add-attendees"
                            type="number"
                            value={expectedAttendees}
                            onChange={(e) => setExpectedAttendees(e.target.value)}
                            placeholder="e.g. 100 (optional)"
                            className="bg-card"
                        />
                    </div>

                    {/* Public Visibility */}
                    <div className="flex items-center justify-between p-3 rounded-md border border-borderSoft bg-card">
                        <div className="grid gap-0.5">
                            <Label htmlFor="add-public">Publicly Visible</Label>
                            <p className="text-xs text-textSecondary">Show on landing page calendar</p>
                        </div>
                        <button
                            id="add-public"
                            type="button"
                            role="switch"
                            aria-checked={isPublic}
                            onClick={() => setIsPublic(!isPublic)}
                            className={`
                                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
                                border-2 border-transparent transition-colors duration-200
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50
                                ${isPublic ? 'bg-brand' : 'bg-borderSoft'}
                            `}
                        >
                            <span
                                className={`
                                    pointer-events-none inline-block h-5 w-5 rounded-full
                                    bg-white shadow-sm transform transition-transform duration-200
                                    ${isPublic ? 'translate-x-5' : 'translate-x-0'}
                                `}
                            />
                        </button>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={saving || coCurricularWarning.startsWith('SBG has already')} className="gap-2 bg-brand text-bgMain">
                        {saving ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Plus size={14} />
                        )}
                        Create Event
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddBookingDialog;