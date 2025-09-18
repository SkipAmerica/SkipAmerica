import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PlayCircle, Plus, Star, Eye, Edit, Trash2, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/app/providers/auth-provider";
import { toast } from "sonner";

interface Playlist {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  content_count?: number;
}

interface PlaylistContent {
  id: string;
  playlist_id: string;
  content_id: string;
  position: number;
  content?: {
    title?: string;
    thumbnail_url?: string;
    content_type: string;
  };
}

export function CreatorPlaylists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistContent, setPlaylistContent] = useState<PlaylistContent[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({
    title: "",
    description: "",
    thumbnail_url: ""
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadPlaylists();
    }
  }, [user]);

  const loadPlaylists = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('creator_playlists')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get content counts for each playlist
      const playlistsWithCounts = await Promise.all(
        (data || []).map(async (playlist) => {
          const { count } = await supabase
            .from('playlist_content')
            .select('*', { count: 'exact', head: true })
            .eq('playlist_id', playlist.id);

          return {
            ...playlist,
            content_count: count || 0
          };
        })
      );

      setPlaylists(playlistsWithCounts);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const createPlaylist = async () => {
    if (!user || !newPlaylist.title) {
      toast.error("Playlist title is required");
      return;
    }

    try {
      const { data, error } = await supabase
        .from('creator_playlists')
        .insert({
          creator_id: user.id,
          title: newPlaylist.title,
          description: newPlaylist.description || null,
          thumbnail_url: newPlaylist.thumbnail_url || null
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Playlist created successfully!");
      setNewPlaylist({ title: "", description: "", thumbnail_url: "" });
      setShowCreateDialog(false);
      loadPlaylists();
    } catch (error) {
      console.error('Error creating playlist:', error);
      toast.error("Failed to create playlist");
    }
  };

  const toggleFeatured = async (playlistId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('creator_playlists')
        .update({ is_featured: !currentState })
        .eq('id', playlistId);

      if (error) throw error;

      toast.success(currentState ? "Removed from featured" : "Added to featured");
      loadPlaylists();
    } catch (error) {
      console.error('Error updating playlist:', error);
      toast.error("Failed to update playlist");
    }
  };

  const deletePlaylist = async (playlistId: string) => {
    try {
      const { error } = await supabase
        .from('creator_playlists')
        .delete()
        .eq('id', playlistId);

      if (error) throw error;

      toast.success("Playlist deleted");
      loadPlaylists();
    } catch (error) {
      console.error('Error deleting playlist:', error);
      toast.error("Failed to delete playlist");
    }
  };

  const loadPlaylistContent = async (playlist: Playlist) => {
    try {
      const { data, error } = await supabase
        .from('playlist_content')
        .select('*')
        .eq('playlist_id', playlist.id)
        .order('position');

      if (error) throw error;

      // Get content info separately
      const contentWithDetails = await Promise.all(
        (data || []).map(async (item) => {
          const { data: contentData } = await supabase
            .from('creator_content')
            .select('title, thumbnail_url, content_type')
            .eq('id', item.content_id)
            .single();

          return {
            ...item,
            content: contentData || { title: 'Unknown', content_type: 'unknown' }
          };
        })
      );

      setPlaylistContent(contentWithDetails);
      setSelectedPlaylist(playlist);
    } catch (error) {
      console.error('Error loading playlist content:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Content Playlists</h2>
          <p className="text-muted-foreground">
            Organize your content into themed collections
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Playlist
        </Button>
      </div>

      {/* Featured Playlists */}
      {playlists.some(p => p.is_featured) && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Featured Playlists
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {playlists
              .filter(playlist => playlist.is_featured)
              .map(playlist => (
                <PlaylistCard 
                  key={playlist.id}
                  playlist={playlist}
                  onPlay={() => loadPlaylistContent(playlist)}
                  onToggleFeatured={() => toggleFeatured(playlist.id, playlist.is_featured)}
                  onDelete={() => deletePlaylist(playlist.id)}
                />
              ))}
          </div>
        </div>
      )}

      {/* All Playlists */}
      <div>
        <h3 className="text-lg font-semibold mb-4">All Playlists</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playlists.map(playlist => (
            <PlaylistCard 
              key={playlist.id}
              playlist={playlist}
              onPlay={() => loadPlaylistContent(playlist)}
              onToggleFeatured={() => toggleFeatured(playlist.id, playlist.is_featured)}
              onDelete={() => deletePlaylist(playlist.id)}
            />
          ))}
        </div>

        {playlists.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No playlists yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first playlist to organize your content
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                Create First Playlist
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Playlist Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={newPlaylist.title}
                onChange={(e) => setNewPlaylist(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Morning Motivation"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newPlaylist.description}
                onChange={(e) => setNewPlaylist(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your playlist..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Thumbnail URL</label>
              <Input
                value={newPlaylist.thumbnail_url}
                onChange={(e) => setNewPlaylist(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={createPlaylist} className="flex-1">
                Create Playlist
              </Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Playlist Content Viewer */}
      {selectedPlaylist && (
        <Dialog open={!!selectedPlaylist} onOpenChange={() => setSelectedPlaylist(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedPlaylist.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPlaylist.description && (
                <p className="text-muted-foreground">{selectedPlaylist.description}</p>
              )}
              
              {playlistContent.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {playlistContent.map((item, index) => (
                    <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground min-w-8">
                        {index + 1}
                      </div>
                      {item.content?.thumbnail_url && (
                        <img 
                          src={item.content.thumbnail_url} 
                          alt="" 
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.content?.title || 'Untitled Content'}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {item.content?.content_type}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <PlayCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No content in this playlist yet</p>
                  <Button variant="outline" className="mt-2">
                    Add Content
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface PlaylistCardProps {
  playlist: Playlist;
  onPlay: () => void;
  onToggleFeatured: () => void;
  onDelete: () => void;
}

function PlaylistCard({ playlist, onPlay, onToggleFeatured, onDelete }: PlaylistCardProps) {
  return (
    <Card className="group relative overflow-hidden hover:shadow-lg transition-all">
      <div className="aspect-video bg-gradient-to-br from-primary/10 to-secondary/10 relative">
        {playlist.thumbnail_url ? (
          <img 
            src={playlist.thumbnail_url} 
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Music className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
          <Button 
            onClick={onPlay}
            size="sm" 
            className="opacity-0 group-hover:opacity-100 transition-all"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            View
          </Button>
        </div>

        {playlist.is_featured && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-primary/90">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </Badge>
          </div>
        )}

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all">
          <div className="flex gap-1">
            <Button
              onClick={onToggleFeatured}
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
            >
              <Star className={`w-3 h-3 ${playlist.is_featured ? 'fill-current' : ''}`} />
            </Button>
            <Button
              onClick={onDelete}
              size="sm"
              variant="destructive"
              className="h-8 w-8 p-0"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <h3 className="font-semibold mb-1 line-clamp-1">{playlist.title}</h3>
        {playlist.description && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {playlist.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <PlayCircle className="w-3 h-3" />
            {playlist.content_count} items
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {playlist.view_count} views
          </div>
        </div>
      </CardContent>
    </Card>
  );
}