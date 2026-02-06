import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ChevronRight, AlertCircle, Calendar as CalendarIcon, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiRequest, mapBooking, type ApiBooking, type ApiVenue } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { toastError, toastSuccess } from '../lib/toast';
import { Booking } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { Calendar } from '../components/ui/calendar';


const AdminDashboard: React.FC = () => {
  const [pendingRequests, setPendingRequests] = React.useState<Booking[]>([]);
  const [venues, setVenues] = React.useState<ApiVenue[]>([]);
  const [stats, setStats] = React.useState({
    pending: 0,
    scheduled: 0,
    conflicts: 0,
    activeClubs: 0
  });
  const [isLoading, setIsLoading] = React.useState(true);

  const [calendarEvents, setCalendarEvents] = React.useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [venuesData, pendingData, statsData, allBookingsData] = await Promise.all([
        apiRequest<ApiVenue[]>('/api/venues'),
        apiRequest<ApiBooking[]>('/api/admin/pending', { auth: true }),
        apiRequest<{ pending: number; scheduled: number; conflicts: number; activeClubs: number }>('/api/admin/stats', { auth: true }),
        apiRequest<ApiBooking[]>('/api/admin/bookings', { auth: true })
      ]);

      setVenues(venuesData);
      setPendingRequests(pendingData.map(mapBooking));
      setStats(statsData);
      setCalendarEvents(allBookingsData.map(mapBooking));
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(getErrorMessage(err, 'Failed to load dashboard.'));
      setPendingRequests([]);
      setStats({ pending: 0, scheduled: 0, conflicts: 0, activeClubs: 0 });
      setCalendarEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (bookingId: string, status: 'approved' | 'rejected') => {
    try {
      await apiRequest(`/api/admin/bookings/${bookingId}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status }
      });
      toastSuccess(`Booking ${status} successfully`);
      fetchData();
    } catch (err) {
      console.error(`Failed to ${status} booking:`, err);
      toastError(err, `Failed to ${status} booking. Please try again.`);
    }
  };

  const getVenueName = (id: string) => venues.find(v => v.id === id)?.name || id;

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(e => {
      const eDate = new Date(e.date);
      return isSameDay(eDate, date);
    });
  };

  const eventDates = calendarEvents
    .filter(e => e.status === 'approved') // Only highlight confirmed events? Or all? Let's highlight Approved for clarity.
    .map(e => new Date(e.date));

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 sm:space-y-8"
      >
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold text-textPrimary tracking-tight">Admin Dashboard</h2>
        </div>
        <Alert variant="destructive" className="rounded-xl">
          <AlertTriangle size={16} />
          <AlertTitle>Could not load dashboard</AlertTitle>
          <AlertDescription className="mt-1">{error}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={fetchData}>
            <RefreshCw size={14} />
            Retry
          </Button>
        </Alert>
      </motion.div>
    );
  }

  if (isLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6 sm:space-y-8"
      >
        <div className="space-y-2">
          <Skeleton className="h-10 w-64 sm:w-80" />
          <Skeleton className="h-5 w-80 sm:w-96" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1,2,3,4].map(i => (
            <Skeleton key={i} className="h-32 sm:h-36 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 sm:space-y-8"
    >
      {/* Enhanced Header */}
      <div className="px-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h2 className="text-5xl sm:text-6xl font-extrabold text-foreground tracking-tighter">Admin Dashboard</h2>
          <p className="text-textSecondary mt-3 text-lg font-medium">Monitor venue bookings, manage approvals, and track system performance.</p>
        </motion.div>
      </div>

      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0, ease: [0.25, 0.46, 0.45, 0.94] }}
          whileHover={{ y: -4 }}
        >
          <Card className="rounded-2xl hover:border-warning/50 transition-all duration-300 shadow-lg shadow-warning/10 glass-card border-warning/30 bg-gradient-to-br from-warning/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-bold text-textMuted uppercase tracking-widest">Pending</div>
                <div className="p-3 bg-warning/20 text-warning rounded-xl border border-warning/30 shadow-lg">
                  <AlertCircle size={20} />
                </div>
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold text-warning tracking-tight">{stats.pending}</div>
              <p className="text-xs text-textMuted mt-2">Awaiting approval</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          whileHover={{ y: -4 }}
        >
          <Card className="rounded-2xl hover:border-brand/50 transition-all duration-300 shadow-lg shadow-brand/10 glass-card border-brand/30 bg-gradient-to-br from-brand/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-bold text-textMuted uppercase tracking-widest">Scheduled</div>
                <div className="p-3 bg-brand/20 text-brand rounded-xl border border-brand/30 shadow-lg">
                  <CalendarIcon size={20} />
                </div>
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold text-brand tracking-tight">{stats.scheduled}</div>
              <p className="text-xs text-textMuted mt-2">Confirmed events</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          whileHover={{ y: -4 }}
        >
          <Card className="rounded-2xl hover:border-error/50 transition-all duration-300 shadow-lg shadow-error/10 glass-card border-error/30 bg-gradient-to-br from-error/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-bold text-textMuted uppercase tracking-widest">Conflicts</div>
                <div className="p-3 bg-error/20 text-error rounded-xl border border-error/30 shadow-lg">
                  <XCircle size={20} />
                </div>
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold text-error tracking-tight">{stats.conflicts}</div>
              <p className="text-xs text-textMuted mt-2">Time overlaps</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          whileHover={{ y: -4 }}
        >
          <Card className="rounded-2xl hover:border-success/50 transition-all duration-300 shadow-lg shadow-success/10 glass-card border-success/30 bg-gradient-to-br from-success/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-bold text-textMuted uppercase tracking-widest">Active Clubs</div>
                <div className="p-3 bg-success/20 text-success rounded-xl border border-success/30 shadow-lg">
                  <CheckCircle size={20} />
                </div>
              </div>
              <div className="text-4xl sm:text-5xl font-extrabold text-success tracking-tight">{stats.activeClubs}</div>
              <p className="text-xs text-textMuted mt-2">Organizations</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Calendar Widget */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="border border-borderSoft rounded-xl">
          <CardHeader className="border-b border-borderSoft">
            <CardTitle className="text-lg sm:text-xl">Master Event Calendar</CardTitle>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
              {/* Calendar */}
              <div className="flex-1 flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  modifiers={{
                    hasEvents: eventDates
                  }}
                  modifierClassNames={{
                    hasEvents: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-brand"
                  }}
                  className="rounded-2xl"
                />
              </div>

              {/* Selected Date Details */}
              <div className="md:w-72 border-t md:border-t-0 md:border-l border-borderSoft md:pl-6 pt-4 md:pt-0 flex flex-col">
                <h4 className="text-sm font-semibold text-textMuted uppercase tracking-wider mb-4">
                  {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Select a date'}
                </h4>

                <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px]">
                  {selectedDateEvents.length > 0 ? (
                    selectedDateEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        <Card className="rounded-xl hover:border-brand/30 transition-colors">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="font-semibold text-textPrimary text-sm mb-1">{event.eventName}</div>
                              <Badge variant={event.status === 'approved' ? 'success' : event.status === 'pending' ? 'pending' : 'destructive'} className="text-[10px] px-1.5 py-0 h-5">
                                {event.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-brand font-medium mt-0.5 mb-2">{event.clubName}</div>
                            <div className="mt-2 text-xs text-textMuted">
                              {event.startTime} - {event.endTime}
                            </div>
                            <div className="mt-1 text-xs text-textMuted">
                              {getVenueName(event.venueId)}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-textMuted text-sm">
                      No events found for this day.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pending Requests Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border border-borderSoft rounded-xl">
          <CardHeader className="border-b border-borderSoft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">Pending Requests</CardTitle>
                <CardDescription className="mt-1">Requests requiring immediate attention (Category B or Conflicts)</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/requests">
                  View All <ChevronRight size={16} />
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-border/40">
              {isLoading ? (
                <div className="p-4 sm:p-6">
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-textMuted">No pending requests.</p>
                </div>
              ) : (
                pendingRequests.map((req, index) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-4 sm:p-6 hover:bg-hoverSoft transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {req.clubName}
                          </Badge>
                          <span className="text-xs text-textMuted">•</span>
                          <span className="text-sm text-textMuted">{new Date(req.date).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-base sm:text-lg font-medium text-foreground">{req.eventName}</h4>
                        <div className="mt-1 text-sm text-textMuted">
                          Requested Venue: <span className="font-semibold text-foreground">{getVenueName(req.venueId)}</span> ({req.startTime} - {req.endTime})
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => handleAction(req.id, 'rejected')}
                        >
                          <XCircle size={16} />
                          <span className="hidden sm:inline">Reject</span>
                        </Button>
                        <Button
                          size="sm"
                          className="flex items-center gap-2"
                          onClick={() => handleAction(req.id, 'approved')}
                        >
                          <CheckCircle size={16} />
                          <span className="hidden sm:inline">Approve</span>
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
