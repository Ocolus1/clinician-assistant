import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  Plus, 
  ChevronRight, 
  Calendar, 
  BarChart, 
  Share2 
} from "lucide-react";

// This is a placeholder component - would need proper types and functionality
export default function ClientReports() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Available Reports</h4>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          Generate New Report
        </Button>
      </div>
      
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h4 className="text-lg font-medium text-gray-500 mb-2">No reports generated</h4>
        <p className="text-gray-500 mb-4">Generate progress reports to track and share therapeutic progress.</p>
        <Button>Create First Report</Button>
      </div>
      
      <div className="mt-8">
        <h4 className="font-medium mb-4">Report Templates</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="p-4 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <h5 className="font-medium mb-1">Monthly Progress</h5>
              <p className="text-xs text-gray-500">Comprehensive monthly progress summary</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="p-4 text-center">
              <BarChart className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <h5 className="font-medium mb-1">Goal Achievement</h5>
              <p className="text-xs text-gray-500">Detailed goal-specific progress report</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary transition-colors">
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <h5 className="font-medium mb-1">Treatment Summary</h5>
              <p className="text-xs text-gray-500">Overview of treatment plan and outcomes</p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* This example UI could be replaced with actual report data once available */}
      <div className="border rounded-md p-4 bg-gray-50 mt-6">
        <div className="text-sm text-gray-500 mb-2">Example Report (Placeholder)</div>
        <Card className="mb-3">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h5 className="font-medium">Q1 Progress Report</h5>
                  <div className="text-sm text-gray-500">Generated Jan 15, 2025</div>
                </div>
              </div>
              <Badge className="bg-blue-100 text-blue-700 border-blue-200">PDF</Badge>
            </div>
            <div className="mt-3">
              <p className="text-sm text-gray-600">
                Comprehensive summary of speech therapy progress over the last quarter, 
                including articulation improvements, language development milestones, and 
                recommendations for continued practice.
              </p>
            </div>
            <div className="flex justify-end mt-3 gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="text-center">
          <Button variant="outline" size="sm" className="mt-2">
            View More Examples
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}