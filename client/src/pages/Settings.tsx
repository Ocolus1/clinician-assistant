import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardDescription,
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Package, 
  Settings as SettingsIcon, 
  Users, 
  Shield, 
  Database, 
  Server, 
  LayoutGrid 
} from "lucide-react";
import { FullscreenProductConfig } from "../components/settings/FullscreenProductConfig";
import { Button } from "@/components/ui/button";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("clinical");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  
  // Function to handle tab change
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // Function to handle product card click
  const handleProductCardClick = () => {
    setProductDialogOpen(true);
  };
  
  return (
    <div className="container py-8">
      <div className="flex items-center mb-6">
        <SettingsIcon className="mr-2 h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>
      
      <Tabs 
        defaultValue="clinical" 
        value={activeTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="administration">Administration</TabsTrigger>
        </TabsList>
        
        {/* Clinical Settings Tab */}
        <TabsContent value="clinical" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Products Card */}
            <Card 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={handleProductCardClick}
            >
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <CardTitle>Products</CardTitle>
                    <CardDescription>Manage therapy products and resources</CardDescription>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Configure products, set pricing, and manage inventory for therapy sessions.
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="ghost" className="w-full justify-start text-primary">
                  Configure Products
                </Button>
              </CardFooter>
            </Card>
            
            {/* Placeholder for other clinical settings cards */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <CardTitle>Templates</CardTitle>
                    <CardDescription>Session and assessment templates</CardDescription>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-full">
                    <LayoutGrid className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Customize templates for session notes, assessments, and client reports.
                </p>
              </CardContent>
            </Card>
            
            {/* Placeholder for future clinical settings features */}
            <Card className="border-dashed hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-center opacity-50">
                  <div className="flex flex-col">
                    <CardTitle>Clinical Library</CardTitle>
                    <CardDescription>Therapeutic resources and activities</CardDescription>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 opacity-50">
                  Coming soon: Manage clinical resources, therapeutic activities, and evidence-based protocols.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Administration Settings Tab */}
        <TabsContent value="administration" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* User Management Card */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>User accounts and permissions</CardDescription>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Manage staff accounts, user roles, and access permissions.
                </p>
              </CardContent>
            </Card>
            
            {/* Security Settings Card */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Data protection and security settings</CardDescription>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Configure security policies, password requirements, and data access controls.
                </p>
              </CardContent>
            </Card>
            
            {/* System Configuration Card */}
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <CardTitle>System</CardTitle>
                    <CardDescription>General system configuration</CardDescription>
                  </div>
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Server className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  Configure system settings, backups, and general preferences.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Product Configuration Fullscreen */}
      <FullscreenProductConfig 
        open={productDialogOpen} 
        onOpenChange={setProductDialogOpen} 
      />
    </div>
  );
}