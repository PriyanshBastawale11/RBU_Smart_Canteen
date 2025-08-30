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
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-xl shadow">
            <thead>
              <tr className="bg-blue-100">
                <th className="py-2 px-4">Name</th>
                <th className="py-2 px-4">Category</th>
                <th className="py-2 px-4">Price</th>
                <th className="py-2 px-4">Available</th>
                <th className="py-2 px-4">Prep Time</th>
                <th className="py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {menu.map(item => (
                <tr key={item.id} className="border-b hover:bg-blue-50 transition-all">
                  <td className="py-2 px-4 font-semibold">{item.name}</td>
                  <td className="py-2 px-4">{item.category}</td>
                  <td className="py-2 px-4">₹{item.price}</td>
                  <td className="py-2 px-4">
                    <button onClick={() => handleAvailability(item.id, item.available)} className={`px-3 py-1 rounded-full font-semibold ${item.available ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>{item.available ? 'Yes' : 'No'}</button>
                  </td>
                  <td className="py-2 px-4">{item.estimatedPrepTime} min</td>
                  <td className="py-2 px-4 space-x-2">
                    <button onClick={() => handleEdit(item)} className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        <div className="space-y-4">
          {orders.length === 0 && <div className="text-gray-500">No orders yet.</div>}
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-semibold">Order #{order.id}</div>
                <div className="text-gray-600 text-sm">Status: <span className="font-bold text-blue-700">{order.status}</span></div>
                <div className="text-gray-500 text-sm">Placed: {new Date(order.orderTime).toLocaleString()}</div>
                {order.completedTime && <div className="text-gray-500 text-sm">Completed: {new Date(order.completedTime).toLocaleString()}</div>}
                <div className="text-gray-700 text-sm">Items: {order.items.map(i => i.name).join(', ')}</div>
                <div className="text-gray-800 font-bold">Total: ₹{order.totalAmount}</div>
              </div>
              <div className="mt-2 md:mt-0 flex flex-col gap-2 items-end">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.status === 'COMPLETED' ? 'bg-green-200 text-green-800' : order.status === 'CANCELLED' ? 'bg-red-200 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status}</span>
                {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                  <>
                    <button onClick={() => handleOrderStatus(order.id, 'PREPARING')} className="bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500">Preparing</button>
                    <button onClick={() => handleOrderStatus(order.id, 'READY')} className="bg-blue-400 text-white px-3 py-1 rounded hover:bg-blue-500">Ready</button>
                    <button onClick={() => handleOrderStatus(order.id, 'COMPLETED')} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600">Complete</button>
                    <button onClick={() => handleOrderStatus(order.id, 'CANCELLED')} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Cancel</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
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
