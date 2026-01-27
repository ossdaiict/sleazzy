import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
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
import { EventType, ClubGroupType, User } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { cn } from '@/lib/utils';

interface BookSlotProps {
  currentUser: User;
}

const BookSlot: React.FC<BookSlotProps> = ({ currentUser }) => {
  const [formData, setFormData] = useState({
    eventName: '',
    eventType: 'closed-club' as EventType,
    expectedAttendees: '',
    clubName: '',
    date: '',
    startTime: '',
    endTime: '',
    venueId: ''
  });

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

  const getClubGroup = (name: string): ClubGroupType | undefined => {
    if (name === currentUser.name && currentUser.group) {
      return currentUser.group;
    }
    return CLUBS.find(c => c.name === name)?.group;
  };

  const getVenueCategory = (id: string) => {
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

    if (formData.eventType === 'co-curricular' && diffDays < 30) {
      warningMsg = 'Co-curricular events must be booked at least 30 days in advance.';
    } else if (formData.eventType === 'open-for-all' && diffDays < 20) {
      warningMsg = 'Open-for-All events must be booked at least 20 days in advance.';
    } else if (formData.eventType === 'closed-club' && diffDays < 1) {
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
    if (category === 'B') {
      setWarnings(prev => ({
        ...prev,
        venue: 'Category B Venue: Requires SBG Convener & Faculty Approval.',
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

    // TODO: Replace with actual API call to check conflicts
    const checkConflicts = async () => {
      try {
        // const response = await fetch(`/api/bookings/check-conflict?date=${formData.date}&startTime=${formData.startTime}&endTime=${formData.endTime}&venueId=${formData.venueId}&clubName=${formData.clubName}`);
        // const conflictData = await response.json();
        // if (conflictData.hasConflict) {
        //   setWarnings(prev => ({ ...prev, conflict: conflictData.message }));
        // } else {
        //   setWarnings(prev => ({ ...prev, conflict: '' }));
        // }
        setWarnings(prev => ({ ...prev, conflict: '' }));
      } catch (error) {
        console.error('Failed to check conflicts:', error);
      }
    };

    checkConflicts();
  }, [formData.date, formData.startTime, formData.endTime, formData.clubName, formData.venueId]);

  const handleChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (warnings.timeline || warnings.conflict || warnings.hours) {
      alert("Please resolve the warnings before submitting.");
      return;
    }

    // TODO: Replace with actual API call
    try {
      // const response = await fetch('/api/bookings', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      // const result = await response.json();
      console.log("Submitting Booking Request for " + formData.clubName, JSON.stringify(formData, null, 2));
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
        <Card className="border-border/40 bg-card/40 backdrop-blur-md">
          <CardHeader className="border-b border-border/40">
            <CardTitle className="text-2xl flex items-center gap-2">
              <Calendar className="text-primary" />
              Book a Venue Slot
            </CardTitle>
            <CardDescription>Fill in the details to request a venue for your club event.</CardDescription>
          </CardHeader>

          <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Section 1: Event Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Event Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-foreground">Event Name</label>
                  <Input
                    type="text"
                    name="eventName"
                    required
                    className="bg-background/50 border-border/40"
                    placeholder="e.g. Intro to Machine Learning"
                    value={formData.eventName}
                    onChange={(e) => handleChange('eventName', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Event Type</label>
                  <Select value={formData.eventType} onValueChange={(v) => handleChange('eventType', v)}>
                    <SelectTrigger className="bg-background/50 border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="closed-club">Closed Club Event</SelectItem>
                      <SelectItem value="open-for-all">Open-for-All</SelectItem>
                      <SelectItem value="co-curricular">Co-curricular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Expected Attendees</label>
                  <div className="relative">
                    <Users size={18} className="absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      type="number"
                      name="expectedAttendees"
                      required
                      className="pl-10 bg-background/50 border-border/40"
                      placeholder="0"
                      value={formData.expectedAttendees}
                      onChange={(e) => handleChange('expectedAttendees', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-border/40" />

            {/* Section 2: Organizer & Timing */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Logistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-foreground">Organizing Club</label>
                  {currentUser.role === 'club' ? (
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-2.5 text-muted-foreground" />
                      <Input 
                        type="text" 
                        readOnly
                        value={formData.clubName}
                        className="pl-10 bg-muted border-border cursor-not-allowed"
                      />
                      <p className="text-xs text-muted-foreground mt-1 ml-1">Auto-filled based on your login session.</p>
                    </div>
                  ) : (
                    <Select value={formData.clubName} onValueChange={(v) => handleChange('clubName', v)}>
                      <SelectTrigger className="bg-background/50 border-border/40">
                        <SelectValue placeholder="Select a Club..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CLUBS.map(club => (
                          <SelectItem key={club.name} value={club.name}>
                            {club.name} (Group {club.group})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-foreground">Date</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      type="date"
                      name="date"
                      required
                      className={cn(
                        "pl-10 bg-background/50 border-border/40",
                        warnings.timeline && "border-destructive"
                      )}
                      value={formData.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                    />
                  </div>
                  {warnings.timeline && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle size={14} />
                      <AlertDescription className="text-xs">{warnings.timeline}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Start Time</label>
                  <div className="relative">
                    <Clock size={18} className="absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      type="time"
                      name="startTime"
                      required
                      className={cn(
                        "pl-10 bg-background/50 border-border/40",
                        warnings.hours && "border-destructive"
                      )}
                      value={formData.startTime}
                      onChange={(e) => handleChange('startTime', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">End Time</label>
                  <div className="relative">
                    <Clock size={18} className="absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      type="time"
                      name="endTime"
                      required
                      className={cn(
                        "pl-10 bg-background/50 border-border/40",
                        warnings.hours && "border-destructive"
                      )}
                      value={formData.endTime}
                      onChange={(e) => handleChange('endTime', e.target.value)}
                    />
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

            <hr className="border-border/40" />

            {/* Section 3: Venue */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Venue Selection</h3>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Preferred Venue</label>
                <div className="relative">
                  <MapPin size={18} className="absolute left-3 top-2.5 text-muted-foreground z-10" />
                  <Select value={formData.venueId} onValueChange={(v) => handleChange('venueId', v)}>
                    <SelectTrigger className="pl-10 bg-background/50 border-border/40">
                      <SelectValue placeholder="Select a Venue..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Category A (General)</div>
                      {VENUES.filter(v => v.category === 'A').map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Category B (Restricted)</div>
                      {VENUES.filter(v => v.category === 'B').map(v => (
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
