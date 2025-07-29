import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, DollarSign, Loader2, Users, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { employeeService } from '@/lib/database';

interface Employee {
  $id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Employee' | 'Store Manager';
  annualSalary: number;
  bankDetails: string;
  storeId?: string;
  status: 'Active' | 'Inactive';
  authUserId?: string;
  monthlySalaryPaid?: number;
  lastPaymentDate?: string;
  $createdAt: string;
}

export const StoreEmployees: React.FC = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [paymentData, setPaymentData] = useState({
    monthlySalary: '',
    bonus: '',
    deductions: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadStoreEmployees();
  }, [user]);

  const loadStoreEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeService.list();
      // Filter employees by store manager's store
      const storeEmployees = response.documents.filter((emp: any) => 
        emp.storeId === user?.storeId || emp.role === 'Employee'
      );
      setEmployees(storeEmployees as unknown as Employee[]);
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

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePaySalary = (employee: Employee) => {
    setSelectedEmployee(employee);
    setPaymentData({
      monthlySalary: (employee.annualSalary / 12).toFixed(0),
      bonus: '0',
      deductions: '0',
      paymentDate: new Date().toISOString().split('T')[0]
    });
    setIsPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    
    setSubmitting(true);
    
    try {
      const monthlySalary = Number(paymentData.monthlySalary);
      const bonus = Number(paymentData.bonus);
      const deductions = Number(paymentData.deductions);
      const netPay = monthlySalary + bonus - deductions;

      await employeeService.update(selectedEmployee.$id, {
        monthlySalaryPaid: netPay,
        lastPaymentDate: paymentData.paymentDate,
        status: 'Active'
      });
      
      toast({
        title: "Salary Paid",
        description: `Salary of $${netPay.toLocaleString()} paid to ${selectedEmployee.name}`,
      });

      await loadStoreEmployees();
      setIsPaymentDialogOpen(false);
      setSelectedEmployee(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (employeeId: string, newStatus: 'Active' | 'Inactive') => {
    try {
      await employeeService.update(employeeId, { status: newStatus });
      toast({
        title: "Status Updated",
        description: `Employee status changed to ${newStatus}`,
      });
      await loadStoreEmployees();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update status: " + error.message,
        variant: "destructive"
      });
    }
  };

  const getMonthlySalary = (annual: number) => (annual / 12).toFixed(0);

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
          <h1 className="text-3xl font-bold text-gray-900">Store Employees</h1>
          <p className="text-gray-600 mt-2">Manage employees in your store</p>
        </div>
      </div>

      {/* Store Statistics */}
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
                <p className="text-sm font-medium text-gray-600">Monthly Payroll</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${employees.reduce((sum, e) => sum + (e.annualSalary / 12), 0).toLocaleString()}
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
                <p className="text-sm font-medium text-gray-600">Paid This Month</p>
                <p className="text-2xl font-bold text-orange-600">
                  {employees.filter(e => e.lastPaymentDate && 
                    new Date(e.lastPaymentDate).getMonth() === new Date().getMonth()
                  ).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Management</CardTitle>
          <CardDescription>
            {employees.length} employees in your store
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

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Monthly Salary</TableHead>
                <TableHead>Last Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => (
                <TableRow key={employee.$id}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>
                    <Badge variant={employee.role === 'Store Manager' ? 'default' : 'secondary'}>
                      {employee.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      <span>${getMonthlySalary(employee.annualSalary)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {employee.lastPaymentDate ? (
                      <div>
                        <p className="text-sm">{new Date(employee.lastPaymentDate).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">
                          ${employee.monthlySalaryPaid?.toLocaleString() || '0'}
                        </p>
                      </div>
                    ) : (
                      <span className="text-gray-400">Not paid</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={employee.status}
                      onValueChange={(value: 'Active' | 'Inactive') => 
                        handleStatusUpdate(employee.$id, value)
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePaySalary(employee)}
                      >
                        Pay Salary
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Salary - {selectedEmployee?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="monthlySalary">Monthly Salary ($)</Label>
              <Input
                id="monthlySalary"
                type="number"
                value={paymentData.monthlySalary}
                onChange={(e) => setPaymentData(prev => ({ ...prev, monthlySalary: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bonus">Bonus ($)</Label>
              <Input
                id="bonus"
                type="number"
                value={paymentData.bonus}
                onChange={(e) => setPaymentData(prev => ({ ...prev, bonus: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="deductions">Deductions ($)</Label>
              <Input
                id="deductions"
                type="number"
                value={paymentData.deductions}
                onChange={(e) => setPaymentData(prev => ({ ...prev, deductions: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData(prev => ({ ...prev, paymentDate: e.target.value }))}
                required
              />
            </div>

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Net Payment:</span>
                <span className="text-lg font-bold">
                  ${(Number(paymentData.monthlySalary) + Number(paymentData.bonus) - Number(paymentData.deductions)).toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Pay Salary'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};