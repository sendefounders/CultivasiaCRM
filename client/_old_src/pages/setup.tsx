import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sidebar } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Package, 
  Settings,
  UserPlus,
  Save,
  X
} from "lucide-react";
import { Product, User, insertProductSchema, insertUserSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";

const productFormSchema = insertProductSchema;
const agentFormSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProductFormData = z.infer<typeof productFormSchema>;
type AgentFormData = z.infer<typeof agentFormSchema>;

export default function Setup() {
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingAgent, setEditingAgent] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("products");
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not admin
  if (user?.role !== 'admin') {
    return <Redirect to="/" />;
  }

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: agents, isLoading: agentsLoading } = useQuery<User[]>({
    queryKey: ["/api/agents"],
  });

  const productForm = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      sku: "",
      name: "",
      price: "0",
      units: 1,
      isActive: true,
    },
  });

  const agentForm = useForm<AgentFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
      role: "agent",
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductFormData) => {
      const response = await apiRequest('POST', '/api/products', productData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Product created successfully",
      });
      setShowProductDialog(false);
      productForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductFormData> }) => {
      const response = await apiRequest('PUT', `/api/products/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Product updated successfully",
      });
      setShowProductDialog(false);
      setEditingProduct(null);
      productForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (agentData: Omit<AgentFormData, 'confirmPassword'>) => {
      const response = await apiRequest('POST', '/api/agents', agentData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      toast({
        title: "Agent created successfully",
      });
      setShowAgentDialog(false);
      agentForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create agent",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateAgentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<User> }) => {
      const response = await apiRequest('PUT', `/api/agents/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agents'] });
      toast({
        title: "Agent updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update agent",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCreateProduct = (data: ProductFormData) => {
    createProductMutation.mutate(data);
  };

  const handleUpdateProduct = (data: ProductFormData) => {
    if (editingProduct) {
      updateProductMutation.mutate({
        id: editingProduct.id,
        data,
      });
    }
  };

  const handleCreateAgent = (data: AgentFormData) => {
    const { confirmPassword, ...agentData } = data;
    createAgentMutation.mutate(agentData);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    productForm.reset({
      sku: product.sku,
      name: product.name,
      price: product.price,
      units: product.units,
      isActive: product.isActive,
    });
    setShowProductDialog(true);
  };

  const handleToggleProductStatus = (product: Product) => {
    updateProductMutation.mutate({
      id: product.id,
      data: { isActive: !product.isActive },
    });
  };

  const handleToggleAgentStatus = (agent: User) => {
    updateAgentMutation.mutate({
      id: agent.id,
      data: { isActive: !agent.isActive },
    });
  };

  const handleCloseProductDialog = () => {
    setShowProductDialog(false);
    setEditingProduct(null);
    productForm.reset();
  };

  const handleCloseAgentDialog = () => {
    setShowAgentDialog(false);
    setEditingAgent(null);
    agentForm.reset();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Setup</h2>
              <p className="text-sm text-muted-foreground">Manage products and team members</p>
            </div>
            <div className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </header>

        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="products" data-testid="tab-products">
                <Package className="h-4 w-4 mr-2" />
                Products
              </TabsTrigger>
              <TabsTrigger value="agents" data-testid="tab-agents">
                <Users className="h-4 w-4 mr-2" />
                Agents
              </TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Product Management</CardTitle>
                    <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-add-product">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Product
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {editingProduct ? "Edit Product" : "Add New Product"}
                          </DialogTitle>
                        </DialogHeader>
                        <form 
                          onSubmit={productForm.handleSubmit(editingProduct ? handleUpdateProduct : handleCreateProduct)}
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="sku">SKU</Label>
                            <Input
                              id="sku"
                              {...productForm.register("sku")}
                              placeholder="e.g., AC1, AP2"
                              data-testid="input-product-sku"
                            />
                            {productForm.formState.errors.sku && (
                              <p className="text-sm text-destructive">
                                {productForm.formState.errors.sku.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="name">Product Name</Label>
                            <Input
                              id="name"
                              {...productForm.register("name")}
                              placeholder="Product name"
                              data-testid="input-product-name"
                            />
                            {productForm.formState.errors.name && (
                              <p className="text-sm text-destructive">
                                {productForm.formState.errors.name.message}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="price">Price (PHP)</Label>
                              <Input
                                id="price"
                                type="number"
                                step="0.01"
                                {...productForm.register("price")}
                                placeholder="0.00"
                                data-testid="input-product-price"
                              />
                              {productForm.formState.errors.price && (
                                <p className="text-sm text-destructive">
                                  {productForm.formState.errors.price.message}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="units">Units</Label>
                              <Input
                                id="units"
                                type="number"
                                {...productForm.register("units", { valueAsNumber: true })}
                                placeholder="1"
                                data-testid="input-product-units"
                              />
                              {productForm.formState.errors.units && (
                                <p className="text-sm text-destructive">
                                  {productForm.formState.errors.units.message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="isActive"
                              checked={productForm.watch("isActive")}
                              onCheckedChange={(checked) => productForm.setValue("isActive", checked)}
                              data-testid="switch-product-active"
                            />
                            <Label htmlFor="isActive">Active Product</Label>
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCloseProductDialog}
                              data-testid="button-cancel-product"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={createProductMutation.isPending || updateProductMutation.isPending}
                              data-testid="button-save-product"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {editingProduct ? "Update" : "Create"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {productsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading products...
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Units</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products?.map((product) => (
                          <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                            <TableCell className="font-medium">{product.sku}</TableCell>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>{formatCurrency(Number(product.price))}</TableCell>
                            <TableCell>{product.units}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={product.isActive}
                                  onCheckedChange={() => handleToggleProductStatus(product)}
                                  data-testid={`switch-product-status-${product.id}`}
                                />
                                <Badge variant={product.isActive ? "default" : "secondary"}>
                                  {product.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditProduct(product)}
                                data-testid={`button-edit-product-${product.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Agents Tab */}
            <TabsContent value="agents" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Agent Management</CardTitle>
                    <Dialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
                      <DialogTrigger asChild>
                        <Button data-testid="button-add-agent">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Agent
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Agent</DialogTitle>
                        </DialogHeader>
                        <form 
                          onSubmit={agentForm.handleSubmit(handleCreateAgent)}
                          className="space-y-4"
                        >
                          <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                              id="username"
                              {...agentForm.register("username")}
                              placeholder="Agent username"
                              data-testid="input-agent-username"
                            />
                            {agentForm.formState.errors.username && (
                              <p className="text-sm text-destructive">
                                {agentForm.formState.errors.username.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                              id="password"
                              type="password"
                              {...agentForm.register("password")}
                              placeholder="Password"
                              data-testid="input-agent-password"
                            />
                            {agentForm.formState.errors.password && (
                              <p className="text-sm text-destructive">
                                {agentForm.formState.errors.password.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              {...agentForm.register("confirmPassword")}
                              placeholder="Confirm password"
                              data-testid="input-agent-confirm-password"
                            />
                            {agentForm.formState.errors.confirmPassword && (
                              <p className="text-sm text-destructive">
                                {agentForm.formState.errors.confirmPassword.message}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCloseAgentDialog}
                              data-testid="button-cancel-agent"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={createAgentMutation.isPending}
                              data-testid="button-save-agent"
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Create Agent
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {agentsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading agents...
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agents?.map((agent) => (
                          <TableRow key={agent.id} data-testid={`agent-row-${agent.id}`}>
                            <TableCell className="font-medium">{agent.username}</TableCell>
                            <TableCell className="capitalize">{agent.role}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  checked={agent.isActive}
                                  onCheckedChange={() => handleToggleAgentStatus(agent)}
                                  data-testid={`switch-agent-status-${agent.id}`}
                                />
                                <Badge variant={agent.isActive ? "default" : "secondary"}>
                                  {agent.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(agent.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Reset password functionality could be added here
                                    toast({
                                      title: "Reset password",
                                      description: "Password reset functionality to be implemented",
                                    });
                                  }}
                                  data-testid={`button-reset-password-${agent.id}`}
                                >
                                  Reset Password
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
