import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Edit2, Trash2, CalendarDays, ExternalLink, X, Search, Users, Download, Plus, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { AppEvent } from '../types';
import { exportRosterToExcel, ExportClubMember } from '../lib/excelExport';

interface ApiClub {
    id: string;
    name: string;
    email: string;
    group_category: string;
    organization_type: string;
    member_tag?: string;
    created_at: string;
}

const AdminClubs: React.FC = () => {
    const navigate = useNavigate();
    const [clubs, setClubs] = useState<ApiClub[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit State
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingClub, setEditingClub] = useState<ApiClub | null>(null);
    const [editFormData, setEditFormData] = useState({ name: '', groupCategory: '', organizationType: 'club', memberTag: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Add State
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [addFormData, setAddFormData] = useState({ name: '', email: '', password: '', groupCategory: 'A', organizationType: 'club' });
    const [isAdding, setIsAdding] = useState(false);

    // Delete State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [clubToDelete, setClubToDelete] = useState<ApiClub | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Events State
    const [eventsSheetOpen, setEventsSheetOpen] = useState(false);
    const [selectedClub, setSelectedClub] = useState<ApiClub | null>(null);
    const [clubEvents, setClubEvents] = useState<AppEvent[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);

    // SBG Settings State
    const [sbgSettingsOpen, setSbgSettingsOpen] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [sbgSettings, setSbgSettings] = useState({
        sbg_constitution_link: '',
        sbg_linkedin: '',
        sbg_email: ''
    });

    const fetchSbgSettings = async () => {
        try {
            const config = await apiRequest<Record<string, string>>('/api/settings', { auth: true });
            setSbgSettings({
                sbg_constitution_link: config.sbg_constitution_link || '',
                sbg_linkedin: config.sbg_linkedin || '',
                sbg_email: config.sbg_email || ''
            });
        } catch (err) {
            console.error('Failed to fetch SBG settings', err);
        }
    };

    const handleExportRoster = async () => {
        setIsExporting(true);
        try {
            const data = await apiRequest<ExportClubMember[]>('/api/admin/club-members/all', { auth: true });
            exportRosterToExcel(data);
            toastSuccess('Member list exported successfully');
        } catch (err) {
            toastError(err, 'Failed to export member list');
        } finally {
            setIsExporting(false);
        }
    };

    const [exportingClubId, setExportingClubId] = useState<string | null>(null);

    const handleExportSingleClub = async (club: ApiClub) => {
        setExportingClubId(club.id);
        try {
            const data = await apiRequest<ExportClubMember[]>(`/api/club-members?clubId=${club.id}`, { auth: true });
            const enriched = data.map(m => ({ ...m, club_name: club.name }));
            exportRosterToExcel(enriched);
            toastSuccess(`${club.name} member list exported successfully`);
        } catch (err) {
            toastError(err, 'Failed to export club member list');
        } finally {
            setExportingClubId(null);
        }
    };

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
        fetchSbgSettings();
    }, []);

    const saveSbgSettings = async () => {
        setIsSavingSettings(true);
        try {
            await apiRequest('/api/settings', {
                method: 'POST',
                auth: true,
                body: sbgSettings
            });
            toastSuccess('SBG Settings saved successfully');
            setSbgSettingsOpen(false);
        } catch (error: any) {
            toastError(error, 'Failed to save SBG settings');
        } finally {
            setIsSavingSettings(false);
        }
    };

    const saveAdd = async () => {
        if (!addFormData.name.trim() || !addFormData.email.trim() || !addFormData.password.trim()) {
            return;
        }
        setIsAdding(true);
        try {
            await apiRequest('/api/auth/register', {
                method: 'POST',
                body: {
                    clubName: addFormData.name,
                    email: addFormData.email,
                    password: addFormData.password,
                    groupCategory: addFormData.groupCategory,
                    organizationType: addFormData.organizationType,
                },
            });
            toastSuccess('Club added successfully');
            setAddDialogOpen(false);
            setAddFormData({ name: '', email: '', password: '', groupCategory: 'A', organizationType: 'club' });
            fetchClubs();
        } catch (err) {
            toastError(err, 'Failed to add club');
        } finally {
            setIsAdding(false);
        }
    };

    const handleEditClick = (club: ApiClub) => {
        setEditingClub(club);
        setEditFormData({ 
            name: club.name, 
            groupCategory: club.group_category || 'A',
            organizationType: club.organization_type || 'club',
            memberTag: club.member_tag || ''
        });
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
                    organization_type: editFormData.organizationType,
                    member_tag: editFormData.memberTag,
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
            const data = await apiRequest<AppEvent[]>(`/api/admin/clubs/${club.id}/events`, { auth: true });
            setClubEvents(data);
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
                    <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tighter leading-tight">Manage Clubs</h2>
                    <p className="text-textSecondary mt-2 text-base font-medium">View, edit, or remove clubs from the system.</p>
                </div>
                <div className="flex items-center gap-2.5 self-start md:self-end">
                    <Button
                        onClick={() => setSbgSettingsOpen(true)}
                        className="gap-1.5 rounded-xl h-10 font-semibold border border-brand/20 bg-brand/5 text-brand hover:bg-brand/10 transition-all"
                    >
                        <Settings size={16} />
                        SBG Settings
                    </Button>
                    <Button
                        onClick={() => setAddDialogOpen(true)}
                        className="gap-1.5 rounded-xl h-10 font-semibold bg-brand text-white hover:bg-brandLink transition-all shadow-md shadow-brand/10 hover:shadow-brand/20"
                    >
                        <Plus size={16} />
                        Add Club
                    </Button>
                    <Button
                        onClick={handleExportRoster}
                        disabled={isExporting}
                        className="gap-2 rounded-xl h-10 font-semibold border-[1.5px] border-slate-300 dark:border-slate-600 bg-card text-textSecondary hover:bg-hoverSoft shadow-sm"
                    >
                        <Download size={16} />
                        {isExporting ? 'Exporting...' : 'Export Members (Excel)'}
                    </Button>
                </div>
            </div>

            <Card className="border border-borderSoft rounded-lg overflow-hidden bg-card shadow-sm">
                <div className="p-4 border-b border-borderSoft flex flex-col sm:flex-row sm:items-center bg-card/50">
                    <div className="relative w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted h-4 w-4" />
                        <Input
                            placeholder="Search clubs by name or email..."
                            className="pl-9 bg-background/50 border-borderSoft w-full max-w-full"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] sm:min-w-0 text-left text-sm">
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
                                                    onClick={() => navigate(`/members?clubId=${club.id}`)}
                                                    title="View Members"
                                                >
                                                    <Users className="h-4 w-4 mr-1.5" />
                                                    <span className="hidden sm:inline">Members</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2 text-textSecondary hover:text-brand"
                                                    onClick={() => handleExportSingleClub(club)}
                                                    disabled={exportingClubId !== null}
                                                    title="Export Member List"
                                                >
                                                    <Download className="h-4 w-4 mr-1.5" />
                                                    <span className="hidden sm:inline">
                                                        {exportingClubId === club.id ? 'Exporting...' : 'Export'}
                                                    </span>
                                                </Button>
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

            {/* Add Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New Club</DialogTitle>
                        <DialogDescription>Create a new club account. The email must end with @dau.ac.in.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="add-name">Club Name</Label>
                            <Input
                                id="add-name"
                                placeholder="e.g. AI Club"
                                value={addFormData.name}
                                onChange={e => setAddFormData({ ...addFormData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="add-email">Login Email</Label>
                            <Input
                                id="add-email"
                                type="email"
                                placeholder="e.g. aiclub@dau.ac.in"
                                value={addFormData.email}
                                onChange={e => setAddFormData({ ...addFormData, email: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="add-password">Password</Label>
                            <Input
                                id="add-password"
                                type="password"
                                placeholder="Min 6 characters"
                                value={addFormData.password}
                                onChange={e => setAddFormData({ ...addFormData, password: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="add-category">Group Category</Label>
                            <Select
                                value={addFormData.groupCategory}
                                onValueChange={v => setAddFormData({ ...addFormData, groupCategory: v })}
                            >
                                <SelectTrigger id="add-category" className="w-full h-10 border-borderSoft bg-transparent">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-borderSoft">
                                    <SelectItem value="A">Group A (Academic/Tech)</SelectItem>
                                    <SelectItem value="B">Group B (Cultural)</SelectItem>
                                    <SelectItem value="C">Group C (Sports)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="add-org-type">Organization Type</Label>
                            <Select
                                value={addFormData.organizationType}
                                onValueChange={v => setAddFormData({ ...addFormData, organizationType: v })}
                            >
                                <SelectTrigger id="add-org-type" className="w-full h-10 border-borderSoft bg-transparent">
                                    <SelectValue placeholder="Select Org Type" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-borderSoft">
                                    <SelectItem value="club">Club</SelectItem>
                                    <SelectItem value="committee">Committee</SelectItem>
                                    <SelectItem value="organisation">Organisation</SelectItem>
                                    <SelectItem value="other">Other (Hidden from directory)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={isAdding}>Cancel</Button>
                        <Button onClick={saveAdd} disabled={isAdding || !addFormData.name.trim() || !addFormData.email.trim() || !addFormData.password.trim()}>
                            {isAdding ? 'Adding...' : 'Add Club'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                            <Select
                                value={editFormData.groupCategory}
                                onValueChange={v => setEditFormData({ ...editFormData, groupCategory: v })}
                            >
                                <SelectTrigger id="category" className="w-full h-10 border-borderSoft bg-transparent">
                                    <SelectValue placeholder="Select Category" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-borderSoft">
                                    <SelectItem value="A">Group A (Academic/Tech)</SelectItem>
                                    <SelectItem value="B">Group B (Cultural)</SelectItem>
                                    <SelectItem value="C">Group C (Sports)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="org-type">Organization Type</Label>
                            <Select
                                value={editFormData.organizationType}
                                onValueChange={v => setEditFormData({ ...editFormData, organizationType: v })}
                            >
                                <SelectTrigger id="org-type" className="w-full h-10 border-borderSoft bg-transparent">
                                    <SelectValue placeholder="Select Org Type" />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-borderSoft">
                                    <SelectItem value="club">Club</SelectItem>
                                    <SelectItem value="committee">Committee</SelectItem>
                                    <SelectItem value="organisation">Organisation</SelectItem>
                                    <SelectItem value="other">Other (Hidden from directory)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="member-tag">Member Tag (Max 30 chars)</Label>
                            <Input
                                id="member-tag"
                                placeholder="e.g. Official Campus Committee"
                                maxLength={30}
                                value={editFormData.memberTag}
                                onChange={e => setEditFormData({ ...editFormData, memberTag: e.target.value })}
                            />
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
                            clubEvents.map(event => {
                                const now = new Date();
                                const startDate = new Date(event.date);
                                const endDate = event.dynamic_end_date ? new Date(event.dynamic_end_date) : new Date(startDate);
                                endDate.setHours(23, 59, 59, 999);
                                
                                let timelineStatus = 'Ongoing';
                                let badgeVariant: 'success' | 'outline' | 'secondary' = 'success';
                                if (now < startDate) {
                                    timelineStatus = 'Upcoming';
                                    badgeVariant = 'outline';
                                } else if (now > endDate) {
                                    timelineStatus = 'Completed';
                                    badgeVariant = 'secondary';
                                }

                                return (
                                <Card key={event.id} className="rounded-lg bg-card border border-borderSoft hover:border-brand/50 transition-colors shadow-sm">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-textPrimary leading-tight pr-4">{event.name}</h4>
                                            <Badge
                                                variant={badgeVariant}
                                                className="text-[10px] px-1.5 py-0 h-5 shrink-0"
                                            >
                                                {timelineStatus}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                                            <div>
                                                <span className="text-textMuted text-xs block uppercase tracking-wider mb-0.5">Date</span>
                                                <div className="font-medium text-textSecondary">{new Date(event.date).toLocaleDateString()}</div>
                                            </div>
                                            <div>
                                                <span className="text-textMuted text-xs block uppercase tracking-wider mb-0.5">Venue</span>
                                                <div className="font-medium text-textSecondary truncate max-w-full" title={event.venue}>{event.venue}</div>
                                                {event.event_type === 'co_curricular' && (
                                                    <div className="text-xs text-brand mt-0.5 font-medium">Co-curricular</div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                )
                            })
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            {/* SBG Settings Dialog */}
            <Dialog open={sbgSettingsOpen} onOpenChange={setSbgSettingsOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>SBG Settings</DialogTitle>
                        <DialogDescription>Manage public information shown on the About SBG page.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Constitution Link (URL)</Label>
                            <Input
                                value={sbgSettings.sbg_constitution_link}
                                onChange={e => setSbgSettings({ ...sbgSettings, sbg_constitution_link: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>SBG LinkedIn (URL)</Label>
                            <Input
                                value={sbgSettings.sbg_linkedin}
                                onChange={e => setSbgSettings({ ...sbgSettings, sbg_linkedin: e.target.value })}
                                placeholder="https://linkedin.com/..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>SBG Contact Email</Label>
                            <Input
                                value={sbgSettings.sbg_email}
                                onChange={e => setSbgSettings({ ...sbgSettings, sbg_email: e.target.value })}
                                placeholder="sbg@daiict.ac.in"
                                type="email"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSbgSettingsOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-brand text-white hover:bg-brandLink"
                            onClick={saveSbgSettings}
                            disabled={isSavingSettings}
                        >
                            {isSavingSettings ? 'Saving...' : 'Save Settings'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
};

export default AdminClubs;