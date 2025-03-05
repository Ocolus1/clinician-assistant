import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Session, SessionNote } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SessionNoteViewProps {
  session: Session & { clientName: string };
  onEdit: () => void;
  initialTabValue?: string;
}

interface RatingDisplayProps {
  label: string;
  value: number;
}

const RatingDisplay = ({ label, value }: RatingDisplayProps) => {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}/10</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full" 
          style={{ width: `${value * 10}%` }}
        ></div>
      </div>
    </div>
  );
};

export function SessionNoteView({ session, onEdit, initialTabValue = "general" }: SessionNoteViewProps) {
  const [activeTab, setActiveTab] = useState(initialTabValue);
  
  const { data: sessionNote, isLoading: noteLoading } = useQuery<SessionNote>({
    queryKey: ["/api/sessions", session.id, "notes"],
    queryFn: async () => {
      const response = await fetch(`/api/sessions/${session.id}/notes`);
      if (!response.ok) {
        throw new Error("Failed to fetch session note");
      }
      return response.json();
    }
  });
  
  const { data: completeNote, isLoading: completeNoteLoading } = useQuery({
    queryKey: ["/api/sessions", session.id, "notes", "complete"],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/sessions/${session.id}/notes/complete`);
        if (!response.ok) {
          throw new Error("Failed to fetch complete note");
        }
        return response.json();
      } catch (error) {
        console.error("Error fetching complete note:", error);
        return null;
      }
    },
    enabled: !!sessionNote
  });
  
  if (noteLoading || completeNoteLoading) {
    return <div>Loading session notes...</div>;
  }
  
  if (!sessionNote) {
    return <div>No session notes found.</div>;
  }
  
  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Session Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium mb-2">Present</h3>
                  <p>{sessionNote.presentAllies?.join(", ") || "No one listed as present"}</p>
                </div>
                
                <div>
                  <h3 className="text-base font-medium mb-2">Notes</h3>
                  <div className="border rounded-md p-4 min-h-[100px]">
                    {sessionNote.notes ? (
                      <div dangerouslySetInnerHTML={{ __html: sessionNote.notes }} />
                    ) : (
                      <p className="text-muted-foreground">No detailed notes provided</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-base font-medium mb-2">Ratings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RatingDisplay label="Mood" value={sessionNote.moodRating || 0} />
                    <RatingDisplay label="Focus" value={sessionNote.focusRating || 0} />
                    <RatingDisplay label="Cooperation" value={sessionNote.cooperationRating || 0} />
                    <RatingDisplay label="Physical Activity" value={sessionNote.physicalActivityRating || 0} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle>Performance Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              {completeNote && completeNote.performanceAssessments && 
               completeNote.performanceAssessments.length > 0 ? (
                <div className="space-y-4">
                  {completeNote.performanceAssessments.map((assessment: any) => (
                    <div key={assessment.id || assessment.goalId} className="border-b pb-4 mb-4 last:border-0">
                      <h3 className="font-medium text-lg">{assessment.goalTitle}</h3>
                      {assessment.notes && <p className="text-sm mb-2">{assessment.notes}</p>}
                      
                      <div className="space-y-3 mt-3">
                        <h4 className="font-medium text-sm">Milestones</h4>
                        
                        {assessment.milestones.map((milestone: any) => (
                          <div key={milestone.id || milestone.milestoneId} className="border rounded-md p-3">
                            <div className="flex justify-between">
                              <h5 className="font-medium">{milestone.milestoneTitle}</h5>
                              <span className="text-sm bg-primary/10 px-2 py-0.5 rounded-full">
                                {milestone.rating}/10
                              </span>
                            </div>
                            
                            {milestone.strategies && milestone.strategies.length > 0 && (
                              <div className="mt-2">
                                <h6 className="text-xs font-medium mb-1">Strategies:</h6>
                                <div className="flex flex-wrap gap-1">
                                  {Array.isArray(milestone.strategies) ? (
                                    milestone.strategies.map((strategy: string, idx: number) => (
                                      <span 
                                        key={idx}
                                        className="text-xs bg-secondary px-2 py-0.5 rounded-full"
                                      >
                                        {strategy}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                                      {milestone.strategies}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {milestone.notes && (
                              <div className="mt-2 text-sm">
                                <h6 className="text-xs font-medium mb-1">Notes:</h6>
                                <p className="text-muted-foreground">{milestone.notes}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No performance assessments recorded for this session.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Products Used</CardTitle>
            </CardHeader>
            <CardContent>
              {sessionNote && sessionNote.products && Array.isArray(sessionNote.products) && sessionNote.products.length > 0 ? (
                <div>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Product</th>
                        <th className="text-center p-2">Quantity</th>
                        <th className="text-right p-2">Unit Price</th>
                        <th className="text-right p-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionNote.products.map((product: any, index: number) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">
                            <div className="font-medium">{product.productDescription}</div>
                            <div className="text-xs text-muted-foreground">{product.productCode}</div>
                          </td>
                          <td className="text-center p-2">{product.quantity}</td>
                          <td className="text-right p-2">${product.unitPrice?.toFixed(2)}</td>
                          <td className="text-right p-2 font-medium">
                            ${(product.quantity * product.unitPrice).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      
                      <tr className="bg-muted/20">
                        <td colSpan={3} className="text-right p-2 font-medium">Total:</td>
                        <td className="text-right p-2 font-bold">
                          ${Array.isArray(sessionNote.products) ? 
                            sessionNote.products.reduce((total: number, product: any) => (
                              total + (product.quantity * product.unitPrice)
                            ), 0).toFixed(2) : "0.00"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No products used in this session.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}