import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Upload, FileText, AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { apiRequest, mapBooking, groupBookings, type ApiBooking, type ApiVenue } from '../lib/api';
import { toastInfo, toastError } from '../lib/toast';
import { getErrorMessage } from '../lib/errors';
import { Booking, GroupedBooking } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getSocket, SOCKET_EVENTS } from '../lib/socket';
import ExtraRoomDialog from '../components/ExtraRoomDialog';

const MyBookings: React.FC = () => {
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extra Room Dialog State
  const [isExtraRoomOpen, setIsExtraRoomOpen] = useState(false);
  const [selectedBookingForExtra, setSelectedBookingForExtra] = useState<GroupedBooking | null>(null);

  const fetchBookings = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [venuesData, bookingsData] = await Promise.all([
        apiRequest<ApiVenue[]>('/api/venues'),
        apiRequest<ApiBooking[]>('/api/my-bookings', { auth: true }),
      ]);
      setVenues(venuesData);
      setMyBookings(bookingsData.map(mapBooking));
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setError(getErrorMessage(err, 'Failed to load bookings.'));
      setMyBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-time updates
  React.useEffect(() => {
    const socket = getSocket();

    if (myBookings.length > 0) {
      socket.emit(SOCKET_EVENTS.JOIN_CLUB, myBookings[0].clubId);
    }

    const handleStatusChanged = () => fetchBookings();
    const handleEventsUpdated = () => fetchBookings();

    socket.on(SOCKET_EVENTS.BOOKING_STATUS_CHANGED, handleStatusChanged);
    socket.on(SOCKET_EVENTS.EVENTS_UPDATED, handleEventsUpdated);

    return () => {
      socket.off(SOCKET_EVENTS.BOOKING_STATUS_CHANGED, handleStatusChanged);
      socket.off(SOCKET_EVENTS.EVENTS_UPDATED, handleEventsUpdated);
    };
  }, [fetchBookings, myBookings]);

  const getVenueName = (id: string) => venues.find(v => v.id === id)?.name || id;

  const groupedBookings = React.useMemo(() => {
    return groupBookings(myBookings, venues);
  }, [myBookings, venues]);

  const isPastEvent = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    return eventDate < today;
  };

  const handleFileUpload = (id: string, type: 'report' | 'indent') => {
    toastInfo(`File upload for ${type === 'report' ? 'event report' : 'indent'} will be available soon.`);
  };

  const openExtraRoomDialog = (booking: GroupedBooking) => {
    setSelectedBookingForExtra(booking);
    setIsExtraRoomOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 px-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <motion.h2 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold text-textPrimary tracking-tighter">My Bookings</motion.h2>
          <p className="text-textSecondary mt-3 text-base sm:text-lg font-medium leading-relaxed">Track your venue reservations, manage schedules, and submit post-event documentation.</p>
        </div>
      </div>

      {error && (
        <Alert className="rounded-2xl border-2 border-error/30 bg-error/5">
          <AlertTriangle size={18} className="text-error" />
          <AlertTitle className="font-bold text-error">Could not load bookings</AlertTitle>
          <AlertDescription className="mt-2 text-error/80">{error}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-4 gap-2 border-error/30 hover:bg-error/5" onClick={fetchBookings}>
            <RefreshCw size={16} /> Retry
          </Button>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-borderSoft rounded-lg p-6 bg-card">
              <Skeleton className="h-32 w-full rounded-md" />
            </Card>
          ))}
        </div>
      ) : !error && myBookings.length === 0 ? (
        <Card className="border-2 border-dashed border-borderSoft rounded-lg p-16 text-center bg-card shadow-none">
          <Calendar className="h-16 w-16 mx-auto text-textMuted/40 mb-4" />
          <p className="text-textMuted text-lg font-semibold">No bookings found yet.</p>
        </Card>
      ) : (
        <div className="grid gap-6 pb-12">
          {groupedBookings.map((booking, index) => {
            const isPast = isPastEvent(booking.date);
            const approvedVenues = booking.bookings.filter(b => b.status === 'approved');
            const rejectedVenues = booking.bookings.filter(b => b.status === 'rejected');
            const pendingVenues = booking.bookings.filter(b => b.status === 'pending');

            return (
              <motion.div
                key={booking.batchId || booking.ids[0]}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <Card className={cn("border rounded-lg overflow-hidden bg-card hover:shadow-md transition-all duration-300", isPast ? "border-borderSoft/50 opacity-75" : "border-borderSoft hover:border-brand/50")}>
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                      <div className={cn("w-full md:w-28 h-28 rounded-lg flex flex-col items-center justify-center shrink-0 border border-borderSoft", isPast ? 'bg-hoverSoft/40 text-textMuted' : 'bg-card text-brand')}>
                        <span className="text-xs font-bold uppercase tracking-wider">{new Date(booking.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="text-3xl font-extrabold leading-none">{new Date(booking.date).getDate()}</span>
                        <span className="text-xs mt-1 opacity-80">{new Date(booking.date).getFullYear()}</span>
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className={cn("text-2xl font-bold mb-3", isPast ? 'text-textMuted' : 'text-textPrimary')}>{booking.eventName}</h3>
                            <div className="flex items-center gap-2 text-sm mb-4 font-medium text-textSecondary">
                              <Clock size={16} className="text-brand" />
                              <span>
                                {booking.endDate && new Date(booking.date).toDateString() !== new Date(booking.endDate).toDateString() ? (
                                  <>
                                    {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {booking.startTime} –{' '}
                                    {new Date(booking.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, {booking.endTime}
                                  </>
                                ) : (
                                  `${booking.startTime} – ${booking.endTime}`
                                )}
                              </span>
                            </div>

                            <div className="space-y-3 mt-4">
                              {approvedVenues.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-success uppercase tracking-widest block">Approved Locations</span>
                                  <div className="flex flex-wrap gap-2">
                                    {approvedVenues.map(v => (
                                      <Badge key={v.id} variant="success" className="bg-success/5 text-success border-success/20 py-1 px-2.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                                        <MapPin size={12} /> {getVenueName(v.venueId)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {rejectedVenues.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-error uppercase tracking-widest block">Rejected Locations</span>
                                  <div className="flex flex-wrap gap-2">
                                    {rejectedVenues.map(v => (
                                      <Badge key={v.id} variant="destructive" className="bg-error/5 text-error border-error/20 py-1 px-2.5 rounded-lg flex items-center gap-1.5 opacity-80 shadow-sm">
                                        <MapPin size={12} /> {getVenueName(v.venueId)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {pendingVenues.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-warning uppercase tracking-widest block">Pending Confirmation</span>
                                  <div className="flex flex-wrap gap-2">
                                    {pendingVenues.map(v => (
                                      <Badge key={v.id} variant="warning" className="bg-warning/5 text-warning border-warning/20 py-1 px-2.5 rounded-lg flex items-center gap-1.5 shadow-sm">
                                        <MapPin size={12} /> {getVenueName(v.venueId)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end">
                            <Badge className={cn("px-4 py-2 font-bold text-sm rounded-full border-2",
                              booking.status === 'approved' ? (isPast ? 'bg-success/10 text-success border-success/30' : 'bg-brand/10 text-brand border-brand/30') :
                                booking.status === 'pending' || booking.status === 'partial' ? 'bg-warning/10 text-warning border-warning/30' : 'bg-error/10 text-error border-error/30'
                            )}>
                              {isPast ? '✓ Completed' : booking.status === 'pending' ? '⏳ Pending' : booking.status === 'partial' ? '⚠ Partial' : '✓ ' + booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-borderSoft/50 flex flex-wrap gap-3">
                          {!isPast && (booking.status === 'approved' || booking.status === 'pending' || booking.status === 'partial') && (
                            <Button variant="outline" size="sm" onClick={() => openExtraRoomDialog(booking)} className="gap-2 rounded-lg font-semibold bg-brand/5 text-brand border-brand/20 hover:bg-brand/10 shadow-sm">
                              <Plus className="h-4 w-4" /> Request Extra Room
                            </Button>
                          )}
                          {isPast && booking.status === 'approved' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => handleFileUpload(booking.ids[0], 'report')} className="gap-2 rounded-lg font-semibold hover:bg-brand/10 border-borderSoft">
                                <Upload size={16} /> Upload Event Report
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleFileUpload(booking.ids[0], 'indent')} className="gap-2 rounded-lg font-semibold hover:bg-brand/10 border-borderSoft">
                                <FileText size={16} /> Upload Indent
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <ExtraRoomDialog
        booking={selectedBookingForExtra}
        open={isExtraRoomOpen}
        onOpenChange={setIsExtraRoomOpen}
        onSuccess={fetchBookings}
      />
    </motion.div>
  );
};

export default MyBookings;