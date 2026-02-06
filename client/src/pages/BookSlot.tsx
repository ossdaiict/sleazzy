import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Building2,
  Lock,
  ChevronDown,
  Check,
  Info
} from 'lucide-react';
import { CLUBS, VENUES } from '../constants';
import { apiRequest, type ApiClub, type ApiVenue } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { toastError, toastSuccess } from '../lib/toast';
import { EventType, ClubGroupType, User } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { CardContent } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { TimePicker } from '../components/ui/time-picker';
import { cn } from '@/lib/utils';

interface BookSlotProps {
  currentUser: User;
}

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
    venueIds: [] as string[]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [metaError, setMetaError] = useState<string | null>(null);

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
      setMetaError(null);
      try {
        const [clubsData, venuesData] = await Promise.all([
          apiRequest<ApiClub[]>('/api/clubs'),
          apiRequest<ApiVenue[]>('/api/venues'),
        ]);
        setClubs(clubsData);
        setVenues(venuesData);
      } catch (error) {
        console.error('Failed to load clubs/venues:', error);
        setMetaError(getErrorMessage(error, 'Failed to load clubs and venues. Please refresh the page.'));
      }
    };

    fetchMeta();
  }, []);

  // Handle date selection from Calendar
  useEffect(() => {
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

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
    if (formData.venueIds.length === 0) {
      setWarnings(prev => ({ ...prev, venue: '', venueType: '' }));
      return;
    }

    const categories = formData.venueIds.map(id => getVenueCategory(id));
    const hasCategoryB = categories.some(c => c === 'B' || c === 'needs_approval');

    if (hasCategoryB) {
      setWarnings(prev => ({
        ...prev,
        venue: 'Includes Category B Venue(s): Requires Sleazzy Convener & Faculty Approval.',
        venueType: 'warning'
      }));
    } else {
      setWarnings(prev => ({
        ...prev,
        venue: 'Category A Venues: Direct booking available (Subject to vacancy).',
        venueType: 'success'
      }));
    }
  }, [formData.venueIds]);

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

    const checkConflicts = async () => {
      try {
        if (!formData.date || !formData.startTime || !formData.endTime) return;

        const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
        const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

        const query = new URLSearchParams({
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          clubId: clubs.find(c => c.name === formData.clubName)?.id || '',
        });

        if (formData.venueIds.length > 0) {
          query.append('venueIds', formData.venueIds.join(','));
        }

        const { hasConflict, message } = await apiRequest<{ hasConflict: boolean; message: string }>(
          `/api/bookings/check-conflict?${query.toString()}`,
          { auth: true }
        );

        if (hasConflict) {
          setWarnings(prev => ({ ...prev, conflict: message }));
        } else {
          setWarnings(prev => ({ ...prev, conflict: '' }));
        }
      } catch (err) {
        console.error('Failed to check conflicts:', err);
        setWarnings(prev => ({ ...prev, conflict: 'Could not verify conflicts. Please check your connection and try again.' }));
      }
    };

    checkConflicts();
  }, [formData.date, formData.startTime, formData.endTime, formData.clubName, formData.venueIds]);

  const handleChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVenueToggle = (venueId: string) => {
    setFormData(prev => {
      const current = prev.venueIds;
      const updated = current.includes(venueId)
        ? current.filter(id => id !== venueId)
        : [...current, venueId];
      return { ...prev, venueIds: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (warnings.timeline || warnings.conflict || warnings.hours) {
      toastError('Please resolve the warnings before submitting.');
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const selectedClub = clubs.find(c => c.name === formData.clubName);
      if (!selectedClub) throw new Error("Invalid club selected");

      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

      if (formData.venueIds.length === 0) {
        toastError('Please select at least one venue.');
        return;
      }

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

      toastSuccess('Booking request submitted successfully!');
      // Optional: Redirect or clear form
    } catch (error) {
      console.error('Failed to submit booking:', error);
      toastError(error, 'Failed to submit booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasErrors = !!warnings.timeline || !!warnings.conflict || !!warnings.hours;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-5xl mx-auto space-y-8 w-full pb-10 px-4"
    >
      {/* Enhanced Header */}
      <div className="text-center space-y-4 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-brand/10 border border-brand/30 mb-3"
        >
          <CalendarIcon className="w-4 h-4 text-brand mr-2" />
          <span className="text-sm font-semibold text-brand">Venue Booking System</span>
        </motion.div>

        <motion.h1
          className="text-5xl md:text-6xl font-extrabold tracking-tighter bg-gradient-to-r from-brand via-purple-500 to-pink-500 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Book Your Venue
        </motion.h1>
        <motion.p
          className="text-textSecondary text-lg max-w-2xl mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Schedule your next event seamlessly. Browse availability, select your perfect venue, and secure your booking in minutes.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-card rounded-3xl overflow-hidden shadow-2xl shadow-brand/20 border-white/30 dark:border-white/10 backdrop-blur-xl"
      >
        {/* Enhanced Progress Decoration */}
        <div className="h-2 w-full bg-gradient-to-r from-borderSoft via-brand/20 to-transparent relative overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand to-brandLink"
            initial={{ width: "0%" }}
            animate={{ width: isSubmitting ? "100%" : "35%" }}
            transition={{ duration: 1.5, ease: "circOut" }}
          />
        </div>

        <CardContent className="p-0">
          {metaError && (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertTriangle size={16} />
                <AlertTitle>Unable to load form data</AlertTitle>
                <AlertDescription className="mt-1">{metaError}</AlertDescription>
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-0">

            {/* Sidebar / Left Panel - Enhanced Context Info */}
            <div className="lg:col-span-4 bg-gradient-to-b from-hoverSoft/50 to-hoverSoft/20 p-8 space-y-8 lg:border-r border-borderSoft/50 lg:border-b-0 border-b">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-1.5 bg-gradient-to-b from-brand to-brandLink rounded-full" />
                  <h3 className="text-lg font-bold text-textPrimary">Key Guidelines</h3>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-white/60 dark:bg-white/5 rounded-xl border border-borderSoft/60 shadow-sm hover:shadow-md hover:border-brand/30 transition-all backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-brand mt-2 shrink-0" />
                      <div>
                        <span className="font-semibold block text-textPrimary text-sm mb-1">Advance Notice</span>
                        <p className="text-xs text-textSecondary leading-relaxed">Closed club: 1 day. Open: 20 days. Co-curricular: 30 days.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white/60 dark:bg-white/5 rounded-xl border border-borderSoft/60 shadow-sm hover:shadow-md hover:border-success/30 transition-all backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-success mt-2 shrink-0" />
                      <div>
                        <span className="font-semibold block text-textPrimary text-sm mb-1">Weekend Hours</span>
                        <p className="text-xs text-textSecondary leading-relaxed">8:00 AM – 12:00 AM</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white/60 dark:bg-white/5 rounded-xl border border-borderSoft/60 shadow-sm hover:shadow-md hover:border-warning/30 transition-all backdrop-blur-sm">
                    <div className="flex items-start gap-3">
                      <div className="h-2 w-2 rounded-full bg-warning mt-2 shrink-0" />
                      <div>
                        <span className="font-semibold block text-textPrimary text-sm mb-1">Weekday Hours</span>
                        <p className="text-xs text-textSecondary leading-relaxed">4:00 PM – 12:00 AM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {currentUser.role === 'club' && (
                <div className="pt-6 border-t border-borderSoft/30">
                  <h3 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-brand" />
                    Logged in as
                  </h3>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-brand/5 border border-brand/20">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand to-brandLink flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-textPrimary">{currentUser.name}</p>
                      <p className="text-xs text-textMuted capitalize">Role: {currentUser.role}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main Form Area - Enhanced */}
            <div className="lg:col-span-8 p-8 space-y-8">

              {/* Event Info */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-1.5 bg-gradient-to-b from-brand to-brandLink rounded-full" />
                  <h2 className="text-2xl font-bold text-textPrimary">Event Details</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2.5">
                    <Label htmlFor="eventName" className="text-textSecondary font-semibold text-sm">Event Name *</Label>
                    <Input
                      id="eventName"
                      value={formData.eventName}
                      onChange={(e) => handleChange('eventName', e.target.value)}
                      placeholder="e.g. Hackathon Kickoff, Tech Summit..."
                      className="h-12 bg-white/70 dark:bg-white/5 border-borderSoft focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all text-base rounded-xl font-medium shadow-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                      <Label htmlFor="eventType" className="text-textSecondary font-semibold text-sm">Event Type *</Label>
                      <Select value={formData.eventType} onValueChange={(v) => handleChange('eventType', v)}>
                        <SelectTrigger id="eventType" className="h-12 border-borderSoft hover:bg-hoverSoft/50 focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all rounded-xl">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="closed_club" className="cursor-pointer">
                            <span className="font-semibold">Closed Club Event</span>
                          </SelectItem>
                          <SelectItem value="open_all" className="cursor-pointer">
                            <span className="font-semibold">Open-for-All</span>
                          </SelectItem>
                          <SelectItem value="co_curricular" className="cursor-pointer">
                            <span className="font-semibold">Co-curricular</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2.5">
                      <Label htmlFor="expectedAttendees" className="text-textSecondary font-semibold text-sm">Expected Attendees *</Label>
                      <Select value={formData.expectedAttendees} onValueChange={(v) => handleChange('expectedAttendees', v)}>
                        <SelectTrigger className="h-12 border-borderSoft hover:bg-hoverSoft/50 focus:border-brand focus:ring-4 focus:ring-brand/20 transition-all rounded-xl">
                          <div className="flex items-center gap-2">
                            <Users size={16} className="text-brand" />
                            <SelectValue placeholder="Count" />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="50">1-50 People</SelectItem>
                          <SelectItem value="100">51-100 People</SelectItem>
                          <SelectItem value="200">101-200 People</SelectItem>
                          <SelectItem value="500">201-500 People</SelectItem>
                          <SelectItem value="500+">500+ People</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </section>

              <Separator className="bg-borderSoft/40" />

              {/* Timing */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-1.5 bg-gradient-to-b from-brand to-brandLink rounded-full" />
                  <h2 className="text-2xl font-bold text-textPrimary">Date & Time</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2 space-y-2.5">
                    <Label className="text-textSecondary font-semibold text-sm">Select Date *</Label>
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-12 justify-start text-left font-semibold border-borderSoft hover:bg-hoverSoft/50 transition-all bg-white/70 dark:bg-white/5 text-textPrimary rounded-xl shadow-sm",
                            !formData.date && "text-textMuted",
                            warnings.timeline && "border-error/50 ring-2 ring-error/20 bg-error/5"
                          )}
                          onClick={() => setDatePickerOpen(true)}
                        >
                          <CalendarIcon className="mr-2 h-5 w-5 text-brand opacity-70" />
                          {formData.date ? (
                            <span className="font-semibold">
                              {new Date(formData.date).toLocaleDateString('en-US', {
                                weekday: 'long', year: 'numeric', month: 'short', day: 'numeric'
                              })}
                            </span>
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3" align="start">
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
                      <p className="text-xs text-error font-semibold flex items-center gap-1.5 mt-2 bg-error/5 p-2.5 rounded-lg border border-error/20">
                        <AlertTriangle size={14} className="shrink-0" /> {warnings.timeline}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-textSecondary font-semibold text-sm">Start Time *</Label>
                    <TimePicker
                      value={formData.startTime}
                      onChange={(v) => handleChange('startTime', v)}
                      className={cn("h-12 rounded-xl", warnings.hours && "border-error/50 ring-2 ring-error/20")}
                    />
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-textSecondary font-semibold text-sm">End Time *</Label>
                    <TimePicker
                      value={formData.endTime}
                      onChange={(v) => handleChange('endTime', v)}
                      className={cn("h-12 rounded-xl", warnings.hours && "border-error/50 ring-2 ring-error/20")}
                    />
                  </div>

                  {(warnings.hours || warnings.conflict) && (
                    <div className="sm:col-span-2 space-y-3">
                      {warnings.hours && (
                        <Alert className="bg-error/5 border-2 border-error/30 text-error rounded-xl">
                          <AlertTriangle size={16} className="shrink-0" />
                          <AlertDescription className="font-semibold ml-2">{warnings.hours}</AlertDescription>
                        </Alert>
                      )}
                      {warnings.conflict && (
                        <Alert className="bg-error/5 border-2 border-error/30 text-error rounded-xl">
                          <AlertOctagon size={16} className="shrink-0" />
                          <AlertTitle className="font-bold">Conflict Detected</AlertTitle>
                          <AlertDescription className="font-semibold mt-1">{warnings.conflict}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  )}
                </div>
              </section>

              <Separator className="bg-borderSoft/40" />

              {/* Venues */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-1.5 bg-gradient-to-b from-brand to-brandLink rounded-full" />
                  <h2 className="text-2xl font-bold text-textPrimary">Select Venue</h2>
                </div>

                <div className="space-y-3">
                  <Label className="text-textSecondary font-semibold text-sm">Venues *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full h-12 justify-between border-borderSoft hover:bg-hoverSoft/50 transition-all bg-white/70 dark:bg-white/5 text-textPrimary rounded-xl shadow-sm font-semibold",
                          formData.venueIds.length === 0 && "text-textMuted"
                        )}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <MapPin size={18} className="text-brand shrink-0" />
                          <span className="truncate">
                            {formData.venueIds.length > 0
                              ? `${formData.venueIds.length} venue${formData.venueIds.length !== 1 ? 's' : ''} selected`
                              : "Choose venues..."}
                          </span>
                        </div>
                        <ChevronDown className="h-5 w-5 opacity-50 shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[360px] p-0 rounded-xl shadow-2xl" align="start">
                      <div className="max-h-[400px] overflow-y-auto space-y-1 p-3">
                        {/* Category A Venues */}
                        <div className="sticky top-0 bg-popover z-10 px-3 py-2 mb-2">
                          <div className="px-2 py-1.5 text-xs font-bold text-brand uppercase tracking-wider bg-brand/10 rounded-lg border border-brand/20 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-brand" />
                            Standard Venues (Category A)
                          </div>
                        </div>

                        {venues.filter(v => normalizeVenueCategory(v.category) === 'A').length === 0 ? (
                          <div className="px-2 py-3 text-center text-xs text-textMuted">No Category A venues</div>
                        ) : (
                          venues.filter(v => normalizeVenueCategory(v.category) === 'A').map(v => (
                            <div
                              key={v.id}
                              className="flex items-center space-x-3 px-3 py-2.5 hover:bg-hoverSoft/50 rounded-lg cursor-pointer transition-all group"
                              onClick={() => handleVenueToggle(v.id)}
                            >
                              <div className={cn(
                                "h-5 w-5 border-2 rounded-md flex items-center justify-center transition-all shrink-0",
                                formData.venueIds.includes(v.id)
                                  ? "bg-brand border-brand text-white shadow-md shadow-brand/30"
                                  : "border-textMuted/40 bg-transparent group-hover:border-brand/50"
                              )}>
                                {formData.venueIds.includes(v.id) && <Check className="h-3.5 w-3.5" />}
                              </div>
                              <span className="text-sm font-medium text-textPrimary flex-1">{v.name}</span>
                              <Badge variant="outline" className="text-xs bg-brand/5 border-brand/30 text-brand">Cat A</Badge>
                            </div>
                          ))
                        )}

                        {/* Category B Venues */}
                        <div className="sticky top-0 bg-popover z-10 px-3 py-2 mt-4 mb-2">
                          <div className="px-2 py-1.5 text-xs font-bold text-warning uppercase tracking-wider bg-warning/10 rounded-lg border border-warning/20 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-warning" />
                            Restricted Venues (Category B)
                          </div>
                        </div>

                        {venues.filter(v => normalizeVenueCategory(v.category) === 'B').length === 0 ? (
                          <div className="px-2 py-3 text-center text-xs text-textMuted">No Category B venues</div>
                        ) : (
                          venues.filter(v => normalizeVenueCategory(v.category) === 'B').map(v => (
                            <div
                              key={v.id}
                              className="flex items-center space-x-3 px-3 py-2.5 hover:bg-hoverSoft/50 rounded-lg cursor-pointer transition-all group"
                              onClick={() => handleVenueToggle(v.id)}
                            >
                              <div className={cn(
                                "h-5 w-5 border-2 rounded-md flex items-center justify-center transition-all shrink-0",
                                formData.venueIds.includes(v.id)
                                  ? "bg-warning border-warning text-white shadow-md shadow-warning/30"
                                  : "border-textMuted/40 bg-transparent group-hover:border-warning/50"
                              )}>
                                {formData.venueIds.includes(v.id) && <Check className="h-3.5 w-3.5" />}
                              </div>
                              <span className="text-sm font-medium text-textPrimary flex-1">{v.name}</span>
                              <Lock size={14} className="text-warning opacity-70 shrink-0" />
                            </div>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Selected Venues Badges */}
                  <div className="flex flex-wrap gap-2 min-h-[36px]">
                    <AnimatePresence>
                      {formData.venueIds.map(id => {
                        const v = venues.find(v => v.id === id);
                        if (!v) return null;
                        const isCatB = normalizeVenueCategory(v.category) === 'B';
                        return (
                          <motion.div
                            key={id}
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                          >
                            <Badge 
                              className={cn(
                                "pl-3 pr-1.5 py-1.5 flex items-center gap-1.5 font-semibold shadow-md",
                                isCatB
                                  ? "bg-warning/15 text-warning border-warning/30 hover:bg-warning/25"
                                  : "bg-brand/15 text-brand border-brand/30 hover:bg-brand/25"
                              )}
                            >
                              {v.name}
                              <button 
                                type="button" 
                                onClick={() => handleVenueToggle(id)} 
                                className={cn(
                                  "ml-0.5 hover:bg-current/20 rounded-full p-0.5 transition-all hover:scale-110"
                                )}
                              >
                                <span className="font-bold text-lg">×</span>
                              </button>
                            </Badge>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Venue Info Alert */}
                  {warnings.venue && (
                    <Alert
                      className={cn(
                        "rounded-xl border-2 mt-3",
                        warnings.venueType === 'warning' 
                          ? "border-warning/30 bg-warning/5" 
                          : "border-success/30 bg-success/5"
                      )}
                    >
                      {warnings.venueType === 'warning' ? (
                        <AlertTriangle size={18} className="text-warning shrink-0" />
                      ) : (
                        <CheckCircle2 size={18} className="text-success shrink-0" />
                      )}
                      <AlertDescription className={cn(
                        "font-semibold ml-3",
                        warnings.venueType === 'warning' ? "text-warning" : "text-success"
                      )}>
                        {warnings.venue}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </section>

              {/* Submit Area */}
              <div className="pt-8 border-t border-borderSoft/40">
                <Button
                  type="submit"
                  disabled={hasErrors || isSubmitting || !formData.eventName || !formData.date || !formData.startTime || !formData.endTime || formData.venueIds.length === 0}
                  className={cn(
                    "w-full h-14 text-base font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2",
                    hasErrors || isSubmitting || !formData.eventName || !formData.date || !formData.startTime || !formData.endTime || formData.venueIds.length === 0
                      ? "bg-textMuted/50 opacity-60 cursor-not-allowed"
                      : "bg-gradient-to-r from-brand via-brandLink to-purple-500 hover:shadow-2xl hover:shadow-brand/30 text-white active:scale-95"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-5 w-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Submitting Booking...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={20} />
                      <span>Confirm Booking</span>
                    </>
                  )}
                </Button>
                {hasErrors && (
                  <p className="text-center text-error text-sm mt-4 font-semibold bg-error/5 p-3 rounded-lg border border-error/20">
                    ⚠️ Please resolve the warnings above to proceed.
                  </p>
                )}
                {!formData.eventName || !formData.date || !formData.startTime || !formData.endTime || formData.venueIds.length === 0 ? (
                  <p className="text-center text-textMuted text-sm mt-4 font-medium">
                    📝 Please fill in all required fields to submit.
                  </p>
                ) : null}
              </div>

            </div>
          </form>
        </CardContent>
      </motion.div>
    </motion.div>
  );
};

export default BookSlot;
