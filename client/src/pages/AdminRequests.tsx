import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Search, Filter, Clock, Calendar, Check, X, AlertTriangle, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { apiRequest, mapBooking, groupBookings, type ApiBooking, type ApiVenue } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { toastError, toastSuccess } from '../lib/toast';
import { GroupedBooking } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getSocket } from '../lib/socket';
import { toast } from 'sonner';

const AdminRequests: React.FC = () => {
  const [requests, setRequests] = useState<GroupedBooking[]>([]);
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const fetchRequests = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [venuesData, bookingsData] = await Promise.all([
        apiRequest<ApiVenue[]>('/api/venues'),
        apiRequest<ApiBooking[]>('/api/admin/bookings', { auth: true }),
      ]);
      setVenues(venuesData);
      setRequests(groupBookings(bookingsData.map(mapBooking)));
    } catch (err) {
      console.error('Failed to fetch requests:', err);
      setError(getErrorMessage(err, 'Failed to load requests.'));
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Socket.io: join admin room for real-time new booking alerts
  React.useEffect(() => {
    const socket = getSocket();
    socket.emit('join:admin');

    const handleBookingNew = (payload: { eventName: string; clubName: string; venueNames: string }) => {
      toast.message('📋 New Booking Request', {
        description: `${payload.clubName} → "${payload.eventName}" at ${payload.venueNames}`,
        action: { label: 'Refresh', onClick: fetchRequests },
      });
      fetchRequests();
    };

    const handleEventsUpdated = () => {
      fetchRequests();
    };

    socket.on('booking:new', handleBookingNew);
    socket.on('events:updated', handleEventsUpdated);
    socket.on('booking:status_changed', handleEventsUpdated);

    return () => {
      socket.off('booking:new', handleBookingNew);
      socket.off('events:updated', handleEventsUpdated);
      socket.off('booking:status_changed', handleEventsUpdated);
    };
  }, [fetchRequests]);

  const handleAction = async (ids: string[], action: 'approved' | 'rejected') => {
    if (isProcessingAction) return;
    setIsProcessingAction(true);
    try {
      await apiRequest('/api/admin/bookings/bulk-status', {
        method: 'PATCH',
        auth: true,
        body: { ids, status: action },
      });
      toastSuccess(`Request(s) ${action === 'approved' ? 'approved' : 'rejected'} successfully`);
      const bookingsData = await apiRequest<ApiBooking[]>('/api/admin/bookings', { auth: true });
      setRequests(groupBookings(bookingsData.map(mapBooking)));
    } catch (err) {
      console.error('Failed to update request(s):', err);
      toastError(err, `Failed to ${action} request(s). Please try again.`);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSendEmail = async (batchId: string | undefined, eventId: string | undefined) => {
    try {
      await apiRequest('/api/admin/bookings/send-email', {
        method: 'POST',
        auth: true,
        body: { batchId, eventId },
      });
      toastSuccess('Status email sent to the club successfully!');
    } catch (err) {
      console.error('Failed to send email:', err);
      toastError(err, 'Failed to send email. Please try again.');
    }
  };

  const getVenueName = (id: string) => venues.find(v => v.id === id)?.name || id;

  const filteredRequests = requests.filter(req => {
    const matchesTab = activeTab === 'pending'
      ? (req.status === 'pending' || (req.status === 'partial' && req.bookings.some(b => b.status === 'pending')))
      : (req.status !== 'pending' && !(req.status === 'partial' && req.bookings.some(b => b.status === 'pending')));

    const matchesSearch =
      req.clubName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.eventName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-textPrimary tracking-tight leading-tight">Request Management</h2>
          <p className="text-textMuted mt-2 text-sm sm:text-base font-medium">Review and take action on venue booking requests.</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-2.5 text-textMuted pointer-events-none" size={18} />
          <Input
            type="text"
            placeholder="Search requests..."
            className="pl-10 w-full rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-xl">
          <AlertTriangle size={16} />
          <AlertTitle>Could not load requests</AlertTitle>
          <AlertDescription className="mt-1">{error}</AlertDescription>
          <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={fetchRequests}>
            <RefreshCw size={14} />
            Retry
          </Button>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'history')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-hoverSoft border-borderSoft rounded-xl p-1">
          <TabsTrigger value="pending" className="data-[state=active]:bg-background">
            Pending Review ({requests.reduce((acc, req) => acc + req.bookings.filter(b => b.status === 'pending').length, 0)})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-background">
            History ({requests.filter(req => req.status !== 'pending' && !req.bookings.some(b => b.status === 'pending')).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card className="rounded-xl overflow-hidden">
            {isLoading ? (
              <CardContent className="p-6">
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            ) : filteredRequests.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="w-full min-w-[600px] sm:min-w-0 text-left text-sm">
                  <thead className="bg-hoverSoft border-b border-borderSoft uppercase tracking-wider text-xs font-semibold text-textMuted">
                    <tr>
                      <th className="px-4 sm:px-6 py-4">Club / Event</th>
                      <th className="px-4 sm:px-6 py-4 hidden sm:table-cell">Venue & Time</th>
                      <th className="px-4 sm:px-6 py-4">Date</th>
                      <th className="px-4 sm:px-6 py-4">Status</th>
                      <th className="px-4 sm:px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredRequests.map((req, index) => (
                      <AdminRequestRow
                        key={req.batchId || req.ids[0]}
                        req={req}
                        index={index}
                        venues={venues}
                        handleAction={handleAction}
                        handleSendEmail={handleSendEmail}
                        getVenueName={getVenueName}
                        isHistoryTab={activeTab === 'history'}
                        isProcessingAction={isProcessingAction}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <CardContent className="p-8 sm:p-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-hoverSoft text-textMuted mb-4">
                  <Filter size={24} />
                </div>
                <h3 className="text-lg font-medium text-textPrimary">No requests found</h3>
                <p className="text-textMuted mt-1">Try adjusting your search or tab filter.</p>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

interface AdminRequestRowProps {
  req: GroupedBooking;
  index: number;
  venues: ApiVenue[];
  handleAction: (ids: string[], action: 'approved' | 'rejected') => Promise<void>;
  handleSendEmail: (batchId: string | undefined, eventId: string | undefined) => Promise<void>;
  getVenueName: (id: string) => string;
  isHistoryTab: boolean;
  isProcessingAction: boolean;
}

const AdminRequestRow: React.FC<AdminRequestRowProps> = ({ req, index, venues, handleAction, handleSendEmail, getVenueName, isHistoryTab, isProcessingAction }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isMultiVenue = req.bookings.length > 1;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      case 'partial': return 'warning';
      default: return 'pending';
    }
  };

  const isStarted = new Date(req.bookings[0].startTimeISO!) <= new Date();

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className={cn(
          "hover:bg-hoverSoft transition-colors cursor-pointer",
          isExpanded && "bg-hoverSoft/50"
        )}
        onClick={() => isMultiVenue && setIsExpanded(!isExpanded)}
      >
        <td className="px-4 sm:px-6 py-4">
          <div className="flex items-center gap-2">
            {isMultiVenue && (
              <div className="text-textMuted">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            )}
            <div>
              <div className="font-semibold text-textPrimary flex items-center gap-2">
                {req.eventName}
                {req.issueFlag && (
                  <div className="text-warning" title={req.issueFlag}>
                    <AlertTriangle size={14} />
                  </div>
                )}
              </div>
              <div className="text-xs text-textMuted mt-0.5">{req.clubName}</div>
              {req.permissionsLink && (
                <a href={req.permissionsLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-brand hover:underline mt-1 inline-block font-medium" onClick={(e) => e.stopPropagation()}>
                  🔗 View Permissions
                </a>
              )}
              <div className="text-xs text-textMuted mt-1 sm:hidden">
                <div className="flex items-center gap-1">
                  <Clock size={12} /> {req.startTime} - {req.endTime}
                </div>
                <div>{req.venueName}</div>
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
          <div className="flex items-center gap-1.5 text-textPrimary">
            {req.venueName}
          </div>
          <div className="text-xs text-textMuted mt-0.5 flex items-center gap-1">
            <Clock size={12} /> {req.startTime} - {req.endTime}
          </div>
        </td>
        <td className="px-4 sm:px-6 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-textMuted shrink-0" />
              {req.endDate && new Date(req.date).toDateString() !== new Date(req.endDate).toDateString() ? (
                <div className="flex flex-col text-xs space-y-0.5">
                  <span className="whitespace-nowrap">{new Date(req.date).toLocaleDateString()} {req.startTime}</span>
                  <span className="text-textMuted text-[10px]">to</span>
                  <span className="whitespace-nowrap">{new Date(req.endDate).toLocaleDateString()} {req.endTime}</span>
                </div>
              ) : (
                <span>{new Date(req.date).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 sm:px-6 py-4">
          <Badge variant={getStatusVariant(req.status)}>
            {req.status === 'partial' ? 'Partial' : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
          </Badge>
        </td>
        <td className="px-4 sm:px-6 py-4 text-right">
          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleSendEmail(req.batchId, req.bookings[0]?.event_id); }}
              className="text-xs"
              title="Send an email to the club with the current status of all venues in this booking"
              disabled={isProcessingAction}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              Send Mail
            </Button>
            {!isHistoryTab && !isStarted && (
              <>
                {/* Single-venue: show individual approve/reject directly on the row */}
                {!isMultiVenue && req.bookings[0]?.status !== 'rejected' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); handleAction([req.bookings[0].id], 'rejected'); }}
                    className="text-textMuted hover:text-error"
                    title="Reject this venue"
                    disabled={isProcessingAction}
                  >
                    <XCircle size={18} />
                  </Button>
                )}
                {!isMultiVenue && req.bookings[0]?.status !== 'approved' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); handleAction([req.bookings[0].id], 'approved'); }}
                    className="text-primary hover:text-primary/80"
                    title="Approve this venue"
                    disabled={isProcessingAction}
                  >
                    <CheckCircle size={18} />
                  </Button>
                )}
                {/* Multi-venue: show bulk Reject All / Approve All; individual controls are in the expanded panel */}
                {isMultiVenue && req.status !== 'rejected' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleAction(req.ids, 'rejected'); }}
                    className="text-textMuted hover:text-error text-xs"
                    title="Reject all venues"
                    disabled={isProcessingAction}
                  >
                    <XCircle size={15} className="mr-1" />
                    <span className="hidden sm:inline">Reject All</span>
                  </Button>
                )}
                {isMultiVenue && req.status !== 'approved' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handleAction(req.ids, 'approved'); }}
                    className="text-primary hover:text-primary/80 text-xs"
                    title="Approve all venues"
                    disabled={isProcessingAction}
                  >
                    <CheckCircle size={15} className="mr-1" />
                    <span className="hidden sm:inline">Approve All</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </td>
      </motion.tr>

      {/* Expanded view for multi-venue details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.tr
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-primary/5"
          >
            <td colSpan={5} className="px-6 py-4">
              <div className="space-y-3">
                <div className="text-xs font-bold text-textMuted uppercase tracking-wider mb-2">Individual Venue Statuses</div>
                {req.bookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-borderSoft shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{getVenueName(booking.venueId)}</span>
                        <span className="text-xs text-textMuted">{booking.startTime} - {booking.endTime}</span>
                        {booking.issueFlag && (
                          <span className="text-[10px] font-medium text-warning mt-0.5 flex items-center gap-1">
                            <AlertTriangle size={10} /> {booking.issueFlag}
                          </span>
                        )}
                      </div>
                      <Badge variant={booking.status === 'approved' ? 'success' : booking.status === 'rejected' ? 'destructive' : 'pending'} className="text-[10px] h-5">
                        {booking.status.toUpperCase()}
                      </Badge>
                    </div>
                      <div className="flex items-center gap-2">
                        {!isStarted && booking.status !== 'rejected' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction([booking.id], 'rejected')}
                            className="h-8 w-8 p-0 text-textMuted hover:text-error"
                            title="Reject this venue"
                            disabled={isProcessingAction}
                          >
                            <X size={16} />
                          </Button>
                        )}
                        {!isStarted && booking.status !== 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction([booking.id], 'approved')}
                            className="h-8 w-8 p-0 text-primary hover:text-primary/80"
                            title="Approve this venue"
                            disabled={isProcessingAction}
                          >
                            <Check size={16} />
                          </Button>
                        )}
                      </div>
                  </div>
                ))}
              </div>
            </td>
          </motion.tr>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminRequests;
