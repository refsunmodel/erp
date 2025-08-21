import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Edit, Trash2, DollarSign, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { creditService } from '@/lib/database';

interface Credit {
  $id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  type: 'Credit' | 'Debt';
  dueDate: string;
  status: 'Pending' | 'Paid' | 'Overdue';
  notes: string;
  reminders: string;
  $createdAt: string;
}

export const Credits: React.FC = () => {
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    amount: '',
    type: 'Credit' as Credit['type'],
    dueDate: '',
    notes: '',
    reminders: ''
  });

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      setLoading(true);
      const response = await creditService.list();
      const creditsWithStatus = (response.data || []).map((credit: any) => ({
        ...credit,
        status: getStatus(credit.dueDate, credit.status)
      }));
      setCredits(creditsWithStatus as Credit[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load credits: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (dueDate: string, currentStatus: string): Credit['status'] => {
    if (currentStatus === 'Paid') return 'Paid';
    
    const today = new Date();
    const due = new Date(dueDate);
    
    if (due < today) return 'Overdue';
    return 'Pending';
  };

  const filteredCredits = credits.filter(credit =>
    credit.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    credit.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    credit.customerPhone.includes(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const creditData = {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        amount: Number(formData.amount),
        type: formData.type,
        dueDate: formData.dueDate,
        notes: formData.notes,
        reminders: formData.reminders,
        status: 'Pending'
      };

      if (editingCredit) {
        await creditService.update(editingCredit.$id, creditData);
        toast({
          title: "Credit Updated",
          description: "Credit information has been updated successfully.",
        });
      } else {
        await creditService.create(creditData);
        toast({
          title: "Credit Added",
          description: "New credit record has been added successfully.",
        });
      }

      await loadCredits();
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save credit",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      amount: '',
      type: 'Credit',
      dueDate: '',
      notes: '',
      reminders: ''
    });
    setEditingCredit(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = (credit: Credit) => {
    setEditingCredit(credit);
    setFormData({
      customerName: credit.customerName,
      customerEmail: credit.customerEmail,
      customerPhone: credit.customerPhone,
      amount: credit.amount.toString(),
      type: credit.type,
      dueDate: credit.dueDate,
      notes: credit.notes,
      reminders: credit.reminders
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this credit record?')) return;
    
    try {
      await creditService.delete(id);
      toast({
        title: "Credit Deleted",
        description: "Credit record has been removed from the system.",
      });
      await loadCredits();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete credit: " + error.message,
        variant: "destructive"
      });
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      await creditService.update(id, { status: 'Paid' });
      toast({
        title: "Status Updated",
        description: "Credit has been marked as paid.",
      });
      await loadCredits();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update status: " + error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: Credit['status']) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const totalCredits = credits.filter(c => c.type === 'Credit').reduce((sum, c) => sum + c.amount, 0);
  const totalDebts = credits.filter(c => c.type === 'Debt').reduce((sum, c) => sum + c.amount, 0);
  const overdueAmount = credits.filter(c => c.status === 'Overdue').reduce((sum, c) => sum + c.amount, 0);

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
          <h1 className="text-3xl font-bold text-gray-900">Credit Management</h1>
          <p className="text-gray-600 mt-2">Track credits, debts, and payment schedules</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCredit(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Credit/Debt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingCredit ? 'Edit Credit/Debt' : 'Add New Credit/Debt'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value: Credit['type']) => 
                    setFormData(prev => ({ ...prev, type: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Credit">Credit (Money Owed to Us)</SelectItem>
                      <SelectItem value="Debt">Debt (Money We Owe)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerEmail: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerPhone: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
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
                  rows={2}
                  placeholder="Additional details about this credit/debt..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="reminders">Reminders</Label>
                <Textarea
                  id="reminders"
                  value={formData.reminders}
                  onChange={(e) => setFormData(prev => ({ ...prev, reminders: e.target.value }))}
                  rows={2}
                  placeholder="Set reminder notes for follow-up..."
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
                      {editingCredit ? 'Updating...' : 'Adding...'}
                    </>
                  ) : (
                    editingCredit ? 'Update Record' : 'Add Record'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Credit Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Credits</p>
                <p className="text-2xl font-bold text-green-600">₹{totalCredits.toLocaleString()}</p>
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
                <p className="text-sm font-medium text-gray-600">Total Debts</p>
                <p className="text-2xl font-bold text-red-600">₹{totalDebts.toLocaleString()}</p>
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
                <p className="text-sm font-medium text-gray-600">Net Position</p>
                <p className={`text-2xl font-bold ${totalCredits - totalDebts >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{Math.abs(totalCredits - totalDebts).toLocaleString()}
                </p>
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
                <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
                <p className="text-2xl font-bold text-orange-600">₹{overdueAmount.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-orange-100">
                <AlertCircle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Credit & Debt Records</CardTitle>
          <CardDescription>
            {credits.length} total records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCredits.map((credit) => (
                <TableRow key={credit.$id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{credit.customerName}</p>
                      <p className="text-sm text-gray-500">{credit.customerEmail}</p>
                      <p className="text-sm text-gray-500">{credit.customerPhone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={credit.type === 'Credit' ? 'default' : 'secondary'}>
                      {credit.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <DollarSign className="h-3 w-3 mr-1" />
                      <span className={credit.type === 'Credit' ? 'text-green-600' : 'text-red-600'}>
                        {credit.amount.toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-2 text-gray-400" />
                      {credit.dueDate}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(credit.status)}>
                      {credit.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-gray-600 max-w-xs truncate" title={credit.notes}>
                      {credit.notes || 'No notes'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {credit.status !== 'Paid' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markAsPaid(credit.$id)}
                        >
                          Mark Paid
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(credit)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(credit.$id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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