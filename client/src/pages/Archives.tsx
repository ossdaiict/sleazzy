import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiRequest } from '../lib/api';
import { toastError } from '../lib/toast';
import { getErrorMessage } from '../lib/errors';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { Calendar, RefreshCw, Archive as ArchiveIcon, MapPin, Download } from 'lucide-react';
import { Button } from '../components/ui/button';

interface ArchivedBooking {
  id: string;
  club_id: string;
  venue_id: string;
  start_time: string;
  end_time: string;
  status: string;
  event_name: string;
  event_type: string;
  archived_at: string;
}

interface ArchivedReport {
  id: string;
  club_id: string;
  level: string;
  report_doc_link: string;
  photos_drive_link: string;
  archived_at: string;
}

interface ArchivedEvent {
  id: string;
  club_id: string;
  name: string;
  date: string;
  end_date: string;
  venue: string;
  event_type: string;
  archived_at: string;
  bookings: ArchivedBooking[];
  report: ArchivedReport | null;
}

const Archives: React.FC = () => {
  const [archives, setArchives] = useState<ArchivedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchArchives = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ArchivedEvent[]>('/api/archives/events', { auth: true });
      setArchives(data);
    } catch (err) {
      console.error('Failed to fetch archives:', err);
      setError(getErrorMessage(err, 'Failed to load archives.'));
      setArchives([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchives();
  }, [fetchArchives]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 px-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-3">
          <ArchiveIcon className="text-textSecondary" size={32} />
          <div>
            <motion.h2 className="text-3xl sm:text-4xl font-extrabold text-textPrimary tracking-tighter">Database Archives</motion.h2>
            <p className="text-textSecondary mt-1 text-sm font-medium leading-relaxed max-w-xl">
              Historical records of deleted events, their bookings, and reports.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchArchives} className="gap-2 shrink-0">
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      {error && (
        <Alert className="rounded-2xl border-2 border-error/30 bg-error/5">
          <AlertTitle className="font-bold text-error">Could not load archives</AlertTitle>
          <AlertDescription className="mt-2 text-error/80">{error}</AlertDescription>
        </Alert>
      )}

      {!error && archives.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card border border-borderSoft rounded-2xl shadow-sm">
          <ArchiveIcon size={48} className="text-textMuted mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-textPrimary">No Archives Found</h3>
          <p className="text-textSecondary max-w-sm mt-2 text-sm">
            When events are deleted, their records will appear here for historical reference.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {archives.map((event, i) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="border border-borderSoft rounded-xl overflow-hidden shadow-sm">
              <CardHeader className="bg-bgMain border-b border-borderSoft p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-textPrimary">{event.name}</CardTitle>
                    <div className="flex gap-4 mt-2 text-xs text-textSecondary">
                      <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(event.date).toLocaleDateString()}</span>
                      {event.venue && <span className="flex items-center gap-1"><MapPin size={12}/> {event.venue}</span>}
                      <span className="flex items-center gap-1">Archived: {new Date(event.archived_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs bg-bgMain border-borderSoft">Event Record</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {event.bookings.length > 0 && (
                  <div className="p-4 border-b border-borderSoft/50 bg-card">
                    <h4 className="text-sm font-semibold mb-2 text-textPrimary flex items-center gap-2">
                      <ArchiveIcon size={14} className="text-brand" /> Associated Bookings ({event.bookings.length})
                    </h4>
                    <div className="space-y-2">
                      {event.bookings.map(b => (
                        <div key={b.id} className="text-xs flex justify-between items-center p-2 rounded-lg bg-bgMain">
                          <span>{new Date(b.start_time).toLocaleString()} - {new Date(b.end_time).toLocaleTimeString()}</span>
                          <Badge variant="outline" className="text-[10px]">{b.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {event.report && (
                  <div className="p-4 bg-card">
                    <h4 className="text-sm font-semibold mb-2 text-textPrimary flex items-center gap-2">
                      <ArchiveIcon size={14} className="text-brand" /> Associated Event Report
                    </h4>
                    <div className="text-xs text-textSecondary flex gap-4">
                      <span>Level: {event.report.level}</span>
                      <a href={event.report.report_doc_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline"><Download size={12}/> Doc</a>
                      {event.report.photos_drive_link && (
                        <a href={event.report.photos_drive_link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-brand hover:underline"><Download size={12}/> Photos</a>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Archives;
