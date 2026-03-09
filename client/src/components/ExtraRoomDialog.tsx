import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { apiRequest, ApiVenue } from '../lib/api';
import { GroupedBooking, Booking } from '../types';
import { Clock, MapPin, Calendar, Loader2, CheckCircle2, AlertCircle, EyeOff, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ExtraRoomDialogProps {
    booking: GroupedBooking | Booking | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const ExtraRoomDialog: React.FC<ExtraRoomDialogProps> = ({ booking, open, onOpenChange, onSuccess }) => {
    const [venues, setVenues] = useState<(ApiVenue & { isBusy?: boolean, isAlreadyIn?: boolean })[]>([]);
    const [selectedVenueId, setSelectedVenueId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingVenues, setIsLoadingVenues] = useState(false);

    useEffect(() => {
        if (open && booking) {
            fetchAvailableVenues();
        } else {
            setSelectedVenueId('');
        }
    }, [open, booking]);

    const fetchAvailableVenues = async () => {
        if (!booking) return;
        setIsLoadingVenues(true);
        try {
            const firstBooking = 'bookings' in booking ? booking.bookings[0] : (booking as Booking);
            const startTime = (firstBooking as any).startTimeISO || firstBooking.date;
            const endTime = (firstBooking as any).endTimeISO || new Date(new Date(firstBooking.date).getTime() + 3600000).toISOString();

            // Fetch all venues and busy venue IDs in parallel with proper encoding
            const [allVenues, busyVenueIds] = await Promise.all([
                apiRequest<ApiVenue[]>('/api/venues'),
                apiRequest<string[]>(`/api/busy-venues?startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`)
            ]);

            const existingVenueIds = 'bookings' in booking
                ? booking.bookings.filter(b => b.status !== 'rejected').map(b => b.venueId)
                : booking.status !== 'rejected' ? [booking.venueId] : [];

            const processedVenues = allVenues.map(v => ({
                ...v,
                isBusy: busyVenueIds.includes(v.id),
                isAlreadyIn: existingVenueIds.includes(v.id)
            }));

            // We hide venues already in the booking, but show busy ones as disabled
            setVenues(processedVenues.filter(v => !v.isAlreadyIn));
        } catch (err) {
            console.error('Failed to fetch venues:', err);
            toast.error('Failed to load available venues');
        } finally {
            setIsLoadingVenues(false);
        }
    };

    const handleRequest = async () => {
        if (!booking || !selectedVenueId) return;

        setIsSubmitting(true);
        try {
            const firstBooking = 'bookings' in booking ? booking.bookings[0] : (booking as Booking);
            const startTime = firstBooking.startTimeISO || firstBooking.date;
            const endTime = firstBooking.endTimeISO || new Date(new Date(firstBooking.date).getTime() + 3600000).toISOString();

            const payload = {
                clubId: booking.clubId,
                venueIds: [selectedVenueId],
                eventType: booking.eventType,
                eventName: booking.eventName,
                startTime,
                endTime,
                expectedAttendees: booking.expectedAttendees,
                batchId: booking.batchId,
            };

            await apiRequest('/api/bookings', {
                method: 'POST',
                auth: true,
                body: payload
            });

            toast.success('Extra room requested successfully');
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error('Request failed:', err);
            toast.error(err.message || 'Failed to request extra room');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!booking) return null;

    const eventDate = new Date(booking.date);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden rounded-[1.5rem] border border-border bg-background shadow-xl">
                {/* Minimal Premium Header */}
                <div className="bg-muted/30 px-6 py-6 border-b border-border">
                    <DialogHeader className="flex flex-row items-center gap-4 space-y-0">
                        <div className="h-10 w-10 rounded-xl bg-brand/10 dark:bg-brand/20 flex items-center justify-center text-brand shrink-0">
                            <Plus size={20} strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                            <DialogTitle className="text-xl font-bold text-foreground leading-tight">
                                Extra Room
                            </DialogTitle>
                            <DialogDescription className="text-sm font-medium text-muted-foreground opacity-70">
                                Add a location to your event
                            </DialogDescription>
                        </div>
                    </DialogHeader>
                </div>

                <div className="p-6 space-y-6">
                    {/* Compact Event Brief */}
                    <div className="p-4 rounded-xl bg-muted/20 border border-border/50 text-xs font-medium space-y-2.5">
                        <div className="flex justify-between items-center text-muted-foreground uppercase tracking-widest font-black text-[10px]">
                            <span>{booking.eventName}</span>
                            <span>{eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-foreground font-bold text-sm">
                            <Clock size={14} className="text-brand/60" />
                            {booking.startTime} - {booking.endTime}
                            <span className="mx-1 opacity-20">|</span>
                            <span className="text-muted-foreground">{booking.clubName}</span>
                        </div>
                    </div>

                    {/* Venue Selection */}
                    <div className="space-y-2.5">
                        <label className="text-[11px] font-black text-foreground uppercase tracking-widest opacity-60 ml-1">Choose Venue</label>

                        <Select
                            value={selectedVenueId}
                            onValueChange={setSelectedVenueId}
                            disabled={isLoadingVenues || isSubmitting}
                        >
                            <SelectTrigger className="h-12 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground focus:ring-1 focus:ring-brand/30 transition-all">
                                <div className="flex items-center gap-2.5">
                                    <MapPin size={16} className="text-brand/60" />
                                    <SelectValue placeholder={isLoadingVenues ? "Loading..." : "Select venue"} />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-border shadow-xl p-1 max-h-[300px]">
                                {venues.map(v => (
                                    <SelectItem
                                        key={v.id}
                                        value={v.id}
                                        disabled={v.isBusy}
                                        className={cn(
                                            "py-2 px-3 rounded-lg mb-0.5 text-sm transition-all",
                                            v.isBusy ? "opacity-50" : "focus:bg-brand/5 focus:text-brand cursor-pointer"
                                        )}
                                    >
                                        <div className="flex items-center justify-between w-full pr-1">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-foreground leading-snug">{v.name}</span>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70 tracking-tight">Category {v.category}</span>
                                            </div>
                                            {v.isBusy && (
                                                <div className="ml-auto pl-4">
                                                    <span className="inline-block text-[10px] font-black text-error uppercase tracking-wide border border-error/30 bg-error/10 px-2 py-1 rounded shadow-sm">
                                                        Busy
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                                {venues.length === 0 && !isLoadingVenues && (
                                    <div className="py-10 text-center">
                                        <EyeOff className="h-8 w-8 mx-auto text-muted-foreground/20 mb-2" />
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">No venues found</p>
                                    </div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-orange-500/5 border border-orange-500/10">
                        <AlertCircle size={14} className="text-orange-500/70 shrink-0" />
                        <p className="text-[10px] font-bold text-orange-500/80 leading-tight uppercase tracking-tight">
                            Event timings are fixed.
                        </p>
                    </div>
                </div>

                <DialogFooter className="p-5 bg-muted/10 border-t border-border flex flex-row items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                        className="flex-1 rounded-xl h-11 font-bold text-sm text-muted-foreground hover:bg-background transition-all"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleRequest}
                        disabled={!selectedVenueId || isSubmitting}
                        className="flex-[1.2] rounded-xl h-11 font-bold text-sm gap-2 text-white shadow-lg shadow-brand/10 transition-all"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <CheckCircle2 size={16} />
                        )}
                        Confirm
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ExtraRoomDialog;
