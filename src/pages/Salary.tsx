import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, Calendar, Loader2 } from 'lucide-react';
import { salaryService, employeeService } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';

interface SalaryInfo {
  $id: string;
  month: string;
  baseSalary: number;
  overtime: number;
  bonus: number;
  deductions: number;
  advanceSalary: number;
  netSalary: number;
  status: 'Paid' | 'Pending' | 'Processing';
  payDate?: string;
  $createdAt: string;
}

interface Employee {
  $id: string;
  name: string;
  email: string;
  role: string;
  annualSalary: number;
  modeOfPayment?: string;
  salaryDate?: string;
}

export const Salary: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salaryHistory, setSalaryHistory] = useState<SalaryInfo[]>([]);
  const [employeeData, setEmployeeData] = useState<Employee | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadSalaryData();
    }
  }, [user]);

  const loadSalaryData = async () => {
    try {
      setLoading(true);
      
      // Get employee data first
      const employeesResponse = await employeeService.list();
      const currentEmployee = employeesResponse.documents.find((emp: any) => emp.authUserId === user?.$id);
      
      if (currentEmployee) {
        setEmployeeData(currentEmployee as unknown as Employee);
        
        // Get salary records for this employee
        const salaryResponse = await salaryService.getByEmployee(currentEmployee.$id);
        setSalaryHistory(salaryResponse.documents as unknown as SalaryInfo[]);
      } else {
        toast({
          title: "Employee Not Found",
          description: "Your employee record was not found in the system.",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load salary data: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: SalaryInfo['status']) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Processing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500">Employee data not found</p>
          <p className="text-sm text-gray-400 mt-2">Please contact your administrator</p>
        </div>
      </div>
    );
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthSalary = salaryHistory.find(s => s.month === currentMonth);
  const lastPaidSalary = salaryHistory.find(s => s.status === 'Paid');

  const formatSalaryAmount = (amount: number) => {
    if (user?.role === 'Admin') {
      return `₹${amount.toLocaleString()}`;
    }
    return '••••';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Salary Information</h1>
        <p className="text-gray-600 mt-2">
          {user?.role === 'Admin' ? 'Manage salary details and payment history' : 'View your payment history'}
        </p>
      </div>

      {/* Salary Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Month</p>
                <p className="text-2xl font-bold">
                  {formatSalaryAmount(currentMonthSalary?.netSalary || (employeeData.annualSalary / 12))}
                </p>
                <p className="text-xs text-gray-500">{formatMonth(currentMonth)}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatSalaryAmount(lastPaidSalary?.netSalary || 0)}
                </p>
                <p className="text-xs text-gray-500">
                  {lastPaidSalary?.payDate ? new Date(lastPaidSalary.payDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Month Breakdown */}
      {currentMonthSalary && user?.role === 'Admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Current Month Breakdown</CardTitle>
            <CardDescription>{formatMonth(currentMonth)} salary details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Base Salary</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatSalaryAmount(currentMonthSalary.baseSalary)}
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Overtime</p>
                <p className="text-xl font-bold text-green-600">
                  {formatSalaryAmount(currentMonthSalary.overtime)}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Bonus</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatSalaryAmount(currentMonthSalary.bonus)}
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-gray-600">Deductions</p>
                <p className="text-xl font-bold text-red-600">
                  -{formatSalaryAmount(currentMonthSalary.deductions)}
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Advance Salary</p>
                <p className="text-xl font-bold text-orange-600">
                  -{formatSalaryAmount(currentMonthSalary.advanceSalary || 0)}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <p className="text-sm text-gray-600">Net Salary</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatSalaryAmount(currentMonthSalary.netSalary)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Salary History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Your payment history</CardDescription>
        </CardHeader>
        <CardContent>
          {salaryHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No salary records found</p>
              <p className="text-sm text-gray-400 mt-2">Salary records will appear here once payments are processed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  {user?.role === 'Admin' && (
                    <>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Bonus</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Advance Salary</TableHead>
                      <TableHead>Net Salary</TableHead>
                    </>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead>Pay Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryHistory.map((salary) => (
                  <TableRow key={salary.$id}>
                    <TableCell className="font-medium">
                      {formatMonth(salary.month)}
                    </TableCell>
                    {user?.role === 'Admin' && (
                      <>
                        <TableCell>{formatSalaryAmount(salary.baseSalary)}</TableCell>
                        <TableCell className="text-green-600">
                          +{formatSalaryAmount(salary.overtime)}
                        </TableCell>
                        <TableCell className="text-purple-600">
                          +{formatSalaryAmount(salary.bonus)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          -{formatSalaryAmount(salary.deductions)}
                        </TableCell>
                        <TableCell className="text-orange-600">
                          -{formatSalaryAmount(salary.advanceSalary || 0)}
                        </TableCell>
                        <TableCell className="font-bold">
                          {formatSalaryAmount(salary.netSalary)}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Badge className={getStatusColor(salary.status)}>
                        {salary.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {salary.payDate ? new Date(salary.payDate).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
         
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Info */}
      <Card>
        <CardHeader>
          <CardTitle>Employment Information</CardTitle>
          <CardDescription>Your employment details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Employee Name</p>
                <p className="text-lg">{employeeData.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Employee ID</p>
                <p className="text-lg font-mono">{employeeData.$id.slice(-8).toUpperCase()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Role</p>
                <p className="text-lg">{employeeData.role}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Email</p>
                <p className="text-lg">{employeeData.email}</p>
              </div>
              {user?.role === 'Admin' && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Annual Salary</p>
                  <p className="text-lg font-bold">{formatSalaryAmount(employeeData.annualSalary)}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-600">Payment Mode</p>
                <p className="text-lg">{employeeData.modeOfPayment || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Salary Date</p>
                <p className="text-lg">{employeeData.salaryDate ? `${employeeData.salaryDate}th of every month` : 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Employment Status</p>
                <Badge className="bg-green-100 text-green-800">Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};