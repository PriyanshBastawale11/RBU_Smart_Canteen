import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api/api';
import { getUserRoles } from '../utils/auth';

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
  readyTime?: string;
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
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [visibleAdminCount, setVisibleAdminCount] = useState<number>(20);
  const [ordersError, setOrdersError] = useState<string>('');

  const roles = getUserRoles();
  const isAdminOrStaff = roles.includes('ADMIN') || roles.includes('STAFF');

  const parseServerDate = (s?: any): Date | null => {
    if (!s) return null;
    if (s instanceof Date) return isNaN(s.getTime()) ? null : s;
    if (Array.isArray(s)) {
      const [y, m, d, hh = 0, mm = 0, ss = 0, ns = 0] = s as number[];
      const ms = Math.floor((ns || 0) / 1_000_000);
      const dt = new Date(y, (m || 1) - 1, d || 1, hh, mm, ss, ms);
      return isNaN(dt.getTime()) ? null : dt;
    }
    if (typeof s === 'string') {
      const str = s.includes('T') ? s : s.replace(' ', 'T');
      const dt = new Date(str);
      return isNaN(dt.getTime()) ? null : dt;
    }
    try {
      const dt = new Date(s);
      return isNaN(dt.getTime()) ? null : dt;
    } catch {
      return null;
    }
  };

  const toIST = (s?: any) => {
    if (!s) return '';
    const normalized = typeof s === 'string' ? (s.includes('T') ? s : s.replace(' ', 'T')) : s;
    const d = new Date(normalized);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  const resetAvgPrep = async () => {
    try {
      await apiFetch('/api/analytics/average-prep-time/reset', { method: 'POST' });
      const avg = await apiFetch('/api/analytics/average-prep-time');
      setAnalytics(a => ({ ...a, avgPrep: avg }));
    } catch {}
  };

  useEffect(() => {
    apiFetch('/api/menu').then(setMenu).catch(() => {});
    apiFetch('/api/orders')
      .then((o) => { setOrders(o); setOrdersError(''); })
      .catch((err: any) => setOrdersError(err?.message || 'Failed to load orders. Ensure you are logged in as Admin/Staff.'));
    apiFetch('/api/analytics/bestsellers?limit=3')
      .then((bestsellers) => setAnalytics(a => ({ ...a, bestsellers })))
      .catch(() => {});
    apiFetch('/api/analytics/average-prep-time')
      .then((avg) => setAnalytics(a => ({ ...a, avgPrep: avg })))
      .catch(() => {});
    apiFetch('/api/analytics/peak-hours')
      .then((peak) => setAnalytics(a => ({ ...a, peak })))
      .catch(() => {});
    apiFetch('/api/analytics/daily-orders?days=7')
      .then((daily) => setAnalytics(a => ({ ...a, dailyOrders: daily })))
      .catch(() => {});
    apiFetch('/api/analytics/revenue-trend?days=7')
      .then((rev) => setAnalytics(a => ({ ...a, revenue: rev })))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab !== 'orders' || !isAdminOrStaff) return;
    const fetchOrders = () => apiFetch('/api/orders')
      .then((o) => { setOrders(o); setOrdersError(''); })
      .catch((err: any) => setOrdersError(err?.message || 'Failed to load orders. Ensure you are logged in as Admin/Staff.'));
    fetchOrders();
    const id = setInterval(fetchOrders, 10000);
    return () => clearInterval(id);
  }, [activeTab, isAdminOrStaff]);

  // Initialize category selection and reset visible rows on change
  useEffect(() => {
    const unique = Array.from(new Map(menu.map(i => [i.id, i])).values());
    const cats = Array.from(new Set(unique.map(i => i.category || 'Uncategorized'))).sort();
    if (!activeCategory && cats.length) setActiveCategory(cats[0]);
  }, [menu]);

  useEffect(() => { setVisibleAdminCount(20); }, [activeCategory]);

  // Expand the latest month by default when orders update
  useEffect(() => {
    if (!orders || orders.length === 0) return;
    const unique = Array.from(new Map(orders.map(o => [o.id, o])).values());
    const monthKeyFrom = (s?: any) => {
      const d = parseServerDate(s);
      if (!d) return '';
      const str = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      return str.slice(0, 7);
    };
    const keys = Array.from(new Set(unique.map(o => monthKeyFrom(o.orderTime)).filter(Boolean))) as string[];
    if (keys.length === 0) return;
    const latest = keys.sort((a, b) => b.localeCompare(a))[0];
    setExpandedMonths(() => {
      const next: Record<string, boolean> = {};
      keys.forEach(k => next[k] = (k === latest));
      return next;
    });
  }, [orders]);

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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 animate-fadeIn">
      <div className="p-6 max-w-7xl mx-auto animate-slideUp">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">Admin/Canteen Staff Dashboard</h1>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setActiveTab('menu')} className={`px-4 py-2 rounded-full font-semibold transition-all ${activeTab === 'menu' ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow' : 'bg-white/80 hover:bg-white text-gray-700 shadow-sm'}`}>Menu</button>
        <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 rounded-full font-semibold transition-all ${activeTab === 'orders' ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow' : 'bg-white/80 hover:bg-white text-gray-700 shadow-sm'}`}>Orders</button>
        <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-full font-semibold transition-all ${activeTab === 'analytics' ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow' : 'bg-white/80 hover:bg-white text-gray-700 shadow-sm'}`}>Analytics</button>
      </div>
      {/* Menu Management */}
      <div className={`${activeTab === 'menu' ? '' : 'hidden'} mb-10 animate-fadeIn`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">Menu Management</h2>
          <button onClick={() => setShowNewModal(true)} className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-4 py-2 rounded-lg font-semibold shadow hover:from-green-700 hover:to-blue-700">Add New Item</button>
        </div>
        {(() => {
          const unique = Array.from(new Map(menu.map(i => [i.id, i])).values());
          const cats = Array.from(new Set(unique.map(i => i.category || 'Uncategorized'))).sort();
          const current = activeCategory && cats.includes(activeCategory) ? activeCategory : (cats[0] || 'Uncategorized');
          const items = unique.filter(i => (i.category || 'Uncategorized') === current);
          return (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                {cats.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full font-semibold ${current === cat ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow' : 'bg-white/80 hover:bg-white text-gray-700 shadow-sm'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto animate-fadeIn">
                <table className="min-w-full bg-white rounded-xl shadow">
                  <thead>
                    <tr className="bg-blue-100/70">
                      <th className="py-2 px-4 text-left">Name</th>
                      <th className="py-2 px-4 text-left">Price</th>
                      <th className="py-2 px-4 text-center">Available</th>
                      <th className="py-2 px-4 text-center">Prep Time</th>
                      <th className="py-2 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.slice(0, visibleAdminCount).map(item => (
                      <tr key={item.id} className="border-b hover:bg-blue-50 transition-all animate-slideUp">
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
              {items.length > visibleAdminCount && (
                <div className="mt-3">
                  <button onClick={() => setVisibleAdminCount(c => c + 20)} className="bg-white/80 hover:bg-white text-gray-700 shadow px-4 py-2 rounded-full">Show more</button>
                </div>
              )}
            </>
          );
        })()}
      </div>
      {/* Edit Modal */}
      {showEditModal && editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 transition-all duration-200">
          <div className="bg-white rounded-xl p-8 shadow-2xl w-96 relative animate-fadeIn">
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
      <div className={`${activeTab === 'orders' ? '' : 'hidden'} mb-10 animate-fadeIn`}>
        <h2 className="text-2xl font-bold text-blue-700 mb-2">Order Management</h2>
        <div className="text-sm text-gray-500 mb-4">Total orders: {Array.isArray(orders) ? orders.length : 0}</div>
        {!isAdminOrStaff ? (
          <div className="text-red-600 text-sm">This section requires Admin or Staff access. Please login with an Admin/Staff account.</div>
        ) : ordersError ? (
          <div className="text-red-600 text-sm">{ordersError}</div>
        ) : (() => {
          try {
          if (!Array.isArray(orders)) {
            return <div className="text-red-600 text-sm">Orders data is invalid.</div>;
          }
          const uniqueOrders = Array.from(new Map(orders.map(o => [o.id, o])).values());
          const keyFrom = (s?: any) => {
            const d = parseServerDate(s);
            if (!d) return '';
            return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
          };
          const monthKeyFrom = (s?: any) => {
            const d = parseServerDate(s);
            if (!d) return '';
            const str = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            return str.slice(0, 7);
          };

          const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
          const compareDesc = (a: any, b: any) => {
            const da = parseServerDate(a);
            const db = parseServerDate(b);
            const ta = da ? da.getTime() : 0;
            const tb = db ? db.getTime() : 0;
            return tb - ta;
          };
          const todayOrders = uniqueOrders
            .filter(o => keyFrom(o.orderTime) === todayKey)
            .sort((a, b) => compareDesc(a.orderTime, b.orderTime));
          const earlierOrders = uniqueOrders.filter(o => keyFrom(o.orderTime) !== todayKey);

          if (uniqueOrders.length === 0) return <div className="text-gray-500">No orders yet.</div>;

          const groupedByMonth: Record<string, Order[]> = earlierOrders.reduce((acc, o) => {
            const mk = monthKeyFrom(o.orderTime);
            if (!mk) return acc;
            if (!acc[mk]) acc[mk] = [];
            acc[mk].push(o);
            return acc;
          }, {} as Record<string, Order[]>);

          const monthKeys = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

          const renderOrderCard = (order: Order, index: number, total: number) => {
            const d = parseServerDate(order.orderTime as any);
            const timeString = d ? d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) : '-';
            const readyString = order.readyTime ? toIST(order.readyTime) : '';
            const completedString = order.completedTime ? toIST(order.completedTime) : '';
            const dayOrderNumber = total - index;
            return (
              <div key={order.id} className="bg-white/90 rounded-xl shadow-lg border-l-4 border-blue-300/70 hover:shadow-xl transition-all p-4 animate-slideUp">
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
                    <div className="text-gray-600 text-sm mb-1"><span className="font-semibold">Placed at:</span> {timeString}</div>
                    {readyString && <div className="text-gray-600 text-sm mb-1"><span className="font-semibold">Ready at:</span> {readyString}</div>}
                    {completedString && <div className="text-gray-600 text-sm mb-1"><span className="font-semibold">Completed at:</span> {completedString}</div>}
                    <div className="text-gray-700 text-sm mb-1">
                      <span className="font-semibold">Items:</span> {order.items.map(i => i.name).join(', ')}
                    </div>
                    <div className="text-gray-800 font-bold mt-2">Total: ₹{order.totalAmount}</div>
                  </div>
                  <div className="mt-3 md:mt-0 flex flex-wrap gap-2 justify-end">
                    {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                      <>
                        {order.status === 'PLACED' && (
                          <button onClick={() => handleOrderStatus(order.id, 'PREPARING')} className="bg-yellow-400 text-white px-4 py-2 rounded-lg hover:bg-yellow-500 text-sm font-semibold">Start Preparing</button>
                        )}
                        {order.status === 'PREPARING' && (
                          <button onClick={() => handleOrderStatus(order.id, 'READY')} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 text-sm font-semibold">Mark Ready</button>
                        )}
                        {(order.status === 'READY' || order.status === 'PREPARING') && (
                          <button onClick={() => handleOrderStatus(order.id, 'COMPLETED')} className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm font-semibold">Complete Order</button>
                        )}
                        <button onClick={() => handleOrderStatus(order.id, 'CANCELLED')} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm font-semibold">Cancel</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          };

          const allSorted = uniqueOrders.slice().sort((a, b) => compareDesc(a.orderTime, b.orderTime));

          return (
            <div className="space-y-6">
              {todayOrders.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-blue-700 mb-3 bg-blue-50 p-2 rounded-lg sticky top-0 z-10">Today</h3>
                  <div className="space-y-4">
                    {todayOrders.map((o, idx) => renderOrderCard(o, idx, todayOrders.length))}
                  </div>
                </div>
              )}

              {monthKeys.map(mk => {
                const monthOrders = groupedByMonth[mk];
                const labelDate = new Date(mk + '-01');
                const monthLabel = isNaN(labelDate.getTime()) ? mk : labelDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: 'long', year: 'numeric' });

                const days = monthOrders.reduce((acc, o) => {
                  const dk = keyFrom(o.orderTime);
                  if (!dk) return acc;
                  if (!acc[dk]) acc[dk] = [];
                  acc[dk].push(o);
                  return acc;
                }, {} as Record<string, Order[]>);
                const dayKeys = Object.keys(days).sort((a, b) => b.localeCompare(a));
                const expanded = !!expandedMonths[mk];

                return (
                  <div key={mk} className="mb-6">
                    <button onClick={() => setExpandedMonths(s => ({ ...s, [mk]: !s[mk] }))} className="w-full text-left text-lg font-bold text-blue-700 mb-2 bg-blue-50 p-2 rounded-lg">
                      {monthLabel} ({monthOrders.length} orders)
                    </button>
                    {expanded && (
                      <div className="space-y-6">
                        {dayKeys.map(dk => {
                          const d = days[dk].sort((a, b) => compareDesc(a.orderTime, b.orderTime));
                          const any = days[dk][0];
                          const dl = toIST(any.orderTime).split(',')[0] || dk;
                          return (
                            <div key={dk}>
                              <h4 className="text-md font-semibold text-blue-600 mb-2">{dl}</h4>
                              <div className="space-y-4">
                                {d.map((o, idx) => renderOrderCard(o, idx, d.length))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {todayOrders.length === 0 && monthKeys.length === 0 && (
                <div>
                  <h3 className="text-lg font-bold text-blue-700 mb-3 bg-blue-50 p-2 rounded-lg">All Orders</h3>
                  <div className="space-y-4">
                    {allSorted.map((o, idx) => renderOrderCard(o, idx, allSorted.length))}
                  </div>
                </div>
              )}
            </div>
          );
          } catch (err: any) {
            const safeOrders = Array.isArray(orders) ? orders : [];
            return (
              <div className="space-y-2">
                <div className="text-red-600 text-sm">Encountered a rendering issue; showing a simplified list.</div>
                {safeOrders.map((o: any) => (
                  <div key={o.id} className="bg-white rounded p-3 shadow flex justify-between">
                    <div>
                      <div className="font-semibold">Order ID: {o.id}</div>
                      <div className="text-sm text-gray-600">Status: {o.status}</div>
                    </div>
                    <div className="text-sm text-gray-500">Items: {(o.items || []).map((i: any) => i?.name).filter(Boolean).join(', ')}</div>
                  </div>
                ))}
              </div>
            );
          }
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
          <div className="flex items-center justify-between">
            <div className="text-2xl font-extrabold text-yellow-800">{analytics.avgPrep ? `${analytics.avgPrep.toFixed(1)} min` : '--'}</div>
            <button onClick={resetAvgPrep} className="text-sm px-3 py-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white">Reset</button>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-100 to-blue-300 rounded-xl p-6 shadow">
          <h3 className="font-bold text-lg mb-2 text-blue-900">Peak Hours</h3>
          {(() => {
            const entries = analytics.peak ? Object.entries(analytics.peak as Record<string, number>) : [];
            const parseStart = (label: string) => {
              const part = label.split(' - ')[0] || '';
              const [numStr, ampm] = part.split(' ');
              const n = Number(numStr);
              if (Number.isNaN(n)) return 0;
              if ((ampm || '').toUpperCase() === 'AM') return n % 12;
              return (n % 12) + 12;
            };
            const sorted = entries.sort((a, b) => parseStart(a[0]) - parseStart(b[0]));
            const max = Math.max(1, ...sorted.map(([, c]) => Number(c) || 0));
            return (
              <div className="space-y-2">
                {sorted.map(([label, count]) => {
                  const w = Math.max(6, (Number(count) / max) * 100);
                  return (
                    <div key={label} className="flex items-center gap-3" title={`${label}: ${count} orders`}>
                      <div className="w-32 text-sm text-blue-900">{label}</div>
                      <div className="flex-1 bg-blue-200 rounded h-3">
                        <div className="bg-blue-600 h-3 rounded transition-all" style={{ width: `${w}%` }} />
                      </div>
                      <div className="w-10 text-right text-sm text-blue-900">{count}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
      <div className={`mt-6 grid grid-cols-1 md:grid-cols-4 gap-6 ${activeTab === 'analytics' ? '' : 'hidden'}`}>
        {(() => {
          const istNow = new Date();
          const todayKey = istNow.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
          const start = new Date(istNow);
          start.setDate(istNow.getDate() - 6);
          const toIstKey = (s: any) => {
            const d = parseServerDate(s);
            if (!d) return '';
            return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
          };
          const inWindow = (s: any) => {
            const d = parseServerDate(s);
            if (!d) return false;
            const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
            return key >= start.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) && key <= todayKey;
          };
          const last7 = orders.filter(o => inWindow(o.orderTime));
          const last7Completed = last7.filter(o => o.status === 'COMPLETED');
          const revenue7 = last7Completed.reduce((s, o) => s + (o.totalAmount || 0), 0);
          const aov = last7Completed.length ? (revenue7 / last7Completed.length) : 0;
          const completion = last7.length ? (last7Completed.length / last7.length) * 100 : 0;
          const catCounts: Record<string, number> = {};
          last7.forEach(o => o.items.forEach(i => { const c = i.category || 'Other'; catCounts[c] = (catCounts[c] || 0) + 1; }));
          const topCat = Object.entries(catCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || '-';
          return (
            <>
              <div className="bg-gradient-to-br from-purple-100 to-purple-300 rounded-xl p-5 shadow">
                <div className="text-sm text-purple-900">Orders (7d)</div>
                <div className="text-2xl font-extrabold text-purple-900">{last7.length}</div>
              </div>
              <div className="bg-gradient-to-br from-emerald-100 to-emerald-300 rounded-xl p-5 shadow">
                <div className="text-sm text-emerald-900">Completion % (7d)</div>
                <div className="text-2xl font-extrabold text-emerald-900">{completion.toFixed(0)}%</div>
              </div>
              <div className="bg-gradient-to-br from-rose-100 to-rose-300 rounded-xl p-5 shadow">
                <div className="text-sm text-rose-900">Revenue (7d)</div>
                <div className="text-2xl font-extrabold text-rose-900">₹{revenue7.toFixed(0)}</div>
              </div>
              <div className="bg-gradient-to-br from-indigo-100 to-indigo-300 rounded-xl p-5 shadow">
                <div className="text-sm text-indigo-900">Avg Order Value</div>
                <div className="text-2xl font-extrabold text-indigo-900">₹{aov.toFixed(0)}</div>
              </div>
            </>
          );
        })()}
      </div>
      {/* Charts */}
      <div className={`mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 ${activeTab === 'analytics' ? '' : 'hidden'}`}>
        <div className="bg-white rounded-xl p-6 shadow relative" style={{ backgroundImage: 'repeating-linear-gradient(to top, rgba(0,0,0,0.04) 0, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 32px)' }}>
          <h3 className="font-bold text-lg mb-2 text-gray-800">Daily Orders (7 days)</h3>
          {analytics.dailyOrders ? (() => {
            const entries = Object.entries(analytics.dailyOrders as Record<string, number>);
            const max = Math.max(1, ...entries.map(([, v]) => Number(v) || 0));
            return (
              <div className="h-56 flex items-end gap-3">
                {entries.map(([day, count]) => {
                  const scale = 160;
                  const hPx = Number(count) > 0 ? Math.max(12, (Number(count) / max) * scale) : 4;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center" title={`${day}: ${count}`}>
                      <div className="w-full bg-gradient-to-t from-green-500 to-green-300 rounded-t transition-all" style={{ height: `${hPx}px` }} />
                      <div className="text-xs mt-1 text-gray-500">{day.slice(5)}</div>
                      <div className="text-xs text-gray-700">{count}</div>
                    </div>
                  );
                })}
              </div>
            );
          })() : <div className="text-gray-500 text-sm">No data</div>}
        </div>
        <div className="bg-white rounded-xl p-6 shadow relative" style={{ backgroundImage: 'repeating-linear-gradient(to top, rgba(0,0,0,0.04) 0, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 32px)' }}>
          <h3 className="font-bold text-lg mb-2 text-gray-800">Revenue Trend (7 days)</h3>
          {analytics.revenue ? (() => {
            const entries = Object.entries(analytics.revenue as Record<string, number>);
            const max = Math.max(1, ...entries.map(([, v]) => Number(v) || 0));
            return (
              <div className="h-56 flex items-end gap-3">
                {entries.map(([day, amount]) => {
                  const scale = 160;
                  const hPx = Number(amount) > 0 ? Math.max(12, (Number(amount) / max) * scale) : 4;
                  return (
                    <div key={day} className="flex-1 flex flex-col items-center" title={`${day}: ₹${Number(amount).toFixed(0)}`}>
                      <div className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t transition-all" style={{ height: `${hPx}px` }} />
                      <div className="text-xs mt-1 text-gray-500">{day.slice(5)}</div>
                      <div className="text-xs text-gray-700">₹{Number(amount).toFixed(0)}</div>
                    </div>
                  );
                })}
              </div>
            );
          })() : <div className="text-gray-500 text-sm">No data</div>}
        </div>
      </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
