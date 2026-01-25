import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Clock, MapPin, ChevronRight, Info, ChevronLeft } from 'lucide-react';
import { UPCOMING_EVENTS, VENUES, PENDING_REQUESTS } from '../constants';
import { Booking } from '../types';

const ClubDashboard: React.FC = () => {
  // Combine all events to show in calendar
  const ALL_EVENTS = [...UPCOMING_EVENTS, ...PENDING_REQUESTS];
  
  // Filter mock events for the "Programming Club" specifically for the list
  const myEvents = UPCOMING_EVENTS.filter(e => e.clubName === 'Programming Club');

  const getVenueName = (id: string) => VENUES.find(v => v.id === id)?.name || id;

  // Calendar State
  // Defaulting to October 2023 to match mock data availability
  const [currentDate, setCurrentDate] = useState(new Date('2023-10-01')); 
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date('2023-10-25'));

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const changeMonth = (offset: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    setCurrentDate(newDate);
    setSelectedDate(null);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const getEventsForDate = (date: Date) => {
    return ALL_EVENTS.filter(e => {
      const eDate = new Date(e.date);
      return isSameDay(eDate, date);
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }

    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const events = getEventsForDate(date);
      const hasEvents = events.length > 0;
      const isSelected = selectedDate && isSameDay(date, selectedDate);

      days.push(
        <button
          key={i}
          onClick={() => setSelectedDate(date)}
          className={`h-10 w-full rounded-lg flex items-center justify-center relative transition-colors ${
            isSelected 
              ? 'bg-blue-600 text-white shadow-sm' 
              : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <span className="text-sm font-medium">{i}</span>
          {hasEvents && !isSelected && (
            <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-blue-500"></span>
          )}
        </button>
      );
    }

    return days;
  };

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Welcome, Programming Club</h2>
          <p className="text-slate-500 mt-1">Manage your events and venue bookings efficiently.</p>
        </div>
        <Link 
          to="/book" 
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
        >
          <CalendarPlus size={20} />
          <span>Book a New Slot</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Widget */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Global Event Schedule</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronLeft size={20}/></button>
              <span className="text-sm font-medium text-slate-700 min-w-[100px] text-center">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded text-slate-500"><ChevronRight size={20}/></button>
            </div>
          </div>
          
          <div className="p-6 flex-1 flex flex-col md:flex-row gap-8">
            {/* The Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-7 mb-2 text-center text-xs font-semibold text-slate-400 uppercase">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
              </div>
              <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                {renderCalendar()}
              </div>
            </div>

            {/* Selected Date Details */}
            <div className="md:w-64 border-l border-slate-100 md:pl-8 flex flex-col">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Select a date'}
              </h4>
              
              <div className="flex-1 overflow-y-auto space-y-3">
                {selectedDateEvents.length > 0 ? (
                  selectedDateEvents.map(event => (
                    <div key={event.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="font-medium text-slate-800 text-sm">{event.eventName}</div>
                      <div className="text-xs text-blue-600 mt-0.5">{event.clubName}</div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={12} />
                        <span>{event.startTime} - {event.endTime}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                         <MapPin size={12} />
                         <span>{getVenueName(event.venueId)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                   selectedDate ? (
                     <div className="text-center py-8 text-slate-400 text-sm">
                       No events scheduled for this day.
                     </div>
                   ) : null
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Your Upcoming Events (Sidebar) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">My Club Events</h3>
            <Link to="/my-bookings" className="text-xs text-blue-600 hover:underline">View All</Link>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[400px]">
            {myEvents.map(event => (
              <div key={event.id} className="p-4 hover:bg-slate-50">
                <div className="font-semibold text-slate-900 text-sm">{event.eventName}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <CalendarPlus size={12} />
                  {new Date(event.date).toLocaleDateString()}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <MapPin size={12} />
                  {getVenueName(event.venueId)}
                </div>
                <div className="mt-2">
                   <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                      event.status === 'approved' 
                        ? 'bg-green-100 text-green-700' 
                        : event.status === 'pending'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {event.status}
                    </span>
                </div>
              </div>
            ))}
             {myEvents.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-sm">No upcoming events.</div>
             )}
          </div>
        </div>
      </div>

      {/* Quick Policy Reminder */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
        <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-sm font-semibold text-blue-900">Booking Policy Reminder</h4>
          <p className="text-sm text-blue-700 mt-1">
            Category A venues are auto-approved for Group A clubs if no conflict exists. 
            Category B venues (Lecture Theatres) always require Admin approval.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClubDashboard;