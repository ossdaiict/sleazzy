import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { Button } from '../components/ui/button';
import { GlassCard } from '../components/glass-card';
import { GradientBackground } from '../components/gradient-background';
import { toastError } from '../lib/toast';
import { toast } from 'sonner';

export default function AdminEventReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [pastEvents, setPastEvents] = useState<any[]>([]);
  const [tab, setTab] = useState<'submitted' | 'tracking' | 'exempt'>('submitted');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const s = await apiRequest<any[]>('/api/event-reports', { auth: true });
      const p = await apiRequest<any[]>('/api/event-reports/all-past-events', { auth: true });
      setReports(s);
      setPastEvents(p);
    } catch (e: any) {
      toastError('Failed to fetch admin reports data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
      const apiUrl = `${baseUrl.replace(/\/$/, '')}/api/event-reports/export`;
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Event_Reports.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toastError('Export failed', error);
    }
  };

  const toggleExempt = async (eventId: string, currentExempt: boolean) => {
    try {
      await apiRequest(`/api/event-reports/exempt/${eventId}`, {
        method: 'PATCH',
        auth: true,
        body: { exempt: !currentExempt }
      });
      toast.success(`Event marked as ${!currentExempt ? 'exempt' : 'requires report'}`);
      fetchData();
    } catch (e: any) {
      toastError('Failed to toggle exemption', e);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="relative min-h-screen">
      <GradientBackground />
      <div className="relative z-10 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-textPrimary leading-tight">All Event Reports</h1>
            <p className="text-textMuted max-w-3xl">Manage and export all club event reports.</p>
          </div>
          {tab === 'submitted' && (
            <Button onClick={handleExport}>Export to Excel</Button>
          )}
        </div>

        <div className="flex gap-4 border-b border-borderSoft pb-2">
          <button
            onClick={() => setTab('submitted')}
            className={`pb-2 px-2 font-medium transition-colors ${tab === 'submitted' ? 'border-b-2 border-brand text-brand' : 'text-textMuted hover:text-textPrimary'}`}
          >
            Submitted Reports ({reports.length})
          </button>
          <button
            onClick={() => setTab('tracking')}
            className={`pb-2 px-2 font-medium transition-colors ${tab === 'tracking' ? 'border-b-2 border-brand text-brand' : 'text-textMuted hover:text-textPrimary'}`}
          >
            Tracking ({pastEvents.filter(e => !e.has_report && !e.report_exempt).length} past events)
          </button>
          <button
            onClick={() => setTab('exempt')}
            className={`pb-2 px-2 font-medium transition-colors ${tab === 'exempt' ? 'border-b-2 border-brand text-brand' : 'text-textMuted hover:text-textPrimary'}`}
          >
            Exempt ({pastEvents.filter(e => e.report_exempt).length})
          </button>
        </div>

        {tab === 'submitted' && (
          <div className="space-y-4">
            {reports.map(r => (
              <GlassCard key={r.id} className="p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <h3 className="font-semibold text-lg leading-tight">
                    {r.event_name} 
                    <span className="block sm:inline text-sm font-normal text-textMuted sm:ml-2">by {r.club_name}</span>
                  </h3>
                  <span className="text-sm bg-brand/10 text-brand px-2 py-1 rounded-md capitalize self-start shrink-0">{r.level}</span>
                </div>
                <p className="text-sm text-textMuted mt-1">Submitted: {new Date(r.created_at).toLocaleDateString()} | Event: {new Date(r.date).toLocaleDateString()}</p>
                <div className="flex flex-wrap gap-4 text-sm mt-2">
                  <a href={r.report_doc_link} target="_blank" rel="noreferrer" className="text-brand hover:underline">Report Doc</a>
                  <a href={r.photos_drive_link} target="_blank" rel="noreferrer" className="text-brand hover:underline">Photos</a>
                  {r.participants_sheet_link && <a href={r.participants_sheet_link} target="_blank" rel="noreferrer" className="text-brand hover:underline">Participants</a>}
                  {r.awards_doc_link && <a href={r.awards_doc_link} target="_blank" rel="noreferrer" className="text-brand hover:underline">Awards</a>}
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {tab === 'tracking' && (
          <div className="space-y-4 overflow-x-auto">
            <table className="w-full min-w-[600px] sm:min-w-0 text-sm text-left">
              <thead className="text-xs uppercase bg-card/50 text-textMuted">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Club</th>
                  <th className="px-4 py-3">End Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastEvents.filter(e => !e.has_report && !e.report_exempt).map(e => (
                  <tr key={e.id} className="border-b border-borderSoft hover:bg-hoverSoft/50">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3">{e.club_name}</td>
                    <td className="px-4 py-3">{new Date(e.end_date || e.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="text-error font-semibold">Pending</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => toggleExempt(e.id, e.report_exempt)}>
                        Mark Exempt
                      </Button>
                    </td>
                  </tr>
                ))}
                {pastEvents.filter(e => !e.has_report && !e.report_exempt).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-textMuted">No pending events require a report.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'exempt' && (
          <div className="space-y-4 overflow-x-auto">
            <table className="w-full min-w-[600px] sm:min-w-0 text-sm text-left">
              <thead className="text-xs uppercase bg-card/50 text-textMuted">
                <tr>
                  <th className="px-4 py-3">Event</th>
                  <th className="px-4 py-3">Club</th>
                  <th className="px-4 py-3">End Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastEvents.filter(e => e.report_exempt).map(e => (
                  <tr key={e.id} className="border-b border-borderSoft hover:bg-hoverSoft/50">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3">{e.club_name}</td>
                    <td className="px-4 py-3">{new Date(e.end_date || e.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className="text-gray-400">Exempt</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => toggleExempt(e.id, e.report_exempt)}>
                        Remove Exemption
                      </Button>
                    </td>
                  </tr>
                ))}
                {pastEvents.filter(e => e.report_exempt).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-textMuted">No exempt events.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
