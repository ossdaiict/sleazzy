import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Upload, FileText } from 'lucide-react';
import { VENUES } from '../constants';
import { Booking } from '../types';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '@/lib/utils';

const MyBookings: React.FC = () => {
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // TODO: Replace with actual API call
  React.useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        // const response = await fetch('/api/bookings/my');
        // const data = await response.json();
        // setMyBookings(data);
        setMyBookings([]); // Empty until API is connected
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
        setMyBookings([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const getVenueName = (id: string) => VENUES.find(v => v.id === id)?.name || id;

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
      console.log(`Uploading ${type} for event ID ${id}`);
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">My Bookings</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage current reservations and submit post-event reports.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/40 bg-card/40 backdrop-blur-md p-4 sm:p-6">
              <Skeleton className="h-24 w-full" />
            </Card>
          ))}
        </div>
      ) : myBookings.length === 0 ? (
        <Card className="border-border/40 bg-card/40 backdrop-blur-md p-12 text-center">
          <p className="text-muted-foreground">No bookings found.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6">
          {myBookings.map((booking, index) => {
          const isPast = isPastEvent(booking.date);
          
          return (
            <motion.div
              key={booking.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card 
                className={cn(
                  "border-border/40 bg-card/40 backdrop-blur-md flex flex-col md:flex-row gap-4 sm:gap-6 p-4 sm:p-6 hover:border-primary/50 transition-all duration-300 group relative overflow-hidden",
                  isPast ? '' : ''
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative z-10 flex flex-col md:flex-row gap-4 sm:gap-6 w-full">
                  {/* Date Box */}
                  <div className={cn(
                    "w-full md:w-24 h-24 rounded-xl flex flex-col items-center justify-center shrink-0 border",
                    isPast 
                      ? 'bg-muted border-border text-muted-foreground' 
                      : 'bg-primary/10 border-primary/30 text-primary'
                  )}>
                    <span className="text-xs font-bold uppercase">
                      {new Date(booking.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-2xl font-bold leading-none">
                      {new Date(booking.date).getDate()}
                    </span>
                    <span className="text-xs mt-1">{new Date(booking.date).getFullYear()}</span>
                  </div>

                  {/* Details */}
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <h3 className={cn(
                          "text-lg sm:text-xl font-bold",
                          isPast ? 'text-muted-foreground' : 'text-foreground'
                        )}>
                          {booking.eventName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Clock size={16} />
                            {booking.startTime} - {booking.endTime}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin size={16} />
                            {getVenueName(booking.venueId)}
                          </span>
                        </div>
                      </div>
                      
                      <Badge 
                        variant={
                          booking.status === 'approved' 
                            ? isPast ? 'secondary' : 'success'
                            : 'pending'
                        }
                      >
                        {isPast ? 'Completed' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                    </div>

                    {/* Post Event Actions */}
                    {isPast && booking.status === 'approved' && (
                      <div className="mt-6 pt-4 border-t border-border/40 flex flex-wrap gap-3">
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleFileUpload(booking.id, 'report')}
                          className="flex items-center gap-2"
                        >
                          <Upload size={16} />
                          Upload Event Report
                        </Button>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleFileUpload(booking.id, 'indent')}
                          className="flex items-center gap-2"
                        >
                          <FileText size={16} />
                          Upload Indent
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
        </div>
      )}
    </div>
  );
};

export default MyBookings;
