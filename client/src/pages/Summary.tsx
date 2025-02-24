import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, Printer } from "lucide-react";

export default function Summary() {
  const { clientId } = useParams();
  const [, setLocation] = useLocation();

  const { data: client } = useQuery({
    queryKey: ["/api/clients", parseInt(clientId)],
  });

  const { data: allies = [] } = useQuery({
    queryKey: ["/api/clients", parseInt(clientId), "allies"],
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["/api/clients", parseInt(clientId), "goals"],
  });

  const { data: budgetItems = [] } = useQuery({
    queryKey: ["/api/clients", parseInt(clientId), "budget-items"],
  });

  const totalBudget = budgetItems.reduce((acc: number, item: any) => {
    return acc + (item.unitPrice * item.quantity);
  }, 0);

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Client not found</h1>
          <Button onClick={() => setLocation("/")}>Return Home</Button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Client Summary</h1>
          <div className="flex gap-4">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button onClick={() => setLocation("/")}>
              <FileText className="w-4 h-4 mr-2" />
              New Client
            </Button>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{client.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p className="font-medium">
                    {new Date(client.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Allies ({allies.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {allies.map((ally: any) => (
                  <div key={ally.id}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium">{ally.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {ally.relationship}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{ally.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {ally.preferredLanguage}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-4 text-sm">
                      <span className={ally.accessTherapeutics ? "text-primary" : "text-muted-foreground"}>
                        Therapeutics Access
                      </span>
                      <span className={ally.accessFinancials ? "text-primary" : "text-muted-foreground"}>
                        Financial Access
                      </span>
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Goals and Subgoals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {goals.map((goal: any) => (
                  <div key={goal.id}>
                    <div className="mb-2">
                      <h4 className="font-medium">{goal.title}</h4>
                      <p className="text-sm text-muted-foreground">{goal.description}</p>
                      <p className="text-sm mt-1">Priority: {goal.priority}</p>
                    </div>
                    <div className="pl-4 border-l-2 border-muted mt-2">
                      {goal.subgoals?.map((subgoal: any) => (
                        <div key={subgoal.id} className="mb-2">
                          <p className="font-medium text-sm">{subgoal.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {subgoal.description}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Budget Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgetItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.itemCode}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${item.unitPrice.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between items-center font-bold">
                  <span>Total Budget</span>
                  <span>${totalBudget.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
