
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiRequest, ApiBooking, mapBooking } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Layers, Calendar, Clock, MapPin, Search } from 'lucide-react';
import { Input } from '../components/ui/input';

const MasterSchedule: React.FC = () => {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const data = await apiRequest<ApiBooking[]>('/api/admin/bookings', { auth: true });
                setBookings(data.map(mapBooking));
            } catch (error) {
                console.error('Failed to fetch schedule:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, []);

    const filteredBookings = bookings.filter(b =>
        b.eventName.toLowerCase().includes(search.toLowerCase()) ||
        b.clubName.toLowerCase().includes(search.toLowerCase()) ||
        b.venueName.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusVariant = (status: string): "success" | "destructive" | "pending" | "default" => {
        switch (status) {
            case 'approved': return 'success'; // mapped to success variant
            case 'rejected': return 'destructive';
            case 'pending': return 'pending';
            default: return 'default';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Master Schedule</h1>
                    <p className="text-muted-foreground">View all venue bookings across the campus.</p>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search events..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">Loading schedule...</div>
            ) : (
                <div className="grid gap-4">
                    {filteredBookings.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-muted/50 rounded-xl border border-dashed">
                            No bookings found matching your search.
                        </div>
                    ) : (
                        filteredBookings.map((booking) => (
                            <motion.div
                                key={booking.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <Card>
                                    <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="font-semibold text-lg">{booking.eventName}</div>
                                                <Badge variant={getStatusVariant(booking.status)}>
                                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} />
                                                    <span>{booking.venueName}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} />
                                                    <span>{new Date(booking.date).toLocaleDateString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} />
                                                    <span>{booking.startTime} - {booking.endTime}</span>
                                                </div>
                                            </div>

                                            <div className="mt-2 text-xs font-medium text-primary">
                                                Organized by {booking.clubName}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default MasterSchedule;
