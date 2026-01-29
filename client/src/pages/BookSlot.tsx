import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Building2,
  Lock
} from 'lucide-react';
import { CLUBS, VENUES } from '../constants';
import { apiRequest, type ApiClub, type ApiVenue } from '../lib/api';
import { EventType, ClubGroupType, User } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';

interface BookSlotProps {
  currentUser: User;
}

// Generate time options for Select dropdowns
const generateTimeOptions = () => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = ['00', '15', '30', '45'];
  const options: string[] = [];

  hours.forEach(hour => {
    minutes.forEach(minute => {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute}`;
      const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      options.push(timeString);
    });
  });

  return options;
};

const TIME_OPTIONS = generateTimeOptions();

const BookSlot: React.FC<BookSlotProps> = ({ currentUser }) => {
  const [clubs, setClubs] = useState<ApiClub[]>([]);
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [formData, setFormData] = useState({
    eventName: '',
    eventType: 'closed_club' as EventType,
    expectedAttendees: '',
    clubName: '',
    date: '',
    startTime: '',
    endTime: '',
    venueId: ''
  });

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const [warnings, setWarnings] = useState({
    timeline: '',
    conflict: '',
    venue: '',
    venueType: '' as 'success' | 'warning' | 'info' | '',
    hours: ''
  });

  useEffect(() => {
    if (currentUser && currentUser.role === 'club') {
      setFormData(prev => ({ ...prev, clubName: currentUser.name }));
    }
  }, [currentUser]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [clubsData, venuesData] = await Promise.all([
          apiRequest<ApiClub[]>('/api/clubs'),
          apiRequest<ApiVenue[]>('/api/venues'),
        ]);
        setClubs(clubsData);
        setVenues(venuesData);
      } catch (error) {
        console.error('Failed to load clubs/venues:', error);
      }
    };

    fetchMeta();
  }, []);

  // Handle date selection from Calendar
  useEffect(() => {
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      handleChange('date', dateString);
      setDatePickerOpen(false);
    }
  }, [selectedDate]);

  // Parse date string to Date object for Calendar
  useEffect(() => {
    if (formData.date) {
      setSelectedDate(new Date(formData.date));
    }
  }, [formData.date]);

  const getClubGroup = (name: string): ClubGroupType | undefined => {
    if (name === currentUser.name && currentUser.group) {
      return currentUser.group;
    }

    const apiClub = clubs.find(c => c.name === name);
    if (apiClub?.group_category) {
      return apiClub.group_category as ClubGroupType;
    }

    return CLUBS.find(c => c.name === name)?.group;
  };

  const normalizeVenueCategory = (category?: string) => {
    if (!category) return undefined;
    if (category === 'auto_approval') return 'A';
    if (category === 'needs_approval') return 'B';
    return category;
  };

  const getVenueCategory = (id: string) => {
    const apiCategory = venues.find(v => v.id === id)?.category;
    const normalized = normalizeVenueCategory(apiCategory);
    if (normalized) return normalized;
    return VENUES.find(v => v.id === id)?.category;
  };

  // Timeline Validation
  useEffect(() => {
    if (!formData.date) return;

    const today = new Date();
    const selectedDate = new Date(formData.date);
    const diffTime = selectedDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let warningMsg = '';

    if (formData.eventType === 'co_curricular' && diffDays < 30) {
      warningMsg = 'Co-curricular events must be booked at least 30 days in advance.';
    } else if (formData.eventType === 'open_all' && diffDays < 20) {
      warningMsg = 'Open-for-All events must be booked at least 20 days in advance.';
    } else if (formData.eventType === 'closed_club' && diffDays < 1) {
      warningMsg = 'Closed club events must be booked at least 1 day in advance.';
    }

    setWarnings(prev => ({ ...prev, timeline: warningMsg }));
  }, [formData.date, formData.eventType]);

  // Venue Permission Logic
  useEffect(() => {
    if (!formData.venueId) {
      setWarnings(prev => ({ ...prev, venue: '', venueType: '' }));
      return;
    }

    const category = getVenueCategory(formData.venueId);
    if (category === 'B' || category === 'needs_approval') {
      setWarnings(prev => ({
        ...prev,
        venue: 'Category B Venue: Requires Sleazzy Convener & Faculty Approval.',
        venueType: 'warning'
      }));
    } else {
      setWarnings(prev => ({
        ...prev,
        venue: 'Category A Venue: Direct booking available (Subject to vacancy).',
        venueType: 'success'
      }));
    }
  }, [formData.venueId]);

  // Operating Hours Logic
  useEffect(() => {
    if (!formData.date || !formData.startTime || !formData.endTime) {
      setWarnings(prev => ({ ...prev, hours: '' }));
      return;
    }

    const dateObj = new Date(formData.date);
    const day = dateObj.getDay();
    const isWeekend = day === 0 || day === 6;

    const start = formData.startTime;
    const end = formData.endTime;

    let errorMsg = '';

    if (end <= start) {
      errorMsg = "End time must be after start time.";
    } else if (isWeekend) {
      if (start < "08:00") {
        errorMsg = "On weekends, bookings are allowed from 8:00 AM to 12:00 AM.";
      }
    } else {
      if (start < "16:00") {
        errorMsg = "On weekdays, bookings are only allowed from 4:00 PM to 12:00 AM.";
      }
    }

    setWarnings(prev => ({ ...prev, hours: errorMsg }));
  }, [formData.date, formData.startTime, formData.endTime]);

  // Conflict Logic
  useEffect(() => {
    if (!formData.date || !formData.startTime || !formData.endTime || !formData.clubName) {
      setWarnings(prev => ({ ...prev, conflict: '' }));
      return;
    }

    // Check conflicts
    const checkConflicts = async () => {
      try {
        // Combine date and time for backend
        if (!formData.date || !formData.startTime || !formData.endTime) return;

        const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
        const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

        const query = new URLSearchParams({
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          clubId: clubs.find(c => c.name === formData.clubName)?.id || '',
        });

        const { hasConflict, message } = await apiRequest<{ hasConflict: boolean; message: string }>(
          `/api/bookings/check-conflict?${query.toString()}`,
          { auth: true }
        );

        if (hasConflict) {
          setWarnings(prev => ({ ...prev, conflict: message }));
        } else {
          setWarnings(prev => ({ ...prev, conflict: '' }));
        }
      } catch (error) {
        console.error('Failed to check conflicts:', error);
      }
    };

    checkConflicts();
  }, [formData.date, formData.startTime, formData.endTime, formData.clubName, formData.venueId]);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (warnings.timeline || warnings.conflict || warnings.hours) {
      alert("Please resolve the warnings before submitting.");
      return;
    }


    try {
      const selectedClub = clubs.find(c => c.name === formData.clubName);
      if (!selectedClub) throw new Error("Invalid club selected");

      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

      await apiRequest('/api/bookings', {
        method: 'POST',
        auth: true,
        body: {
          ...formData,
          clubId: selectedClub.id,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          expectedAttendees: parseInt(formData.expectedAttendees, 10) || 0
        }
      });

      // Redirect or show success
      // navigate('/dashboard'); // Assuming react-router navigate is available, but for now just alert
      alert("Booking submitted successfully!");
      // window.location.href = '/'; 
      // TODO: Show success message and redirect
    } catch (error) {
      console.error('Failed to submit booking:', error);
      alert("Failed to submit booking request. Please try again.");
    }
  };

  const hasErrors = !!warnings.timeline || !!warnings.conflict || !!warnings.hours;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border border-border">
          <CardHeader className="border-b border-border pb-6">
            <CardTitle className="text-2xl flex items-center gap-3 font-bold tracking-tight">
              <CalendarIcon className="text-primary" size={24} />
              Book a Venue Slot
            </CardTitle>
            <CardDescription className="mt-2 text-base">Fill in the details to request a venue for your club event.</CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Section 1: Event Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Event Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="eventName">Event Name</Label>
                    <Input
                      id="eventName"
                      type="text"
                      name="eventName"
                      required
                      placeholder="e.g. Intro to Machine Learning"
                      value={formData.eventName}
                      onChange={(e) => handleChange('eventName', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="eventType">Event Type</Label>
                    <Select value={formData.eventType} onValueChange={(v) => handleChange('eventType', v)}>
                      <SelectTrigger id="eventType" className="w-full">
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="closed_club">Closed Club Event</SelectItem>
                        <SelectItem value="open_all">Open-for-All</SelectItem>
                        <SelectItem value="co_curricular">Co-curricular</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Expected Attendees</Label>
                    <div className="relative">
                      <Users size={18} className="absolute left-3 top-2.5 text-muted-foreground z-10 pointer-events-none" />
                      <Select
                        value={formData.expectedAttendees}
                        onValueChange={(v) => handleChange('expectedAttendees', v)}
                      >
                        <SelectTrigger className="w-full pl-10">
                          <SelectValue placeholder="Select expected attendees" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="0">0 - No attendees</SelectItem>
                          <SelectItem value="10">1-10 attendees</SelectItem>
                          <SelectItem value="25">11-25 attendees</SelectItem>
                          <SelectItem value="50">26-50 attendees</SelectItem>
                          <SelectItem value="75">51-75 attendees</SelectItem>
                          <SelectItem value="100">76-100 attendees</SelectItem>
                          <SelectItem value="150">101-150 attendees</SelectItem>
                          <SelectItem value="200">151-200 attendees</SelectItem>
                          <SelectItem value="250">201-250 attendees</SelectItem>
                          <SelectItem value="300">251-300 attendees</SelectItem>
                          <SelectItem value="400">301-400 attendees</SelectItem>
                          <SelectItem value="500">401-500 attendees</SelectItem>
                          <SelectItem value="500+">500+ attendees</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section 2: Organizer & Timing */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Logistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="clubName">Organizing Club</Label>
                    {currentUser.role === 'club' ? (
                      <div className="relative">
                        <Lock size={18} className="absolute left-3 top-2.5 text-muted-foreground" />
                        <Input
                          id="clubName"
                          type="text"
                          readOnly
                          value={formData.clubName}
                          className="pl-10 bg-muted border-border cursor-not-allowed"
                        />
                        <p className="text-xs text-muted-foreground mt-1 ml-1">Auto-filled based on your login session.</p>
                      </div>
                    ) : (
                      <Select value={formData.clubName} onValueChange={(v) => handleChange('clubName', v)}>
                        <SelectTrigger id="clubName" className="w-full">
                          <SelectValue placeholder="Select a Club..." />
                        </SelectTrigger>
                        <SelectContent>
                          {clubs.map(club => (
                            <SelectItem key={club.id} value={club.name}>
                              {club.name} (Group {club.group_category})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label>Date</Label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <CalendarIcon size={18} className="absolute left-3 top-2.5 text-muted-foreground z-10 pointer-events-none" />
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal pl-10",
                              !formData.date && "text-muted-foreground",
                              warnings.timeline && "border-destructive"
                            )}
                          >
                            {formData.date ? (
                              new Date(formData.date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            ) : (
                              <span>Pick a date</span>
                            )}
                          </Button>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    {warnings.timeline && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertTriangle size={14} />
                        <AlertDescription className="text-xs">{warnings.timeline}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <div className="relative">
                      <Clock size={18} className="absolute left-3 top-2.5 text-muted-foreground z-10 pointer-events-none" />
                      <Select
                        value={formData.startTime}
                        onValueChange={(v) => handleChange('startTime', v)}
                      >
                        <SelectTrigger className={cn(
                          "w-full pl-10",
                          warnings.hours && "border-destructive"
                        )}>
                          <SelectValue placeholder="Select start time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {TIME_OPTIONS.map((time) => {
                            const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            });
                            return (
                              <SelectItem key={time} value={time}>
                                {displayTime}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <div className="relative">
                      <Clock size={18} className="absolute left-3 top-2.5 text-muted-foreground z-10 pointer-events-none" />
                      <Select
                        value={formData.endTime}
                        onValueChange={(v) => handleChange('endTime', v)}
                      >
                        <SelectTrigger className={cn(
                          "w-full pl-10",
                          warnings.hours && "border-destructive"
                        )}>
                          <SelectValue placeholder="Select end time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {TIME_OPTIONS.map((time) => {
                            const displayTime = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            });
                            return (
                              <SelectItem key={time} value={time}>
                                {displayTime}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {warnings.hours && (
                    <div className="md:col-span-2">
                      <Alert variant="destructive">
                        <AlertTriangle size={14} />
                        <AlertDescription className="text-xs">{warnings.hours}</AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {warnings.conflict && (
                    <div className="md:col-span-2">
                      <Alert variant="destructive">
                        <AlertOctagon size={18} />
                        <AlertTitle>Booking Conflict</AlertTitle>
                        <AlertDescription className="mt-1 text-xs">{warnings.conflict}</AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Section 3: Venue */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Venue Selection</h3>
                <div className="space-y-2">
                  <Label htmlFor="venueId">Preferred Venue</Label>
                  <div className="relative">
                    <MapPin size={18} className="absolute left-3 top-2.5 text-muted-foreground z-10 pointer-events-none" />
                    <Select value={formData.venueId} onValueChange={(v) => handleChange('venueId', v)}>
                      <SelectTrigger id="venueId" className="w-full pl-10">
                        <SelectValue placeholder="Select a Venue..." />
                      </SelectTrigger>
                      <SelectContent>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Category A (General)</div>
                        {venues.filter(v => normalizeVenueCategory(v.category) === 'A').map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Category B (Restricted)</div>
                        {venues.filter(v => normalizeVenueCategory(v.category) === 'B').map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {warnings.venue && (
                    <Alert
                      variant={warnings.venueType === 'warning' ? 'warning' : 'success'}
                      className="mt-3"
                    >
                      {warnings.venueType === 'warning' ? <Building2 size={16} /> : <CheckCircle2 size={16} />}
                      <AlertDescription className="font-medium">{warnings.venue}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={hasErrors}
                  className="w-full sm:w-auto"
                >
                  Submit Request
                  <CheckCircle2 size={18} />
                </Button>
              </div>

            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default BookSlot;
