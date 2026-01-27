import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Search, Filter, Clock, Calendar, Check, X } from 'lucide-react';
import { VENUES } from '../constants';
import { Booking } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { cn } from '@/lib/utils';

const AdminRequests: React.FC = () => {
  const [requests, setRequests] = useState<Booking[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // TODO: Replace with actual API call
  React.useEffect(() => {
    const fetchRequests = async () => {
      setIsLoading(true);
      try {
        // const response = await fetch('/api/admin/requests');
        // const data = await response.json();
        // setRequests(data);
        setRequests([]);
      } catch (error) {
        console.error('Failed to fetch requests:', error);
        setRequests([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const handleAction = async (id: string, action: 'approved' | 'rejected') => {
    // TODO: Replace with actual API call
    try {
      // await fetch(`/api/admin/requests/${id}/${action}`, { method: 'POST' });
      // Refresh requests after action
      // const response = await fetch('/api/admin/requests');
      // const data = await response.json();
      // setRequests(data);
      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, status: action } : req
      ));
    } catch (error) {
      console.error('Failed to update request:', error);
    }
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
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Request Management</h2>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">Review and take action on venue booking requests.</p>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
          <Input 
            type="text" 
            placeholder="Search requests..." 
            className="pl-10 w-full sm:w-64 bg-background/50 border-border/40"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'history')} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted border-border">
          <TabsTrigger value="pending" className="data-[state=active]:bg-background">
            Pending Review ({requests.filter(r => r.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-background">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <Card className="border-border/40 bg-card/40 backdrop-blur-md">
            {isLoading ? (
              <CardContent className="p-6">
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-12 w-full mb-4" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            ) : filteredRequests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-card/40 border-b border-border/40 uppercase tracking-wider text-xs font-semibold text-muted-foreground">
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
                        className="hover:bg-card/40 transition-colors"
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="font-semibold text-foreground">{req.eventName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{req.clubName}</div>
                          <div className="text-xs text-muted-foreground mt-1 sm:hidden">
                            <div className="flex items-center gap-1">
                              <Clock size={12} /> {req.startTime} - {req.endTime}
                            </div>
                            <div>{getVenueName(req.venueId)}</div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5 text-foreground">
                            {getVenueName(req.venueId)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock size={12} /> {req.startTime} - {req.endTime}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-muted-foreground" />
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
                                className="text-muted-foreground hover:text-destructive"
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
                            <div className="text-xs text-muted-foreground italic">
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
              <CardContent className="p-12 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground mb-4">
                  <Filter size={24} />
                </div>
                <h3 className="text-lg font-medium text-foreground">No requests found</h3>
                <p className="text-muted-foreground mt-1">Try adjusting your search or tab filter.</p>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminRequests;
