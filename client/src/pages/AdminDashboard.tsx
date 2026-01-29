import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ChevronRight, AlertCircle, Calendar as CalendarIcon, Users } from 'lucide-react';
import { apiRequest, mapBooking, type ApiBooking, type ApiVenue } from '../lib/api';
import { Booking } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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

  const fetchData = async () => {
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
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setPendingRequests([]);
      setStats({ pending: 0, scheduled: 0, conflicts: 0, activeClubs: 0 });
      setCalendarEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (bookingId: string, status: 'approved' | 'rejected') => {
    try {
      await apiRequest(`/api/admin/bookings/${bookingId}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status }
      });
      fetchData();
    } catch (error) {
      console.error(`Failed to ${status} booking:`, error);
      alert(`Failed to ${status} booking`);
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

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Admin Dashboard</h2>
        <p className="text-muted-foreground mt-2 text-base sm:text-lg font-medium">Overview of venue requests and system status.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0 }}
        >
          <Card className="border border-border hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending</div>
                <div className="p-2 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                  <AlertCircle size={18} />
                </div>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{stats.pending}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border border-border hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Scheduled</div>
                <div className="p-2 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                  <CalendarIcon size={18} />
                </div>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{stats.scheduled}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border border-border hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Conflicts</div>
                <div className="p-2 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20">
                  <XCircle size={18} />
                </div>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{stats.conflicts}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border border-border hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Clubs</div>
                <div className="p-2 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                  <CheckCircle size={18} />
                </div>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{stats.activeClubs}</div>
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
        <Card className="border border-border">
          <CardHeader className="border-b border-border">
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
                    hasEvents: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-2 after:h-2 after:rounded-full after:bg-primary after:shadow-lg after:shadow-primary/50"
                  }}
                  className="rounded-2xl"
                />
              </div>

              {/* Selected Date Details */}
              <div className="md:w-72 border-t md:border-t-0 md:border-l border-border/80 md:pl-6 pt-4 md:pt-0 flex flex-col">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
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
                        <Card className="border border-border hover:border-primary/40 transition-colors">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div className="font-semibold text-foreground text-sm mb-1">{event.eventName}</div>
                              <Badge variant={event.status === 'approved' ? 'success' : event.status === 'pending' ? 'pending' : 'destructive'} className="text-[10px] px-1.5 py-0 h-5">
                                {event.status}
                              </Badge>
                            </div>
                            <div className="text-xs text-primary font-medium mt-0.5 mb-2">{event.clubName}</div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              {event.startTime} - {event.endTime}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {getVenueName(event.venueId)}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground text-sm">
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
        <Card className="border border-border">
          <CardHeader className="border-b border-border">
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
                  <p className="text-muted-foreground">No pending requests.</p>
                </div>
              ) : (
                pendingRequests.map((req, index) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-4 sm:p-6 hover:bg-muted transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {req.clubName}
                          </Badge>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">{new Date(req.date).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-base sm:text-lg font-medium text-foreground">{req.eventName}</h4>
                        <div className="mt-1 text-sm text-muted-foreground">
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
    </div>
  );
};

export default AdminDashboard;
