import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { toastError, toastSuccess } from '../lib/toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Info, AlertTriangle } from 'lucide-react';
import { User, AppEvent } from '../types';
import { cn } from '../lib/utils';
import { DatePicker } from './ui/date-picker';
import { TimePicker } from './ui/time-picker';
import { format, parseISO } from 'date-fns';

interface RegisterEventDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser?: User;
  onEventCreated: (event: AppEvent) => void;
}

const RegisterEventDialog: React.FC<RegisterEventDialogProps> = ({
  isOpen,
  onOpenChange,
  currentUser,
  onEventCreated
}) => {
  const [newEvent, setNewEvent] = useState<{ 
    name: string; 
    startDate: string; 
    startTime: string; 
    endDate: string; 
    endTime: string; 
    venue: string[]; 
    event_type: string 
  }>({ name: '', startDate: '', startTime: '', endDate: '', endTime: '', venue: ['Online'], event_type: 'open_all' });
  
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [eventWarnings, setEventWarnings] = useState({ timeline: '', limit: '' });
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [allClubs, setAllClubs] = useState<{ id: string; name: string }[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isOpen && venues.length === 0) {
      apiRequest<{ id: string; name: string }[]>('/api/venues')
        .then(setVenues)
        .catch(console.error);
    }
    
    if (isOpen && currentUser?.role === 'admin' && allClubs.length === 0) {
      apiRequest<any[]>('/api/clubs')
        .then((clubs) => {
          setAllClubs(clubs);
          const sbg = clubs.find((c) =>
            c.name.toLowerCase().includes('sbg') ||
            c.name.toLowerCase().includes('student body')
          );
          setSelectedClubId(sbg?.id || clubs[0]?.id || null);
        })
        .catch(console.error);
    }
  }, [isOpen, venues.length, currentUser?.role, allClubs.length]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setNewEvent({ name: '', startDate: '', startTime: '', endDate: '', endTime: '', venue: ['Online'], event_type: 'open_all' });
      setEventWarnings({ timeline: '', limit: '' });
    }
  }, [isOpen]);

  useEffect(() => {
    let timelineMsg = '';
    if (newEvent.startDate) {
      const eventDate = new Date(newEvent.startDate);
      const diffDays = Math.ceil((eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      
      if (newEvent.event_type === 'co_curricular' && diffDays < 14) {
        timelineMsg = 'Co-curricular events require 14 days advance notice.';
      } else if (newEvent.event_type === 'open_all' && diffDays < 7) {
        timelineMsg = 'Open-for-All events require 7 days advance notice.';
      } else if (newEvent.event_type === 'closed_club' && diffDays < 1) {
        timelineMsg = 'Closed club events require 1 day advance notice.';
      }

      if (timelineMsg && currentUser?.role === 'admin') {
        timelineMsg += ' (Admin Bypass Active)';
      }
    }
    
    setEventWarnings(prev => ({ ...prev, timeline: timelineMsg }));

    if (newEvent.event_type === 'co_curricular' && currentUser?.role !== 'admin') {
      apiRequest<{ count: number; limit: number }>(`/api/bookings/co-curricular-count`, { auth: true })
        .then(({ count, limit }) => {
          if (count >= limit) {
            setEventWarnings(prev => ({ ...prev, limit: `You have reached the limit of ${limit} co-curricular events this semester.` }));
          } else if (count === limit - 1) {
            setEventWarnings(prev => ({ ...prev, limit: `Warning: This will be your last co-curricular event this semester (${count}/${limit} used).` }));
          } else {
            setEventWarnings(prev => ({ ...prev, limit: '' }));
          }
        })
        .catch(() => setEventWarnings(prev => ({ ...prev, limit: '' })));
    } else {
      setEventWarnings(prev => ({ ...prev, limit: '' }));
    }
  }, [newEvent.startDate, newEvent.event_type, currentUser]);

  const handleCreateEvent = async () => {
    setIsSavingEvent(true);
    try {
      const startDateTime = new Date(`${newEvent.startDate}T${newEvent.startTime || '00:00'}:00`);
      const endDateTime = new Date(`${newEvent.endDate || newEvent.startDate}T${newEvent.endTime || '23:59'}:00`);

      const createdEvent = await apiRequest<AppEvent>('/api/events', {
        method: 'POST',
        auth: true,
        body: {
          name: newEvent.name,
          date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          venue: newEvent.venue.join(', '),
          event_type: newEvent.event_type,
          ...(currentUser?.role === 'admin' && selectedClubId ? { club_id: selectedClubId } : {})
        }
      });
      toastSuccess('Event registered successfully');
      onEventCreated(createdEvent);
      onOpenChange(false);
    } catch (err) {
      toastError(err, 'Failed to register event');
    } finally {
      setIsSavingEvent(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-borderSoft text-textPrimary overflow-y-auto max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Register a New Event</DialogTitle>
          <DialogDescription className="text-textMuted">
            Create an event to tie slot bookings to it.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-brand/5 border border-brand/20 p-3 rounded-xl mt-2 text-sm text-brand font-medium">
          <h4 className="font-bold flex items-center gap-1.5 mb-1"><Info size={16}/> Event Registration Rules</h4>
          <ul className="list-disc pl-5 space-y-0.5 text-textSecondary text-xs">
            <li><strong className="text-textPrimary">Open for All:</strong> 7 days advance notice.</li>
            <li><strong className="text-textPrimary">Co-Curricular:</strong> 14 days advance notice. (Semester limits apply)</li>
            <li><strong className="text-textPrimary">Closed Club:</strong> 1 day advance notice.</li>
          </ul>
        </div>

        <div className="grid gap-4 py-4">
          {currentUser?.role === 'admin' && (
            <div className="grid gap-2">
              <Label className="text-textSecondary">Organizing Club</Label>
              <Select value={selectedClubId || ''} onValueChange={setSelectedClubId}>
                <SelectTrigger className="bg-bgMain border-borderSoft text-textPrimary">
                  <SelectValue placeholder="Select club..." />
                </SelectTrigger>
                <SelectContent>
                  {allClubs.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="event-name-dialog" className="text-textSecondary">Event Name *</Label>
            <Input
              id="event-name-dialog"
              value={newEvent.name}
              onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
              placeholder="e.g. Annual Tech Fest"
              className="rounded-xl bg-bgMain border-borderSoft text-textPrimary"
            />
          </div>
          <div className="grid gap-2">
            <Label className="text-textSecondary">Event Type *</Label>
            <Select value={newEvent.event_type} onValueChange={val => setNewEvent({ ...newEvent, event_type: val })}>
              <SelectTrigger className="rounded-xl bg-bgMain border-borderSoft text-textPrimary">
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open_all">Open for All</SelectItem>
                <SelectItem value="co_curricular">Co-Curricular Activity</SelectItem>
                <SelectItem value="closed_club">Closed Club Event</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-textSecondary">Start Date *</Label>
              <DatePicker
                date={newEvent.startDate ? parseISO(newEvent.startDate) : undefined}
                setDate={d => setNewEvent({ ...newEvent, startDate: d ? format(d, 'yyyy-MM-dd') : '' })}
                minDate={new Date(todayStr)}
                className="bg-bgMain h-10 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-textSecondary">Start Time</Label>
              <TimePicker
                value={newEvent.startTime}
                onChange={v => setNewEvent({ ...newEvent, startTime: v })}
                className="bg-bgMain h-10 rounded-xl"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="text-textSecondary">End Date</Label>
              <DatePicker
                date={newEvent.endDate ? parseISO(newEvent.endDate) : undefined}
                setDate={d => setNewEvent({ ...newEvent, endDate: d ? format(d, 'yyyy-MM-dd') : '' })}
                minDate={newEvent.startDate ? parseISO(newEvent.startDate) : new Date(todayStr)}
                className="bg-bgMain h-10 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-textSecondary">End Time</Label>
              <TimePicker
                value={newEvent.endTime}
                onChange={v => setNewEvent({ ...newEvent, endTime: v })}
                className="bg-bgMain h-10 rounded-xl"
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label className="text-textSecondary">Venues * (Select one or more)</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-borderSoft rounded-xl bg-bgMain">
              {[{ id: 'online', name: 'Online' }, ...venues].map(v => {
                const isSelected = newEvent.venue.includes(v.name);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      if (v.name === 'Online') {
                        setNewEvent({ ...newEvent, venue: ['Online'] });
                      } else {
                        if (isSelected) {
                          const newVenues = newEvent.venue.filter(n => n !== v.name);
                          setNewEvent({ ...newEvent, venue: newVenues.length === 0 ? ['Online'] : newVenues });
                        } else {
                          setNewEvent({ ...newEvent, venue: [...newEvent.venue.filter(n => n !== 'Online'), v.name] });
                        }
                      }
                    }}
                    className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                      isSelected ? 'bg-brand text-white border-brand' : 'bg-transparent text-textSecondary border-borderSoft hover:border-brand/50'
                    }`}
                  >
                    {v.name}
                  </button>
                );
              })}
            </div>
          </div>
          {eventWarnings.limit && (
            <div className="p-3 rounded-lg border text-sm font-semibold flex items-start gap-2 bg-error/10 text-error border-error/20">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{eventWarnings.limit}</span>
            </div>
          )}
          {eventWarnings.timeline && (
            <div className={cn(
              "p-3 rounded-lg border text-sm font-semibold flex items-start gap-2",
              currentUser?.role === 'admin' 
                ? "bg-warning/10 text-warning border-warning/20" 
                : "bg-error/10 text-error border-error/20"
            )}>
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{eventWarnings.timeline}</span>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl border-borderSoft text-textSecondary hover:bg-hoverSoft w-full sm:w-auto">Cancel</Button>
          <Button 
            type="button"
            onClick={handleCreateEvent} 
            disabled={isSavingEvent || !newEvent.name || !newEvent.startDate || (!!eventWarnings.timeline && currentUser?.role !== 'admin') || (!!eventWarnings.limit && !eventWarnings.limit.startsWith('Warning:'))}
            className="rounded-xl bg-brand hover:bg-brand/90 text-white font-semibold w-full sm:w-auto"
          >
            {isSavingEvent ? 'Registering...' : 'Register Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RegisterEventDialog;
