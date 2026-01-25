import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Upload, FileText, Download } from 'lucide-react';
import { VENUES, UPCOMING_EVENTS } from '../constants';

const MyBookings: React.FC = () => {
  // Mock data: Add some past events to the existing upcoming ones for demonstration
  const [myBookings] = useState([
    ...UPCOMING_EVENTS.filter(e => e.clubName === 'Programming Club'),
    // Add dummy past events
    {
      id: 'past-1',
      eventName: 'Intro to Python Workshop',
      venueId: 'cep-104',
      clubName: 'Programming Club',
      date: '2023-09-15', // Past date
      startTime: '10:00',
      endTime: '12:00',
      status: 'approved' as const
    },
    {
      id: 'past-2',
      eventName: 'Tech Talk: Cloud Computing',
      venueId: 'lt1',
      clubName: 'Programming Club',
      date: '2023-09-01', // Past date
      startTime: '14:00',
      endTime: '16:00',
      status: 'approved' as const
    }
  ]);

  const getVenueName = (id: string) => VENUES.find(v => v.id === id)?.name || id;

  const isPastEvent = (dateStr: string) => {
    // For demo purposes, we treat dates before Oct 2023 as past, or strictly calculate vs today
    // Using simple string comparison for logic if data is static, but proper Date obj is better
    const eventDate = new Date(dateStr);
    const today = new Date(); 
    return eventDate < today;
  };

  const handleFileUpload = (id: string, type: 'report' | 'indent') => {
    // In a real app, this would trigger a file picker
    alert(`Mock: Uploading ${type} for event ID ${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">My Bookings</h2>
          <p className="text-slate-500 mt-1">Manage current reservations and submit post-event reports.</p>
        </div>
      </div>

      <div className="grid gap-6">
        {myBookings.map((booking) => {
          const isPast = isPastEvent(booking.date);
          
          return (
            <div 
              key={booking.id} 
              className={`bg-white rounded-xl border p-6 flex flex-col md:flex-row gap-6 ${
                isPast ? 'border-slate-200 bg-slate-50/50' : 'border-blue-100 shadow-sm'
              }`}
            >
              {/* Date Box */}
              <div className={`w-full md:w-24 h-24 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                isPast ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-blue-50 border-blue-100 text-blue-600'
              }`}>
                <span className="text-xs font-bold uppercase">{new Date(booking.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                <span className="text-2xl font-bold leading-none">{new Date(booking.date).getDate()}</span>
                <span className="text-xs mt-1">{new Date(booking.date).getFullYear()}</span>
              </div>

              {/* Details */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`text-lg font-bold ${isPast ? 'text-slate-600' : 'text-slate-900'}`}>
                      {booking.eventName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">
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
                  
                  {/* Status Tag */}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                     booking.status === 'approved' 
                     ? isPast ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-green-50 text-green-700 border-green-200' 
                     : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {isPast ? 'Completed' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>

                {/* Post Event Actions */}
                {isPast && booking.status === 'approved' && (
                  <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap gap-3">
                    <button 
                      onClick={() => handleFileUpload(booking.id, 'report')}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <Upload size={16} />
                      Upload Event Report
                    </button>
                    <button 
                      onClick={() => handleFileUpload(booking.id, 'indent')}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <FileText size={16} />
                      Upload Indent
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyBookings;