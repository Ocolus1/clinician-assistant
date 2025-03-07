import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Package, 
  Edit, 
  Trash, 
  Plus, 
  Save,
  X,
  ArrowLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { BudgetItemCatalog } from "@shared/schema";

import { insertBudgetItemCatalogSchema } from "@/shared/schema";

// Form schema for product creation/editing
const productSchema = insertBudgetItemCatalogSchema.extend({
  // We'll use string for defaultUnitPrice in the form and convert to number on submit
  defaultUnitPrice: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    { message: "Unit price must be a positive number" }
  ),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductConfigDialog({ open, onOpenChange }: ProductConfigDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all-products");
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<BudgetItemCatalog | null>(null);

  // Fetch products (catalog items)
  const { data: products = [], isLoading } = useQuery<BudgetItemCatalog[]>({
    queryKey: ['/api/budget-catalog'],
    queryFn: async () => {
      const response = await fetch('/api/budget-catalog');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      return response.json();
    }
  });

  // Initialize form with default values or selected product values
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      itemCode: "",
      description: "",
      category: "",
      defaultUnitPrice: "0",
      isActive: true
    }
  });

  // Mutation to create or update a product
  const mutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      if (selectedProduct) {
        // Update existing product
        return apiRequest('PUT', `/api/budget-catalog/${selectedProduct.id}`, {
          ...data,
          defaultUnitPrice: parseFloat(data.defaultUnitPrice)
        });
      } else {
        // Create new product
        return apiRequest('POST', '/api/budget-catalog', {
          ...data,
          defaultUnitPrice: parseFloat(data.defaultUnitPrice)
        });
      }
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['/api/budget-catalog'] });
      
      // Show success message
      toast({
        title: selectedProduct ? "Product Updated" : "Product Created",
        description: `Successfully ${selectedProduct ? "updated" : "created"} product.`,
      });
      
      // Reset form and state
      resetForm();
      setActiveTab("all-products");
    },
    onError: (error) => {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: `Failed to ${selectedProduct ? "update" : "create"} product. Please try again.`,
        variant: "destructive",
      });
    }
  });

  // Function to reset form and editing state
  const resetForm = () => {
    form.reset({
      itemCode: "",
      description: "",
      category: "",
      defaultUnitPrice: "0",
      isActive: true
    });
    setSelectedProduct(null);
    setIsEditing(false);
  };

  // Function to handle edit product
  const handleEditProduct = (product: BudgetItemCatalog) => {
    setSelectedProduct(product);
    
    // Set form values
    form.reset({
      itemCode: product.itemCode || "",
      description: product.description || "",
      category: product.category || "",
      defaultUnitPrice: product.defaultUnitPrice?.toString() || "0",
      isActive: product.isActive === true
    });
    
    setActiveTab("new-product");
    setIsEditing(true);
  };

  // Function to handle delete product
  const handleDeleteProduct = async (product: BudgetItemCatalog) => {
    // Implement delete confirmation and API call
    if (confirm(`Are you sure you want to delete ${product.itemCode}?`)) {
      try {
        await apiRequest('DELETE', `/api/budget-catalog/${product.id}`);
        queryClient.invalidateQueries({ queryKey: ['/api/budget-catalog'] });
        toast({
          title: "Product Deleted",
          description: "Product has been successfully deleted.",
        });
      } catch (error) {
        console.error("Error deleting product:", error);
        toast({
          title: "Error",
          description: "Failed to delete product. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  // Function to handle form submission
  const onSubmit = (data: ProductFormValues) => {
    mutation.mutate(data);
  };

  // Function to handle add new product
  const handleAddNewProduct = () => {
    resetForm();
    setActiveTab("new-product");
  };

  // Function to handle cancel edit/add
  const handleCancel = () => {
    resetForm();
    setActiveTab("all-products");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center">
            <Package className="mr-2 h-5 w-5" /> 
            Product Configuration
          </DialogTitle>
          <DialogDescription>
            Manage therapy products and resources for client sessions
          </DialogDescription>
        </DialogHeader>

        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all-products">All Products</TabsTrigger>
            <TabsTrigger value="new-product">{isEditing ? "Edit Product" : "New Product"}</TabsTrigger>
          </TabsList>

          {/* All Products Tab */}
          <TabsContent value="all-products" className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Product Catalog</h3>
              <Button onClick={handleAddNewProduct}>
                <Plus className="mr-2 h-4 w-4" /> Add New Product
              </Button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <h4 className="text-lg font-medium text-gray-500 mb-2">No products found</h4>
                <p className="text-gray-500 mb-4">Start adding products to your catalog</p>
                <Button onClick={handleAddNewProduct}>
                  <Plus className="mr-2 h-4 w-4" /> Add First Product
                </Button>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.itemCode}</TableCell>
                        <TableCell>{product.description}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>${parseFloat(product.defaultUnitPrice?.toString() || "0").toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={product.isActive ? "default" : "outline"}>
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* New/Edit Product Tab */}
          <TabsContent value="new-product" className="space-y-4 pt-4">
            <div className="flex items-center mb-4">
              <Button variant="ghost" onClick={handleCancel} className="mr-2">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <h3 className="text-lg font-medium">{isEditing ? `Edit Product: ${selectedProduct?.itemCode}` : "Add New Product"}</h3>
            </div>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="itemCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Code</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., PT001" {...field} />
                            </FormControl>
                            <FormDescription>
                              A unique identifier for this product
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe the product..."
                                className="min-h-[100px]"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Therapy Resources" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Right Column */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Pricing & Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="defaultUnitPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price ($)</FormLabel>
                            <FormControl>
                              <Input type="number" min="0" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="space-y-4 pt-4">
                        <FormField
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel>Active</FormLabel>
                                <FormDescription>
                                  Product is available for use in sessions
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                  <Button type="submit" disabled={mutation.isPending}>
                    {mutation.isPending ? "Saving..." : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> 
                        {isEditing ? "Update Product" : "Save Product"}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}