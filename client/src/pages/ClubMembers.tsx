import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { apiRequest } from '../lib/api';
import { toastError, toastSuccess } from '../lib/toast';
import { ClubMember } from '../types';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Edit2, Users, Shield, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../components/ui/dialog';

const ClubMembers: React.FC = () => {
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ClubMember | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    roll_number: '',
    email: '',
    designation: '',
    phone: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<ClubMember[]>('/api/club-members', { auth: true });
      setMembers(data);
    } catch (err) {
      toastError(err, 'Failed to load club members');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const coreMembers = members.filter((m) => m.is_core_member);
  const generalMembers = members.filter((m) => !m.is_core_member);

  const openEdit = (member: ClubMember) => {
    setEditingMember(member);
    setFormData({
      full_name: member.full_name,
      roll_number: member.roll_number ?? '',
      email: member.email ?? '',
      designation: member.designation ?? '',
      phone: member.phone ?? '',
    });
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingMember) return;
    setIsSaving(true);
    try {
      await apiRequest<ClubMember>(`/api/club-members/${editingMember.id}`, {
        method: 'PATCH',
        auth: true,
        body: formData,
      });
      toastSuccess('Core member updated successfully');
      setEditDialogOpen(false);
      fetchMembers();
    } catch (err) {
      toastError(err, 'Failed to update member');
    } finally {
      setIsSaving(false);
    }
  };

  const MemberRow = ({ member, editable }: { member: ClubMember; editable: boolean }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-borderSoft bg-card/50 hover:bg-hoverSoft/50 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-textPrimary">{member.full_name}</p>
          {member.is_core_member ? (
            <Badge variant="secondary" className="bg-brand/10 text-brand border-brand/20">
              <Shield size={12} className="mr-1" />
              Core
            </Badge>
          ) : (
            <Badge variant="outline" className="text-textMuted">
              General
            </Badge>
          )}
        </div>
        <p className="text-sm text-textMuted mt-0.5">
          {member.designation || 'Member'}
          {member.roll_number ? ` · ${member.roll_number}` : ''}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-textMuted">
          {member.email && <span>{member.email}</span>}
          {member.phone && <span>{member.phone}</span>}
        </div>
      </div>
      {editable ? (
        <Button variant="outline" size="sm" onClick={() => openEdit(member)} className="shrink-0 rounded-lg">
          <Edit2 size={14} className="mr-1.5" />
          Edit
        </Button>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-textMuted shrink-0">
          <Lock size={14} />
          View only
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-textPrimary tracking-tight flex items-center gap-2">
            <Users className="text-brand" size={28} />
            Club Members
          </h1>
          <p className="text-textMuted mt-1 text-sm sm:text-base">
            Manage your committee roster. You can edit <strong>core member</strong> details only.
          </p>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <Card className="border-borderSoft shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Core Committee Members</CardTitle>
              <CardDescription>
                President, Secretary, Treasurer, and other core roles — editable by your club login.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {coreMembers.length === 0 ? (
                <p className="text-sm text-textMuted py-4 text-center">No core members listed yet.</p>
              ) : (
                coreMembers.map((m) => <MemberRow key={m.id} member={m} editable />)
              )}
            </CardContent>
          </Card>

          {generalMembers.length > 0 && (
            <Card className="border-borderSoft shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">General Members</CardTitle>
                <CardDescription>Read-only. Contact SBG admin to update general member records.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {generalMembers.map((m) => (
                  <MemberRow key={m.id} member={m} editable={false} />
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Core Member</DialogTitle>
            <DialogDescription>Update details for {editingMember?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="roll_number">Roll Number</Label>
              <Input
                id="roll_number"
                value={formData.roll_number}
                onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                className="rounded-xl"
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
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                placeholder="e.g. President, Secretary"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={isSaving || !formData.full_name.trim()} className="rounded-xl">
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClubMembers;
