import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Building, 
  Users, 
  Calendar, 
  CreditCard, 
  Plus,
  Settings,
  UserPlus,
  Crown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Agency {
  id: string;
  name: string;
  description: string;
  subscription_status: string;
  subscription_end_date: string;
  yearly_fee: number;
  created_at: string;
}

interface ManagedCreator {
  id: string;
  creator_id: string;
  creator_name: string;
  creator_email: string;
  permissions: any;
  created_at: string;
}

export function AgencyDashboard() {
  const { user } = useAuth();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [managedCreators, setManagedCreators] = useState<ManagedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (user) {
      loadAgencyData();
    }
  }, [user]);

  const loadAgencyData = async () => {
    try {
      setLoading(true);
      
      // Load agency
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .select('*')
        .eq('owner_id', user?.id)
        .single();

      if (agencyError && agencyError.code !== 'PGRST116') {
        throw agencyError;
      }

      setAgency(agencyData);

      // Load managed creators if agency exists
      if (agencyData) {
        const { data: creatorsData, error: creatorsError } = await supabase
          .from('agency_creators')
          .select(`
            *,
            profiles!creator_id(full_name)
          `)
          .eq('agency_id', agencyData.id);

        if (creatorsError) throw creatorsError;

        const transformedCreators = creatorsData?.map(item => ({
          ...item,
          creator_name: item.profiles?.full_name || 'Unknown Creator',
          creator_email: `creator-${item.creator_id.slice(0, 8)}@example.com`
        })) || [];

        setManagedCreators(transformedCreators);
      }
    } catch (error) {
      console.error('Error loading agency data:', error);
      toast.error('Failed to load agency data');
    } finally {
      setLoading(false);
    }
  };

  const createAgency = async () => {
    if (!formData.name.trim()) {
      toast.error('Agency name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('agencies')
        .insert({
          owner_id: user?.id,
          name: formData.name,
          description: formData.description,
          subscription_status: 'trial',
          subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update user profile to agency type
      await supabase
        .from('profiles')
        .update({ account_type: 'agency' })
        .eq('id', user?.id);

      toast.success('Agency created successfully!');
      setAgency(data);
      setShowCreateForm(false);
      setFormData({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating agency:', error);
      toast.error('Failed to create agency');
    }
  };

  const inviteCreator = async () => {
    // This would typically open a modal to search and invite creators
    toast.info('Creator invitation feature coming soon');
  };

  const updateSubscription = async () => {
    // This would integrate with payment system
    toast.info('Payment integration coming soon');
  };

  if (loading) {
    return <div className="p-6">Loading agency dashboard...</div>;
  }

  if (!agency) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Building className="h-6 w-6" />
              <span>Create Your Agency</span>
            </CardTitle>
            <p className="text-muted-foreground">
              Start managing creator accounts with a professional agency dashboard
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 border rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Manage Creators</h3>
                <p className="text-sm text-muted-foreground">
                  Handle multiple creator accounts
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Schedule Management</h3>
                <p className="text-sm text-muted-foreground">
                  Coordinate appointments & availability
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <Settings className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Content & Profiles</h3>
                <p className="text-sm text-muted-foreground">
                  Manage images, language & content
                </p>
              </div>
            </div>

            {!showCreateForm ? (
              <Button onClick={() => setShowCreateForm(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Agency Account
              </Button>
            ) : (
              <div className="space-y-4">
                <Input
                  placeholder="Agency Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
                <Textarea
                  placeholder="Agency Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
                <div className="flex space-x-2">
                  <Button onClick={createAgency} className="flex-1">
                    Create Agency
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="text-center text-sm text-muted-foreground">
              <p>30-day free trial • $1,200/year after trial</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center space-x-2">
            <Building className="h-6 w-6" />
            <span>{agency.name}</span>
          </h2>
          <p className="text-muted-foreground">{agency.description}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge 
            className={agency.subscription_status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}
          >
            <Crown className="h-3 w-3 mr-1" />
            {agency.subscription_status}
          </Badge>
          <Button variant="outline" onClick={updateSubscription}>
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="font-medium">Managed Creators</span>
            </div>
            <p className="text-2xl font-bold mt-2">{managedCreators.length}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-medium">Subscription Ends</span>
            </div>
            <p className="text-sm font-medium mt-2">
              {format(new Date(agency.subscription_end_date), 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="font-medium">Annual Fee</span>
            </div>
            <p className="text-2xl font-bold mt-2">${agency.yearly_fee}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="creators" className="w-full">
        <TabsList>
          <TabsTrigger value="creators">Managed Creators ({managedCreators.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="creators" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Creator Accounts</h3>
            <Button onClick={inviteCreator}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Creator
            </Button>
          </div>

          {managedCreators.length > 0 ? (
            <div className="grid gap-4">
              {managedCreators.map((creator) => (
                <Card key={creator.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{creator.creator_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Added {format(new Date(creator.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">
                          {Object.keys(creator.permissions).length} permissions
                        </Badge>
                        <Button size="sm" variant="outline">
                          Manage
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No creators under management yet</p>
                <Button className="mt-4" onClick={inviteCreator}>
                  Invite Your First Creator
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Analytics dashboard coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Agency settings coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}