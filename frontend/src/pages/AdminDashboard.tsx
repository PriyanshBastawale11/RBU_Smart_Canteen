import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/api';

interface FoodItem {
  id: number;
  name: string;
  category: string;
  price: number;
  available: boolean;
  estimatedPrepTime: number;
  totalOrders: number;
}

interface Order {
  id: number;
  status: string;
  orderTime: string;
  completedTime?: string;
  items: FoodItem[];
  totalAmount: number;
  couponCode?: string;
}

interface Analytics {
  bestsellers?: FoodItem[];
  avgPrep?: number;
  peak?: Record<string, number>;
  dailyOrders?: Record<string, number>;
  revenue?: Record<string, number>;
}

const AdminDashboard: React.FC = () => {
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({});
  const [editItem, setEditItem] = useState<FoodItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newItem, setNewItem] = useState<Partial<FoodItem>>({});
  const [showNewModal, setShowNewModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'analytics'>('menu');

  useEffect(() => {
    apiFetch('/api/menu').then(setMenu);
    apiFetch('/api/orders').then(setOrders);
    apiFetch('/api/analytics/bestsellers?limit=3')
      .then((bestsellers) => setAnalytics(a => ({ ...a, bestsellers })));
    apiFetch('/api/analytics/average-prep-time')
      .then((avg) => setAnalytics(a => ({ ...a, avgPrep: avg })));
    apiFetch('/api/analytics/peak-hours')
      .then((peak) => setAnalytics(a => ({ ...a, peak })));
    apiFetch('/api/analytics/daily-orders?days=7')
      .then((daily) => setAnalytics(a => ({ ...a, dailyOrders: daily })));
    apiFetch('/api/analytics/revenue-trend?days=7')
      .then((rev) => setAnalytics(a => ({ ...a, revenue: rev })));
  }, []);

  // Auto-refresh analytics when Analytics tab is active
  useEffect(() => {
    if (activeTab !== 'analytics') return;
    const interval = setInterval(() => {
      apiFetch('/api/analytics/bestsellers?limit=3')
        .then((bestsellers) => setAnalytics(a => ({ ...a, bestsellers }))).catch(() => {});
      apiFetch('/api/analytics/peak-hours')
        .then((peak) => setAnalytics(a => ({ ...a, peak }))).catch(() => {});
      apiFetch('/api/analytics/daily-orders?days=7')
        .then((daily) => setAnalytics(a => ({ ...a, dailyOrders: daily }))).catch(() => {});
      apiFetch('/api/analytics/revenue-trend?days=7')
        .then((rev) => setAnalytics(a => ({ ...a, revenue: rev }))).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleAvailability = async (id: number, available: boolean) => {
    await apiFetch(`/api/menu/${id}/availability?available=${!available}`, { method: 'PATCH' });
    apiFetch('/api/menu').then(setMenu);
  };

  const handleEdit = (item: FoodItem) => {
    setEditItem(item);
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    await apiFetch(`/api/menu/${editItem.id}`, {
      method: 'PUT',
      body: JSON.stringify(editItem)
    });
    setShowEditModal(false);
    apiFetch('/api/menu').then(setMenu);
  };

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/menu/${id}`, { method: 'DELETE' });
    apiFetch('/api/menu').then(setMenu);
  };

  const handleNewSave = async () => {
    await apiFetch('/api/menu', {
      method: 'POST',
      body: JSON.stringify(newItem)
    });
    setShowNewModal(false);
    setNewItem({});
    apiFetch('/api/menu').then(setMenu);
  };

  const handleOrderStatus = async (orderId: number, status: string) => {
    await apiFetch(`/api/orders/${orderId}/status?status=${status}`, { method: 'PUT' });
    apiFetch('/api/orders').then(setOrders);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-extrabold mb-6 text-blue-800">Admin/Canteen Staff Dashboard</h1>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setActiveTab('menu')} className={`px-4 py-2 rounded-full font-semibold ${activeTab === 'menu' ? 'bg-blue-700 text-white' : 'bg-gray-200'}`}>Menu</button>
        <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 rounded-full font-semibold ${activeTab === 'orders' ? 'bg-blue-700 text-white' : 'bg-gray-200'}`}>Orders</button>
        <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-full font-semibold ${activeTab === 'analytics' ? 'bg-blue-700 text-white' : 'bg-gray-200'}`}>Analytics</button>
      </div>
      {/* Menu Management */}
      <div className={`${activeTab === 'menu' ? '' : 'hidden'} mb-10`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-blue-700">Menu Management</h2>
          <button onClick={() => setShowNewModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:bg-blue-700">Add New Item</button>
        </div>
        {/* Group items by category */}
        {Object.entries(
          menu.reduce((acc, item) => {
            const category = item.category || 'Uncategorized';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
          }, {} as Record<string, FoodItem[]>)
        )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, items]) => (
            <div key={category} className="mb-6">
              <h3 className="text-lg font-bold text-blue-600 mb-3 bg-blue-50 p-2 rounded-lg">{category}</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-xl shadow">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="py-2 px-4 text-left">Name</th>
                      <th className="py-2 px-4 text-left">Price</th>
                      <th className="py-2 px-4 text-center">Available</th>
                      <th className="py-2 px-4 text-center">Prep Time</th>
                      <th className="py-2 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-b hover:bg-blue-50 transition-all">
                        <td className="py-2 px-4 font-semibold">{item.name}</td>
                        <td className="py-2 px-4">₹{item.price}</td>
                        <td className="py-2 px-4 text-center">
                          <button onClick={() => handleAvailability(item.id, item.available)} className={`px-3 py-1 rounded-full font-semibold ${item.available ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{item.available ? 'Yes' : 'No'}</button>
                        </td>
                        <td className="py-2 px-4 text-center">{item.estimatedPrepTime} min</td>
                        <td className="py-2 px-4 space-x-2 text-center">
                          <button onClick={() => handleEdit(item)} className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500">Edit</button>
                          <button onClick={() => handleDelete(item.id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
      </div>
      {/* Edit Modal */}
      {showEditModal && editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 shadow-2xl w-96 relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-red-600 text-2xl" onClick={() => setShowEditModal(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-2">Edit Item</h2>
            <input className="w-full border rounded px-3 py-2 mb-2" value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value } as FoodItem)} placeholder="Name" />
            <input className="w-full border rounded px-3 py-2 mb-2" value={editItem.category} onChange={e => setEditItem({ ...editItem, category: e.target.value } as FoodItem)} placeholder="Category" />
            <input className="w-full border rounded px-3 py-2 mb-2" type="number" value={editItem.price} onChange={e => setEditItem({ ...editItem, price: +e.target.value } as FoodItem)} placeholder="Price" />
            <input className="w-full border rounded px-3 py-2 mb-2" type="number" value={editItem.estimatedPrepTime} onChange={e => setEditItem({ ...editItem, estimatedPrepTime: +e.target.value } as FoodItem)} placeholder="Prep Time (min)" />
            <button onClick={handleEditSave} className="w-full bg-blue-700 text-white py-2 rounded-lg font-semibold mt-4 hover:bg-blue-800">Save</button>
          </div>
        </div>
      )}
      {/* New Item Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 shadow-2xl w-96 relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-red-600 text-2xl" onClick={() => setShowNewModal(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-2">Add New Item</h2>
            <input className="w-full border rounded px-3 py-2 mb-2" value={newItem.name || ''} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="Name" />
            <input className="w-full border rounded px-3 py-2 mb-2" value={newItem.category || ''} onChange={e => setNewItem({ ...newItem, category: e.target.value })} placeholder="Category" />
            <input className="w-full border rounded px-3 py-2 mb-2" type="number" value={newItem.price || ''} onChange={e => setNewItem({ ...newItem, price: +e.target.value })} placeholder="Price" />
            <input className="w-full border rounded px-3 py-2 mb-2" type="number" value={newItem.estimatedPrepTime || ''} onChange={e => setNewItem({ ...newItem, estimatedPrepTime: +e.target.value })} placeholder="Prep Time (min)" />
            <button onClick={handleNewSave} className="w-full bg-blue-700 text-white py-2 rounded-lg font-semibold mt-4 hover:bg-blue-800">Add</button>
          </div>
        </div>
      )}
      {/* Order Management */}
      <div className={`${activeTab === 'orders' ? '' : 'hidden'} mb-10`}>
        <h2 className="text-2xl font-bold text-blue-700 mb-4">Order Management</h2>
        {(() => {
          // Group orders by IST date key and keep a label for display
          const ordersByDate = orders.reduce((acc, order) => {
            const d = new Date(order.orderTime);
            const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
            if (!acc[key]) acc[key] = [];
            acc[key].push(order);
            return acc;
          }, {} as Record<string, Order[]>);

          const dateLabels = Object.keys(ordersByDate).reduce((labels, key) => {
            const anyOrder = ordersByDate[key][0];
            const d = new Date(anyOrder.orderTime);
            labels[key] = d.toLocaleDateString('en-IN', {
              timeZone: 'Asia/Kolkata',
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
            return labels;
          }, {} as Record<string, string>);

          // Sort keys (YYYY-MM-DD) in descending order (most recent first)
          const sortedDates = Object.keys(ordersByDate).sort((a, b) => b.localeCompare(a));

          if (sortedDates.length === 0) {
            return <div className="text-gray-500">No orders yet.</div>;
          }

          return sortedDates.map(dateKey => {
            const dayOrders = ordersByDate[dateKey].sort((a, b) => 
              new Date(b.orderTime).getTime() - new Date(a.orderTime).getTime()
            );
            
            return (
              <div key={dateKey} className="mb-8">
                <h3 className="text-lg font-bold text-blue-600 mb-3 bg-blue-50 p-2 rounded-lg sticky top-0 z-10">
                  {dateLabels[dateKey]} ({dayOrders.length} orders)
                </h3>
                <div className="space-y-4">
                  {dayOrders.map((order, index) => {
                    const orderDate = new Date(order.orderTime);
                    const timeString = orderDate.toLocaleTimeString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    });
                    const dayOrderNumber = dayOrders.length - index;
                    
                    return (
                      <div key={order.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-bold text-lg">Order #{dayOrderNumber}</span>
                              <span className="text-xs text-gray-500">(ID: {order.id})</span>
                            </div>
                            {order.couponCode && (
                              <div className="bg-green-50 text-green-700 px-3 py-1 rounded-lg mb-2 inline-block">
                                <span className="font-semibold">Coupon: {order.couponCode}</span>
                              </div>
                            )}
                            <div className="text-gray-600 text-sm mb-1">
                              <span className="font-semibold">Status:</span> 
                              <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' : order.status === 'PREPARING' ? 'bg-yellow-100 text-yellow-800' : order.status === 'READY' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                {order.status}
                              </span>
                            </div>
                            <div className="text-gray-600 text-sm mb-1">
                              <span className="font-semibold">Placed at:</span> {timeString}
                            </div>
                            <div className="text-gray-700 text-sm mb-1">
                              <span className="font-semibold">Items:</span> {order.items.map(i => i.name).join(', ')}
                            </div>
                            <div className="text-gray-800 font-bold mt-2">
                              Total: ₹{order.totalAmount}
                            </div>
                          </div>
                          <div className="mt-3 md:mt-0 flex flex-wrap gap-2 justify-end">
                            {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                              <>
                                {order.status === 'PLACED' && (
                                  <button onClick={() => handleOrderStatus(order.id, 'PREPARING')} 
                                    className="bg-yellow-400 text-white px-4 py-2 rounded-lg hover:bg-yellow-500 text-sm font-semibold">
                                    Start Preparing
                                  </button>
                                )}
                                {order.status === 'PREPARING' && (
                                  <button onClick={() => handleOrderStatus(order.id, 'READY')} 
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-semibold">
                                    Mark Ready
                                  </button>
                                )}
                                {(order.status === 'READY' || order.status === 'PREPARING') && (
                                  <button onClick={() => handleOrderStatus(order.id, 'COMPLETED')} 
                                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm font-semibold">
                                    Complete Order
                                  </button>
                                )}
                                <button onClick={() => handleOrderStatus(order.id, 'CANCELLED')} 
                                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm font-semibold">
                                  Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
      </div>
      {/* Analytics Panel */}
      <div className={`mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 ${activeTab === 'analytics' ? '' : 'hidden'}`}>
        <div className="bg-gradient-to-br from-green-100 to-green-300 rounded-xl p-6 shadow">
          <h3 className="font-bold text-lg mb-2 text-green-900">Top 3 Bestsellers</h3>
          <ul className="list-disc ml-5 text-green-800">
            {analytics.bestsellers?.map((item: any) => <li key={item.id}>{item.name}</li>)}
          </ul>
        </div>
        <div className="bg-gradient-to-br from-yellow-100 to-yellow-300 rounded-xl p-6 shadow">
          <h3 className="font-bold text-lg mb-2 text-yellow-900">Avg. Prep Time</h3>
          <div className="text-2xl font-extrabold text-yellow-800">{analytics.avgPrep ? `${analytics.avgPrep.toFixed(1)} min` : '--'}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-100 to-blue-300 rounded-xl p-6 shadow">
          <h3 className="font-bold text-lg mb-2 text-blue-900">Peak Hours</h3>
          <ul className="list-disc ml-5 text-blue-800">
            {analytics.peak && Object.entries(analytics.peak).map(([hour, count]: any) => <li key={hour}>{hour}: {count} orders</li>)}
          </ul>
        </div>
      </div>
      {/* Charts */}
      <div className={`mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 ${activeTab === 'analytics' ? '' : 'hidden'}`}>
        <div className="bg-white rounded-xl p-6 shadow">
          <h3 className="font-bold text-lg mb-2 text-gray-800">Daily Orders (7 days)</h3>
          {analytics.dailyOrders ? (
            <div className="h-48 flex items-end gap-3">
              {Object.entries(analytics.dailyOrders).map(([day, count]: any, idx: number) => {
                const max = Math.max(...(Object.values(analytics.dailyOrders as Record<string, number>) as number[]));
                const h = max > 0 ? (count / max) * 100 : 0;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-green-400 rounded-t" style={{ height: `${h}%` }} />
                    <div className="text-xs mt-1 text-gray-500">{day.slice(5)}</div>
                    <div className="text-xs text-gray-700">{count}</div>
                  </div>
                );
              })}
            </div>
          ) : <div className="text-gray-500 text-sm">No data</div>}
        </div>
        <div className="bg-white rounded-xl p-6 shadow">
          <h3 className="font-bold text-lg mb-2 text-gray-800">Revenue Trend (7 days)</h3>
          {analytics.revenue ? (
            <div className="h-48 flex items-end gap-3">
              {Object.entries(analytics.revenue).map(([day, amount]: any) => {
                const max = Math.max(...(Object.values(analytics.revenue as Record<string, number>) as number[]));
                const h = max > 0 ? (amount / max) * 100 : 0;
                return (
                  <div key={day} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-blue-400 rounded-t" style={{ height: `${h}%` }} />
                    <div className="text-xs mt-1 text-gray-500">{day.slice(5)}</div>
                    <div className="text-xs text-gray-700">₹{Number(amount).toFixed(0)}</div>
                  </div>
                );
              })}
            </div>
          ) : <div className="text-gray-500 text-sm">No data</div>}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
