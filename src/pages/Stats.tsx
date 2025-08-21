import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Store,
  Download,
  Calendar,
  Loader2
} from 'lucide-react';
import { statsService, dailyReportService, storeService } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface StatsData {
  employees: number;
  stores: number;
  customers: number;
  totalSales: number;
  totalExpenses: number;
  totalRevenue: number;
  netProfit: number;
  completedTasks: number;
  pendingTasks: number;
}

interface SalesData {
  month: string;
  sales: number;
  expenses: number;
  revenue: number;
  profit: number;
}

export const Stats: React.FC = () => {
  const { user } = useAuth();
  const [selectedStore, setSelectedStore] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [storePerformance, setStorePerformance] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    loadStatsData();
  }, [selectedStore, selectedPeriod, startDate, endDate]);

  const loadStores = async () => {
    try {
      const response = await storeService.list();
      setStores(response.data || []);
    } catch (error: any) {
      console.error('Failed to load stores:', error);
    }
  };

  const loadStatsData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on period
      const { start, end } = getDateRange();
      
      // Load overall stats
      const stats = await statsService.getOverallStats();
      setStatsData({
        ...stats,
        totalRevenue: typeof (stats as any).totalRevenue === 'number'
          ? (stats as any).totalRevenue
          : (typeof stats.totalSales === 'number' ? stats.totalSales : 0),
      });

      // Load sales trend data with date filtering
      const salesTrend = await statsService.getSalesData(
        selectedStore === 'all' ? undefined : selectedStore,
        start,
        end
      );
      setSalesData((salesTrend as any[]).map((d: any) => ({
        ...d,
        revenue: d.sales, // fallback: revenue = sales
      })));

      // Load store performance
      const [storesResponse, reportsResponse] = await Promise.all([
        storeService.list(),
        dailyReportService.list(undefined, undefined, start, end)
      ]);

      const storePerf = (storesResponse.data || []).map((store: any) => {
        const storeReports = (reportsResponse.data || []).filter((r: any) => r.storeId === store.$id);
        const totalSales = storeReports.reduce((sum: number, r: any) => sum + (r.sales || 0), 0);
        
        return {
          name: store.name,
          sales: totalSales,
          color: getRandomColor()
        };
      });

      setStorePerformance(storePerf);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load statistics: " + error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const now = new Date();
    let start = '';
    let end = '';

    if (startDate && endDate) {
      start = startDate;
      end = endDate;
    } else {
      switch (selectedPeriod) {
        case '1month':
          start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0];
          break;
        case '3months':
          start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()).toISOString().split('T')[0];
          break;
        case '6months':
          start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0];
          break;
        case '1year':
          start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0];
          break;
        default:
          start = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()).toISOString().split('T')[0];
      }
      end = now.toISOString().split('T')[0];
    }

    return { start, end };
  };

  const getRandomColor = () => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const categoryData = [
    { name: 'Sales', value: statsData?.totalSales || 0, fill: '#3B82F6' },
    { name: 'Expenses', value: statsData?.totalExpenses || 0, fill: '#EF4444' },
    { name: 'Profit', value: statsData?.netProfit || 0, fill: '#10B981' },
  ];

  const kpis = [
    {
      title: 'Total Revenue',
      value: `₹${statsData?.totalRevenue.toLocaleString() || '0'}`,
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Total Sales',
      value: `₹${statsData?.totalSales.toLocaleString() || '0'}`,
      change: '+8.2%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'text-blue-600'
    },
    {
      title: 'Active Customers',
      value: statsData?.customers.toString() || '0',
      change: '+15.3%',
      trend: 'up',
      icon: Users,
      color: 'text-purple-600'
    },
    {
      title: 'Store Performance',
      value: `${statsData?.stores || 0} Stores`,
      change: 'All Active',
      trend: 'up',
      icon: Store,
      color: 'text-orange-600'
    }
  ];

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
          <h1 className="text-3xl font-bold text-gray-900">Stats & Trends</h1>
          <p className="text-gray-600 mt-2">
            {user?.role === 'Admin' ? 'Business analytics and performance insights' : 'Team performance and analytics'}
          </p>
        </div>
        
        <div className="flex space-x-4">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.$id} value={store.$id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
              <SelectItem value="6months">6 Months</SelectItem>
              <SelectItem value="1year">1 Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Custom Date Range */}
      {selectedPeriod === 'custom' && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Date Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <div className="flex items-center mt-1">
                      {kpi.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                      )}
                      <span className={`text-xs ${kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                        {kpi.change}
                      </span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full bg-gray-100`}>
                    <Icon className={`h-6 w-6 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Sales & Revenue Trend</CardTitle>
            <CardDescription>Monthly performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Sales"
                />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Revenue"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Profit vs Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Profit vs Expenses</CardTitle>
            <CardDescription>Financial performance breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
                <Legend />
                <Bar dataKey="profit" fill="#10B981" name="Profit" />
                <Bar dataKey="expenses" fill="#EF4444" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Store Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Store Performance</CardTitle>
            <CardDescription>Sales comparison across all stores</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={storePerformance} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Sales']} />
                <Bar dataKey="sales" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Financial Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
            <CardDescription>Revenue distribution breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: $${Number(value).toLocaleString()}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>Key insights and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center mb-2">
                <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="font-semibold text-green-800">Strong Growth</h3>
              </div>
              <p className="text-sm text-green-700">
                Revenue increased by 12.5% compared to last quarter, with consistent growth across all stores.
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-2">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-semibold text-blue-800">Team Performance</h3>
              </div>
              <p className="text-sm text-blue-700">
                {statsData?.completedTasks || 0} tasks completed with {statsData?.pendingTasks || 0} still pending across all teams.
              </p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center mb-2">
                <Calendar className="h-5 w-5 text-yellow-600 mr-2" />
                <h3 className="font-semibold text-yellow-800">Operational Efficiency</h3>
              </div>
              <p className="text-sm text-yellow-700">
                All {statsData?.stores || 0} stores are operational with strong performance metrics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};