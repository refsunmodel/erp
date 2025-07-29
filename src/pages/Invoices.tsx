import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Printer, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useReactToPrint } from 'react-to-print';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientAddress: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

const mockInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    clientName: 'ABC Corporation',
    clientAddress: '123 Business St, City, State 12345',
    date: '2024-01-15',
    dueDate: '2024-02-15',
    items: [
      { id: '1', description: 'Consulting Services', quantity: 10, rate: 150, amount: 1500 },
      { id: '2', description: 'Software License', quantity: 1, rate: 500, amount: 500 }
    ],
    subtotal: 2000,
    tax: 200,
    total: 2200,
    notes: 'Thank you for your business!'
  }
];

export const Invoices: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    clientName: '',
    clientAddress: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: ''
  });

  const [items, setItems] = useState<Omit<InvoiceItem, 'id' | 'amount'>[]>([
    { description: '', quantity: 1, rate: 0 }
  ]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: `Invoice-${selectedInvoice?.invoiceNumber}`,
  });

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof Omit<InvoiceItem, 'id' | 'amount'>, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const calculateTax = (subtotal: number) => {
    return subtotal * 0.1; // 10% tax
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const total = subtotal + tax;
    
    const invoiceItems: InvoiceItem[] = items.map((item, index) => ({
      id: (index + 1).toString(),
      ...item,
      amount: item.quantity * item.rate
    }));

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoiceNumber: `INV-2024-${String(invoices.length + 1).padStart(3, '0')}`,
      ...formData,
      items: invoiceItems,
      subtotal,
      tax,
      total
    };

    setInvoices(prev => [...prev, newInvoice]);
    
    toast({
      title: "Invoice Created",
      description: `Invoice ${newInvoice.invoiceNumber} has been created successfully.`,
    });

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      clientName: '',
      clientAddress: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      notes: ''
    });
    setItems([{ description: '', quantity: 1, rate: 0 }]);
    setIsCreateDialogOpen(false);
  };

  const InvoiceTemplate = ({ invoice }: { invoice: Invoice }) => (
    <div className="max-w-4xl mx-auto p-8 bg-white">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
          <p className="text-gray-600">#{invoice.invoiceNumber}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">Your Company</div>
          <div className="text-gray-600">
            <p>123 Business Avenue</p>
            <p>City, State 12345</p>
            <p>Phone: (555) 123-4567</p>
            <p>Email: info@yourcompany.com</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
          <div className="text-gray-600">
            <p className="font-medium">{invoice.clientName}</p>
            <p className="whitespace-pre-line">{invoice.clientAddress}</p>
          </div>
        </div>
        <div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Invoice Date:</span>
              <span className="font-medium">{invoice.date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Due Date:</span>
              <span className="font-medium">{invoice.dueDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 text-gray-600">Description</th>
              <th className="text-right py-2 text-gray-600">Qty</th>
              <th className="text-right py-2 text-gray-600">Rate</th>
              <th className="text-right py-2 text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="py-2">{item.description}</td>
                <td className="text-right py-2">{item.quantity}</td>
                <td className="text-right py-2">${item.rate.toFixed(2)}</td>
                <td className="text-right py-2">${item.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between py-1">
            <span>Subtotal:</span>
            <span>${invoice.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Tax (10%):</span>
            <span>${invoice.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 border-t-2 border-gray-200 font-bold text-lg">
            <span>Total:</span>
            <span>${invoice.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && (
        <div className="border-t pt-6">
          <h4 className="font-semibold mb-2">Notes:</h4>
          <p className="text-gray-600">{invoice.notes}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-600 mt-2">Create and manage your invoices</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Invoice Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientAddress">Client Address</Label>
                  <Textarea
                    id="clientAddress"
                    value={formData.clientAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientAddress: e.target.value }))}
                    rows={3}
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

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Invoice Items</h3>
                  <Button type="button" onClick={addItem} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label htmlFor={`desc-${index}`}>Description</Label>
                      <Input
                        id={`desc-${index}`}
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`qty-${index}`}>Quantity</Label>
                      <Input
                        id={`qty-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor={`rate-${index}`}>Rate ($)</Label>
                      <Input
                        id={`rate-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.rate}
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Amount</Label>
                      <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 flex items-center">
                        ${(item.quantity * item.rate).toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (10%):</span>
                    <span>${calculateTax(calculateSubtotal()).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>${(calculateSubtotal() + calculateTax(calculateSubtotal())).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  placeholder="Thank you for your business!"
                />
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">Create Invoice</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>Manage all your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  <TableCell>{invoice.date}</TableCell>
                  <TableCell>{invoice.dueDate}</TableCell>
                  <TableCell>${invoice.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setIsPreviewOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setTimeout(handlePrint, 100);
                        }}
                      >
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Print Template (Hidden) */}
      <div style={{ display: 'none' }}>
        <div ref={printRef}>
          {selectedInvoice && <InvoiceTemplate invoice={selectedInvoice} />}
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Invoice Preview</DialogTitle>
              <div className="flex space-x-2">
                <Button onClick={handlePrint} size="sm">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </DialogHeader>
          {selectedInvoice && <InvoiceTemplate invoice={selectedInvoice} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};