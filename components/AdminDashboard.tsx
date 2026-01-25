import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, ChevronRight, AlertCircle, Calendar } from 'lucide-react';
import { PENDING_REQUESTS, VENUES } from '../constants';

const AdminDashboard: React.FC = () => {
  const getVenueName = (id: string) => VENUES.find(v => v.id === id)?.name || id;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Admin Dashboard</h2>
        <p className="text-slate-500 mt-1">Overview of venue requests and system status.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500">Pending</div>
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><AlertCircle size={18} /></div>
          </div>
          <div className="mt-4 text-3xl font-bold text-slate-900">{PENDING_REQUESTS.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
             <div className="text-sm font-medium text-slate-500">Scheduled</div>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Calendar size={18} /></div>
          </div>
          <div className="mt-4 text-3xl font-bold text-slate-900">12</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500">Conflicts</div>
            <div className="p-2 bg-red-100 text-red-600 rounded-lg"><XCircle size={18} /></div>
          </div>
          <div className="mt-4 text-3xl font-bold text-slate-900">0</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-500">Active Clubs</div>
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><CheckCircle size={18} /></div>
          </div>
          <div className="mt-4 text-3xl font-bold text-slate-900">34</div>
        </div>
      </div>

      {/* Pending Requests Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
             <h3 className="text-lg font-semibold text-slate-800">Pending Requests</h3>
             <p className="text-sm text-slate-500">Requests requiring immediate attention (Category B or Conflicts)</p>
          </div>
          <Link to="/admin/requests" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            View All <ChevronRight size={16} />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {PENDING_REQUESTS.map(req => (
            <div key={req.id} className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                      {req.clubName}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-sm text-slate-500">{new Date(req.date).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-lg font-medium text-slate-900">{req.eventName}</h4>
                  <div className="mt-1 text-sm text-slate-600">
                    Requested Venue: <span className="font-semibold text-slate-800">{getVenueName(req.venueId)}</span> ({req.startTime} - {req.endTime})
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors">
                    <XCircle size={16} />
                    Reject
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow transition-colors">
                    <CheckCircle size={16} />
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;