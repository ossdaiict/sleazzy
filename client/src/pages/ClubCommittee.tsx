import React, { useState, useEffect } from 'react';
import { User, AppEvent } from '../types';

import { apiRequest } from '../lib/api';
import { toastError, toastSuccess } from '../lib/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import RegisterEventDialog from '../components/RegisterEventDialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../components/ui/select';
import { Calendar as CalendarIcon, Plus, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';



interface ClubCommitteeProps {
  user: User;
}

const ClubCommittee: React.FC<ClubCommitteeProps> = ({ user }) => {
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const navigate = useNavigate();

  const isCommittee = user.name.toLowerCase().includes('committee');
  const entityType = isCommittee ? 'Committee' : 'Club';

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    try {
      const eventsData = await apiRequest<AppEvent[]>('/api/events', { auth: true });
      setEvents(eventsData);
    } catch (error) {
      toastError(error, 'Failed to fetch data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-textPrimary tracking-tight flex items-center gap-2 leading-tight">
            <CalendarIcon className="text-brand shrink-0" size={28} />
            <span className="whitespace-normal">{entityType} Events</span>
          </h1>
          <p className="text-textMuted mt-1 text-sm sm:text-base">
            Register and manage your {entityType.toLowerCase()}'s list of events.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => navigate('/members')} variant="outline" className="rounded-xl">
            Edit {entityType} Members
          </Button>
          <Button onClick={() => setIsAddEventOpen(true)} className="rounded-xl bg-brand hover:bg-brand/90 text-white font-semibold">
            <Plus size={16} className="mr-1.5" />
            Register Event
          </Button>
        </div>
      </div>

      <div className="bg-card p-6 rounded-xl border border-borderSoft shadow-sm flex flex-col min-h-[400px]">
        <h3 className="text-lg font-bold text-textPrimary mb-4">Registered Events</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-sm text-textMuted">No registered events yet.</p>
            </div>
          ) : (
            events.map(event => (
              <div key={event.id} className="p-5 rounded-xl border border-borderSoft bg-hoverSoft/20 hover:bg-hoverSoft/40 transition-all flex flex-col justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-base text-textPrimary">{event.name}</h4>
                  <p className="text-xs text-textMuted mt-1">
                    Date: {new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  {event.venue && (
                    <p className="text-xs text-textMuted mt-0.5">
                      Target Venue: {event.venue}
                    </p>
                  )}
                </div>
                <Button 
                  onClick={() => navigate('/book', { 
                    state: { 
                      prefill: { 
                        event_id: event.id,
                        eventName: event.name,
                        date: event.date ? event.date.split('T')[0] : '',
                        venueName: event.venue || ''
                      } 
                    } 
                  })}
                  size="sm"
                  className="w-full text-xs rounded-lg font-semibold bg-brand/10 hover:bg-brand/20 text-brand gap-1"
                >
                  <Plus size={14} />
                  Book Slot
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <RegisterEventDialog 
        isOpen={isAddEventOpen} 
        onOpenChange={setIsAddEventOpen} 
        currentUser={user}
        onEventCreated={() => fetchData()}
      />
    </div>
  );
};

export default ClubCommittee;
