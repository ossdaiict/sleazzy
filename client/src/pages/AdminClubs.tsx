import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiRequest } from '../lib/api';
import { toastError, toastSuccess } from '../lib/toast';
import { getErrorMessage } from '../lib/errors';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Edit2, Trash2, CalendarDays, ExternalLink, X, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Booking } from '../types';

interface ApiClub {
    id: string;
    name: string;
    email: string;
    group_category: string;
    created_at: string;
}

const AdminClubs: React.FC = () => {
    const [clubs, setClubs] = useState<ApiClub[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit State
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingClub, setEditingClub] = useState<ApiClub | null>(null);
    const [editFormData, setEditFormData] = useState({ name: '', groupCategory: '' });
    const [isSaving, setIsSaving] = useState(false);

    // Delete State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [clubToDelete, setClubToDelete] = useState<ApiClub | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Events State
    const [eventsSheetOpen, setEventsSheetOpen] = useState(false);
    const [selectedClub, setSelectedClub] = useState<ApiClub | null>(null);
    const [clubEvents, setClubEvents] = useState<Booking[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);

    const fetchClubs = async () => {
        setIsLoading(true);
        try {
            const data = await apiRequest<ApiClub[]>('/api/admin/clubs', { auth: true });
            setClubs(data);
        } catch (err) {
            toastError(err, 'Failed to fetch clubs');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClubs();
    }, []);

    const handleEditClick = (club: ApiClub) => {
        setEditingClub(club);
        setEditFormData({ name: club.name, groupCategory: club.group_category || 'A' });
        setEditDialogOpen(true);
    };

    const saveEdit = async () => {
        if (!editingClub) return;
        setIsSaving(true);
        try {
            await apiRequest(`/api/admin/clubs/${editingClub.id}`, {
                method: 'PATCH',
                auth: true,
                body: {
                    name: editFormData.name,
                    group_category: editFormData.groupCategory,
                },
            });
            toastSuccess('Club updated successfully');
            setEditDialogOpen(false);
            fetchClubs();
        } catch (err) {
            toastError(err, 'Failed to update club');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteClick = (club: ApiClub) => {
        setClubToDelete(club);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!clubToDelete) return;
        setIsDeleting(true);
        try {
            await apiRequest(`/api/admin/clubs/${clubToDelete.id}`, {
                method: 'DELETE',
                auth: true,
            });
            toastSuccess('Club and its bookings deleted successfully');
            setDeleteDialogOpen(false);
            fetchClubs();
        } catch (err) {
            toastError(err, 'Failed to delete club');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleViewEvents = async (club: ApiClub) => {
        setSelectedClub(club);
        setEventsSheetOpen(true);
        setIsLoadingEvents(true);
        try {
            const data = await apiRequest<any[]>(`/api/admin/clubs/${club.id}/bookings`, { auth: true });
            // Map properties from backend to frontend expectations
            setClubEvents(data.map(e => ({
                id: e.id,
                eventName: e.event_name,
                clubId: e.club_id,
                clubName: e.clubs?.name,
                venueId: e.venue_id,
                venueName: e.venues?.name,
                date: e.start_time,
                startTime: new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                endTime: new Date(e.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: e.status,
                eventType: e.event_type,
                expectedAttendees: e.expected_attendees,
                isPublic: e.is_public
            })));
        } catch (err) {
            toastError(err, 'Failed to fetch events for club');
        } finally {
            setIsLoadingEvents(false);
        }
    };

    const filteredClubs = clubs.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 sm:space-y-8"
        >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tighter">Manage Clubs</h2>
                    <p className="text-textSecondary mt-2 text-base font-medium">View, edit, or remove clubs from the system.</p>
                </div>
            </div>

            <Card className="border border-borderSoft rounded-lg overflow-hidden bg-card shadow-sm">
                <div className="p-4 border-b border-borderSoft flex items-center bg-card/50">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted h-4 w-4" />
                        <Input
                            placeholder="Search clubs by name or email..."
                            className="pl-9 bg-background/50 border-borderSoft"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-hoverSoft/50 border-b border-borderSoft text-textSecondary font-semibold">
                            <tr>
                                <th className="px-6 py-4">Club Name</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-borderSoft">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-40" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                                        <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-40 ml-auto" /></td>
                                    </tr>
                                ))
                            ) : filteredClubs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-textMuted">
                                        No clubs found.
                                    </td>
                                </tr>
                            ) : (
                                filteredClubs.map(club => (
                                    <motion.tr
                                        key={club.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="hover:bg-hoverSoft/30 transition-colors group"
                                    >
                                        <td className="px-6 py-4 font-medium text-textPrimary">{club.name}</td>
                                        <td className="px-6 py-4 text-textSecondary">{club.email}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant="secondary" className="bg-brand/10 text-brand border-brand/20">
                                                Group {club.group_category || 'A'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-textSecondary hover:text-brand"
                                                    onClick={() => handleViewEvents(club)}
                                                    title="View Events"
                                                >
                                                    <CalendarDays className="h-4 w-4 mr-1.5" />
                                                    <span className="hidden sm:inline">Events</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-textSecondary hover:text-warning"
                                                    onClick={() => handleEditClick(club)}
                                                    title="Edit Club"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-textSecondary hover:text-error"
                                                    onClick={() => handleDeleteClick(club)}
                                                    title="Delete Club"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Club</DialogTitle>
                        <DialogDescription>Update the club's information below.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Club Name</Label>
                            <Input
                                id="name"
                                value={editFormData.name}
                                onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Group Category</Label>
                            <select
                                id="category"
                                className="flex h-10 w-full rounded-lg border border-borderSoft bg-transparent px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand [&>option]:bg-popover"
                                value={editFormData.groupCategory}
                                onChange={e => setEditFormData({ ...editFormData, groupCategory: e.target.value })}
                            >
                                <option value="A">Group A (Academic/Tech)</option>
                                <option value="B">Group B (Cultural)</option>
                                <option value="C">Group C (Sports)</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSaving}>Cancel</Button>
                        <Button onClick={saveEdit} disabled={isSaving || !editFormData.name}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-error">Delete Club</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <strong className="text-textPrimary">{clubToDelete?.name}</strong>?
                            This will permanently remove the club profile and <strong>ALL of its event bookings</strong>. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                            {isDeleting ? 'Deleting...' : 'Yes, Delete Club'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Events Sheet */}
            <Sheet open={eventsSheetOpen} onOpenChange={setEventsSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-md lg:max-w-lg overflow-y-auto bg-background border-l border-borderSoft">
                    <SheetHeader className="mb-6">
                        <SheetTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-brand" />
                            Events for {selectedClub?.name}
                        </SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4">
                        {isLoadingEvents ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 w-full rounded-xl" />
                            ))
                        ) : clubEvents.length === 0 ? (
                            <div className="text-center py-12 text-textMuted bg-hoverSoft/30 rounded-xl border border-dashed border-borderSoft">
                                No events found for this club.
                            </div>
                        ) : (
                            clubEvents.map(event => (
                                <Card key={event.id} className="rounded-lg bg-card border border-borderSoft hover:border-brand/50 transition-colors shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-textPrimary leading-tight pr-4">{event.eventName}</h4>
                                            <Badge
                                                variant={event.status === 'approved' ? 'success' : event.status === 'rejected' ? 'destructive' : 'pending'}
                                                className="text-[10px] px-1.5 py-0 h-5 shrink-0"
                                            >
                                                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                                            <div>
                                                <span className="text-textMuted text-xs block uppercase tracking-wider mb-0.5">Date & Time</span>
                                                <div className="font-medium text-textSecondary">{new Date(event.date).toLocaleDateString()}</div>
                                                <div className="text-xs text-textMuted">{event.startTime} - {event.endTime}</div>
                                            </div>
                                            <div>
                                                <span className="text-textMuted text-xs block uppercase tracking-wider mb-0.5">Venue</span>
                                                <div className="font-medium text-textSecondary truncate max-w-full" title={event.venueName}>{event.venueName}</div>
                                                {event.eventType === 'co_curricular' && (
                                                    <div className="text-xs text-brand mt-0.5 font-medium">Co-curricular</div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </motion.div>
    );
};

export default AdminClubs;