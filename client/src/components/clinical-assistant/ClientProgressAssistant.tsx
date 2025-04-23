import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ClientProgressAssistantProps {
  clientId?: number;
  clientName?: string;
}

interface ProgressQuestion {
  id: string;
  question: string;
  answer?: string;
  isLoading: boolean;
  error?: string;
  data?: any;
}

/**
 * Client Progress Assistant Component
 * 
 * This component provides a user interface for asking questions about client progress
 * and displaying the answers.
 */
export default function ClientProgressAssistant({ clientId, clientName }: ClientProgressAssistantProps) {
  const [questions, setQuestions] = useState<ProgressQuestion[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  
  // Example questions to help the user
  const exampleQuestions = [
    'What goals is the client currently working on?',
    'Has the client made progress on their communication goal?',
    'Which subgoals were scored in the last session?',
    'What milestone did the client work on most recently?',
    'What was the client\'s last milestone score?',
    'Which milestone is showing the most improvement?',
    'Has the client completed any subgoals yet?',
    'What is the client\'s average milestone score over time?',
    'Which goal is the client making the most progress on?',
    'Are there any goals that haven\'t been updated in over a month?'
  ];
  
  /**
   * Handle the submission of a question
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    // Replace placeholder with actual client name if provided
    const processedQuestion = clientName 
      ? inputValue.replace(/the client/gi, clientName)
      : inputValue;
    
    // Create a new question with a unique ID
    const questionId = Date.now().toString();
    const newQuestion: ProgressQuestion = {
      id: questionId,
      question: processedQuestion,
      isLoading: true
    };
    
    // Add the question to the list
    setQuestions(prev => [...prev, newQuestion]);
    setInputValue('');
    setIsProcessing(true);
    
    try {
      // Make the API call to process the question
      const response = await fetch('/api/client-progress/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ question: processedQuestion })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to process question');
      }
      
      // Update the question with the answer
      setQuestions(prev => 
        prev.map(q => 
          q.id === questionId 
            ? { 
                ...q, 
                answer: data.answer, 
                isLoading: false,
                data: data.data
              } 
            : q
        )
      );
    } catch (error: any) {
      console.error('Error processing question:', error);
      
      // Update the question with the error
      setQuestions(prev => 
        prev.map(q => 
          q.id === questionId 
            ? { 
                ...q, 
                isLoading: false, 
                error: error.message || 'An error occurred while processing your question.'
              } 
            : q
        )
      );
      
      // Show a toast with the error
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'An error occurred while processing your question.'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  /**
   * Handle clicking on an example question
   */
  const handleExampleClick = (question: string) => {
    setInputValue(question);
  };
  
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Client Progress Assistant
        </CardTitle>
        <CardDescription>
          Ask questions about client progress, goals, and milestones
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Questions and Answers */}
        {questions.length > 0 ? (
          <div className="space-y-4 mb-6">
            {questions.map((q) => (
              <div key={q.id} className="space-y-2">
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="font-medium">Q: {q.question}</p>
                </div>
                
                {q.isLoading ? (
                  <div className="p-3 flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing your question...
                  </div>
                ) : q.error ? (
                  <div className="bg-destructive/10 p-3 rounded-lg text-destructive">
                    <p>{q.error}</p>
                  </div>
                ) : (
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <p>{q.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p className="mb-4">Ask a question about client progress</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
              {exampleQuestions.slice(0, 6).map((q, i) => (
                <Button 
                  key={i} 
                  variant="outline" 
                  className="justify-start overflow-hidden text-ellipsis whitespace-nowrap"
                  onClick={() => handleExampleClick(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        {/* Question input */}
        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about client progress, goals, or milestones..."
            className="flex-1"
            disabled={isProcessing}
          />
          <Button type="submit" disabled={isProcessing || !inputValue.trim()}>
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Ask</span>
          </Button>
        </form>
      </CardContent>
      
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <p>Powered by OpenAI GPT-4o</p>
        <p>Uses real clinical data from the database</p>
      </CardFooter>
    </Card>
  );
}