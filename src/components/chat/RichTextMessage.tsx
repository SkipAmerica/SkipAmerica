import React from 'react';

interface RichTextMessageProps {
  message: string;
  className?: string;
}

/**
 * Component to render rich text messages with formatting
 * Supports basic markdown-style formatting and custom tags
 */
export function RichTextMessage({ message, className = '' }: RichTextMessageProps) {
  
  const parseMessage = (text: string): JSX.Element => {
    let processedText = text;
    const elements: JSX.Element[] = [];
    let key = 0;
    
    // Handle bold text (**text**)
    processedText = processedText.replace(/\*\*(.*?)\*\*/g, (match, content) => {
      const id = `bold-${key++}`;
      elements.push(<strong key={id}>{content}</strong>);
      return `__ELEMENT_${id}__`;
    });
    
    // Handle italic text (*text*)
    processedText = processedText.replace(/\*(.*?)\*/g, (match, content) => {
      const id = `italic-${key++}`;
      elements.push(<em key={id}>{content}</em>);
      return `__ELEMENT_${id}__`;
    });
    
    // Handle font size tags [size:text-lg]text[/size]
    processedText = processedText.replace(/\[size:(.*?)\](.*?)\[\/size\]/g, (match, size, content) => {
      const id = `size-${key++}`;
      elements.push(<span key={id} className={size}>{content}</span>);
      return `__ELEMENT_${id}__`;
    });
    
    // Handle color tags [color:text-primary]text[/color]
    processedText = processedText.replace(/\[color:(.*?)\](.*?)\[\/color\]/g, (match, color, content) => {
      const id = `color-${key++}`;
      elements.push(<span key={id} className={color}>{content}</span>);
      return `__ELEMENT_${id}__`;
    });
    
    // Split by element placeholders and reconstruct
    const parts = processedText.split(/(__ELEMENT_.*?__)/);
    
    return (
      <span>
        {parts.map((part, index) => {
          if (part.startsWith('__ELEMENT_') && part.endsWith('__')) {
            const elementId = part.slice(10, -2); // Remove __ELEMENT_ and __
            const element = elements.find(el => el.key === elementId);
            return element || part;
          }
          return part;
        })}
      </span>
    );
  };

  // Check if message contains any formatting
  const hasFormatting = /\*\*.*?\*\*|\*.*?\*|\[size:.*?\].*?\[\/size\]|\[color:.*?\].*?\[\/color\]/.test(message);
  
  if (!hasFormatting) {
    // Plain text message
    return <span className={className}>{message}</span>;
  }
  
  // Rich text message
  return (
    <span className={className}>
      {parseMessage(message)}
    </span>
  );
}