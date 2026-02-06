import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Upload, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiRequest, mapBooking, type ApiBooking, type ApiVenue } from '../lib/api';
import { toastInfo, toastError } from '../lib/toast';
import { getErrorMessage } from '../lib/errors';
import { Booking } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '@/lib/utils';

const MyBookings: React.FC = () => {
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const getVenueName = (id: string) => venues.find(v => v.id === id)?.name || id;

  const groupedBookings = React.useMemo(() => {
    const groups: Record<string, Booking & { venueNames: string[] }> = {};

    myBookings.forEach(booking => {
      // Group by batchId if available, otherwise by event details
      const key = booking.batchId || `${booking.eventName}-${booking.date}-${booking.startTime}-${booking.endTime}`;

      const vName = getVenueName(booking.venueId);

      if (!groups[key]) {
        groups[key] = {
          ...booking,
          venueNames: [vName]
        };
      } else {
        if (!groups[key].venueNames.includes(vName)) {
          groups[key].venueNames.push(vName);
        }
      }
    });

    return Object.values(groups);
  }, [myBookings, venues]);

  const isPastEvent = (dateStr: string) => {
    const eventDate = new Date(dateStr);
    const today = new Date();
    return eventDate < today;
  };

  const handleFileUpload = async (id: string, type: 'report' | 'indent') => {
    // TODO: Replace with actual file upload API call
    try {
      // const formData = new FormData();
      // formData.append('file', file);
      // formData.append('bookingId', id);
      // formData.append('type', type);
      // await fetch('/api/bookings/upload', { method: 'POST', body: formData });
      toastInfo(`File upload for ${type === 'report' ? 'event report' : 'indent'} will be available soon.`);
    } catch (error) {
      console.error('Failed to upload file:', error);
      toastError(error, 'Failed to upload file.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 px-4"
    >
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold text-textPrimary tracking-tighter">My Bookings</h2>
            <p className="text-textSecondary mt-3 text-base sm:text-lg font-medium leading-relaxed">Track your venue reservations, manage schedules, and submit post-event documentation.</p>
          </motion.div>
        </div>
      </div>

      {error && (
        <Alert className="rounded-2xl border-2 border-error/30 bg-error/5">
          <AlertTriangle size={18} className="text-error" />
          <AlertTitle className="font-bold text-error">Could not load bookings</AlertTitle>
          <AlertDescription className="mt-2 text-error/80">{error}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-4 gap-2 border-error/30 hover:bg-error/5" onClick={fetchBookings}>
            <RefreshCw size={16} />
            Retry
          </Button>
        </Alert>
      )}
      
      {isLoading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-borderSoft rounded-2xl p-6 glass-card">
              <Skeleton className="h-32 w-full rounded-xl" />
            </Card>
          ))}
        </div>
      ) : !error && myBookings.length === 0 ? (
        <Card className="border-2 border-dashed border-borderSoft rounded-2xl p-16 text-center glass-card">
          <Calendar className="h-16 w-16 mx-auto text-textMuted/40 mb-4" />
          <p className="text-textMuted text-lg font-semibold">No bookings found yet.</p>
          <p className="text-textMuted/70 mt-2">Start by booking a venue to see your reservations here.</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {groupedBookings.map((booking, index) => {
            const isPast = isPastEvent(booking.date);

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <Card
                  className={cn(
                    "border rounded-2xl overflow-hidden glass-card hover:shadow-2xl hover:shadow-brand/10 transition-all duration-300 hover:-translate-y-1",
                    isPast
                      ? "border-borderSoft/50 opacity-75"
                      : "border-brand/30 bg-gradient-to-br from-brand/5 to-transparent"
                  )}
                >
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                      {/* Enhanced Date Box */}
                      <div className={cn(
                        "w-full md:w-28 h-28 rounded-2xl flex flex-col items-center justify-center shrink-0 border-2 shadow-lg",
                        isPast
                          ? 'bg-hoverSoft/40 border-borderSoft/50 text-textMuted'
                          : 'bg-gradient-to-br from-brand to-brandLink text-white border-brand/50 shadow-brand/30'
                      )}>
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {new Date(booking.date).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-3xl font-extrabold leading-none">
                          {new Date(booking.date).getDate()}
                        </span>
                        <span className="text-xs mt-1 opacity-80">{new Date(booking.date).getFullYear()}</span>
                      </div>

                      {/* Enhanced Details */}
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className={cn(
                              "text-2xl font-bold mb-3",
                              isPast ? 'text-textMuted' : 'text-textPrimary'
                            )}>
                              {booking.eventName}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <span className={cn(
                                "flex items-center gap-2 font-medium",
                                isPast ? "text-textMuted/60" : "text-textSecondary"
                              )}>
                                <Clock size={18} className="shrink-0" />
                                <span>{booking.startTime} – {booking.endTime}</span>
                              </span>
                              <span className={cn(
                                "flex items-center gap-2 font-medium",
                                isPast ? "text-textMuted/60" : "text-textSecondary"
                              )}>
                                <MapPin size={18} className="shrink-0 text-brand" />
                                <span>{booking.venueNames.join(', ')}</span>
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="shrink-0">
                            <Badge
                              className={cn(
                                "px-4 py-2 font-bold text-sm rounded-full border-2",
                                booking.status === 'approved'
                                  ? isPast 
                                    ? 'bg-success/10 text-success border-success/30 shadow-lg shadow-success/20' 
                                    : 'bg-brand/10 text-brand border-brand/30 shadow-lg shadow-brand/20'
                                  : booking.status === 'pending'
                                  ? 'bg-warning/10 text-warning border-warning/30 shadow-lg shadow-warning/20'
                                  : 'bg-error/10 text-error border-error/30'
                              )}
                            >
                              {isPast ? '✓ Completed' : booking.status === 'pending' ? '⏳ Pending' : '✓ ' + booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </Badge>
                          </div>
                        </div>

                        {/* Post Event Actions */}
                        {isPast && booking.status === 'approved' && (
                          <div className="mt-6 pt-6 border-t border-borderSoft/50 flex flex-wrap gap-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFileUpload(booking.id, 'report')}
                              className="gap-2 rounded-lg font-semibold hover:bg-brand/10 hover:border-brand/50 border-borderSoft"
                            >
                              <Upload size={16} />
                              Upload Event Report
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleFileUpload(booking.id, 'indent')}
                              className="gap-2 rounded-lg font-semibold hover:bg-brand/10 hover:border-brand/50 border-borderSoft"
                            >
                              <FileText size={16} />
                              Upload Indent
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default MyBookings;
