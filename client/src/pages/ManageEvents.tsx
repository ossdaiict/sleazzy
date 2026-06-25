import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '../lib/api';
import { toastInfo, toastError } from '../lib/toast';
import { getErrorMessage } from '../lib/errors';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { Calendar, Clock, MapPin, Edit, Trash2, Plus, AlertTriangle, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AppEvent } from '../types';

const ManageEvents: React.FC = () => {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AppEvent | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; date: string; startTime: string; endDate: string; endTime: string; venue: string[]; event_type: string }>({ name: '', date: '', startTime: '', endDate: '', endTime: '', venue: [], event_type: 'open_all' });
  const [isSaving, setIsSaving] = useState(false);

  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<{ name: string; startDate: string; startTime: string; endDate: string; endTime: string; venue: string[]; event_type: string }>({ name: '', startDate: '', startTime: '', endDate: '', endTime: '', venue: ['Online'], event_type: 'open_all' });
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [eventsData, venuesData] = await Promise.all([
        apiRequest<AppEvent[]>('/api/events', { auth: true }),
        apiRequest<{ id: string; name: string }[]>('/api/venues')
      ]);
      setEvents(eventsData);
      setVenues(venuesData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(getErrorMessage(err, 'Failed to load events.'));
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleEditClick = (event: AppEvent) => {
    setEditingEvent(event);
    
    // Parse the stored dates
    const startDate = new Date(event.date);
    const endDate = event.dynamic_end_date ? new Date(event.dynamic_end_date) : startDate;

    setEditForm({
      name: event.name,
      date: isNaN(startDate.getTime()) ? '' : startDate.toISOString().split('T')[0],
      startTime: isNaN(startDate.getTime()) ? '' : startDate.toTimeString().substring(0, 5),
      endDate: isNaN(endDate.getTime()) ? '' : endDate.toISOString().split('T')[0],
      endTime: isNaN(endDate.getTime()) ? '' : endDate.toTimeString().substring(0, 5),
      venue: event.venue ? event.venue.split(', ') : [],
      event_type: (event as any).event_type || 'open_all'
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEvent) return;
    setIsSaving(true);
    try {
      // Combine date and time
      const startDateTime = new Date(`${editForm.date}T${editForm.startTime || '00:00'}:00`);
      const endDateTime = new Date(`${editForm.endDate || editForm.date}T${editForm.endTime || '23:59'}:00`);

      await apiRequest(`/api/events/${editingEvent.id}`, {
        method: 'PUT',
        auth: true,
        body: {
          name: editForm.name,
          date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          venue: editForm.venue.join(', '),
          event_type: editForm.event_type
        }
      });
      toastInfo('Event updated successfully');
      setIsEditOpen(false);
      fetchData();
    } catch (err) {
      toastError(err, 'Failed to update event');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateEvent = async () => {
    setIsSavingEvent(true);
    try {
      const startDateTime = new Date(`${newEvent.startDate}T${newEvent.startTime || '00:00'}:00`).toISOString();
      const endDateTime = new Date(`${newEvent.endDate || newEvent.startDate}T${newEvent.endTime || '23:59'}:00`).toISOString();

      await apiRequest('/api/events', {
        method: 'POST',
        auth: true,
        body: {
          name: newEvent.name,
          date: startDateTime,
          end_date: endDateTime,
          venue: newEvent.venue.join(', '),
          event_type: newEvent.event_type,
        },
      });
      toastInfo('Event registered successfully');
      setIsAddEventOpen(false);
      setNewEvent({ name: '', startDate: '', startTime: '', endDate: '', endTime: '', venue: ['Online'], event_type: 'open_all' });
      fetchData();
    } catch (err) {
      toastError(err, 'Failed to register event');
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to completely delete this event? This action will archive and remove all associated bookings and reports. It cannot be undone.')) {
      return;
    }
    try {
      await apiRequest(`/api/events/${id}`, { method: 'DELETE', auth: true });
      toastInfo('Event deleted successfully');
      fetchData();
    } catch (err) {
      toastError(err, 'Failed to delete event');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 px-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <motion.h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-textPrimary tracking-tighter">Manage Events</motion.h2>
          <p className="text-textSecondary mt-2 sm:mt-3 text-sm sm:text-base font-medium leading-relaxed max-w-xl">
            View, edit, or delete your registered events.
          </p>
        </div>
        <Button onClick={() => setIsAddEventOpen(true)} className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90 gap-2 shrink-0">
          <Plus size={18} /> Register Event
        </Button>
      </div>

      {error && (
        <Alert className="rounded-2xl border-2 border-error/30 bg-error/5">
          <AlertTriangle size={18} className="text-error" />
          <AlertTitle className="font-bold text-error">Could not load events</AlertTitle>
          <AlertDescription className="mt-2 text-error/80">{error}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-4 gap-2 border-error/30 hover:bg-error/5" onClick={fetchData}>
            <RefreshCw size={16} /> Retry
          </Button>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-borderSoft rounded-lg p-6 bg-card">
              <Skeleton className="h-24 w-full rounded-md" />
            </Card>
          ))}
        </div>
      ) : !error && events.length === 0 ? (
        <Card className="border-2 border-dashed border-borderSoft rounded-lg p-16 text-center bg-card shadow-none">
          <Calendar className="h-16 w-16 mx-auto text-textMuted/40 mb-4" />
          <p className="text-textMuted text-lg font-semibold">No registered events found.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {events.map((event, index) => {
            const startDate = new Date(event.date);
            const endDate = event.dynamic_end_date ? new Date(event.dynamic_end_date) : startDate;
            
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border border-borderSoft rounded-lg hover:border-brand/50 transition-colors shadow-sm bg-card">
                  <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-textPrimary mb-1">{event.name}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-textMuted">
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className="text-brand/70" />
                          <span>
                            {startDate.toLocaleDateString()} {startDate.toTimeString().substring(0, 5)} - {endDate.toLocaleDateString()} {endDate.toTimeString().substring(0, 5)}
                          </span>
                        </div>
                        {event.venue && (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-brand/70" />
                            <span>{event.venue}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(event)} className="gap-2">
                        <Edit size={14} /> Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(event.id)} className="gap-2 text-error border-error/30 hover:bg-error/10 hover:border-error">
                        <Trash2 size={14} /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit Event Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-borderSoft text-textPrimary">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>Modify event details and dates.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Event Name</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label>Event Type *</Label>
              <Select value={editForm.event_type} onValueChange={val => setEditForm({ ...editForm, event_type: val })}>
                <SelectTrigger className="rounded-xl">
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
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={editForm.startTime}
                  onChange={e => setEditForm({ ...editForm, startTime: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={editForm.endDate}
                  onChange={e => setEditForm({ ...editForm, endDate: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={editForm.endTime}
                  onChange={e => setEditForm({ ...editForm, endTime: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-textSecondary">Venues * (Select one or more)</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-borderSoft rounded-xl bg-bgMain">
                {[{ id: 'online', name: 'Online' }, ...venues].map(v => {
                  const isSelected = editForm.venue.includes(v.name);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        if (v.name === 'Online') {
                          setEditForm({ ...editForm, venue: ['Online'] });
                        } else {
                          if (isSelected) {
                            const newVenues = editForm.venue.filter(n => n !== v.name);
                            setEditForm({ ...editForm, venue: newVenues.length === 0 ? ['Online'] : newVenues });
                          } else {
                            setEditForm({ ...editForm, venue: [...editForm.venue.filter(n => n !== 'Online'), v.name] });
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving || !editForm.name || !editForm.date || editForm.venue.length === 0} className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for Register Event */}
      <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl bg-card border border-borderSoft text-textPrimary">
          <DialogHeader>
            <DialogTitle>Register a New Event</DialogTitle>
            <DialogDescription className="text-textMuted">
              Create an event to tie slot bookings to it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
                <Label htmlFor="event-sdate-dialog" className="text-textSecondary">Start Date *</Label>
                <Input
                  id="event-sdate-dialog"
                  type="date"
                  value={newEvent.startDate}
                  onChange={e => setNewEvent({ ...newEvent, startDate: e.target.value })}
                  className="rounded-xl bg-bgMain border-borderSoft text-textPrimary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-stime-dialog" className="text-textSecondary">Start Time</Label>
                <Input
                  id="event-stime-dialog"
                  type="time"
                  value={newEvent.startTime}
                  onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })}
                  className="rounded-xl bg-bgMain border-borderSoft text-textPrimary"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="event-edate-dialog" className="text-textSecondary">End Date</Label>
                <Input
                  id="event-edate-dialog"
                  type="date"
                  value={newEvent.endDate}
                  onChange={e => setNewEvent({ ...newEvent, endDate: e.target.value })}
                  className="rounded-xl bg-bgMain border-borderSoft text-textPrimary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-etime-dialog" className="text-textSecondary">End Time</Label>
                <Input
                  id="event-etime-dialog"
                  type="time"
                  value={newEvent.endTime}
                  onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })}
                  className="rounded-xl bg-bgMain border-borderSoft text-textPrimary"
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
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAddEventOpen(false)} className="rounded-xl border-borderSoft text-textSecondary hover:bg-hoverSoft">Cancel</Button>
            <Button 
              type="button"
              onClick={handleCreateEvent} 
              disabled={isSavingEvent || !newEvent.name || !newEvent.startDate || newEvent.venue.length === 0}
              className="rounded-xl bg-brand hover:bg-brand/90 text-white font-semibold"
            >
              {isSavingEvent ? 'Registering...' : 'Register Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ManageEvents;
