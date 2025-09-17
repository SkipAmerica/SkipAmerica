import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, Calendar, Megaphone, TrendingUp, Clock } from "lucide-react";

export function FeatureDemo() {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold mb-4">🚀 New Skip Features Live!</h2>
        <p className="text-muted-foreground">
          Creator economy platform with sponsor revenue & collaborative events
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Ad Revenue Model */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Sponsor Revenue Model
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-primary/5 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Ad Impressions</span>
                <Badge>12.5K</Badge>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Click Rate</span>
                <Badge variant="secondary">2.3%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Revenue</span>
                <Badge variant="outline" className="text-primary">$847</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              • Targeted sponsor placements<br/>
              • Revenue sharing with creators<br/>
              • Performance analytics<br/>
              • Campaign management
            </p>
          </CardContent>
        </Card>

        {/* Collaborative Events */}
        <Card className="border-secondary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              Collaborative Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-secondary/5 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Live Together</span>
                <Badge>✨ New</Badge>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Profit Sharing</span>
                <Badge variant="secondary">Auto</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Event Countdown</span>
                <Badge variant="outline" className="text-secondary">Live</Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              • Multi-creator events<br/>
              • Customizable profit splits<br/>
              • Event countdowns & promotion<br/>
              • Follower timeline integration
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <DollarSign className="w-6 h-6 text-primary mx-auto mb-2" />
            <div className="text-xl font-bold">$2.1K</div>
            <p className="text-xs text-muted-foreground">Ad Revenue</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-6 h-6 text-secondary mx-auto mb-2" />
            <div className="text-xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">Collab Events</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 text-accent mx-auto mb-2" />
            <div className="text-xl font-bold">89%</div>
            <p className="text-xs text-muted-foreground">Engagement</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <div className="text-xl font-bold">24/7</div>
            <p className="text-xs text-muted-foreground">Live System</p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          New features are live and integrated into Skip's creator economy platform
        </p>
        <div className="flex justify-center gap-2">
          <Badge variant="outline">Sponsors Active</Badge>
          <Badge variant="outline">Events Live</Badge>
          <Badge variant="outline">Revenue Tracking</Badge>
          <Badge variant="outline">Profit Sharing</Badge>
        </div>
      </div>
    </div>
  );
}