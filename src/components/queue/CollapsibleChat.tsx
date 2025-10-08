import React, { useState } from "react";
import { Plus, Minus } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
};

export function CollapsibleChat({ children, className }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("sticky top-0 z-20", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full bg-muted/80 backdrop-blur-sm hover:bg-muted transition-colors px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium">
            Chat {isOpen ? "-" : "+"}
          </span>
          {isOpen ? (
            <Minus className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Plus className="h-4 w-4 text-muted-foreground" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
          <div className="h-[224px]">
            {children}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
