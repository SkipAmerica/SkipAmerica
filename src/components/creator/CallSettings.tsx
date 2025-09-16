import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Clock, DollarSign, Settings } from "lucide-react";

interface CallSettingsProps {
  creatorId: string;
}

export function CallSettings({ creatorId }: CallSettingsProps) {
  const [maxCallDuration, setMaxCallDuration] = useState("60"); // minutes
  const [customDurationEnabled, setCustomDurationEnabled] = useState(false);
  const [customDuration, setCustomDuration] = useState("");
  const [callRate, setCallRate] = useState("5.00");
  const [autoAcceptCalls, setAutoAcceptCalls] = useState(false);
  const { toast } = useToast();

  const handleSaveSettings = () => {
    // In a real app, this would save to the database
    toast({
      title: "Settings Saved",
      description: "Your call settings have been updated successfully.",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Call Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Call Duration Settings */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Maximum Call Duration</Label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Switch
                  checked={!customDurationEnabled}
                  onCheckedChange={(checked) => setCustomDurationEnabled(!checked)}
                />
                <Label>Use preset durations</Label>
              </div>
              
              {!customDurationEnabled && (
                <Select value={maxCallDuration} onValueChange={setMaxCallDuration}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select maximum duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="unlimited">No limit</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              <div className="flex items-center space-x-3">
                <Switch
                  checked={customDurationEnabled}
                  onCheckedChange={setCustomDurationEnabled}
                />
                <Label>Set custom duration per call</Label>
              </div>
              
              {customDurationEnabled && (
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    placeholder="Minutes"
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">minutes maximum</span>
                </div>
              )}
            </div>
          </div>

          {/* Call Rate Settings */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Call Rate</Label>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                value={callRate}
                onChange={(e) => setCallRate(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-muted-foreground">per minute</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Rate splits automatically when multiple fans join the same call
            </p>
          </div>

          {/* Auto Accept Settings */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Call Management</Label>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-accept calls</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically accept incoming calls when you're online
                </p>
              </div>
              <Switch
                checked={autoAcceptCalls}
                onCheckedChange={setAutoAcceptCalls}
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button onClick={handleSaveSettings} className="w-full">
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Settings Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Max Duration:</span>
              <span className="ml-2 font-medium">
                {customDurationEnabled 
                  ? `${customDuration || 'Custom'} min` 
                  : maxCallDuration === 'unlimited' 
                    ? 'No limit' 
                    : `${maxCallDuration} min`
                }
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Rate:</span>
              <span className="ml-2 font-medium">${callRate}/min</span>
            </div>
            <div>
              <span className="text-muted-foreground">Auto-accept:</span>
              <span className="ml-2 font-medium">{autoAcceptCalls ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}