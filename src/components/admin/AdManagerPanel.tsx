import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, Eye, BarChart3, Plus } from 'lucide-react';
import { useAdManager, AdData } from '@/hooks/useAdManager';
import { toast } from 'sonner';

interface AdManagerPanelProps {
  onClose?: () => void;
}

export const AdManagerPanel: React.FC<AdManagerPanelProps> = ({ onClose }) => {
  const { ads, loading, saveAd, deleteAd, refetch } = useAdManager();
  const [editingAd, setEditingAd] = useState<Partial<AdData> | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleCreateNew = () => {
    setEditingAd({
      title: '',
      description: '',
      imageUrl: '',
      buttonText: 'Learn More',
      isActive: true,
      position: 'left',
      adType: 'general'
    });
    setShowForm(true);
  };

  const handleEdit = (ad: AdData) => {
    setEditingAd(ad);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!editingAd) return;
    
    try {
      await saveAd(editingAd);
      toast.success('Ad saved successfully');
      setShowForm(false);
      setEditingAd(null);
    } catch (error) {
      toast.error('Failed to save ad');
    }
  };

  const handleDelete = async (adId: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;
    
    try {
      await deleteAd(adId);
      toast.success('Ad deleted successfully');
    } catch (error) {
      toast.error('Failed to delete ad');
    }
  };

  const updateEditingAd = (field: keyof AdData, value: any) => {
    setEditingAd(prev => prev ? { ...prev, [field]: value } : null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ad Manager</h2>
          <p className="text-muted-foreground">Manage promotional content and advertisements</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreateNew} className="flex items-center gap-2">
            <Plus size={16} />
            Create Ad
          </Button>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Ad Creation/Edit Form */}
      {showForm && editingAd && (
        <Card>
          <CardHeader>
            <CardTitle>{editingAd.id ? 'Edit Ad' : 'Create New Ad'}</CardTitle>
            <CardDescription>Configure your advertisement details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adTitle">Title</Label>
                <Input
                  id="adTitle"
                  value={editingAd.title || ''}
                  onChange={(e) => updateEditingAd('title', e.target.value)}
                  placeholder="Ad title..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="buttonText">Button Text</Label>
                <Input
                  id="buttonText"
                  value={editingAd.buttonText || ''}
                  onChange={(e) => updateEditingAd('buttonText', e.target.value)}
                  placeholder="Learn More"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingAd.description || ''}
                onChange={(e) => updateEditingAd('description', e.target.value)}
                placeholder="Ad description..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input
                id="imageUrl"
                value={editingAd.imageUrl || ''}
                onChange={(e) => updateEditingAd('imageUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Select 
                  value={editingAd.position || 'left'} 
                  onValueChange={(value) => updateEditingAd('position', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adType">Ad Type</Label>
                <Select 
                  value={editingAd.adType || 'general'} 
                  onValueChange={(value) => updateEditingAd('adType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="creator">Creator</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="isActive">Active</Label>
                <div className="flex items-center space-x-2 h-10">
                  <Switch
                    id="isActive"
                    checked={editingAd.isActive || false}
                    onCheckedChange={(checked) => updateEditingAd('isActive', checked)}
                  />
                  <Label htmlFor="isActive" className="text-sm">
                    {editingAd.isActive ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Ad'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowForm(false);
                  setEditingAd(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Ads List */}
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold">Current Advertisements</h3>
        
        {ads.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">No ads found. Create your first ad to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {ads.map((ad) => (
              <Card key={ad.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{ad.title}</h4>
                        <Badge variant={ad.isActive ? 'default' : 'secondary'}>
                          {ad.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {ad.position}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {ad.adType}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {ad.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          {ad.impressions || 0} views
                        </span>
                        <span className="flex items-center gap-1">
                          <BarChart3 size={12} />
                          {ad.clicks || 0} clicks
                        </span>
                        <span>
                          CTR: {ad.impressions && ad.clicks 
                            ? ((ad.clicks / ad.impressions) * 100).toFixed(1)
                            : '0'}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(ad)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(ad.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
