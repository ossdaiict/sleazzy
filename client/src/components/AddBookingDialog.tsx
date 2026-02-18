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
import { apiRequest, ApiVenue } from '../lib/api';
import { Loader2, Plus } from 'lucide-react';

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
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [eventType, setEventType] = useState('');
    const [expectedAttendees, setExpectedAttendees] = useState('');
    const [isPublic, setIsPublic] = useState(false);

    const [venues, setVenues] = useState<ApiVenue[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            setStartTime('');
            setEndTime('');
            setEventType('');
            setExpectedAttendees('');
            setIsPublic(false);
            setError(null);
        }
    }, [open]);

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
        if (!startTime || !endTime) {
            setError('Start and end times are required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await apiRequest('/api/admin/bookings', {
                method: 'POST',
                auth: true,
                body: {
                    club_id: sbgClubId,
                    venue_ids: selectedVenues,
                    event_name: eventName.trim(),
                    start_time: new Date(startTime).toISOString(),
                    end_time: new Date(endTime).toISOString(),
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
                    <div className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">
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
                        />
                    </div>

                    {/* Club (fixed to SBG) */}
                    <div className="grid gap-2">
                        <Label>Organizing Club</Label>
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-borderSoft bg-hoverSoft text-sm text-textPrimary">
                            <span className="font-medium">SBG</span>
                            <span className="text-textMuted text-xs">(Student Body Government)</span>
                        </div>
                        {!sbgClubId && (
                            <p className="text-xs text-warning">SBG club not found in system — event creation won't work until it's added.</p>
                        )}
                    </div>

                    {/* Venues (multi-select as checkboxes) */}
                    <div className="grid gap-2">
                        <Label>Venues</Label>
                        <div className="max-h-36 overflow-y-auto rounded-lg border border-borderSoft p-2 space-y-1">
                            {venues.length === 0 ? (
                                <p className="text-xs text-textMuted py-2 text-center">Loading venues...</p>
                            ) : (
                                venues.map((v) => (
                                    <label
                                        key={v.id}
                                        className={`
                                            flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors
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

                    {/* Start / End Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="add-start-time">Start Time</Label>
                            <Input
                                id="add-start-time"
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="add-end-time">End Time</Label>
                            <Input
                                id="add-end-time"
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Event Type */}
                    <div className="grid gap-2">
                        <Label>Event Type</Label>
                        <Select value={eventType} onValueChange={setEventType}>
                            <SelectTrigger>
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

                    {/* Expected Attendees */}
                    <div className="grid gap-2">
                        <Label htmlFor="add-attendees">Expected Attendees</Label>
                        <Input
                            id="add-attendees"
                            type="number"
                            value={expectedAttendees}
                            onChange={(e) => setExpectedAttendees(e.target.value)}
                            placeholder="e.g. 100 (optional)"
                        />
                    </div>

                    {/* Public Visibility */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="add-public">Publicly visible</Label>
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
                                    bg-white shadow-lg transform transition-transform duration-200
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
                    <Button onClick={handleCreate} disabled={saving} className="gap-2">
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
