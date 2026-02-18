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
import { Trash2, Loader2 } from 'lucide-react';

type Booking = {
    id: string;
    eventName: string;
    venueName: string;
    venueId: string;
    clubName: string;
    date: string;
    startTime: string;
    endTime: string;
    status: string;
    eventType?: string;
    expectedAttendees?: number;
    isPublic: boolean;
    batchId?: string;
};

type Props = {
    booking: Booking | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    onDeleted: () => void;
};

const EVENT_TYPES = [
    { value: 'co_curricular', label: 'Co-Curricular' },
    { value: 'open_all', label: 'Open for All' },
    { value: 'closed_club', label: 'Closed Club' },
];

const STATUSES = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
];

const EditBookingDialog: React.FC<Props> = ({
    booking,
    open,
    onOpenChange,
    onSaved,
    onDeleted,
}) => {
    const [eventName, setEventName] = useState('');
    const [venueId, setVenueId] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [eventType, setEventType] = useState('');
    const [expectedAttendees, setExpectedAttendees] = useState('');
    const [status, setStatus] = useState('');
    const [isPublic, setIsPublic] = useState(false);

    const [venues, setVenues] = useState<ApiVenue[]>([]);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load venues list
    useEffect(() => {
        apiRequest<ApiVenue[]>('/api/venues')
            .then(setVenues)
            .catch(() => setVenues([]));
    }, []);

    // Populate form from booking
    useEffect(() => {
        if (booking) {
            setEventName(booking.eventName);
            setVenueId(booking.venueId);
            setEventType(booking.eventType || '');
            setExpectedAttendees(
                booking.expectedAttendees ? String(booking.expectedAttendees) : ''
            );
            setStatus(booking.status);
            setIsPublic(booking.isPublic);
            setConfirmDelete(false);
            setError(null);

            // Convert ISO date + localeTimeString back to datetime-local format
            const start = new Date(booking.date);
            // Parse the start/end time strings to set on the same date
            setStartTime(toDatetimeLocal(booking.date, booking.startTime));
            setEndTime(toDatetimeLocal(booking.date, booking.endTime));
        }
    }, [booking]);

    const toDatetimeLocal = (isoDate: string, timeStr: string): string => {
        // timeStr is like "6:05 PM"
        const date = new Date(isoDate);
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':').map(Number);

        if (modifier === 'PM' && hours !== 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const h = String(hours).padStart(2, '0');
        const m = String(minutes).padStart(2, '0');

        return `${year}-${month}-${day}T${h}:${m}`;
    };

    const handleSave = async () => {
        if (!booking) return;
        setSaving(true);
        setError(null);

        try {
            await apiRequest(`/api/admin/bookings/${booking.id}`, {
                method: 'PUT',
                auth: true,
                body: {
                    event_name: eventName,
                    venue_id: venueId,
                    start_time: new Date(startTime).toISOString(),
                    end_time: new Date(endTime).toISOString(),
                    event_type: eventType || undefined,
                    expected_attendees: expectedAttendees
                        ? parseInt(expectedAttendees)
                        : undefined,
                    status,
                    is_public: isPublic,
                },
            });
            onSaved();
            onOpenChange(false);
        } catch (err: any) {
            setError(err?.message || 'Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!booking) return;
        if (!confirmDelete) {
            setConfirmDelete(true);
            return;
        }

        setDeleting(true);
        setError(null);

        try {
            await apiRequest(`/api/admin/bookings/${booking.id}`, {
                method: 'DELETE',
                auth: true,
            });
            onDeleted();
            onOpenChange(false);
        } catch (err: any) {
            setError(err?.message || 'Failed to delete event');
        } finally {
            setDeleting(false);
            setConfirmDelete(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Event</DialogTitle>
                    <DialogDescription>
                        Modify event details or delete this event entirely.
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
                        <Label htmlFor="edit-event-name">Event Name</Label>
                        <Input
                            id="edit-event-name"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                            placeholder="Event name"
                        />
                    </div>

                    {/* Venue */}
                    <div className="grid gap-2">
                        <Label>Venue</Label>
                        <Select value={venueId} onValueChange={setVenueId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select venue" />
                            </SelectTrigger>
                            <SelectContent>
                                {venues.map((v) => (
                                    <SelectItem key={v.id} value={v.id}>
                                        {v.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Start / End Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-start-time">Start Time</Label>
                            <Input
                                id="edit-start-time"
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-end-time">End Time</Label>
                            <Input
                                id="edit-end-time"
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Event Type & Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label>Event Type</Label>
                            <Select value={eventType} onValueChange={setEventType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
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
                        <div className="grid gap-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {STATUSES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>
                                            {s.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Expected Attendees */}
                    <div className="grid gap-2">
                        <Label htmlFor="edit-attendees">Expected Attendees</Label>
                        <Input
                            id="edit-attendees"
                            type="number"
                            value={expectedAttendees}
                            onChange={(e) => setExpectedAttendees(e.target.value)}
                            placeholder="e.g. 100"
                        />
                    </div>

                    {/* Public Visibility toggle */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="edit-public">Publicly visible</Label>
                        <button
                            id="edit-public"
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

                <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2">
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={saving || deleting}
                        className="gap-2"
                    >
                        {deleting ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Trash2 size={14} />
                        )}
                        {confirmDelete ? 'Confirm Delete' : 'Delete Event'}
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving || deleting}>
                            {saving && <Loader2 size={14} className="animate-spin mr-2" />}
                            Save Changes
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default EditBookingDialog;
