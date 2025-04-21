/**
 * Template Selector Component
 * 
 * This component displays available query templates and allows users to select one.
 */

import React, { useState } from 'react';
import { QueryTemplate } from '@shared/enhancedAssistantTypes';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, FileText } from 'lucide-react';

interface TemplateSelectorProps {
  templates: QueryTemplate[];
  isLoading: boolean;
  error?: string;
  onSelect: (templateId: string | null) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  isLoading,
  error,
  onSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter templates based on search query
  const filteredTemplates = templates.filter(template => {
    const search = searchQuery.toLowerCase();
    return (
      template.name.toLowerCase().includes(search) ||
      template.description.toLowerCase().includes(search) ||
      template.patterns.some((pattern: string) => pattern.toLowerCase().includes(search))
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading templates...</span>
        </div>
      ) : error ? (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">Failed to load templates: {error}</p>
          </CardContent>
        </Card>
      ) : filteredTemplates.length === 0 ? (
        <Card className="bg-muted">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No templates match your search</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  {template.name}
                </CardTitle>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Example Patterns:</h4>
                  <div className="flex flex-wrap gap-2">
                    {template.patterns.slice(0, 3).map((pattern: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {pattern}
                      </Badge>
                    ))}
                    {template.patterns.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.patterns.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
                
                {template.parameters.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium">Parameters:</h4>
                    <ul className="text-xs text-muted-foreground ml-4 list-disc">
                      {template.parameters.map((param: any, index: number) => (
                        <li key={index}>
                          {param.name}
                          {param.required && <span className="text-destructive">*</span>}
                          {param.description && `: ${param.description}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => onSelect(template.id)} 
                  variant="default" 
                  className="w-full"
                >
                  Use Template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TemplateSelector;