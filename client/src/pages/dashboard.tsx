import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sidebar } from "@/components/sidebar";
import { Phone, TrendingUp, DollarSign, Percent, Search, Plus } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useAuth } from "@/hooks/use-auth";
import { useState, useMemo } from "react";

interface DashboardStats {
  totalCallsToday: number;
  successfulUpsells: number;
  revenueToday: number;
  conversionRate: number;
  callsByStatus: { status: string; count: number }[];
  revenueByDay: { date: string; revenue: number }[];
}

interface AgentPerformance {
  agent: { id: string; username: string; role: string };
  callsHandled: number;
  upsellsClosed: number;
  conversionRate: number;
  revenue: number;
  averageHandlingTime: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState("7"); // Default to last 7 days

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: agentPerformance, isLoading: performanceLoading } = useQuery<AgentPerformance[]>({
    queryKey: ["/api/dashboard/agent-performance"],
  });

  // Filter chart data based on selected date range
  const filteredChartData = useMemo(() => {
    if (!stats?.revenueByDay) return [];
    
    const days = parseInt(dateFilter);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return stats.revenueByDay
      .filter(item => new Date(item.date) >= cutoffDate)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [stats?.revenueByDay, dateFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="bg-white border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Dashboard</h2>
              <p className="text-sm text-muted-foreground">Monitor your telemarketing performance</p>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-md transition-shadow" data-testid="card-calls-today">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Calls Today</p>
                    <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-calls-today">
                      {statsLoading ? "..." : stats?.totalCallsToday || 0}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      <TrendingUp className="inline h-3 w-3 mr-1" />
                      +12% from yesterday
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow" data-testid="card-upsells">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Successful Upsells</p>
                    <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-upsells">
                      {statsLoading ? "..." : stats?.successfulUpsells || 0}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      <TrendingUp className="inline h-3 w-3 mr-1" />
                      +8% from yesterday
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow" data-testid="card-revenue">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Revenue Today</p>
                    <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-revenue">
                      {statsLoading ? "..." : formatCurrency(stats?.revenueToday || 0)}
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      <TrendingUp className="inline h-3 w-3 mr-1" />
                      +15% from yesterday
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow" data-testid="card-conversion">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                    <p className="text-3xl font-bold text-foreground mt-2" data-testid="text-conversion">
                      {statsLoading ? "..." : `${stats?.conversionRate || 0}%`}
                    </p>
                    <p className="text-sm text-red-600 mt-1">
                      <TrendingUp className="inline h-3 w-3 mr-1 rotate-180" />
                      -2% from yesterday
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Percent className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Chart */}
            <Card data-testid="card-sales-chart">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Sales Performance</CardTitle>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-40" data-testid="select-date-filter">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 3 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {statsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2" />
                        Loading chart...
                      </div>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={filteredChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
                          labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Agent Performance */}
            <Card data-testid="card-agent-performance">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Agent Leaderboard</CardTitle>
                  <Button variant="ghost" size="sm" data-testid="button-view-all-agents">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceLoading ? (
                    <div className="text-center text-muted-foreground py-8">
                      Loading performance data...
                    </div>
                  ) : (
                    agentPerformance?.slice(0, 3).map((agent, index) => (
                      <div key={agent.agent.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg" data-testid={`agent-performance-${index}`}>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {getInitials(agent.agent.username)}
                          </div>
                          <div>
                            <p className="font-medium text-sm" data-testid={`agent-name-${index}`}>
                              {agent.agent.username}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {agent.callsHandled} calls • {agent.upsellsClosed} upsells
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600 dark:text-green-400" data-testid={`agent-revenue-${index}`}>
                            {formatCurrency(agent.revenue)}
                          </p>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card data-testid="card-recent-activity">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Activity</CardTitle>
                <Button variant="ghost" size="sm" data-testid="button-view-all-activity">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-4 p-4 hover:bg-secondary rounded-lg transition-colors" data-testid="activity-item-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      System update: Dashboard analytics refreshed
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Real-time data sync • Just now</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4 p-4 hover:bg-secondary rounded-lg transition-colors" data-testid="activity-item-1">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">
                      Welcome to Cultivasia CRM Dashboard
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">System ready for call management • 1 minute ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
