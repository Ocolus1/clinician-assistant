import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";

export type Language = "english" | "french" | "spanish" | "other";

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

              <RadioGroup 
                value={selectedLanguage} 
                onValueChange={(value) => setSelectedLanguage(value as Language)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="french" id="french" />
                  <Label htmlFor="french">French</Label>
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <RadioGroupItem value="spanish" id="spanish" />
                  <Label htmlFor="spanish">Spanish</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other</Label>
                </div>
              </RadioGroup>
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