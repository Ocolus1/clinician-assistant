import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Define all supported languages in Australia - can be expanded as needed
const AUSTRALIAN_LANGUAGES = [
  { value: "english", label: "English", description: "Official & most widely spoken" },
  { value: "mandarin", label: "Mandarin", description: "Most spoken non-English language" },
  { value: "arabic", label: "Arabic", description: "Widely spoken in Lebanese, Syrian communities" },
  { value: "punjabi", label: "Punjabi", description: "Fast-growing language from India/Pakistan" },
  { value: "cantonese", label: "Cantonese", description: "Common in Chinese-Australian communities" },
  { value: "vietnamese", label: "Vietnamese", description: "Significant in Melbourne and Sydney" },
  { value: "italian", label: "Italian", description: "Common among older immigrant generations" },
  { value: "greek", label: "Greek", description: "Strong presence in Melbourne" },
  { value: "hindi", label: "Hindi", description: "Growing with Indian-Australian population" },
  { value: "spanish", label: "Spanish", description: "From Latin American and Spanish communities" },
  { value: "tagalog", label: "Tagalog/Filipino", description: "Common in Filipino communities" },
  { value: "urdu", label: "Urdu", description: "Spoken by Pakistani and Indian communities" },
  { value: "french", label: "French", description: "International language with growing presence" },
  { value: "other", label: "Other", description: "Other languages not listed" }
];

export type Language = typeof AUSTRALIAN_LANGUAGES[number]['value'];

interface LanguageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLanguage: (language: Language) => void;
  allies?: { name: string; preferredLanguage: string }[];
}

export function LanguageSelector({ open, onOpenChange, onSelectLanguage, allies = [] }: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("english");
  const [suggestionLanguages, setSuggestionLanguages] = useState<string[]>([]);
  const [enableBilingual, setEnableBilingual] = useState<boolean>(false);

  // Extract unique languages from allies
  useEffect(() => {
    if (allies && allies.length > 0) {
      const languages = allies
        .map(ally => ally.preferredLanguage?.toLowerCase())
        .filter(lang => lang && lang !== "english" && lang !== "")
        .filter((lang, index, self) => self.indexOf(lang) === index); // Unique values
      
      setSuggestionLanguages(languages);
    }
  }, [allies]);

  const handleSubmit = () => {
    if (enableBilingual) {
      onSelectLanguage(selectedLanguage);
    } else {
      onSelectLanguage("english");
    }
  };

  // Map ally language to our supported languages
  const mapToSupportedLanguage = (language: string): Language => {
    const lowercased = language.toLowerCase();
    
    // Find the closest matching language from our list
    const foundLanguage = AUSTRALIAN_LANGUAGES.find(
      lang => lowercased.includes(lang.value) || 
              lowercased.includes(lang.label.toLowerCase())
    );
    
    if (foundLanguage) return foundLanguage.value;
    
    // Legacy mappings for backward compatibility
    if (lowercased.includes("french") || lowercased.includes("français")) return "french";
    if (lowercased.includes("spanish") || lowercased.includes("español")) return "spanish";
    if (lowercased === "english") return "english";
    
    return "other";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Print Language</DialogTitle>
          <DialogDescription>
            Choose an additional language for printing. The report will be printed in both English and the selected language.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2">
          <div className="flex items-start space-x-2 pb-4">
            <Checkbox
              id="enable-bilingual"
              checked={enableBilingual}
              onCheckedChange={(checked) => setEnableBilingual(checked as boolean)}
            />
            <div className="grid gap-1.5 leading-none">
              <Label htmlFor="enable-bilingual" className="text-sm font-medium">
                Enable bilingual printing
              </Label>
              <p className="text-sm text-muted-foreground">
                The summary will be printed in English and the selected language
              </p>
            </div>
          </div>
          
          {enableBilingual && (
            <>
              {suggestionLanguages.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm mb-2">
                    <span className="font-medium">Suggested languages</span> based on allies' preferences:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestionLanguages.map((lang) => (
                      <Button
                        key={lang}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setSelectedLanguage(mapToSupportedLanguage(lang))}
                      >
                        {lang}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col space-y-4">
                <label className="text-sm font-medium">Select Language</label>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                    >
                      {selectedLanguage
                        ? AUSTRALIAN_LANGUAGES.find(
                            (language) => language.value === selectedLanguage
                          )?.label
                        : "Select language..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Search language..." />
                      <CommandEmpty>No language found.</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-auto">
                        {AUSTRALIAN_LANGUAGES.filter(lang => lang.value !== "english").map((language) => (
                          <CommandItem
                            key={language.value}
                            value={language.value}
                            onSelect={(value) => {
                              setSelectedLanguage(value as Language);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedLanguage === language.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{language.label}</span>
                              <span className="text-xs text-muted-foreground">{language.description}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Print</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}