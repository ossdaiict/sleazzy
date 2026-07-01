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
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { DatePicker } from './ui/date-picker';
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
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);
    const [allClubs, setAllClubs] = useState<Club[]>([]);
    const [selectedVenues, setSelectedVenues] = useState<string[]>([]);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [eventType, setEventType] = useState('');
    const [expectedAttendees, setExpectedAttendees] = useState('');
    
    const [clubEvents, setClubEvents] = useState<any[]>([]);
    const [selectedEventId, setSelectedEventId] = useState('');

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
                    setAllClubs(clubs);
                    const sbg = clubs.find((c) =>
                        c.name.toLowerCase().includes('sbg') ||
                        c.name.toLowerCase().includes('student body')
                    );
                    const clubId = sbg?.id || clubs[0]?.id || null;
                    setSelectedClubId(clubId);
                })
                .catch(() => {
                    setSelectedClubId(null);
                    setAllClubs([]);
                });
        }
    }, [open]);

    // Fetch events when club changes
    useEffect(() => {
        if (selectedClubId) {
            apiRequest<any[]>(`/api/admin/clubs/${selectedClubId}/events`, { auth: true })
                .then(setClubEvents)
                .catch(() => setClubEvents([]));
        } else {
            setClubEvents([]);
        }
    }, [selectedClubId]);

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
            setSelectedEventId('');
            setError(null);
            setCoCurricularWarning('');
        }
    }, [open]);

    // Sync eventType with selected event
    useEffect(() => {
        if (selectedEventId) {
            const evt = clubEvents.find(e => e.id === selectedEventId);
            if (evt && evt.event_type) {
                setEventType(evt.event_type);
            }
        }
    }, [selectedEventId, clubEvents]);

    // Co-curricular limit check
    useEffect(() => {
        if (eventType !== 'co_curricular' || !selectedClubId) {
            setCoCurricularWarning('');
            return;
        }

        apiRequest<{ count: number; limit: number }>(
            `/api/bookings/co-curricular-count?clubId=${selectedClubId}`,
            { auth: true }
        )
            .then(({ count, limit }) => {
                if (count >= limit) {
                    setCoCurricularWarning(
                        `This club has already booked ${limit} co-curricular events this semester. (Admin Override Active - You can still book)`
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
    }, [eventType, selectedClubId]);

    const toggleVenue = (venueId: string) => {
        setSelectedVenues((prev) =>
            prev.includes(venueId)
                ? prev.filter((v) => v !== venueId)
                : [...prev, venueId]
        );
    };

    const handleCreate = async () => {
        if (!selectedClubId) {
            setError('Please select an organizing club.');
            return;
        }
        if (!selectedEventId) {
            setError('Please select an existing event');
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
                    club_id: selectedClubId,
                    venue_ids: selectedVenues,
                    event_id: selectedEventId,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    expected_attendees: expectedAttendees
                        ? parseInt(expectedAttendees)
                        : undefined,
                },
            });
            onCreated();
            onOpenChange(false);
        } catch (err: any) {
            setError(err?.message || 'Failed to register/book');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Book Venues</DialogTitle>
                    <DialogDescription>
                        Book venues for an existing event.
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <div className="text-sm text-error bg-error/10 border border-error/20 rounded-md px-3 py-2">
                        {error}
                    </div>
                )}

                <div className="grid gap-4 py-2">
                    {/* Club Selection */}
                    <div className="grid gap-2">
                        <Label>Organizing Club</Label>
                        <Select value={selectedClubId || ''} onValueChange={setSelectedClubId}>
                            <SelectTrigger className="bg-card border-borderSoft">
                                <SelectValue placeholder="Select club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allClubs.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label>Select Event</Label>
                        <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                            <SelectTrigger className="bg-card">
                                <SelectValue placeholder="Select an event" />
                            </SelectTrigger>
                            <SelectContent>
                                {clubEvents.map((evt) => (
                                    <SelectItem key={evt.id} value={evt.id}>
                                        {evt.name}
                                    </SelectItem>
                                ))}
                                {clubEvents.length === 0 && (
                                    <div className="px-2 py-3 text-sm text-textMuted text-center">No events found for this club</div>
                                )}
                            </SelectContent>
                        </Select>
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
                                <DatePicker
                                    date={date}
                                    setDate={setDate}
                                    className="bg-card"
                                />
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

                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={saving} className="gap-2 bg-brand text-bgMain">
                        {saving ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Plus size={14} />
                        )}
                        Book Venues
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AddBookingDialog;