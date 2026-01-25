import React, { useState } from 'react';
import { CheckCircle, XCircle, Search, Filter, Eye, Clock, Calendar, Check, X } from 'lucide-react';
import { PENDING_REQUESTS, VENUES, UPCOMING_EVENTS } from '../constants';
import { Booking } from '../types';

const AdminRequests: React.FC = () => {
  // Combine pending and some mock history for the full view
  const [requests, setRequests] = useState<Booking[]>([
    ...PENDING_REQUESTS,
    ...UPCOMING_EVENTS // Treating these as processed/history for demo
  ]);
  
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');

  const handleAction = (id: string, action: 'approved' | 'rejected') => {
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, status: action } : req
    ));
  };

  const getVenueName = (id: string) => VENUES.find(v => v.id === id)?.name || id;

  const filteredRequests = requests.filter(req => {
    const matchesTab = activeTab === 'pending' 
      ? req.status === 'pending' 
      : req.status !== 'pending';
    
    const matchesSearch = 
      req.clubName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.eventName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Request Management</h2>
          <p className="text-slate-500 mt-1">Review and take action on venue booking requests.</p>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search requests..." 
            className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'pending' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Review ({requests.filter(r => r.status === 'pending').length})
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'history' 
              ? 'border-blue-600 text-blue-600' 
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 uppercase tracking-wider text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-4">Club / Event</th>
                  <th className="px-6 py-4">Venue & Time</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{req.eventName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{req.clubName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-900">
                         {getVenueName(req.venueId)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Clock size={12} /> {req.startTime} - {req.endTime}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(req.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        req.status === 'approved' 
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : req.status === 'rejected'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleAction(req.id, 'rejected')}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <X size={18} />
                          </button>
                          <button 
                            onClick={() => handleAction(req.id, 'approved')}
                            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <Check size={18} />
                          </button>
                        </div>
                      ) : (
                         <div className="text-xs text-slate-400 italic">
                            Processed
                         </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 text-slate-400 mb-4">
              <Filter size={24} />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No requests found</h3>
            <p className="text-slate-500 mt-1">Try adjusting your search or tab filter.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRequests;