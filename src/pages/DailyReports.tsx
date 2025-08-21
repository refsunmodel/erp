import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, DollarSign, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dailyReportService } from '@/lib/database';

interface DailyReport {
  $id: string;
  date: string;
  sales: number;
  expenses: number;
  customerCount: number;
  notes: string;
  userId: string;
  storeId?: string;
  userName: string;
  storeName?: string;
  $createdAt: string;
}

export const DailyReports: React.FC = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    sales: '',
    expenses: '',
    customerCount: '',
    notes: ''
  });

  useEffect(() => {
    loadReports();
  }, [user]);

  const loadReports = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = user?.role === 'Admin'
        ? await dailyReportService.list(undefined, undefined)
        : await dailyReportService.list(user.id, user.storeId);
      setReports((response.data || []) as unknown as DailyReport[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load reports: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSubmitting(true);
    
    try {
      const reportData = {
        date: formData.date,
        sales: Number(formData.sales),
        expenses: Number(formData.expenses),
        customerCount: Number(formData.customerCount),
        notes: formData.notes,
        userId: user.id,
        userName: user.employeeData?.name || user.email,
        storeId: user.storeId || null,
        storeName: user.storeId ? 'Store Name' : null // In real app, fetch from stores
      };

      await dailyReportService.create(reportData);
      
      toast({
        title: "Report Submitted",
        description: "Daily report has been submitted successfully.",
      });

      await loadReports();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit report",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      sales: '',
      expenses: '',
      customerCount: '',
      notes: ''
    });
    setIsAddDialogOpen(false);
  };

  const totalSales = reports.reduce((sum, report) => sum + report.sales, 0);
  const totalExpenses = reports.reduce((sum, report) => sum + report.expenses, 0);
  const totalProfit = totalSales - totalExpenses;
  const avgCustomers = reports.length > 0 ? Math.round(reports.reduce((sum, report) => sum + report.customerCount, 0) / reports.length) : 0;

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
          <h1 className="text-3xl font-bold text-gray-900">Daily Reports</h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'Admin' ? 'View all daily reports' : 'Submit and track your daily performance'}
          </p>
        </div>
        
        {user?.role !== 'Admin' && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Submit Daily Report</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerCount">Customer Count</Label>
                    <Input
                      id="customerCount"
                      type="number"
                      min="0"
                      value={formData.customerCount}
                      onChange={(e) => setFormData(prev => ({ ...prev, customerCount: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sales">Sales ($)</Label>
                    <Input
                      id="sales"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.sales}
                      onChange={(e) => setFormData(prev => ({ ...prev, sales: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expenses">Expenses ($)</Label>
                    <Input
                      id="expenses"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.expenses}
                      onChange={(e) => setFormData(prev => ({ ...prev, expenses: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    placeholder="Any important observations, issues, or highlights from today..."
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
                        Submitting...
                      </>
                    ) : (
                      'Submit Report'
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Report Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-green-600">${totalSales.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">${totalExpenses.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <DollarSign className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Profit</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  ${Math.abs(totalProfit).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100">
                {totalProfit >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-blue-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Customers</p>
                <p className="text-2xl font-bold text-purple-600">{avgCustomers}</p>
              </div>
              <div className="p-3 rounded-full bg-purple-100">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {user?.role === 'Admin' ? 'All Daily Reports' : 'My Reports'}
          </CardTitle>
          <CardDescription>
            {reports.length} total reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                {user?.role === 'Admin' && <TableHead>Submitted By</TableHead>}
                <TableHead>Sales</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Profit</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const profit = report.sales - report.expenses;
                return (
                  <TableRow key={report.$id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {report.date}
                      </div>
                    </TableCell>
                    {user?.role === 'Admin' && (
                      <TableCell>
                        <div>
                          <p className="font-medium">{report.userName}</p>
                          {report.storeName && (
                            <p className="text-sm text-gray-500">{report.storeName}</p>
                          )}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="flex items-center text-green-600">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {report.sales.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-red-600">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {report.expenses.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`flex items-center ${profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        <DollarSign className="h-3 w-3 mr-1" />
                        {Math.abs(profit).toLocaleString()}
                        {profit >= 0 ? (
                          <TrendingUp className="h-3 w-3 ml-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 ml-1" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {report.customerCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-600 max-w-xs truncate" title={report.notes}>
                        {report.notes || 'No notes'}
                      </p>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};