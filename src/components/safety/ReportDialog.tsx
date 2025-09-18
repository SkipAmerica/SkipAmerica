import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/app/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { AlertTriangle, Flag, Shield, UserX } from 'lucide-react';

interface ReportDialogProps {
  reportedUserId: string;
  reportedUserName: string;
  trigger?: React.ReactNode;
}

const reportReasons = [
  { value: 'inappropriate_content', label: 'Inappropriate Content', severity: 'medium' },
  { value: 'harassment', label: 'Harassment or Bullying', severity: 'high' },
  { value: 'spam', label: 'Spam or Unwanted Contact', severity: 'low' },
  { value: 'fake_profile', label: 'Fake Profile', severity: 'medium' },
  { value: 'scam', label: 'Scam or Fraud', severity: 'high' },
  { value: 'underage', label: 'Underage User', severity: 'critical' },
  { value: 'violence', label: 'Threats or Violence', severity: 'critical' },
  { value: 'other', label: 'Other', severity: 'medium' }
];

const severityColors = {
  low: 'bg-yellow-100 text-yellow-800',
  medium: 'bg-orange-100 text-orange-800',
  high: 'bg-red-100 text-red-800',
  critical: 'bg-red-200 text-red-900'
};

export function ReportDialog({ reportedUserId, reportedUserName, trigger }: ReportDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmitReport = async () => {
    if (!user) {
      toast.error('Please log in to submit a report');
      return;
    }

    if (!reason) {
      toast.error('Please select a reason for the report');
      return;
    }

    try {
      setLoading(true);

      // In real app, this would insert into a reports table
      // For now, we'll simulate the report submission
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Report submitted successfully. Our team will review it shortly.');
      
      setOpen(false);
      setReason('');
      setDescription('');
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error('Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const selectedReason = reportReasons.find(r => r.value === reason);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
            <Flag className="h-4 w-4 mr-2" />
            Report
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Report {reportedUserName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Your safety is our priority</p>
                <p className="text-red-700">
                  Reports are reviewed by our moderation team within 24 hours. False reports may result in account penalties.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason for report *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map((reportReason) => (
                  <SelectItem key={reportReason.value} value={reportReason.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{reportReason.label}</span>
                      <Badge 
                        variant="secondary" 
                        className={`ml-2 text-xs ${severityColors[reportReason.severity as keyof typeof severityColors]}`}
                      >
                        {reportReason.severity}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedReason && (
              <Badge className={severityColors[selectedReason.severity as keyof typeof severityColors]}>
                {selectedReason.severity.toUpperCase()} PRIORITY
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label>Additional details (optional)</Label>
            <Textarea
              placeholder="Provide more context about this report..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Screenshots or other evidence can be submitted via our support email.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReport}
              disabled={loading || !reason}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {loading ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700"
              onClick={() => {
                // In real app, this would block the user
                toast.success(`${reportedUserName} has been blocked`);
                setOpen(false);
              }}
            >
              <UserX className="h-4 w-4 mr-2" />
              Block User Instead
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}