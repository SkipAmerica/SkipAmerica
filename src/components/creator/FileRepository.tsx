import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Upload, 
  Search, 
  Star, 
  MoreHorizontal, 
  Trash2, 
  Edit, 
  Download,
  FileText,
  Image,
  Video,
  Archive,
  Plus,
  Filter,
  Clock
} from 'lucide-react';

interface CreatorFile {
  id: string;
  creator_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  description?: string;
  is_favorite: boolean;
  upload_date: string;
  last_shared?: string;
  share_count: number;
}

export function FileRepository() {
  const { user } = useAuth();
  const [files, setFiles] = useState<CreatorFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'recent'>('all');
  const [editingFile, setEditingFile] = useState<CreatorFile | null>(null);
  const [newDescription, setNewDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadFiles();
    }
  }, [user]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('creator_files')
        .select('*')
        .eq('creator_id', user?.id)
        .order('upload_date', { ascending: false });

      if (filter === 'favorites') {
        query = query.eq('is_favorite', true);
      } else if (filter === 'recent') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        query = query.gte('upload_date', oneWeekAgo.toISOString());
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setFiles(data || []);
      
    } catch (error: any) {
      console.error('Load files error:', error);
      toast({
        title: "Error",
        description: "Failed to load files",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      
      // Check file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        throw new Error('File size must be less than 20MB');
      }
      
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}_${file.name}`;
      
      // Upload to creator-files bucket
      const { error: uploadError } = await supabase.storage
        .from('creator-files')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      // Save file record
      const { error: saveError } = await supabase
        .from('creator_files')
        .insert({
          creator_id: user?.id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          file_type: file.type
        });
      
      if (saveError) throw saveError;
      
      toast({
        title: "File Uploaded",
        description: `${file.name} has been added to your repository`
      });
      
      await loadFiles();
      
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleFavorite = async (fileId: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('creator_files')
        .update({ is_favorite: !currentFavorite })
        .eq('id', fileId);
      
      if (error) throw error;
      
      setFiles(files.map(file => 
        file.id === fileId ? { ...file, is_favorite: !currentFavorite } : file
      ));
      
    } catch (error: any) {
      console.error('Toggle favorite error:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive"
      });
    }
  };

  const updateDescription = async () => {
    if (!editingFile) return;
    
    try {
      const { error } = await supabase
        .from('creator_files')
        .update({ description: newDescription })
        .eq('id', editingFile.id);
      
      if (error) throw error;
      
      setFiles(files.map(file => 
        file.id === editingFile.id ? { ...file, description: newDescription } : file
      ));
      
      setEditingFile(null);
      setNewDescription('');
      
      toast({
        title: "Updated",
        description: "File description has been updated"
      });
      
    } catch (error: any) {
      console.error('Update description error:', error);
      toast({
        title: "Error",
        description: "Failed to update description",
        variant: "destructive"
      });
    }
  };

  const deleteFile = async (file: CreatorFile) => {
    if (!confirm(`Are you sure you want to delete ${file.file_name}?`)) return;
    
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('creator-files')
        .remove([file.file_path]);
      
      if (storageError) throw storageError;
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('creator_files')
        .delete()
        .eq('id', file.id);
      
      if (dbError) throw dbError;
      
      setFiles(files.filter(f => f.id !== file.id));
      
      toast({
        title: "File Deleted",
        description: `${file.file_name} has been deleted`
      });
      
    } catch (error: any) {
      console.error('Delete file error:', error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete file",
        variant: "destructive"
      });
    }
  };

  const downloadFile = async (file: CreatorFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('creator-files')
        .download(file.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download file",
        variant: "destructive"
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="h-4 w-4" />;
    if (fileType.includes('zip') || fileType.includes('archive')) return <Archive className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredFiles = files.filter(file =>
    file.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>File Repository</span>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Add File'}
          </Button>
        </CardTitle>
        
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                {filter === 'all' ? 'All Files' : 
                 filter === 'favorites' ? 'Favorites' : 'Recent'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilter('all')}>
                All Files
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('favorites')}>
                Favorites
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('recent')}>
                Recent (7 days)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
          }}
          className="hidden"
          accept="*/*"
        />
        
        <ScrollArea className="h-96">
          <div className="grid gap-3">
            {filteredFiles.map((file) => (
              <Card key={file.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getFileIcon(file.file_type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{file.file_name}</h4>
                        {file.is_favorite && (
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.file_size)} • Uploaded {formatDate(file.upload_date)}
                      </p>
                      {file.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {file.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          Shared {file.share_count} times
                        </Badge>
                        {file.last_shared && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Last shared {formatDate(file.last_shared)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => downloadFile(file)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleFavorite(file.id, file.is_favorite)}>
                        <Star className="h-4 w-4 mr-2" />
                        {file.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setEditingFile(file);
                        setNewDescription(file.description || '');
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit description
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deleteFile(file)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
            
            {filteredFiles.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-2">No files found</h3>
                <p className="text-sm">
                  {searchTerm ? 'Try adjusting your search terms' : 'Upload files to share during calls'}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* Edit Description Dialog */}
        <Dialog open={!!editingFile} onOpenChange={() => setEditingFile(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit File Description</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">File Name</label>
                <p className="text-sm text-muted-foreground">{editingFile?.file_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Add a description to help you find this file later..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingFile(null)}>
                  Cancel
                </Button>
                <Button onClick={updateDescription}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}