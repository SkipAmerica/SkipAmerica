import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useFileSharing, FileShare, CreatorFile } from '@/hooks/useFileSharing';
import { 
  Upload, 
  Paperclip, 
  Download, 
  FileText, 
  Image, 
  Video, 
  Archive,
  Star,
  Clock,
  Share2,
  Search
} from 'lucide-react';

interface FileSharePanelProps {
  callId: string;
  currentUserId: string;
  recipientId: string;
  isCreator: boolean;
}

export function FileSharePanel({ callId, currentUserId, recipientId, isCreator }: FileSharePanelProps) {
  const [activeTab, setActiveTab] = useState<'shared' | 'repository'>('shared');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    uploading,
    sharedFiles,
    creatorFiles,
    uploadCallFile,
    shareRepositoryFile,
    downloadFile,
    loadSharedFiles,
    loadCreatorFiles
  } = useFileSharing(callId, currentUserId);

  useEffect(() => {
    loadSharedFiles();
    if (isCreator) {
      loadCreatorFiles();
    }
  }, [loadSharedFiles, loadCreatorFiles, isCreator]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        alert('File size must be less than 20MB');
        return;
      }
      uploadCallFile(file, recipientId);
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
    return new Date(dateString).toLocaleString();
  };

  const filteredCreatorFiles = creatorFiles.filter(file =>
    file.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-80 border-l bg-card flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Paperclip className="h-4 w-4" />
          File Sharing
        </CardTitle>
        
        {/* Tab Navigation */}
        <div className="flex gap-1 bg-muted p-1 rounded-md">
          <Button
            variant={activeTab === 'shared' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('shared')}
            className="flex-1 text-xs h-7"
          >
            Call Files
          </Button>
          {isCreator && (
            <Button
              variant={activeTab === 'repository' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('repository')}
              className="flex-1 text-xs h-7"
            >
              Repository
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3 p-3 pt-0">
        {/* Upload Button */}
        <div className="space-y-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            size="sm"
            className="w-full"
          >
            <Upload className="h-3 w-3 mr-2" />
            {uploading ? 'Uploading...' : 'Attach File'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <p className="text-xs text-muted-foreground text-center">
            Max size: 20MB
          </p>
        </div>

        <Separator />

        {activeTab === 'shared' && (
          <div className="flex-1 flex flex-col">
            <h4 className="text-xs font-medium mb-2 flex items-center gap-1">
              <Share2 className="h-3 w-3" />
              Shared Files ({sharedFiles.length})
            </h4>
            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {sharedFiles.map((share) => (
                  <Card key={share.id} className="p-3">
                    <div className="flex items-start gap-2">
                      {getFileIcon(share.file_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {share.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(share.file_size)}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs h-5">
                            {share.sender_id === currentUserId ? 'Sent' : 'Received'}
                          </Badge>
                          {share.downloaded_at && (
                            <Badge variant="secondary" className="text-xs h-5">
                              Downloaded
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadFile(share)}
                        className="h-7 w-7 p-0"
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(share.shared_at)}
                    </p>
                  </Card>
                ))}
                {sharedFiles.length === 0 && (
                  <div className="text-center text-muted-foreground text-xs py-8">
                    No files shared yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {activeTab === 'repository' && isCreator && (
          <div className="flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-xs font-medium flex items-center gap-1">
                <Archive className="h-3 w-3" />
                My Repository ({filteredCreatorFiles.length})
              </h4>
            </div>
            
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 text-xs pl-7"
              />
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {filteredCreatorFiles.map((file) => (
                  <Card key={file.id} className="p-3">
                    <div className="flex items-start gap-2">
                      {getFileIcon(file.file_type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-medium truncate">
                            {file.file_name}
                          </p>
                          {file.is_favorite && (
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)}
                        </p>
                        {file.description && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {file.description}
                          </p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="outline" className="text-xs h-5">
                            Shared {file.share_count} times
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => shareRepositoryFile(file.id, recipientId)}
                        className="h-7 w-7 p-0"
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                ))}
                {filteredCreatorFiles.length === 0 && (
                  <div className="text-center text-muted-foreground text-xs py-8">
                    {searchTerm ? 'No files match your search' : 'No files in repository'}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </div>
  );
}