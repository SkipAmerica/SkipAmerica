import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/app/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Clock, 
  Users, 
  Star,
  Download,
  Eye,
  Target,
  Award,
  BarChart3,
  PieChart
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RePieChart, Cell, Pie } from 'recharts';

interface EarningsData {
  totalEarnings: number;
  thisMonth: number;
  lastMonth: number;
  pendingPayouts: number;
  totalCalls: number;
  avgRating: number;
  responseTime: string;
  conversionRate: number;
}

interface CallData {
  date: string;
  earnings: number;
  calls: number;
  duration: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function EarningsDashboard() {
  const { user } = useAuth();
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarnings: 0,
    thisMonth: 0,
    lastMonth: 0,
    pendingPayouts: 0,
    totalCalls: 0,
    avgRating: 0,
    responseTime: '0 min',
    conversionRate: 0
  });
  const [callData, setCallData] = useState<CallData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  // Mock data for demonstration
  const mockEarningsData: EarningsData = {
    totalEarnings: 12450.00,
    thisMonth: 3280.50,
    lastMonth: 2950.00,
    pendingPayouts: 450.00,
    totalCalls: 234,
    avgRating: 4.9,
    responseTime: '< 2 min',
    conversionRate: 68.5
  };

  const mockCallData: CallData[] = [
    { date: '2024-01-01', earnings: 120, calls: 3, duration: 180 },
    { date: '2024-01-02', earnings: 200, calls: 5, duration: 300 },
    { date: '2024-01-03', earnings: 150, calls: 4, duration: 240 },
    { date: '2024-01-04', earnings: 300, calls: 7, duration: 420 },
    { date: '2024-01-05', earnings: 180, calls: 4, duration: 240 },
    { date: '2024-01-06', earnings: 250, calls: 6, duration: 360 },
    { date: '2024-01-07', earnings: 220, calls: 5, duration: 300 }
  ];

  const categoryData = [
    { name: 'Video Calls', value: 65, earnings: 8092.50 },
    { name: 'Quick Advice', value: 25, earnings: 3112.50 },
    { name: 'Extended Sessions', value: 10, earnings: 1245.00 }
  ];

  useEffect(() => {
    loadEarningsData();
  }, [user, timeRange]);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      // In real app, this would fetch from Supabase
      await new Promise(resolve => setTimeout(resolve, 1000));
      setEarningsData(mockEarningsData);
      setCallData(mockCallData);
    } catch (error) {
      console.error('Error loading earnings data:', error);
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const requestPayout = async () => {
    try {
      // In real app, this would call a Stripe payout function
      toast.success('Payout request submitted successfully');
    } catch (error) {
      toast.error('Failed to request payout');
    }
  };

  const downloadReport = () => {
    // In real app, this would generate and download a CSV/PDF report
    toast.success('Report downloaded');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const growthRate = ((earningsData.thisMonth - earningsData.lastMonth) / earningsData.lastMonth * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Earnings Dashboard</h2>
          <p className="text-muted-foreground">Track your performance and earnings</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold">${earningsData.totalEarnings.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-600">+{growthRate}% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">${earningsData.thisMonth.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Badge variant="secondary" className="text-xs">
                {earningsData.totalCalls} calls completed
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Rating</p>
                <p className="text-2xl font-bold">{earningsData.avgRating}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Payout</p>
                <p className="text-2xl font-bold">${earningsData.pendingPayouts.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <Button size="sm" onClick={requestPayout} disabled={earningsData.pendingPayouts === 0}>
                Request Payout
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="earnings">
        <TabsList>
          <TabsTrigger value="earnings">Earnings Trend</TabsTrigger>
          <TabsTrigger value="calls">Call Activity</TabsTrigger>
          <TabsTrigger value="breakdown">Revenue Breakdown</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Daily Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={callData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="earnings" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Call Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={callData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="calls" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Revenue by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.map((category, index) => (
                    <div key={category.name} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${category.earnings.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{category.value}% of total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Key Performance Indicators
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span>Response Time</span>
                  <Badge variant="secondary">{earningsData.responseTime}</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span>Conversion Rate</span>
                  <Badge variant="secondary">{earningsData.conversionRate}%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span>Repeat Customers</span>
                  <Badge variant="secondary">42%</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span>Avg Call Duration</span>
                  <Badge variant="secondary">45 min</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Star className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium">Top Rated</p>
                    <p className="text-sm text-muted-foreground">Maintained 4.9+ rating</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Popular Creator</p>
                    <p className="text-sm text-muted-foreground">200+ calls completed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Quick Responder</p>
                    <p className="text-sm text-muted-foreground">Avg response &lt; 2min</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}