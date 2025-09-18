import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const categories = [
  "technology", "business", "entertainment", "sports", "science", "health",
  "finance", "education", "art", "politics", "social media", "beauty"
];

const sortOptions = [
  { value: "rating", label: "Highest Rated" },
  { value: "price-low", label: "Lowest Price" },
  { value: "price-high", label: "Highest Price" },
  { value: "popularity", label: "Most Popular" },
  { value: "recent", label: "Recently Active" }
];

interface CreatorSearchHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  priceRange: number[];
  onPriceRangeChange: (range: number[]) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export const CreatorSearchHeader = ({ 
  searchTerm, 
  onSearchChange, 
  showFilters, 
  onToggleFilters, 
  selectedCategory, 
  onCategoryChange, 
  priceRange, 
  onPriceRangeChange, 
  sortBy, 
  onSortChange 
}: CreatorSearchHeaderProps) => {
  return (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 pb-4 space-y-4">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search influential people by name, expertise, or specialty..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button 
          variant="outline" 
          size="icon"
          onClick={onToggleFilters}
          className={cn("shrink-0", showFilters && "bg-accent")}
        >
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Collapsible Filters */}
      {showFilters && (
        <div className="space-y-4 pt-2">
          <div className="flex gap-3 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange("all")}
              className="whitespace-nowrap"
            >
              All Categories
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => onCategoryChange(category)}
                className="whitespace-nowrap capitalize"
              >
                {category}
              </Button>
            ))}
          </div>
          
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">Price Range: ${priceRange[0]} - ${priceRange[1]}/min</Label>
              <Slider
                value={priceRange}
                onValueChange={onPriceRangeChange}
                max={1000}
                min={50}
                step={25}
                className="w-full"
              />
            </div>
            <div className="min-w-[120px]">
              <Label className="text-sm font-medium mb-2 block">Sort By</Label>
              <Select value={sortBy} onValueChange={onSortChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};