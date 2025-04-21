/**
 * Enhanced Clinician Assistant Page
 * 
 * This page serves as the container for the enhanced assistant components
 * and provides the main entry point for users to access the enhanced
 * assistant functionality.
 */

import React from 'react';
import EnhancedAssistant from '@/components/enhanced-assistant/EnhancedAssistant';

const EnhancedClinicianAssistantPage: React.FC = () => {
  return (
    <div className="container mx-auto max-w-7xl">
      <div className="pb-4 mb-4 border-b">
        <h1 className="text-2xl font-bold mb-1">Enhanced Clinician Assistant</h1>
        <p className="text-muted-foreground">
          Get advanced insights about your practice data with our enhanced natural language assistant
        </p>
      </div>
      
      <EnhancedAssistant />
    </div>
  );
};

export default EnhancedClinicianAssistantPage;