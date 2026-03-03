import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Search, Filter, Clock, Calendar, Check, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiRequest, mapBooking, type ApiBooking, type ApiVenue } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { toastError, toastSuccess } from '../lib/toast';
import { Booking } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '@/lib/utils';

const AdminRequests: React.FC = () => {
  const [requests, setRequests] = useState<Booking[]>([]);
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [venuesData, bookingsData] = await Promise.all([
        apiRequest<ApiVenue[]>('/api/venues'),
        apiRequest<ApiBooking[]>('/api/admin/bookings', { auth: true }),
      ]);
      setVenues(venuesData);
      setRequests(bookingsData.map(mapBooking));
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

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    try {
      await apiRequest(`/api/admin/bookings/${id}/status`, {
        method: 'PATCH',
        auth: true,
        body: { status: action, adminNote: '' },
      });
      toastSuccess(`Request ${action === 'approved' ? 'approved' : 'rejected'} successfully`);
      const bookingsData = await apiRequest<ApiBooking[]>('/api/admin/bookings', { auth: true });
      setRequests(bookingsData.map(mapBooking));
    } catch (err) {
      console.error('Failed to update request:', err);
      toastError(err, `Failed to ${action} request. Please try again.`);
    }
  };

  const getVenueName = (id: string) => venues.find(v => v.id === id)?.name || id;

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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-textPrimary tracking-tight">Request Management</h2>
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
            Pending Review ({requests.filter(r => r.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-background">
            History
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
                      <motion.tr
                        key={req.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="hover:bg-hoverSoft transition-colors"
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="font-semibold text-textPrimary">{req.eventName}</div>
                          <div className="text-xs text-textMuted mt-0.5">{req.clubName}</div>
                          <div className="text-xs text-textMuted mt-1 sm:hidden">
                            <div className="flex items-center gap-1">
                              <Clock size={12} /> {req.startTime} - {req.endTime}
                            </div>
                            <div>{getVenueName(req.venueId)}</div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 text-textPrimary">
                            {getVenueName(req.venueId)}
                          </div>
                          <div className="text-xs text-textMuted mt-0.5 flex items-center gap-1">
                            <Clock size={12} /> {req.startTime} - {req.endTime}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-textMuted" />
                            {new Date(req.date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <Badge 
                            variant={
                              req.status === 'approved' ? 'success' : 
                              req.status === 'rejected' ? 'destructive' : 
                              'pending'
                            }
                          >
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </Badge>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-right">
                          {req.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAction(req.id, 'rejected')}
                                className="text-textMuted hover:text-error"
                                title="Reject"
                              >
                                <X size={18} />
                              </Button>
                              <Button 
                                variant="ghost"
                                size="icon"
                                onClick={() => handleAction(req.id, 'approved')}
                                className="text-primary hover:text-primary/80"
                                title="Approve"
                              >
                                <Check size={18} />
                              </Button>
                            </div>
                          ) : (
                            <div className="text-xs text-textMuted italic">
                              Processed
                            </div>
                          )}
                        </td>
                      </motion.tr>
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

export default AdminRequests;
