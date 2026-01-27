import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarPlus, Clock, MapPin, ChevronRight, Info } from 'lucide-react';
import { VENUES } from '../constants';
import { Booking } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Calendar } from '../components/ui/calendar';
import { cn } from '@/lib/utils';

const ClubDashboard: React.FC = () => {
  const [allEvents, setAllEvents] = React.useState<Booking[]>([]);
  const [myEvents, setMyEvents] = React.useState<Booking[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // TODO: Replace with actual API calls
  React.useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      try {
        // const [allResponse, myResponse] = await Promise.all([
        //   fetch('/api/bookings/all'),
        //   fetch('/api/bookings/my')
        // ]);
        // const allData = await allResponse.json();
        // const myData = await myResponse.json();
        // setAllEvents(allData);
        // setMyEvents(myData);
        setAllEvents([]);
        setMyEvents([]);
      } catch (error) {
        console.error('Failed to fetch events:', error);
        setAllEvents([]);
        setMyEvents([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const getVenueName = (id: string) => VENUES.find(v => v.id === id)?.name || id;

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

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Welcome, Programming Club</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage your events and venue bookings efficiently.</p>
        </div>
        <Button 
          asChild
          className="w-full sm:w-auto"
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
          <Card className="border-border/40 bg-card/40 backdrop-blur-md">
            <CardHeader className="border-b border-border/40">
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
                  modifiers={{
                    hasEvents: eventDates
                  }}
                  modifiersClassNames={{
                    hasEvents: "relative after:absolute after:bottom-1.5 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary"
                  }}
                  className="rounded-md border-0"
                />
              </div>

              {/* Selected Date Details */}
              <div className="md:w-64 border-t md:border-t-0 md:border-l border-border/40 md:pl-6 pt-4 md:pt-0 flex flex-col">
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
                        <Card className="border-border/40 bg-card/40 backdrop-blur-sm">
                          <CardContent className="p-3">
                          <div className="font-medium text-foreground text-sm">{event.eventName}</div>
                          <div className="text-xs text-primary mt-0.5">{event.clubName}</div>
                          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock size={12} />
                            <span>{event.startTime} - {event.endTime}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin size={12} />
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
          <Card className="border-border/40 bg-card/40 backdrop-blur-md">
            <CardHeader className="border-b border-border/40">
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
                  className="p-4 hover:bg-card/40 transition-colors"
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

      {/* Quick Policy Reminder */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Alert variant="info" className="border-primary/50 bg-primary/5 backdrop-blur-sm">
        <Info className="h-4 w-4" />
        <AlertTitle>Booking Policy Reminder</AlertTitle>
        <AlertDescription className="mt-1">
          Category A venues are auto-approved for Group A clubs if no conflict exists. 
          Category B venues (Lecture Theatres) always require Admin approval.
        </AlertDescription>
      </Alert>
      </motion.div>
    </div>
  );
};

export default ClubDashboard;
