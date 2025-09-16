import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, TrendingUp, Users, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdMetrics {
  total_impressions: number;
  total_clicks: number;
  total_revenue: number;
  click_through_rate: number;
}

export function SponsorManager() {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<AdMetrics>({
    total_impressions: 0,
    total_clicks: 0,
    total_revenue: 0,
    click_through_rate: 0
  });
  const [newSponsor, setNewSponsor] = useState({
    company_name: "",
    logo_url: "",
    website_url: "",
    ad_budget: 0,
    target_audience: ""
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSponsors();
    loadMetrics();
  }, []);

  const loadSponsors = async () => {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSponsors(data || []);
    } catch (error) {
      console.error('Error loading sponsors:', error);
    }
  };

  const loadMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_placements')
        .select('impressions, clicks, revenue_generated');

      if (error) throw error;

      const totals = (data || []).reduce(
        (acc, placement) => ({
          total_impressions: acc.total_impressions + (placement.impressions || 0),
          total_clicks: acc.total_clicks + (placement.clicks || 0),
          total_revenue: acc.total_revenue + (placement.revenue_generated || 0),
          click_through_rate: 0
        }),
        { total_impressions: 0, total_clicks: 0, total_revenue: 0, click_through_rate: 0 }
      );

      totals.click_through_rate = totals.total_impressions > 0 
        ? (totals.total_clicks / totals.total_impressions) * 100 
        : 0;

      setMetrics(totals);
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const createSponsor = async () => {
    if (!newSponsor.company_name) {
      toast.error("Company name is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sponsors')
        .insert({
          company_name: newSponsor.company_name,
          logo_url: newSponsor.logo_url || null,
          website_url: newSponsor.website_url || null,
          ad_budget: newSponsor.ad_budget,
          target_audience: newSponsor.target_audience ? JSON.parse(newSponsor.target_audience) : {}
        });

      if (error) throw error;

      toast.success("Sponsor created successfully!");
      setNewSponsor({
        company_name: "",
        logo_url: "",
        website_url: "",
        ad_budget: 0,
        target_audience: ""
      });
      loadSponsors();
    } catch (error) {
      console.error('Error creating sponsor:', error);
      toast.error("Failed to create sponsor");
    } finally {
      setLoading(false);
    }
  };

  const updateSponsorStatus = async (sponsorId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('sponsors')
        .update({ status })
        .eq('id', sponsorId);

      if (error) throw error;

      toast.success(`Sponsor ${status}`);
      loadSponsors();
    } catch (error) {
      console.error('Error updating sponsor:', error);
      toast.error("Failed to update sponsor");
    }
  };

  return (
    <div className="space-y-6">
      {/* Ad Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Impressions</p>
                <p className="text-2xl font-bold">{metrics.total_impressions.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Clicks</p>
                <p className="text-2xl font-bold">{metrics.total_clicks.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Click-Through Rate</p>
                <p className="text-2xl font-bold">{metrics.click_through_rate.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Ad Revenue</p>
                <p className="text-2xl font-bold">${metrics.total_revenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Sponsor */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Sponsor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={newSponsor.company_name}
                onChange={(e) => setNewSponsor(prev => ({ ...prev, company_name: e.target.value }))}
                placeholder="Acme Corporation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad_budget">Ad Budget ($)</Label>
              <Input
                id="ad_budget"
                type="number"
                value={newSponsor.ad_budget}
                onChange={(e) => setNewSponsor(prev => ({ ...prev, ad_budget: Number(e.target.value) }))}
                placeholder="1000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="logo_url">Logo URL</Label>
              <Input
                id="logo_url"
                value={newSponsor.logo_url}
                onChange={(e) => setNewSponsor(prev => ({ ...prev, logo_url: e.target.value }))}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                value={newSponsor.website_url}
                onChange={(e) => setNewSponsor(prev => ({ ...prev, website_url: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_audience">Target Audience (JSON)</Label>
            <Textarea
              id="target_audience"
              value={newSponsor.target_audience}
              onChange={(e) => setNewSponsor(prev => ({ ...prev, target_audience: e.target.value }))}
              placeholder='{"interests": ["tech", "business"], "age_range": "25-45"}'
              rows={3}
            />
          </div>

          <Button onClick={createSponsor} disabled={loading}>
            {loading ? "Creating..." : "Add Sponsor"}
          </Button>
        </CardContent>
      </Card>

      {/* Sponsors List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Sponsors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sponsors.map(sponsor => (
              <div key={sponsor.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  {sponsor.logo_url && (
                    <img 
                      src={sponsor.logo_url} 
                      alt={sponsor.company_name}
                      className="w-12 h-12 object-contain rounded"
                    />
                  )}
                  <div>
                    <h3 className="font-semibold">{sponsor.company_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Budget: ${sponsor.ad_budget}
                    </p>
                    {sponsor.website_url && (
                      <a 
                        href={sponsor.website_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {sponsor.website_url}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={sponsor.status === 'active' ? 'default' : 'secondary'}>
                    {sponsor.status}
                  </Badge>
                  <Button
                    onClick={() => updateSponsorStatus(
                      sponsor.id, 
                      sponsor.status === 'active' ? 'paused' : 'active'
                    )}
                    variant="outline"
                    size="sm"
                  >
                    {sponsor.status === 'active' ? 'Pause' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
            
            {sponsors.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No sponsors found. Add your first sponsor above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}