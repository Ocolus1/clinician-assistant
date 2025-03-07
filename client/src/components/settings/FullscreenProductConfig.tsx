import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

// UI Components
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Package,
  Edit,
  Archive,
  Save,
  Plus,
  X,
  ArrowLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// Create a simplified local schema for budget item catalog 
type BudgetItemCatalog = {
  id: number;
  itemCode: string;
  description: string;
  defaultUnitPrice: number;
  category: string | null;
  isActive: boolean | null;
}

// Define our own product schema
const productSchema = z.object({
  itemCode: z.string().min(2, "Product code must be at least 2 characters"),
  description: z.string().min(3, "Description must be at least 3 characters"),
  category: z.string().optional().nullable(),
  defaultUnitPrice: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0,
    { message: "Unit price must be a positive number" }
  ),
  isActive: z.boolean().default(true)
});

type ProductFormValues = z.infer<typeof productSchema>;

interface FullscreenProductConfigProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FullscreenProductConfig({ open, onOpenChange }: FullscreenProductConfigProps) {
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

  // If not open, don't render anything
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-auto">
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b">
          <div className="container w-full px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-xl font-semibold flex items-center">
                  <Package className="mr-2 h-5 w-5" /> 
                  Product Configuration
                </h2>
                <p className="text-sm text-muted-foreground">
                  Manage therapy products and resources for client sessions
                </p>
              </div>
            </div>

            {activeTab === "new-product" && (
              <Button 
                type="submit" 
                form="product-form" 
                disabled={mutation.isPending}
              >
                {mutation.isPending ? "Saving..." : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> 
                    {isEditing ? "Update Product" : "Save Product"}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="container w-full px-4 py-6 flex-1">
          <div className="container max-w-7xl mx-auto">
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="mt-2"
            >
            <div className="flex justify-center mb-6">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="all-products">All Products</TabsTrigger>
                <TabsTrigger value="new-product">{isEditing ? "Edit Product" : "New Product"}</TabsTrigger>
              </TabsList>
            </div>

            {/* All Products Tab */}
            <TabsContent value="all-products" className="space-y-4 pt-4">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-xl font-medium">Product Catalog</h3>
                  <p className="text-sm text-muted-foreground mt-1">Manage your therapy products and resources</p>
                </div>
                <Button onClick={handleAddNewProduct} className="h-10">
                  <Plus className="mr-2 h-4 w-4" /> Add New Product
                </Button>
              </div>

              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-pulse flex flex-col items-center">
                    <div className="rounded-full bg-gray-200 h-12 w-12 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
                    <div className="h-3 bg-gray-200 rounded w-48"></div>
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 border rounded-lg bg-gray-50">
                  <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <h4 className="text-lg font-medium text-gray-500 mb-2">No products found</h4>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Start adding products to your catalog to make them available for client sessions
                  </p>
                  <Button onClick={handleAddNewProduct} size="lg">
                    <Plus className="mr-2 h-5 w-5" /> Add First Product
                  </Button>
                </div>
              ) : (
                <Card className="w-full">
                  <CardContent className="p-0">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[15%]">Code</TableHead>
                          <TableHead className="w-[35%]">Description</TableHead>
                          <TableHead className="w-[20%]">Category</TableHead>
                          <TableHead className="w-[10%]">Price</TableHead>
                          <TableHead className="w-[10%]">Status</TableHead>
                          <TableHead className="text-right w-[10%]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id} className="hover:bg-gray-50">
                            <TableCell className="font-medium">{product.itemCode}</TableCell>
                            <TableCell className="max-w-[300px] truncate">{product.description}</TableCell>
                            <TableCell>{product.category || "-"}</TableCell>
                            <TableCell>${parseFloat(product.defaultUnitPrice?.toString() || "0").toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant={product.isActive ? "default" : "outline"} className="font-normal">
                                {product.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEditProduct(product)} className="h-8 w-8" title="Edit">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product)} className="h-8 w-8 text-amber-600" title="Archive">
                                <Archive className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* New/Edit Product Tab */}
            <TabsContent value="new-product" className="space-y-4 pt-4">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <Button variant="ghost" onClick={handleCancel} className="mr-3">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
                  </Button>
                  <div>
                    <h3 className="text-xl font-medium">{isEditing ? `Edit Product: ${selectedProduct?.itemCode}` : "Add New Product"}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{isEditing ? "Update product details" : "Create a new product for your catalog"}</p>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  form="product-form" 
                  className="hidden md:flex"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Saving..." : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> 
                      {isEditing ? "Update Product" : "Save Product"}
                    </>
                  )}
                </Button>
              </div>

              <Form {...form}>
                <form id="product-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                <Input 
                                  placeholder="e.g., Therapy Resources" 
                                  value={field.value || ""} 
                                  onChange={(e) => field.onChange(e.target.value)}
                                />
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

                  {/* Mobile-friendly submit button at the bottom */}
                  <div className="md:hidden">
                    <Button 
                      type="submit" 
                      className="w-full mt-6"
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? "Saving..." : (
                        <>
                          <Save className="mr-2 h-4 w-4" /> 
                          {isEditing ? "Update Product" : "Save Product"}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}