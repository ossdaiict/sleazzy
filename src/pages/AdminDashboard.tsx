import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, ChevronRight, AlertCircle, Calendar } from 'lucide-react';
import { VENUES } from '../constants';
import { Booking } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';

const AdminDashboard: React.FC = () => {
  const [pendingRequests, setPendingRequests] = React.useState<Booking[]>([]);
  const [stats, setStats] = React.useState({
    pending: 0,
    scheduled: 0,
    conflicts: 0,
    activeClubs: 0
  });
  const [isLoading, setIsLoading] = React.useState(true);

  // TODO: Replace with actual API calls
  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // const [requestsResponse, statsResponse] = await Promise.all([
        //   fetch('/api/admin/requests/pending'),
        //   fetch('/api/admin/stats')
        // ]);
        // const requests = await requestsResponse.json();
        // const statsData = await statsResponse.json();
        // setPendingRequests(requests);
        // setStats(statsData);
        setPendingRequests([]);
        setStats({ pending: 0, scheduled: 0, conflicts: 0, activeClubs: 0 });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setPendingRequests([]);
        setStats({ pending: 0, scheduled: 0, conflicts: 0, activeClubs: 0 });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const getVenueName = (id: string) => VENUES.find(v => v.id === id)?.name || id;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">Admin Dashboard</h2>
        <p className="text-muted-foreground mt-2 text-base sm:text-lg font-medium">Overview of venue requests and system status.</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0 }}
        >
          <Card className="border border-border hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending</div>
                <div className="p-2 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                  <AlertCircle size={18} />
                </div>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">{pendingRequests.length}</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border border-border hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Scheduled</div>
                <div className="p-2 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                  <Calendar size={18} />
                </div>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">12</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border border-border hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Conflicts</div>
                <div className="p-2 bg-destructive/10 text-destructive rounded-2xl border border-destructive/20">
                  <XCircle size={18} />
                </div>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">0</div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border border-border hover:border-primary/40 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Clubs</div>
                <div className="p-2 bg-primary/10 text-primary rounded-2xl border border-primary/20">
                  <CheckCircle size={18} />
                </div>
              </div>
              <div className="mt-4 text-3xl sm:text-4xl font-bold text-foreground tracking-tight">34</div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Pending Requests Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <Card className="border border-border">
          <CardHeader className="border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Pending Requests</CardTitle>
              <CardDescription className="mt-1">Requests requiring immediate attention (Category B or Conflicts)</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/requests">
                View All <ChevronRight size={16} />
              </Link>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {isLoading ? (
              <div className="p-4 sm:p-6">
                <Skeleton className="h-20 w-full" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">No pending requests.</p>
              </div>
            ) : (
              pendingRequests.map((req, index) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="p-4 sm:p-6 hover:bg-muted transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        {req.clubName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">{new Date(req.date).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-base sm:text-lg font-medium text-foreground">{req.eventName}</h4>
                    <div className="mt-1 text-sm text-muted-foreground">
                      Requested Venue: <span className="font-semibold text-foreground">{getVenueName(req.venueId)}</span> ({req.startTime} - {req.endTime})
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <XCircle size={16} />
                      <span className="hidden sm:inline">Reject</span>
                    </Button>
                    <Button 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <CheckCircle size={16} />
                      <span className="hidden sm:inline">Approve</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))
            )}
          </div>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
