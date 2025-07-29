import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash, DollarSign, Loader2, Users, Calendar, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { employeeService, storeService, salaryService } from '@/lib/database';
import { createUserAccount } from '@/lib/appwrite';
import { useAuth } from '@/contexts/AuthContext';

interface Employee {
  $id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Graphic Designer' | 'Printing Technician' | 'Delivery Supervisor';
  annualSalary: number;
  bankDetails: string;
  storeId?: string;
  storeName?: string;
  status: 'Active' | 'Inactive';
  authUserId?: string;
  modeOfPayment?: string;
  salaryDate?: string;
  lastPaymentDate?: string;
  password?: string;
  $createdAt: string;
  advancePayment?: number; // Add advance payment field
}

interface Store {
  $id: string;
  name: string;
}

export const Employees: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedEmployeePassword, setSelectedEmployeePassword] = useState<Employee | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Graphic Designer' as Employee['role'],
    annualSalary: '',
    modeOfPayment: '',
    salaryDate: '',
    storeId: '',
    advancePayment: '' // Add advance payment field
  });

  useEffect(() => {
    loadEmployees();
    loadStores();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const [employeesResponse, storesResponse, salaryResponse] = await Promise.all([
        employeeService.list(),
        storeService.list(),
        salaryService.list()
      ]);
      
      // Map store names and last payment dates to employees
      const employeesWithDetails = employeesResponse.documents.map((emp: any) => {
        const store = storesResponse.documents.find((s: any) => s.$id === emp.storeId);
        const lastSalary = salaryResponse.documents
          .filter((s: any) => s.employeeId === emp.$id)
          .sort((a: any, b: any) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())[0];
        
        return {
          ...emp,
          storeName: store?.name || null,
          lastPaymentDate: lastSalary?.payDate || null,
          advancePayment: emp.advancePayment || 0 // Add advance payment to employee object
        };
      });
      
      setEmployees(employeesWithDetails as Employee[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load employees: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const response = await storeService.list();
      setStores(response.documents as unknown as Store[]);
    } catch (error: any) {
      console.error('Failed to load stores:', error);
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      let authUserId = editingEmployee?.authUserId;
      
      // Create user account if adding new employee
      if (!editingEmployee && formData.email && formData.password) {
        try {
          const userAccount = await createUserAccount(formData.email, formData.password, formData.name);
          authUserId = userAccount.$id;
        } catch (error: any) {
          toast({
            title: "Error",
            description: "Failed to create user account: " + error.message,
            variant: "destructive"
          });
          return;
        }
      }

      const employeeData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        annualSalary: Number(formData.annualSalary),
        modeOfPayment: formData.modeOfPayment,
        salaryDate: formData.salaryDate,
        storeId: formData.storeId || null,
        password: formData.password,
        status: 'Active',
        authUserId,
        advancePayment: Number(formData.advancePayment) || 0 // Save advance payment
      };

      if (editingEmployee) {
        await employeeService.update(editingEmployee.$id, employeeData);
        toast({
          title: "Employee Updated",
          description: "Employee information has been updated successfully.",
        });
      } else {
        await employeeService.create(employeeData);
        toast({
          title: "Employee Added",
          description: "New employee has been added successfully.",
        });
      }

      await loadEmployees();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save employee",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Graphic Designer',
      annualSalary: '',
      modeOfPayment: '',
      salaryDate: '',
      storeId: '',
      advancePayment: ''
    });
    setEditingEmployee(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      password: '',
      role: employee.role,
      annualSalary: employee.annualSalary.toString(),
      modeOfPayment: employee.modeOfPayment || '',
      salaryDate: employee.salaryDate || '',
      storeId: employee.storeId || '',
      advancePayment: employee.advancePayment?.toString() || ''
    });
    setIsAddDialogOpen(true);
  };

  const handleViewPassword = (employee: Employee) => {
    setSelectedEmployeePassword(employee);
    setIsPasswordDialogOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    
    try {
      await employeeService.delete(id);
      toast({
        title: "Employee Deleted",
        description: "Employee has been removed from the system.",
      });
      await loadEmployees();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete employee: " + error.message,
        variant: "destructive"
      });
    }
  };

  const paySalary = async (employee: Employee) => {
    try {
      const monthlySalary = Math.round(employee.annualSalary / 12);
      
      await salaryService.create({
        employeeId: employee.$id,
        employeeName: employee.name,
        month: new Date().toISOString().slice(0, 7), // YYYY-MM format
        baseSalary: monthlySalary,
        overtime: 0,
        bonus: 0,
        deductions: Math.round(monthlySalary * 0.1), // 10% deductions
        netSalary: Math.round(monthlySalary * 0.9),
        status: 'Paid',
        payDate: new Date().toISOString().split('T')[0]
      });

      toast({
        title: "Salary Paid",
        description: `Monthly salary paid to ${employee.name}`,
      });
      
      // Reload employees to update last payment date
      await loadEmployees();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to process salary: " + error.message,
        variant: "destructive"
      });
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'Admin' ? 'Manage your team members and their information' : 'Manage team members under your supervision'}
          </p>
        </div>
        
        {(user?.role === 'Admin' || user?.role === 'Manager') && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingEmployee(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
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
                
                {!editingEmployee && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      required={!editingEmployee}
                      placeholder="Enter password for new account"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={formData.role} onValueChange={(value: Employee['role']) => 
                      setFormData(prev => ({ ...prev, role: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Graphic Designer">Graphic Designer</SelectItem>
                        <SelectItem value="Printing Technician">Printing Technician</SelectItem>
                        <SelectItem value="Delivery Supervisor">Delivery Supervisor</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="annualSalary">Annual Salary ($)</Label>
                    <Input
                      id="annualSalary"
                      type="number"
                      value={formData.annualSalary}
                      onChange={(e) => setFormData(prev => ({ ...prev, annualSalary: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="storeId">Assign to Store (Optional)</Label>
                  <Select value={formData.storeId} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, storeId: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a store" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Store Assignment</SelectItem>
                      {stores.map(store => (
                        <SelectItem key={store.$id} value={store.$id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="modeOfPayment">Mode of Payment</Label>
                  <Select value={formData.modeOfPayment} onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, modeOfPayment: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="GPay">GPay</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Paytm">Paytm</SelectItem>
                      <SelectItem value="PhonePe">PhonePe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="salaryDate">Salary Date (Day of Month)</Label>
                  <Input
                    id="salaryDate"
                    type="number"
                    min="1"
                    max="31"
                    value={formData.salaryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, salaryDate: e.target.value }))}
                    placeholder="e.g., 15 for 15th of every month"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="advancePayment">Advance Payment ($)</Label>
                  <Input
                    id="advancePayment"
                    type="number"
                    value={formData.advancePayment}
                    onChange={(e) => setFormData(prev => ({ ...prev, advancePayment: e.target.value }))}
                    placeholder="Enter advance payment amount"
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingEmployee ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      editingEmployee ? 'Update Employee' : 'Add Employee'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Employee Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Employees</p>
                <p className="text-2xl font-bold text-green-600">
                  {employees.filter(e => e.status === 'Active').length}
                </p>
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
                <p className="text-sm font-medium text-gray-600">Total Payroll</p>
                <p className="text-2xl font-bold text-purple-600">
                  ₹{employees.reduce((sum, e) => sum + e.annualSalary, 0).toLocaleString()}
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
                <p className="text-sm font-medium text-gray-600">Stores Covered</p>
                <p className="text-2xl font-bold text-orange-600">
                  {new Set(employees.filter(e => e.storeId).map(e => e.storeId)).size}
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <Building className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
          <CardDescription>
            {employees.length} total employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Store</TableHead>
                <TableHead>Annual Salary</TableHead>
                <TableHead>Last Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Advance Payment</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.$id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{employee.name}</p>
                      <p className="text-sm text-gray-500">{employee.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.role === 'Admin' ? 'default' : 'secondary'}>
                      {employee.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {employee.storeName ? (
                      <div className="flex items-center">
                        <Building className="h-4 w-4 mr-2 text-gray-400" />
                        {employee.storeName}
                      </div>
                    ) : (
                      <span className="text-gray-400">No assignment</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      <span>{employee.annualSalary.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {employee.lastPaymentDate ? (
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-2 text-gray-400" />
                        <span className="text-sm">
                          {new Date(employee.lastPaymentDate).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">No payments</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.status === 'Active' ? 'default' : 'secondary'}>
                      {employee.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPassword(employee)}
                    >
                      View Password
                    </Button>
                  </TableCell>
                  <TableCell>
                    <span>${employee.advancePayment?.toLocaleString() || '0'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {(user?.role === 'Admin' || user?.role === 'Manager') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => paySalary(employee)}
                        >
                          Pay Salary
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(employee)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user?.role === 'Admin' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(employee.$id, employee.name)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Password View Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Employee Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee Name</Label>
              <p className="font-medium">{selectedEmployeePassword?.name}</p>
            </div>
            <div>
              <Label>Password</Label>
              <p className="font-mono bg-gray-100 p-2 rounded border">
                {selectedEmployeePassword?.password || 'No password saved'}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};