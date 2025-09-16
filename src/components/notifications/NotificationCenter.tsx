import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  Bell, 
  MessageCircle, 
  Calendar, 
  Gift, 
  Star, 
  DollarSign,
  UserPlus,
  CheckCircle,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  type: 'message' | 'booking' | 'gift' | 'review' | 'payment' | 'follow' | 'system';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  actor?: {
    name: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
}

const notificationIcons = {
  message: MessageCircle,
  booking: Calendar,
  gift: Gift,
  review: Star,
  payment: DollarSign,
  follow: UserPlus,
  system: Bell
};

const notificationColors = {
  message: 'text-blue-600',
  booking: 'text-green-600',
  gift: 'text-purple-600',
  review: 'text-yellow-600',
  payment: 'text-emerald-600',
  follow: 'text-indigo-600',
  system: 'text-gray-600'
};

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Mock notifications for demo
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'booking',
      title: 'New booking confirmed',
      message: 'Your session with Sarah Johnson is confirmed for tomorrow at 2:00 PM',
      read: false,
      created_at: new Date(Date.now() - 300000).toISOString(),
      actor: {
        name: 'Sarah Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b9e36b13?w=150'
      }
    },
    {
      id: '2',
      type: 'gift',
      title: 'Gift received!',
      message: 'Alex sent you a Coffee gift with a sweet message',
      read: false,
      created_at: new Date(Date.now() - 1800000).toISOString(),
      actor: {
        name: 'Alex Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
      }
    },
    {
      id: '3',
      type: 'review',
      title: 'New 5-star review',
      message: 'Emma left you an amazing review: "Incredibly helpful and knowledgeable!"',
      read: true,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      actor: {
        name: 'Emma Rodriguez',
        avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150'
      }
    },
    {
      id: '4',
      type: 'payment',
      title: 'Payment received',
      message: 'You earned $85.00 from your session with Maya',
      read: true,
      created_at: new Date(Date.now() - 7200000).toISOString()
    },
    {
      id: '5',
      type: 'follow',
      title: 'New follower',
      message: 'Jessica started following you',
      read: true,
      created_at: new Date(Date.now() - 10800000).toISOString(),
      actor: {
        name: 'Jessica Park',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150'
      }
    }
  ];

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);
  }, [notifications]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      // In real app, this would fetch from Supabase
      await new Promise(resolve => setTimeout(resolve, 500));
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // In real app, this would update the notification in Supabase
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // In real app, this would update all notifications in Supabase
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      // In real app, this would delete from Supabase
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const renderNotification = (notification: Notification) => {
    const Icon = notificationIcons[notification.type];
    const iconColor = notificationColors[notification.type];

    return (
      <div
        key={notification.id}
        className={`flex gap-3 p-3 rounded-lg border transition-all hover:bg-muted/50 ${
          !notification.read ? 'bg-blue-50 border-blue-200' : 'border-border'
        }`}
        onClick={() => !notification.read && markAsRead(notification.id)}
      >
        <div className="flex-shrink-0">
          {notification.actor?.avatar ? (
            <Avatar className="w-8 h-8">
              <AvatarImage src={notification.actor.avatar} />
              <AvatarFallback>{notification.actor.name[0]}</AvatarFallback>
            </Avatar>
          ) : (
            <div className={`w-8 h-8 rounded-full bg-muted flex items-center justify-center`}>
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-medium text-sm">{notification.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-7"
                >
                  Mark all read
                </Button>
              )}
            </div>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="w-fit">
                {unreadCount} unread
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-80">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-4 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {notifications.map(renderNotification)}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}