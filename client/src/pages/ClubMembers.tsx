import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiRequest } from '../lib/api';
import { toastError, toastSuccess } from '../lib/toast';
import { ClubMember, User } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Edit2, Users, Shield, Lock, Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

interface ApiClub {
  id: string;
  name: string;
  email: string;
}

interface ClubMembersProps {
  user?: User;
}

const ClubMembers: React.FC<ClubMembersProps> = ({ user }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClubId = searchParams.get('clubId') || '';

  const [members, setMembers] = useState<ClubMember[]>([]);
  const [clubs, setClubs] = useState<ApiClub[]>([]);
  const [selectedClubId, setSelectedClubId] = useState<string>(queryClubId);
  const [isLoading, setIsLoading] = useState(true);

  // Add/Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ClubMember | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    roll_number: '',
    email: '',
    designation: 'Core',
    phone: '',
    is_core_member: true,
    tenure_start_date: '',
    tenure_end_date: '',
    tenure_end_reason: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<ClubMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Resignation Dialog State
  const [resignDialogOpen, setResignDialogOpen] = useState(false);
  const [memberToResign, setMemberToResign] = useState<ClubMember | null>(null);
  const [resignDate, setResignDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [resignReason, setResignReason] = useState('Resigned');
  const [isResigning, setIsResigning] = useState(false);

  const isClubUser = user?.role === 'club';
  const getEntityType = () => {
    if (isClubUser && user?.name) {
      return user.name.toLowerCase().includes('committee') ? 'Committee' : 'Club';
    }
    if (selectedClubId && clubs.length > 0) {
      const selectedClub = clubs.find(c => c.id === selectedClubId);
      if (selectedClub) {
        return selectedClub.name.toLowerCase().includes('committee') ? 'Committee' : 'Club';
      }
    }
    return 'Club';
  };
  const entityType = getEntityType();

  const fetchMembers = async (clubIdToFetch?: string) => {
    setIsLoading(true);
    try {
      const url = clubIdToFetch 
        ? `/api/club-members?clubId=${clubIdToFetch}` 
        : '/api/club-members';
      const data = await apiRequest<ClubMember[]>(url, { auth: true });
      setMembers(data);
    } catch (err) {
      toastError(err, 'Failed to load club members');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initPage = async () => {
      setIsLoading(true);
      if (user?.role === 'admin') {
        try {
          const clubList = await apiRequest<ApiClub[]>('/api/clubs');
          setClubs(clubList);
          
          let activeId = '';
          const urlClubId = searchParams.get('clubId');
          
          if (urlClubId && clubList.some(c => c.id === urlClubId)) {
            activeId = urlClubId;
          } else if (clubList.length > 0) {
            activeId = clubList[0].id;
          }

          if (activeId) {
            setSelectedClubId(activeId);
            setSearchParams({ clubId: activeId }, { replace: true });
            fetchMembers(activeId);
          } else {
            setIsLoading(false);
          }
        } catch (err) {
          toastError(err, 'Failed to load clubs');
          setIsLoading(false);
        }
      } else {
        fetchMembers();
      }
    };

    initPage();
  }, [user]);

  const handleClubChange = (clubId: string) => {
    setSelectedClubId(clubId);
    setSearchParams({ clubId });
    fetchMembers(clubId);
  };

  const openAdd = () => {
    setEditingMember(null);
    setFormData({
      full_name: '',
      roll_number: '',
      email: '',
      designation: 'Core',
      phone: '',
      is_core_member: true,
      tenure_start_date: '',
      tenure_end_date: '',
      tenure_end_reason: '',
    });
    setEditDialogOpen(true);
  };

  const openEdit = (member: ClubMember) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name,
      roll_number: member.roll_number ?? '',
      email: member.email ?? '',
      designation: member.designation ?? 'Core',
      phone: member.phone ?? '',
      is_core_member: true,
      tenure_start_date: member.tenure_start_date ? member.tenure_start_date.split('T')[0] : '',
      tenure_end_date: member.tenure_end_date ? member.tenure_end_date.split('T')[0] : '',
      tenure_end_reason: member.tenure_end_reason ?? '',
    });
    setEditDialogOpen(true);
  };

  const saveMember = async () => {
    setIsSaving(true);
    try {
      if (editingMember) {
        await apiRequest<ClubMember>(`/api/club-members/${editingMember.id}`, {
          method: 'PATCH',
          auth: true,
          body: formData,
        });
        toastSuccess('Member details updated successfully');
      } else {
        await apiRequest<ClubMember>('/api/club-members', {
          method: 'POST',
          auth: true,
          body: formData,
        });
        toastSuccess('Member added to roster successfully');
      }
      setEditDialogOpen(false);
      fetchMembers(user?.role === 'admin' ? selectedClubId : undefined);
    } catch (err) {
      toastError(err, editingMember ? 'Failed to update member' : 'Failed to add member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveClick = (member: ClubMember) => {
    const isMemberActive = !member.tenure_end_date || new Date(member.tenure_end_date) >= new Date(new Date().setHours(0,0,0,0));
    if (isMemberActive) {
      setMemberToResign(member);
      setResignDate(new Date().toISOString().split('T')[0]);
      setResignReason('Resigned');
      setResignDialogOpen(true);
    } else {
      setMemberToDelete(member);
      setDeleteDialogOpen(true);
    }
  };

  const confirmResign = async () => {
    if (!memberToResign) return;
    setIsResigning(true);
    try {
      await apiRequest(`/api/club-members/${memberToResign.id}`, {
        method: 'PATCH',
        auth: true,
        body: {
          tenure_end_date: resignDate,
          tenure_end_reason: resignReason,
        },
      });
      toastSuccess('Member resignation/impeachment recorded successfully');
      setResignDialogOpen(false);
      fetchMembers(user?.role === 'admin' ? selectedClubId : undefined);
    } catch (err) {
      toastError(err, 'Failed to end member tenure');
    } finally {
      setIsResigning(false);
      setMemberToResign(null);
    }
  };

  const confirmDelete = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    try {
      await apiRequest(`/api/club-members/${memberToDelete.id}`, {
        method: 'DELETE',
        auth: true,
      });
      toastSuccess('Member permanently removed from database');
      setDeleteDialogOpen(false);
      fetchMembers(user?.role === 'admin' ? selectedClubId : undefined);
    } catch (err) {
      toastError(err, 'Failed to delete member');
    } finally {
      setIsDeleting(false);
      setMemberToDelete(null);
    }
  };

  const DESIGNATION_BADGES = {
    'Convener': 'bg-brand/10 text-brand border-brand/20',
    'Dy. Convener': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    'Core': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };

  const DEFAULT_BADGE_STYLE = 'bg-slate-500/10 text-slate-500 border-slate-500/20';

  const MemberRow = ({ member, editable }: { member: ClubMember; editable: boolean }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-borderSoft bg-card/50 hover:bg-hoverSoft/50 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-textPrimary">{member.full_name}</p>
          <Badge 
            variant="secondary" 
            className={DESIGNATION_BADGES[member.designation as keyof typeof DESIGNATION_BADGES] || DEFAULT_BADGE_STYLE}
          >
            {member.designation || 'Core'}
          </Badge>
        </div>
        {member.roll_number && (
          <p className="text-sm text-textMuted mt-0.5">
            Roll: {member.roll_number}
          </p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-textMuted">
          {member.email && <span>{member.email}</span>}
          {member.phone && <span>{member.phone}</span>}
          {(member.tenure_start_date || member.tenure_end_date) && (
            <span>
              Tenure: {member.tenure_start_date ? new Date(member.tenure_start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'} –{' '}
              {member.tenure_end_date ? new Date(member.tenure_end_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Present'}
            </span>
          )}
          {member.tenure_end_reason && (
            <span className="font-semibold text-error/95">
              Reason: {member.tenure_end_reason}
            </span>
          )}
        </div>
      </div>
      {editable ? (
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => openEdit(member)} className="rounded-lg">
            <Edit2 size={14} className="mr-1.5" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRemoveClick(member)}
            className="rounded-lg h-9 w-9 p-0 text-textMuted hover:text-error hover:bg-error/10"
            title="Delete/Remove Member"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-textMuted shrink-0">
          <Lock size={14} />
          View only
        </div>
      )}
    </div>
  );

  const activeMembers = members.filter(m => {
    if (!m.tenure_end_date) return true;
    const endDate = new Date(m.tenure_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate >= today;
  });

  const pastMembers = members.filter(m => {
    if (!m.tenure_end_date) return false;
    const endDate = new Date(m.tenure_end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate < today;
  });

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-textPrimary tracking-tight flex items-center gap-2 leading-tight">
            <Users className="text-brand shrink-0" size={28} />
            <span className="whitespace-normal">{entityType} Members</span>
          </h1>
          <p className="text-textMuted mt-1 text-sm sm:text-base">
            {isClubUser
              ? `Manage your ${entityType.toLowerCase()} roster. Add, edit, or remove members as needed.`
              : `View ${entityType.toLowerCase()} rosters of different campus clubs.`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto sm:self-center max-w-full">
          {!isClubUser && clubs.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto max-w-full">
              <Label htmlFor="club-select" className="text-xs text-textMuted shrink-0 font-medium">{entityType}:</Label>
              <Select value={selectedClubId} onValueChange={handleClubChange}>
                <SelectTrigger id="club-select" className="h-9 w-full sm:w-[200px] bg-card border-borderSoft focus:ring-brand/30">
                  <SelectValue placeholder={`Select a ${entityType.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent className="bg-popover border-borderSoft max-h-[300px]">
                  {clubs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isClubUser && (
            <Button onClick={openAdd} className="rounded-xl bg-brand hover:bg-brand/90 text-white font-semibold">
              <Plus size={16} className="mr-1.5" />
              Add Member
            </Button>
          )}
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="border-borderSoft shadow-sm bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Active {entityType} Members</CardTitle>
              <CardDescription>
                Conveners, core leadership, and active coordinators currently serving their tenure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeMembers.length === 0 ? (
                <p className="text-sm text-textMuted py-4 text-center">No active {entityType.toLowerCase()} members listed yet.</p>
              ) : (
                activeMembers.map((m) => <MemberRow key={m.id} member={m} editable={isClubUser} />)
              )}
            </CardContent>
          </Card>

          <Card className="border-borderSoft shadow-sm bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Past / Resigned Members</CardTitle>
              <CardDescription>
                Members who have resigned, completed their tenure, or been impeached.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pastMembers.length === 0 ? (
                <p className="text-sm text-textMuted py-4 text-center">No past/resigned members recorded.</p>
              ) : (
                pastMembers.map((m) => <MemberRow key={m.id} member={m} editable={isClubUser} />)
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingMember ? 'Edit Member Details' : `Add ${entityType} Member`}</DialogTitle>
            <DialogDescription>
              {editingMember 
                ? `Update information for ${editingMember.full_name}`
                : `Enter the ${entityType.toLowerCase()} details to add a new member.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="rounded-xl"
                placeholder="e.g. Rahul Sen"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="roll_number">Roll Number</Label>
              <Input
                id="roll_number"
                value={formData.roll_number}
                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                className="rounded-xl"
                placeholder="e.g. 22BCS001"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="rounded-xl"
                placeholder="e.g. rahul@student.dau.ac.in"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="designation">Designation *</Label>
              <select
                id="designation"
                value={['Convener', 'Dy. Convener', 'Core'].includes(formData.designation) ? formData.designation : 'Special Designation'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'Special Designation') {
                    setFormData({ ...formData, designation: '' });
                  } else {
                    setFormData({ ...formData, designation: val });
                  }
                }}
                className="flex h-10 w-full rounded-xl border border-borderSoft/80 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur-sm px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:cursor-not-allowed disabled:opacity-50 transition-colors [&>option]:bg-card"
              >
                <option value="Convener">Convener</option>
                <option value="Dy. Convener">Dy. Convener</option>
                <option value="Core">Core</option>
                <option value="Special Designation">Special Designation</option>
              </select>
            </div>
            
            {!['Convener', 'Dy. Convener', 'Core'].includes(formData.designation) && (
              <div className="grid gap-2 animate-in fade-in-50 duration-200">
                <Label htmlFor="custom_designation">Custom Designation Title *</Label>
                <Input
                  id="custom_designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  className="rounded-xl"
                  placeholder="e.g. Technical Head, Webmaster"
                />
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="rounded-xl"
                placeholder="e.g. 9876543210"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="tenure_start_date">Tenure Start Date *</Label>
              <Input
                id="tenure_start_date"
                type="date"
                value={formData.tenure_start_date}
                onChange={(e) => setFormData({ ...formData, tenure_start_date: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              onClick={saveMember} 
              disabled={isSaving || !formData.full_name.trim() || !formData.phone.trim() || !formData.tenure_start_date.trim() || !formData.designation.trim()} 
              className="rounded-xl bg-brand hover:bg-brand/90 text-white font-semibold"
            >
              {isSaving ? 'Saving...' : editingMember ? 'Save Changes' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-error flex items-center gap-1.5">
              <Trash2 size={20} />
              Remove Member Permanently
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong className="text-textPrimary">{memberToDelete?.full_name}</strong> from the database? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting} className="rounded-xl">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="rounded-xl bg-error hover:bg-error/90 text-white font-semibold">
              {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resignation / Impeachment Dialog */}
      <Dialog open={resignDialogOpen} onOpenChange={setResignDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="text-warning flex items-center gap-1.5">
              <Trash2 size={20} />
              End Member Tenure
            </DialogTitle>
            <DialogDescription>
              Specify the resignation/impeachment date for <strong className="text-textPrimary">{memberToResign?.full_name}</strong> to move them to Past Members.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="grid gap-1.5">
              <Label htmlFor="resign_date">Resignation / Impeachment Date *</Label>
              <Input
                id="resign_date"
                type="date"
                value={resignDate}
                onChange={(e) => setResignDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="resign_reason">Reason for Ending Tenure *</Label>
              <select
                id="resign_reason"
                value={resignReason}
                onChange={(e) => setResignReason(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-borderSoft/80 dark:border-white/10 bg-white/90 dark:bg-white/5 backdrop-blur-sm px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand [&>option]:bg-card"
              >
                <option value="Resigned">Resigned</option>
                <option value="Impeached">Impeached</option>
                <option value="Tenure Ended">Tenure Ended</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResignDialogOpen(false)} disabled={isResigning} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={confirmResign} disabled={isResigning || !resignDate} className="rounded-xl bg-warning hover:bg-warning/90 text-white font-semibold">
              {isResigning ? 'Recording...' : 'End Tenure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClubMembers;
