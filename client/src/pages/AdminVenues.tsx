import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit2, Trash2, MapPin, Users, Hash } from 'lucide-react';
import { apiRequest, type ApiVenue } from '../lib/api';
import { toastError, toastSuccess } from '../lib/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';

const AdminVenues: React.FC = () => {
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<ApiVenue | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'needs_approval',
    capacity: '',
    location: ''
  });

  const fetchVenues = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest<ApiVenue[]>('/api/venues');
      setVenues(data);
    } catch (error) {
      console.error('Failed to load venues:', error);
      toastError(error, 'Failed to load venues');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const handleOpenModal = (venue?: ApiVenue) => {
    if (venue) {
      setEditingVenue(venue);
      setFormData({
        name: venue.name,
        category: venue.category,
        capacity: venue.capacity ? venue.capacity.toString() : '',
        location: venue.location || ''
      });
    } else {
      setEditingVenue(null);
      setFormData({
        name: '',
        category: 'needs_approval',
        capacity: '',
        location: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVenue(null);
  };

  const handleSaveVenue = async () => {
    if (!formData.name.trim() || !formData.category) {
      toastError('Name and category are required');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : null,
        location: formData.location
      };

      if (editingVenue) {
        await apiRequest(`/api/admin/venues/${editingVenue.id}`, {
          method: 'PATCH',
          auth: true,
          body: payload
        });
        toastSuccess('Venue updated successfully');
      } else {
        await apiRequest('/api/admin/venues', {
          method: 'POST',
          auth: true,
          body: payload
        });
        toastSuccess('Venue added successfully');
      }
      
      handleCloseModal();
      fetchVenues();
    } catch (error) {
      toastError(error, 'Failed to save venue');
    }
  };

  const handleDeleteVenue = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiRequest(`/api/admin/venues/${id}`, {
        method: 'DELETE',
        auth: true
      });
      toastSuccess('Venue deleted successfully');
      setVenues(prev => prev.filter(v => v.id !== id));
    } catch (error) {
      toastError(error, 'Failed to delete venue');
    }
  };

  return (
    <div className="space-y-6 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-textPrimary">Manage Venues</h2>
          <p className="text-textSecondary mt-1 text-sm font-medium">Add, edit, or remove venues available for booking.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus size={16} /> Add Venue
        </Button>
      </div>

      <div className="bg-card border border-borderSoft rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bgMain border-b border-borderSoft text-textSecondary uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-4">Venue Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Capacity</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderSoft">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : venues.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-textMuted">
                    <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                    No venues found.
                  </td>
                </tr>
              ) : (
                venues.map(venue => (
                  <motion.tr 
                    key={venue.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-hoverSoft/30 transition-colors group"
                  >
                    <td className="px-6 py-4 font-semibold text-textPrimary">{venue.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs rounded-full bg-brand/10 text-brand font-medium">
                        {venue.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-textSecondary flex items-center gap-1.5 mt-2.5">
                      <Users size={14} /> {venue.capacity || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-textSecondary">
                      {venue.location || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-textMuted hover:text-brand hover:bg-brand/10"
                          onClick={() => handleOpenModal(venue)}
                        >
                          <Edit2 size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-textMuted hover:text-error hover:bg-error/10"
                          onClick={() => handleDeleteVenue(venue.id, venue.name)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingVenue ? 'Edit Venue' : 'Add New Venue'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Venue Name <span className="text-error">*</span></Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="e.g. CEP 108, OAT"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Category <span className="text-error">*</span></Label>
              <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="needs_approval">Needs Approval (Classrooms, etc)</SelectItem>
                  <SelectItem value="auto_approval">Auto Approval (OAT, SAC)</SelectItem>
                  <SelectItem value="sports">Sports Facility</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input 
                type="number"
                value={formData.capacity} 
                onChange={e => setFormData({ ...formData, capacity: e.target.value })} 
                placeholder="e.g. 60"
              />
            </div>

            <div className="space-y-2">
              <Label>Location</Label>
              <Input 
                value={formData.location} 
                onChange={e => setFormData({ ...formData, location: e.target.value })} 
                placeholder="e.g. CEP Building, 1st Floor"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button onClick={handleSaveVenue}>Save Venue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVenues;
