import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Store, MapPin, Users, DollarSign, Edit, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { storeService } from '@/lib/database';

interface StoreData {
  $id: string;
  name: string;
  address: string;
  managerId?: string;
  managerName?: string;
  phone: string;
  email: string;
  status: 'Active' | 'Inactive';
  monthlySales: number;
  monthlyExpenses: number;
  employeeCount: number;
  $createdAt: string;
}

export const Stores: React.FC = () => {
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    managerName: '',
    employeeCount: '0',
    monthlySales: '0',
    monthlyExpenses: '0'
  });

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      const response = await storeService.list();
      setStores(response.documents as unknown as StoreData[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load stores: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const storeData = {
        name: formData.name,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        managerName: formData.managerName,
        employeeCount: Number(formData.employeeCount),
        monthlySales: Number(formData.monthlySales),
        monthlyExpenses: Number(formData.monthlyExpenses),
        status: 'Active'
      };

      if (editingStore) {
        await storeService.update(editingStore.$id, storeData);
        toast({
          title: "Store Updated",
          description: "Store information has been updated successfully.",
        });
      } else {
        await storeService.create(storeData);
        toast({
          title: "Store Added",
          description: "New store has been added successfully.",
        });
      }

      await loadStores();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save store",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      managerName: '',
      employeeCount: '0',
      monthlySales: '0',
      monthlyExpenses: '0'
    });
    setEditingStore(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = (store: StoreData) => {
    setEditingStore(store);
    setFormData({
      name: store.name,
      address: store.address,
      phone: store.phone,
      email: store.email,
      managerName: store.managerName || '',
      employeeCount: store.employeeCount.toString(),
      monthlySales: store.monthlySales.toString(),
      monthlyExpenses: store.monthlyExpenses.toString()
    });
    setIsAddDialogOpen(true);
  };

  const totalSales = stores.reduce((sum, store) => sum + store.monthlySales, 0);
  const totalExpenses = stores.reduce((sum, store) => sum + store.monthlyExpenses, 0);
  const totalEmployees = stores.reduce((sum, store) => sum + store.employeeCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stores</h1>
          <p className="text-gray-600 mt-2">Manage your store locations and performance</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingStore(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Store
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingStore ? 'Edit Store' : 'Add New Store'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Store Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="managerName">Manager Name</Label>
                  <Input
                    id="managerName"
                    value={formData.managerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, managerName: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeCount">Employee Count</Label>
                  <Input
                    id="employeeCount"
                    type="number"
                    value={formData.employeeCount}
                    onChange={(e) => setFormData(prev => ({ ...prev, employeeCount: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlySales">Monthly Sales ($)</Label>
                  <Input
                    id="monthlySales"
                    type="number"
                    value={formData.monthlySales}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthlySales: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyExpenses">Monthly Expenses ($)</Label>
                  <Input
                    id="monthlyExpenses"
                    type="number"
                    value={formData.monthlyExpenses}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthlyExpenses: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingStore ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    editingStore ? 'Update Store' : 'Add Store'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Store Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Stores</p>
                <p className="text-2xl font-bold">{stores.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold text-green-600">{totalEmployees}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Sales</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${totalSales.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${(totalSales - totalExpenses).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <DollarSign className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Directory</CardTitle>
          <CardDescription>
            {stores.length} total stores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Store Info</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stores.map((store) => (
                <TableRow key={store.$id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{store.name}</p>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <MapPin className="h-3 w-3 mr-1" />
                        {store.address}
                      </div>
                      <p className="text-sm text-gray-500">{store.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{store.managerName || 'Not assigned'}</p>
                      <p className="text-sm text-gray-500">{store.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-sm">
                        <span className="text-green-600">Sales: ${store.monthlySales.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-red-600">Expenses: ${store.monthlyExpenses.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center text-sm font-medium">
                        <span className="text-blue-600">
                          Profit: ${(store.monthlySales - store.monthlyExpenses).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{store.employeeCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={store.status === 'Active' ? 'default' : 'secondary'}>
                      {store.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(store)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};