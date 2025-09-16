import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Heart, Gift, Star, Coffee, Sparkles, Crown, Zap, MessageCircle } from 'lucide-react';

interface VirtualGift {
  id: string;
  name: string;
  icon: React.ReactNode;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  animation?: string;
}

interface VirtualGiftsProps {
  recipientId: string;
  recipientName: string;
  onGiftSent?: (gift: VirtualGift, message?: string) => void;
}

const gifts: VirtualGift[] = [
  {
    id: '1',
    name: 'Heart',
    icon: <Heart className="h-6 w-6" />,
    price: 1,
    rarity: 'common',
    description: 'Show some love'
  },
  {
    id: '2',
    name: 'Star',
    icon: <Star className="h-6 w-6" />,
    price: 2,
    rarity: 'common',
    description: 'You\'re a star!'
  },
  {
    id: '3',
    name: 'Coffee',
    icon: <Coffee className="h-6 w-6" />,
    price: 5,
    rarity: 'common',
    description: 'Buy them a coffee'
  },
  {
    id: '4',
    name: 'Sparkles',
    icon: <Sparkles className="h-6 w-6" />,
    price: 10,
    rarity: 'rare',
    description: 'Add some sparkle'
  },
  {
    id: '5',
    name: 'Lightning Bolt',
    icon: <Zap className="h-6 w-6" />,
    price: 15,
    rarity: 'rare',
    description: 'Electrifying performance!'
  },
  {
    id: '6',
    name: 'Crown',
    icon: <Crown className="h-6 w-6" />,
    price: 25,
    rarity: 'epic',
    description: 'Royal treatment'
  },
  {
    id: '7',
    name: 'Diamond',
    icon: <Sparkles className="h-6 w-6" />,
    price: 50,
    rarity: 'legendary',
    description: 'The ultimate gift'
  }
];

const rarityColors = {
  common: 'border-gray-200 bg-gray-50',
  rare: 'border-blue-200 bg-blue-50',
  epic: 'border-purple-200 bg-purple-50',
  legendary: 'border-yellow-200 bg-yellow-50'
};

const rarityBadgeColors = {
  common: 'bg-gray-100 text-gray-800',
  rare: 'bg-blue-100 text-blue-800',
  epic: 'bg-purple-100 text-purple-800',
  legendary: 'bg-yellow-100 text-yellow-800'
};

export function VirtualGifts({ recipientId, recipientName, onGiftSent }: VirtualGiftsProps) {
  const { user } = useAuth();
  const [selectedGift, setSelectedGift] = useState<VirtualGift | null>(null);
  const [giftMessage, setGiftMessage] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

  const sendGift = async (gift: VirtualGift, amount?: number) => {
    if (!user) {
      toast.error('Please log in to send gifts');
      return;
    }

    try {
      setSending(true);
      
      const finalAmount = amount || gift.price;
      
      // In real app, this would process payment and record the gift
      const { error } = await supabase
        .from('virtual_gifts')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          gift_type: gift.id,
          amount: finalAmount,
          message: giftMessage || null
        });

      if (error) throw error;

      toast.success(`${gift.name} sent to ${recipientName}!`);
      onGiftSent?.(gift, giftMessage);
      setGiftMessage('');
      setCustomAmount('');
      setOpen(false);
    } catch (error) {
      console.error('Error sending gift:', error);
      toast.error('Failed to send gift');
    } finally {
      setSending(false);
    }
  };

  const sendCustomTip = async () => {
    const amount = parseFloat(customAmount);
    if (!amount || amount < 1) {
      toast.error('Please enter a valid amount');
      return;
    }

    const customGift: VirtualGift = {
      id: 'custom',
      name: 'Custom Tip',
      icon: <Gift className="h-6 w-6" />,
      price: amount,
      rarity: 'common',
      description: `$${amount} tip`
    };

    await sendGift(customGift, amount);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Gift className="h-4 w-4" />
          Send Gift
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Send a Gift to {recipientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Virtual Gifts Grid */}
          <div>
            <h3 className="font-semibold mb-3">Virtual Gifts</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {gifts.map((gift) => (
                <Card 
                  key={gift.id} 
                  className={`cursor-pointer hover:shadow-md transition-all ${rarityColors[gift.rarity]} ${
                    selectedGift?.id === gift.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedGift(gift)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="flex justify-center mb-2 text-2xl">
                      {gift.icon}
                    </div>
                    <p className="text-sm font-medium">{gift.name}</p>
                    <p className="text-xs text-muted-foreground">${gift.price}</p>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs mt-1 ${rarityBadgeColors[gift.rarity]}`}
                    >
                      {gift.rarity}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Custom Tip */}
          <div>
            <h3 className="font-semibold mb-3">Custom Tip</h3>
            <div className="flex gap-3">
              <Input
                type="number"
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min="1"
                className="flex-1"
              />
              <Button 
                variant="outline"
                onClick={sendCustomTip}
                disabled={sending || !customAmount}
              >
                Send ${customAmount || '0'}
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="font-semibold mb-3">Quick Actions</h3>
            <div className="flex gap-2 flex-wrap">
              {[5, 10, 20, 50].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => sendGift({
                    id: 'tip',
                    name: 'Tip',
                    icon: <Gift className="h-6 w-6" />,
                    price: amount,
                    rarity: 'common',
                    description: `$${amount} tip`
                  }, amount)}
                  disabled={sending}
                >
                  Tip ${amount}
                </Button>
              ))}
            </div>
          </div>

          {/* Gift Message */}
          <div>
            <h3 className="font-semibold mb-3">Add a message (optional)</h3>
            <Textarea
              placeholder="Write a nice message..."
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Selected Gift Preview */}
          {selectedGift && (
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{selectedGift.icon}</div>
                  <div className="flex-1">
                    <p className="font-semibold">{selectedGift.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedGift.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${selectedGift.price}</p>
                    <Badge className={rarityBadgeColors[selectedGift.rarity]}>
                      {selectedGift.rarity}
                    </Badge>
                  </div>
                </div>
                <Button 
                  className="w-full mt-3"
                  onClick={() => sendGift(selectedGift)}
                  disabled={sending}
                >
                  {sending ? 'Sending...' : `Send ${selectedGift.name} - $${selectedGift.price}`}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Recent Gifts Display */}
          <div className="text-center text-sm text-muted-foreground">
            <p>💝 Gifts help support creators and show appreciation for their content</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}