import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { Bold, Italic, Palette, Type, Send } from 'lucide-react';
import type { ChatRichText } from '@/shared/types/chat';

interface RichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  richText?: ChatRichText;
  showSendButton?: boolean;
  leftButton?: React.ReactNode;
}

export function RichTextInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type a message...',
  disabled = false,
  richText,
  showSendButton = true,
  leftButton
}: RichTextInputProps) {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [selectedFontSize, setSelectedFontSize] = useState('text-sm');
  const [selectedColor, setSelectedColor] = useState('text-foreground');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [value]);

  const isRichTextEnabled = richText?.enabled ?? false;
  const allowBold = richText?.allowBold ?? true;
  const allowItalic = richText?.allowItalic ?? true;
  const allowFontSize = richText?.allowFontSize ?? false;
  const allowFontColor = richText?.allowFontColor ?? false;
  const toolbar = richText?.toolbar ?? 'compact';
  
  const fontSizes = richText?.fontSizes ?? ['text-xs', 'text-sm', 'text-base', 'text-lg'];
  const fontColors = richText?.fontColors ?? [
    'text-foreground',
    'text-primary',
    'text-secondary',
    'text-accent',
    'text-muted-foreground'
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
    
    // Keyboard shortcuts for rich text
    if (isRichTextEnabled) {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'b' && allowBold) {
          e.preventDefault();
          setIsBold(!isBold);
        }
        if (e.key === 'i' && allowItalic) {
          e.preventDefault();
          setIsItalic(!isItalic);
        }
      }
    }
  };

  const formatMessage = (text: string): string => {
    if (!isRichTextEnabled) return text;
    
    let formattedText = text;
    
    // Add formatting markers that can be parsed later
    if (isBold && allowBold) {
      formattedText = `**${formattedText}**`;
    }
    if (isItalic && allowItalic) {
      formattedText = `*${formattedText}*`;
    }
    if (selectedFontSize !== 'text-sm' && allowFontSize) {
      formattedText = `[size:${selectedFontSize}]${formattedText}[/size]`;
    }
    if (selectedColor !== 'text-foreground' && allowFontColor) {
      formattedText = `[color:${selectedColor}]${formattedText}[/color]`;
    }
    
    return formattedText;
  };

  const handleSubmit = () => {
    if (!value.trim()) return;
    const formattedMessage = formatMessage(value);
    onChange(formattedMessage);
    onSubmit();
    // Reset formatting after sending
    setIsBold(false);
    setIsItalic(false);
    setSelectedFontSize('text-sm');
    setSelectedColor('text-foreground');
  };

  const getInputClasses = () => {
    let classes = 'flex-1';
    
    if (isRichTextEnabled) {
      if (isBold && allowBold) classes += ' font-bold';
      if (isItalic && allowItalic) classes += ' italic';
      if (allowFontSize) classes += ` ${selectedFontSize}`;
      if (allowFontColor) classes += ` ${selectedColor}`;
    }
    
    return classes;
  };

  if (!isRichTextEnabled) {
    // Simple input without rich text features
    return (
      <div className="flex gap-2 items-end">
        {leftButton}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none min-h-[40px] max-h-40"
        />
        {showSendButton && (
          <Button 
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Rich Text Toolbar */}
      {toolbar !== 'minimal' && (
        <div className="flex items-center gap-1 p-2 border rounded-md bg-muted/50">
          {allowBold && (
            <Toggle
              pressed={isBold}
              onPressedChange={setIsBold}
              size="sm"
              variant="outline"
            >
              <Bold className="h-3 w-3" />
            </Toggle>
          )}
          
          {allowItalic && (
            <Toggle
              pressed={isItalic}
              onPressedChange={setIsItalic}
              size="sm"
              variant="outline"
            >
              <Italic className="h-3 w-3" />
            </Toggle>
          )}
          
          {allowFontSize && toolbar === 'full' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Type className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40">
                <Select value={selectedFontSize} onValueChange={setSelectedFontSize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontSizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        <span className={size}>
                          {size.replace('text-', '').toUpperCase()}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PopoverContent>
            </Popover>
          )}
          
          {allowFontColor && toolbar === 'full' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Palette className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40">
                <Select value={selectedColor} onValueChange={setSelectedColor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontColors.map((color) => (
                      <SelectItem key={color} value={color}>
                        <span className={color}>
                          {color.replace('text-', '').replace('-', ' ')}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </PopoverContent>
            </Popover>
          )}
          
          <div className="text-xs text-muted-foreground ml-auto">
            Ctrl+B Bold, Ctrl+I Italic
          </div>
        </div>
      )}
      
      {/* Input Field */}
      <div className="flex gap-2 items-end">
        {leftButton}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={`${getInputClasses()} resize-none min-h-[40px] max-h-40`}
        />
        {showSendButton && (
          <Button 
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}