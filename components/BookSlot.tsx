import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  AlertOctagon,
  Building2,
  Lock
} from 'lucide-react';
import { CLUBS, VENUES, UPCOMING_EVENTS, PENDING_REQUESTS } from '../constants';
import { EventType, ClubGroupType, User } from '../types';

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

  // Autofill Club Name from User Session
  useEffect(() => {
    if (currentUser && currentUser.role === 'club') {
      setFormData(prev => ({ ...prev, clubName: currentUser.name }));
    }
  }, [currentUser]);

  // Helper to get Club Group
  const getClubGroup = (name: string): ClubGroupType | undefined => {
    // If it's the current user, use their group directly if available
    if (name === currentUser.name && currentUser.group) {
      return currentUser.group;
    }
    return CLUBS.find(c => c.name === name)?.group;
  };

  // Helper to get Venue Category
  const getVenueCategory = (id: string) => {
    return VENUES.find(v => v.id === id)?.category;
  };

  // --- Logic Effects ---

  // 1. Timeline Validation
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

  // 2. Venue Permission Logic
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

  // 3. Operating Hours Logic (Weekdays vs Weekends)
  useEffect(() => {
    if (!formData.date || !formData.startTime || !formData.endTime) {
       setWarnings(prev => ({ ...prev, hours: '' }));
       return;
    }

    const dateObj = new Date(formData.date);
    const day = dateObj.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = day === 0 || day === 6;

    const start = formData.startTime;
    const end = formData.endTime;
    
    let errorMsg = '';

    if (end <= start) {
      errorMsg = "End time must be after start time.";
    } else if (isWeekend) {
      // Weekends: 8am to 12am (Midnight)
      // Interpreting "12pm" from prompt as 12am/Midnight to support full day events
      if (start < "08:00") {
        errorMsg = "On weekends, bookings are allowed from 8:00 AM to 12:00 AM.";
      }
    } else {
      // Weekdays: 4pm to 12am (Midnight)
      if (start < "16:00") {
        errorMsg = "On weekdays, bookings are only allowed from 4:00 PM to 12:00 AM.";
      }
    }

    setWarnings(prev => ({ ...prev, hours: errorMsg }));
  }, [formData.date, formData.startTime, formData.endTime]);

  // 4. Parallel Booking & Venue Conflict Logic
  useEffect(() => {
    if (!formData.date || !formData.startTime || !formData.endTime || !formData.clubName) {
      setWarnings(prev => ({ ...prev, conflict: '' }));
      return;
    }

    const currentGroup = getClubGroup(formData.clubName);
    const allExistingBookings = [...UPCOMING_EVENTS, ...PENDING_REQUESTS];
    
    // Check conflicts
    let conflictMessage = '';

    const hasConflict = allExistingBookings.some(booking => {
      // Check date match
      if (booking.date !== formData.date) return false;

      // Check time overlap
      // Logic: (StartA < EndB) and (EndA > StartB)
      const overlap = (formData.startTime < booking.endTime) && (formData.endTime > booking.startTime);
      
      if (!overlap) return false;

      // Conflict Type 1: Same Venue
      if (booking.venueId === formData.venueId) {
        conflictMessage = `Venue Conflict: ${booking.venueId.toUpperCase()} is already booked for "${booking.eventName}" at this time.`;
        return true;
      }

      // Conflict Type 2: Same Group (Parallel Policy)
      // Only applies if it's NOT the same club (a club can theoretically have 2 events if diff venues, but usually policy restricts group)
      // Assuming strict policy: No two clubs from same group at same time.
      const bookingClubGroup = getClubGroup(booking.clubName);
      if (bookingClubGroup && currentGroup && bookingClubGroup === currentGroup && booking.clubName !== formData.clubName) {
         conflictMessage = `Parallel Event Policy: Group ${currentGroup} already has an event "${booking.eventName}" scheduled.`;
         return true;
      }

      return false;
    });

    if (hasConflict) {
      setWarnings(prev => ({
        ...prev,
        conflict: conflictMessage
      }));
    } else {
      setWarnings(prev => ({ ...prev, conflict: '' }));
    }
  }, [formData.date, formData.startTime, formData.endTime, formData.clubName, formData.venueId]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (warnings.timeline || warnings.conflict || warnings.hours) {
      alert("Please resolve the warnings before submitting.");
      return;
    }

    console.log("Submitting Booking Request for " + formData.clubName, JSON.stringify(formData, null, 2));
    alert("Booking request submitted! (Mock) \nCheck console for payload.");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
        <div className="mb-8 border-b border-slate-100 pb-4">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="text-blue-600" />
            Book a Venue Slot
          </h2>
          <p className="text-slate-500 mt-1">Fill in the details to request a venue for your club event.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Event Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Event Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Name</label>
                <input
                  type="text"
                  name="eventName"
                  required
                  className="w-full bg-white rounded-lg border-slate-300 border px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                  placeholder="e.g. Intro to Machine Learning"
                  value={formData.eventName}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Type</label>
                <select
                  name="eventType"
                  className="w-full bg-white rounded-lg border-slate-300 border px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.eventType}
                  onChange={handleChange}
                >
                  <option value="closed-club">Closed Club Event</option>
                  <option value="open-for-all">Open-for-All</option>
                  <option value="co-curricular">Co-curricular</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expected Attendees</label>
                <div className="relative">
                  <Users size={18} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="number"
                    name="expectedAttendees"
                    required
                    className="w-full bg-white rounded-lg border-slate-300 border pl-10 pr-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0"
                    value={formData.expectedAttendees}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 2: Organizer & Timing */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Logistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Organizing Club</label>
                <div className="relative">
                   {/* If Club User, show Lock icon and disable. If Admin, show select. */}
                   {currentUser.role === 'club' ? (
                     <>
                      <Lock size={18} className="absolute left-3 top-2.5 text-slate-400" />
                      <input 
                        type="text" 
                        readOnly
                        value={formData.clubName}
                        className="w-full rounded-lg border-slate-200 border bg-slate-50 pl-10 pr-3 py-2 text-slate-500 cursor-not-allowed focus:outline-none"
                      />
                      <p className="text-xs text-slate-400 mt-1 ml-1">Auto-filled based on your login session.</p>
                     </>
                   ) : (
                    <select
                      name="clubName"
                      required
                      className="w-full bg-white rounded-lg border-slate-300 border px-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                      value={formData.clubName}
                      onChange={handleChange}
                    >
                      <option value="">Select a Club...</option>
                      {CLUBS.map(club => (
                        <option key={club.name} value={club.name}>
                          {club.name} (Group {club.group})
                        </option>
                      ))}
                    </select>
                   )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <div className="relative">
                  <Calendar size={18} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="date"
                    name="date"
                    required
                    className={`w-full bg-white rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none ${warnings.timeline ? 'border-red-300 bg-red-50' : ''}`}
                    value={formData.date}
                    onChange={handleChange}
                  />
                </div>
                {/* Timeline Error */}
                {warnings.timeline && (
                  <div className="mt-2 flex items-start gap-2 text-xs text-red-600 font-medium">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>{warnings.timeline}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="time"
                    name="startTime"
                    required
                    className={`w-full bg-white rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none ${warnings.hours ? 'border-red-300 bg-red-50' : ''}`}
                    value={formData.startTime}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                <div className="relative">
                  <Clock size={18} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="time"
                    name="endTime"
                    required
                    className={`w-full bg-white rounded-lg border border-slate-300 pl-10 pr-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none ${warnings.hours ? 'border-red-300 bg-red-50' : ''}`}
                    value={formData.endTime}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Operating Hours Error */}
              {warnings.hours && (
                <div className="md:col-span-2 mt-1 flex items-start gap-2 text-xs text-red-600 font-medium">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>{warnings.hours}</span>
                </div>
              )}

              {/* Conflict Error */}
              {warnings.conflict && (
                <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                  <AlertOctagon className="text-red-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="text-sm font-bold text-red-800">Booking Conflict</h4>
                    <p className="text-xs text-red-600 mt-1">{warnings.conflict}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* Section 3: Venue */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Venue Selection</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Venue</label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <select
                  name="venueId"
                  required
                  className="w-full bg-white rounded-lg border-slate-300 border pl-10 pr-3 py-2 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.venueId}
                  onChange={handleChange}
                >
                  <option value="">Select a Venue...</option>
                  <optgroup label="Category A (General)">
                    {VENUES.filter(v => v.category === 'A').map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Category B (Restricted)">
                    {VENUES.filter(v => v.category === 'B').map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              
              {/* Venue Permission Badge */}
              {warnings.venue && (
                <div className={`mt-3 flex items-center gap-2 text-sm p-3 rounded-lg border ${
                  warnings.venueType === 'warning' 
                    ? 'bg-amber-50 border-amber-200 text-amber-800' 
                    : 'bg-green-50 border-green-200 text-green-800'
                }`}>
                  {warnings.venueType === 'warning' ? <Building2 size={16} /> : <CheckCircle2 size={16} />}
                  <span className="font-medium">{warnings.venue}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3">
             <button
              type="button"
              className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors"
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!warnings.timeline || !!warnings.conflict || !!warnings.hours}
              className={`px-6 py-2.5 rounded-lg text-white font-medium shadow-sm transition-all flex items-center gap-2 ${
                (warnings.timeline || warnings.conflict || warnings.hours)
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'
              }`}
            >
              Submit Request
              <CheckCircle2 size={18} />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default BookSlot;