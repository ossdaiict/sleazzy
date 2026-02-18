import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarPlus, Clock, MapPin, ChevronRight, Info, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiRequest, mapBooking, type ApiBooking, type ApiVenue } from './api';
import { getErrorMessage } from './errors';
import { Booking } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Calendar, type CalendarEvent } from '../components/ui/calendar';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '@/lib/utils';

import { User } from '../types';

interface ClubDashboardProps {
  user: User;
}

const ClubDashboard: React.FC<ClubDashboardProps> = ({ user }) => {
  const [allEvents, setAllEvents] = React.useState<Booking[]>([]);
  const [myEvents, setMyEvents] = React.useState<Booking[]>([]);
  const [venues, setVenues] = React.useState<ApiVenue[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchEvents = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [venuesData, myBookings, publicBookings] = await Promise.all([
        apiRequest<ApiVenue[]>('/api/venues'),
        apiRequest<ApiBooking[]>('/api/my-bookings', { auth: true }),
        apiRequest<ApiBooking[]>('/api/public-bookings'),
      ]);

      const mappedMyBookings = myBookings.map(mapBooking);
      const mappedPublicBookings = publicBookings.map(mapBooking);

      setVenues(venuesData);
      setMyEvents(mappedMyBookings);
      setAllEvents(mappedPublicBookings);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setError(getErrorMessage(err, 'Failed to load events.'));
      setAllEvents([]);
      setMyEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const getVenueName = (id: string) => venues.find(v => v.id === id)?.name || id;

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

  const getEventsForDate = (date: Date) => {
    return allEvents.filter(e => {
      const eDate = new Date(e.date);
      return isSameDay(eDate, date);
    });
  };

  // Get dates that have events for calendar highlighting
  const eventDates = allEvents.map(e => new Date(e.date));

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  const calendarEventsWithVenue: CalendarEvent[] = React.useMemo(() =>
    allEvents.map(e => ({
      eventName: e.eventName,
      clubName: e.clubName,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      venueName: getVenueName(e.venueId),
    })),
    [allEvents, venues]
  );

  const upcomingEvents = React.useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return allEvents
      .filter(e => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 6);
  }, [allEvents]);

  if (error) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-textPrimary tracking-tight">Welcome, {user.name}</h2>
        </div>
        <Alert variant="destructive" className="rounded-xl">
          <AlertTriangle size={16} />
          <AlertTitle>Could not load dashboard</AlertTitle>
          <AlertDescription className="mt-1">{error}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={fetchEvents}>
            <RefreshCw size={14} />
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-64 sm:w-80" />
            <Skeleton className="h-5 w-72 sm:w-96" />
          </div>
          <Skeleton className="h-11 w-full sm:w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          <div className="lg:col-span-2">
            <Skeleton className="h-[420px] w-full rounded-2xl" />
          </div>
          <Skeleton className="h-[320px] w-full rounded-2xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 sm:space-y-8"
    >
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight truncate">Welcome, {user.name}</h2>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base font-medium">Manage your events and venue bookings efficiently.</p>
        </div>
        <Button
          asChild
          className="w-full sm:w-auto shrink-0 rounded-xl h-11 shadow-lg shadow-primary/20"
        >
          <Link to="/book">
            <CalendarPlus size={20} />
            <span>Book a New Slot</span>
          </Link>
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Calendar Widget */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="rounded-xl">
            <CardHeader className="border-b border-borderSoft p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Global Event Schedule</CardTitle>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
                {/* Calendar */}
                <div className="flex-1 flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    events={calendarEventsWithVenue}
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
                <div className="md:w-64 border-t md:border-t-0 md:border-l border-borderSoft md:pl-6 pt-4 md:pt-0 flex flex-col">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Select a date'}
                  </h4>

                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px]">
                    {selectedDateEvents.length > 0 ? (
                      selectedDateEvents.map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ scale: 1.01 }}
                        >
                          <Card className="border border-borderSoft rounded-xl hover:border-brand/30 transition-colors rounded-xl">
                            <CardContent className="p-4">
                              <div className="font-semibold text-foreground text-sm mb-1">{event.eventName}</div>
                              <div className="text-xs text-primary font-medium mt-0.5 mb-2">{event.clubName}</div>
                              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock size={12} className="text-primary/60" />
                                <span>{event.startTime} - {event.endTime}</span>
                              </div>
                              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin size={12} className="text-primary/60" />
                                <span>{getVenueName(event.venueId)}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    ) : (
                      selectedDate ? (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          No events scheduled for this day.
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Your Upcoming Events (Sidebar) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border border-borderSoft rounded-xl">
            <CardHeader className="border-b border-borderSoft">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">My Club Events</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/my-bookings" className="text-xs">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/40 overflow-y-auto max-h-[400px]">
                {myEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="p-4 hover:bg-hoverSoft transition-colors"
                  >
                    <div className="font-semibold text-foreground text-sm">{event.eventName}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <CalendarPlus size={12} />
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <MapPin size={12} />
                      {getVenueName(event.venueId)}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      {event.eventType && (
                        <Badge variant="outline" className="text-[10px] h-5 capitalize">
                          {event.eventType.replace('_', ' ')}
                        </Badge>
                      )}
                      {event.expectedAttendees && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Users size={10} />
                          <span>{event.expectedAttendees}</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-2">
                      <Badge
                        variant={
                          event.status === 'approved' ? 'success' :
                            event.status === 'pending' ? 'pending' :
                              'destructive'
                        }
                        className="text-[10px]"
                      >
                        <span>{event.status}</span>
                      </Badge>
                    </div>
                  </motion.div>
                ))}
                {myEvents.length === 0 && (
                  <div className="p-6 text-center text-muted-foreground text-sm">No upcoming events.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Upcoming Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Card className="border border-borderSoft rounded-xl">
          <CardHeader className="border-b border-borderSoft">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg sm:text-xl">Upcoming Events</CardTitle>
                <CardDescription className="mt-1">Events happening in the coming days across all venues</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {upcomingEvents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ y: -2 }}
                  >
                    <Card className="border border-borderSoft rounded-xl hover:border-brand/30 hover:shadow-md transition-all duration-200 h-full">
                      <CardContent className="p-4">
                        <div className="font-semibold text-foreground text-sm leading-tight mb-1">{event.eventName}</div>
                        <div className="text-xs text-primary font-medium mb-3">{event.clubName}</div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarPlus size={12} className="text-primary/60 shrink-0" />
                            <span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock size={12} className="text-primary/60 shrink-0" />
                            <span>{event.startTime} - {event.endTime}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin size={12} className="text-primary/60 shrink-0" />
                            <span>{getVenueName(event.venueId)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No upcoming events scheduled.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick Policy Reminder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <Alert variant="info" className="border-brand/30 bg-primary/5 rounded-2xl">
          <Info className="h-4 w-4 shrink-0" />
          <AlertTitle>Booking Policy Reminder</AlertTitle>
          <AlertDescription className="mt-1">
            Category A venues are auto-approved for Group A clubs if no conflict exists.
            Category B venues (Lecture Theatres) always require Admin approval.
          </AlertDescription>
        </Alert>
      </motion.div>
    </motion.div>
  );
};

export default ClubDashboard;
