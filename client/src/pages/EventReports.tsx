import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { Button } from '../components/ui/button';
import { GlassCard } from '../components/glass-card';
import { GradientBackground } from '../components/gradient-background';
import { toastError } from '../lib/toast';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export default function EventReports() {
  const [pending, setPending] = useState<any[]>([]);
  const [submitted, setSubmitted] = useState<any[]>([]);
  const [tab, setTab] = useState<'pending' | 'submitted'>('pending');
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [form, setForm] = useState({
    level: 'institutional',
    level_description: '',
    report_doc_link: '',
    participants_sheet_link: '',
    photos_drive_link: '',
    awards_doc_link: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = await apiRequest<any[]>('/api/event-reports/pending', { auth: true });
      const s = await apiRequest<any[]>('/api/event-reports', { auth: true });
      setPending(p);
      setSubmitted(s);
    } catch (e: any) {
      toastError('Failed to fetch event reports', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId && !editingReportId) return;

    try {
      if (editingReportId) {
        await apiRequest(`/api/event-reports/${editingReportId}`, {
          method: 'PUT',
          auth: true,
          body: {
            ...form
          }
        });
        toast.success('Event Report Updated!');
      } else {
        await apiRequest('/api/event-reports', {
          method: 'POST',
          auth: true,
          body: {
            event_id: selectedEventId,
            ...form
          }
        });
        toast.success('Event Report Submitted!');
      }
      closeDialog();
      fetchData();
    } catch (error: any) {
      toastError(editingReportId ? 'Update failed' : 'Submission failed', error);
    }
  };

  const handleEdit = (report: any) => {
    setEditingReportId(report.id);
    setForm({
      level: report.level || 'institutional',
      level_description: report.level_description || '',
      report_doc_link: report.report_doc_link || '',
      participants_sheet_link: report.participants_sheet_link || '',
      photos_drive_link: report.photos_drive_link || '',
      awards_doc_link: report.awards_doc_link || '',
    });
  };

  const closeDialog = () => {
    setSelectedEventId(null);
    setEditingReportId(null);
    setForm({
      level: 'institutional',
      level_description: '',
      report_doc_link: '',
      participants_sheet_link: '',
      photos_drive_link: '',
      awards_doc_link: '',
    });
  };

  const getDeadlineText = (event: any) => {
    if (!event.final_end_date) return '';
    const date = new Date(event.final_end_date);
    // Rough calculation matching backend rules
    const next7Days = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const deadline = new Date(Math.min(next7Days.getTime(), endOfMonth.getTime()));
    
    const now = new Date();
    const isPast = now > deadline;
    return (
      <span className={isPast ? "text-error font-semibold" : "text-brand"}>
        Due by: {deadline.toLocaleDateString()} {isPast && "(Overdue!)"}
      </span>
    );
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="relative min-h-screen">
      <GradientBackground />
      <div className="relative z-10 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-textPrimary">Event Reports</h1>
        <p className="text-textMuted max-w-3xl">
          Submit reports for your past events. If reports are overdue (7 days or end of month), you will not be able to make new bookings.
        </p>

        <div className="flex gap-4 border-b border-borderSoft pb-2">
          <button
            onClick={() => setTab('pending')}
            className={`pb-2 px-2 font-medium transition-colors ${tab === 'pending' ? 'border-b-2 border-brand text-brand' : 'text-textMuted hover:text-textPrimary'}`}
          >
            Pending Reports ({pending.length})
          </button>
          <button
            onClick={() => setTab('submitted')}
            className={`pb-2 px-2 font-medium transition-colors ${tab === 'submitted' ? 'border-b-2 border-brand text-brand' : 'text-textMuted hover:text-textPrimary'}`}
          >
            Submitted Reports
          </button>
        </div>

        {tab === 'pending' && (
          <div className="space-y-4">
            {pending.length === 0 ? (
              <p className="text-textMuted">You have no pending event reports! Great job.</p>
            ) : (
              pending.map(p => (
                <GlassCard key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">{p.name}</h3>
                    <p className="text-sm text-textMuted">Ended: {new Date(p.final_end_date).toLocaleDateString()}</p>
                    <p className="text-sm mt-1">{getDeadlineText(p)}</p>
                  </div>
                  <Button onClick={() => setSelectedEventId(p.id)}>Submit Report</Button>
                </GlassCard>
              ))
            )}
          </div>
        )}

        {tab === 'submitted' && (
          <div className="space-y-4">
            {submitted.length === 0 ? (
              <p className="text-textMuted">No reports submitted yet.</p>
            ) : (
              submitted.map(s => (
                <GlassCard key={s.id} className="p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{s.event_name}</h3>
                      <p className="text-sm text-textMuted">Submitted on: {new Date(s.created_at).toLocaleDateString()}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(s)}>Edit Report</Button>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm mt-2">
                    <a href={s.report_doc_link} target="_blank" rel="noreferrer" className="text-brand hover:underline">Report Doc</a>
                    <a href={s.photos_drive_link} target="_blank" rel="noreferrer" className="text-brand hover:underline">Photos</a>
                    {s.participants_sheet_link && <a href={s.participants_sheet_link} target="_blank" rel="noreferrer" className="text-brand hover:underline">Participants</a>}
                  </div>
                </GlassCard>
              ))
            )}
          </div>
        )}

        <Dialog open={!!selectedEventId || !!editingReportId} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">{editingReportId ? 'Edit Event Report' : 'Submit Event Report'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              <div className="space-y-2">
                <Label>Level of Event</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="institutional">Institutional</SelectItem>
                    <SelectItem value="state">State</SelectItem>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="international">International</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {form.level === 'other' && (
                <div className="space-y-2">
                  <Label>Level Description *</Label>
                  <Input 
                    required 
                    value={form.level_description} 
                    onChange={e => setForm({...form, level_description: e.target.value})} 
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Google Docs Link to Report *</Label>
                <Input 
                  type="url" 
                  required 
                  value={form.report_doc_link} 
                  onChange={e => setForm({...form, report_doc_link: e.target.value})} 
                  placeholder="https://docs.google.com/..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Participants Sheet Link (Optional)</Label>
                <Input 
                  type="url" 
                  value={form.participants_sheet_link} 
                  onChange={e => setForm({...form, participants_sheet_link: e.target.value})} 
                  placeholder="https://docs.google.com/spreadsheets/..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Google Drive Photos Link (Min 3 photos) *</Label>
                <Input 
                  type="url" 
                  required 
                  value={form.photos_drive_link} 
                  onChange={e => setForm({...form, photos_drive_link: e.target.value})} 
                  placeholder="https://drive.google.com/..."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Awards and Achievements Link (Optional)</Label>
                <Input 
                  type="url" 
                  value={form.awards_doc_link} 
                  onChange={e => setForm({...form, awards_doc_link: e.target.value})} 
                  placeholder="https://docs.google.com/..."
                />
              </div>
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button type="submit">{editingReportId ? 'Update Report' : 'Submit Report'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
}
