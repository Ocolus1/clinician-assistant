import React, { useEffect, useState, useRef } from 'react';
import { RichTextEditor } from './rich-text-editor';
import { useFormContext } from 'react-hook-form';

interface FormRichTextEditorProps {
  name: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

/**
 * A wrapper component for RichTextEditor that works with react-hook-form
 * This component isolates the rich text editor's state from form validation
 * to prevent infinite update cycles and validation conflicts
 */
export function FormRichTextEditor({
  name,
  value,
  onChange,
  placeholder,
  className,
  minHeight,
}: FormRichTextEditorProps) {
  // Get form context to access setValue method
  const form = useFormContext();
  
  // Local state to track content to prevent unnecessary re-renders
  const [localContent, setLocalContent] = useState(value || '');
  
  // Use a ref to track whether we're in an update cycle
  const isUpdatingRef = useRef(false);
  
  // Counter to track how many updates have happened
  const updateCountRef = useRef(0);
  
  // Update local content when value prop changes, but only if it's not from our own update
  useEffect(() => {
    // If the value changed externally, update our local state
    if (value !== undefined && value !== localContent && !isUpdatingRef.current) {
      console.log("FormRichTextEditor: Externally changed value detected, updating local content", {
        prev: localContent,
        next: value
      });
      setLocalContent(value);
    }
  }, [value, localContent]);
  
  // Handler for editor changes
  const handleEditorChange = (newContent: string) => {
    // Set the flag to prevent update loops
    isUpdatingRef.current = true;
    updateCountRef.current += 1;
    
    // Safety check to prevent infinite loops
    if (updateCountRef.current > 100) {
      console.error("FormRichTextEditor: Too many updates, breaking potential infinite loop");
      isUpdatingRef.current = false;
      updateCountRef.current = 0;
      return;
    }
    
    // Only update if content actually changed to prevent unnecessary renders
    if (newContent !== localContent) {
      // Update local state
      setLocalContent(newContent);
      
      // Update form value without triggering validation
      if (form) {
        console.log(`FormRichTextEditor: Setting form value for "${name}" without triggering validation`);
        form.setValue(name, newContent, { 
          shouldValidate: false, // Prevent validation on every keystroke
          shouldDirty: true 
        });
      }
      
      // Call external onChange if provided
      if (onChange) {
        onChange(newContent);
      }
    }
    
    // Reset the flag after a short delay to handle batched updates
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 0);
  };
  
  return (
    <RichTextEditor
      value={localContent}
      onChange={handleEditorChange}
      placeholder={placeholder}
      className={className}
      minHeight={minHeight}
    />
  );
}