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
import { useState } from "react";

type Language = "english" | "french" | "spanish" | "other";

interface LanguageSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectLanguage: (language: Language) => void;
}

export function LanguageSelector({ open, onOpenChange, onSelectLanguage }: LanguageSelectorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("english");

  const handleSubmit = () => {
    onSelectLanguage(selectedLanguage);
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
        <div className="py-4">
          <RadioGroup value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value as Language)}>
            <div className="flex items-center space-x-2 mb-3">
              <RadioGroupItem value="english" id="english" />
              <Label htmlFor="english">English Only</Label>
            </div>
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