import React, { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/api';
import { getUserId, getUsername, getEmail, getToken, decodeToken } from '../utils/auth';
import MenuCard from '../components/MenuCard';
import Notification from '../components/Notification';

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

const StudentDashboard: React.FC = () => {
  const [menu, setMenu] = useState<FoodItem[]>([]);
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [error, setError] = useState<string>('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<any>({});
  const [payingOrderId, setPayingOrderId] = useState<number | null>(null);
  const [payStatus, setPayStatus] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState<number | null>(null);
  const [etaMap, setEtaMap] = useState<Record<number, number>>({});
  const [notification, setNotification] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
  const [couponData, setCouponData] = useState<{ code: string; orderId: number; transactionId?: string; amount?: number } | null>(null);
  const [showCouponModal, setShowCouponModal] = useState(false);
  // Combo & recommendations
  const [comboCart, setComboCart] = useState<number[]>([]);
  const [recoToday, setRecoToday] = useState<FoodItem[]>([]);
  const [recoWith, setRecoWith] = useState<FoodItem[]>([]);
  // Smart notifications
  const [queueSize, setQueueSize] = useState<number>(0);
  const prevStatusesRef = useRef<Map<number, string>>(new Map());
  const lastQueueRef = useRef<number | null>(null);
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'analytics'>('menu');

  // User display info
  const usernameLS = getUsername();
  const emailLS = getEmail();
  const jwt = getToken();
  const sub = jwt ? decodeToken(jwt)?.sub : null;
  const displayName = (usernameLS || sub || 'Student') as string;
  const displayEmail = emailLS || '';
  const initial = displayName.trim().charAt(0).toUpperCase();

  useEffect(() => {
    apiFetch('/api/menu/available')
      .then((data) => {
        setMenu(data);
        setCategories(Array.from(new Set(data.map((item: FoodItem) => item.category))));
      })
      .catch(() => setNotification({ message: 'Failed to load menu', type: 'error' }));
    // Fetch orders
    const uid = getUserId();
    if (!uid) {
      setNotification({ message: 'Session expired. Please login again.', type: 'error' });
      return;
    }
    apiFetch(`/api/orders/user/${uid}`)
      .then(setOrders)
      .catch(() => {});
    // Fetch analytics
    apiFetch('/api/analytics/bestsellers?limit=3')
      .then((bestsellers) => setAnalytics((a: any) => ({ ...a, bestsellers })));
    apiFetch('/api/analytics/peak-hours')
      .then((peak) => setAnalytics((a: any) => ({ ...a, peak })));
    // Fetch recommendations - most ordered today
    apiFetch('/api/recommendations/most-ordered-today?limit=5')
      .then((reco) => setRecoToday(reco))
      .catch(() => {});
  }, []);

  // Poll orders and queue size for smart notifications
  useEffect(() => {
    const uid = getUserId();
    if (!uid) return;
    // Initialize prev status map
    prevStatusesRef.current = new Map(orders.map(o => [o.id, o.status]));
    const pollOrders = setInterval(() => {
      apiFetch(`/api/orders/user/${uid}`).then((latest: Order[]) => {
        // Compare statuses
        latest.forEach(o => {
          const prev = prevStatusesRef.current.get(o.id);
          if (prev && prev !== o.status) {
            if (o.status === 'READY') {
              setNotification({ message: `Order #${o.id} is READY for pickup!`, type: 'success' });
            } else if (o.status === 'COMPLETED') {
              setNotification({ message: `Order #${o.id} has been COMPLETED. Enjoy!`, type: 'success' });
            }
          }
        });
        prevStatusesRef.current = new Map(latest.map(o => [o.id, o.status]));
        setOrders(latest);
      }).catch(() => {});
    }, 8000);
    const pollQueue = setInterval(() => {
      apiFetch('/api/orders/queue-size').then((size: number) => {
        setQueueSize(size);
        const last = lastQueueRef.current;
        lastQueueRef.current = size;
        // Notify on threshold transitions
        if (last === null) return;
        if (size >= 10 && (last < 10)) {
          setNotification({ message: `High queue: ${size} active orders. Expect delays.`, type: 'info' });
        } else if (size <= 2 && (last > 2)) {
          setNotification({ message: 'Queue is short now. Great time to order!', type: 'success' });
        }
      }).catch(() => {});
    }, 10000);
    return () => { clearInterval(pollOrders); clearInterval(pollQueue); };
  }, [orders]);

  // Poll ETA for active orders and refresh periodically
  useEffect(() => {
    const active = orders.filter(o => o.status === 'PLACED' || o.status === 'PREPARING');
    if (active.length === 0) { setEtaMap({}); return; }
    let cancelled = false;
    const fetchEtas = () => {
      Promise.all(active.map(o =>
        apiFetch(`/api/orders/${o.id}/wait-time`).then((m: number) => ({ id: o.id, m })).catch(() => ({ id: o.id, m: null }))
      )).then(results => {
        if (cancelled) return;
        const next: Record<number, number> = {};
        results.forEach(r => { if (r.m !== null && r.m !== undefined) next[r.id] = r.m as number; });
        setEtaMap(next);
      });
    };
    fetchEtas();
    const interval = setInterval(fetchEtas, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [orders]);

  // Poll realtime bestsellers when Analytics tab is active
  useEffect(() => {
    if (activeTab !== 'analytics') return;
    const interval = setInterval(() => {
      apiFetch('/api/analytics/bestsellers?limit=3')
        .then((bestsellers) => setAnalytics((a: any) => ({ ...a, bestsellers })))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const filteredMenu = menu.filter(item =>
    (!category || item.category === category) &&
    (!search || item.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOrder = (id: number) => {
    const item = menu.find(i => i.id === id);
    setSelectedItem(item || null);
    setShowOrderModal(true);
    if (item) {
      apiFetch(`/api/recommendations/frequently-with/${item.id}?limit=5`).then(setRecoWith).catch(() => setRecoWith([]));
    }
  };

  const placeOrder = async () => {
    if (!selectedItem) return;
    try {
      const uid = getUserId();
      if (!uid) throw new Error('User not found');
      await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ userId: uid, foodItemIds: [selectedItem.id] })
      });
      setShowOrderModal(false);
      setSelectedItem(null);
      setNotification({ message: 'Order placed successfully!', type: 'success' });
      apiFetch(`/api/orders/user/${uid}`).then(setOrders);
    } catch (e: any) {
      setNotification({ message: e?.message || 'Order failed!', type: 'error' });
    }
  };

  const handleAddToCombo = (id: number) => {
    setComboCart(prev => prev.includes(id) ? prev : [...prev, id]);
    setNotification({ message: 'Added to combo cart.', type: 'success' });
  };

  const removeFromCombo = (id: number) => {
    setComboCart(prev => prev.filter(x => x !== id));
  };

  const placeComboOrder = async () => {
    if (comboCart.length === 0) return;
    try {
      const uid = getUserId();
      if (!uid) throw new Error('User not found');
      await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ userId: uid, foodItemIds: comboCart })
      });
      setComboCart([]);
      setNotification({ message: 'Combo order placed!', type: 'success' });
      apiFetch(`/api/orders/user/${uid}`).then(setOrders);
    } catch (e: any) {
      setNotification({ message: e?.message || 'Combo order failed!', type: 'error' });
    }
  };

  const handlePay = async (orderId: number) => {
    setPayingOrderId(orderId);
    setPayStatus('');
    try {
      // Placeholder for real Razorpay integration
      // Here you would open Razorpay modal and handle payment
      const resp = await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ orderId, method: 'MOCK' })
      });
      if (resp.paymentStatus === 'SUCCESS') {
        setPayStatus('Payment successful!');
        setNotification({ message: 'Payment successful!', type: 'success' });
        setCouponData({
          code: resp.couponCode,
          orderId: resp.orderId,
          transactionId: resp.transactionId,
          amount: resp.orderSummary?.totalAmount,
        });
        setShowCouponModal(true);
      } else {
        setPayStatus('Payment failed!');
        setNotification({ message: 'Payment failed!', type: 'error' });
      }
      setTimeout(() => setPayStatus(''), 2000);
      const uid = getUserId();
      if (uid) apiFetch(`/api/orders/user/${uid}`).then(setOrders);
    } catch (e: any) {
      setPayStatus('Payment failed!');
      setNotification({ message: e?.message || 'Payment failed!', type: 'error' });
      setTimeout(() => setPayStatus(''), 2000);
    }
    setPayingOrderId(null);
  };

  const handleCancel = async (orderId: number) => {
    setCancellingOrderId(orderId);
    try {
      await apiFetch(`/api/orders/${orderId}/status?status=CANCELLED`, { method: 'PUT' });
      setNotification({ message: 'Order cancelled.', type: 'info' });
      const uid = getUserId();
      if (uid) apiFetch(`/api/orders/user/${uid}`).then(setOrders);
    } catch {
      setNotification({ message: 'Failed to cancel order.', type: 'error' });
    }
    setCancellingOrderId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {/* User Profile Section */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-green-200 flex items-center justify-center text-2xl font-bold text-green-800">{initial || 'U'}</div>
        <div>
          <div className="font-bold text-lg text-green-900">{displayName}</div>
          {displayEmail && <div className="text-gray-500 text-sm">{displayEmail}</div>}
        </div>
      </div>
      <h1 className="text-3xl font-extrabold mb-6 text-green-800">Welcome to RBU Smart Canteen</h1>
      <div className="mb-4 flex gap-2">
        <button onClick={() => setActiveTab('menu')} className={`px-4 py-2 rounded-full font-semibold ${activeTab === 'menu' ? 'bg-green-700 text-white' : 'bg-gray-200'}`}>Menu</button>
        <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 rounded-full font-semibold ${activeTab === 'orders' ? 'bg-green-700 text-white' : 'bg-gray-200'}`}>Orders</button>
        <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-full font-semibold ${activeTab === 'analytics' ? 'bg-green-700 text-white' : 'bg-gray-200'}`}>Analytics</button>
      </div>
      <div className={`mb-6 flex flex-wrap gap-2 items-center ${activeTab === 'menu' ? '' : 'hidden'}`}>
        <input
          type="text"
          placeholder="Search menu..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
        />
        <button onClick={() => setCategory('')} className={`px-4 py-2 rounded-full font-semibold ${!category ? 'bg-green-700 text-white' : 'bg-gray-200'}`}>All</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} className={`px-4 py-2 rounded-full font-semibold ${category === cat ? 'bg-green-700 text-white' : 'bg-gray-200'}`}>{cat}</button>
        ))}
      </div>
      {/* Combo cart and recommendations */}
      <div className={`${activeTab === 'menu' ? '' : 'hidden'} grid grid-cols-1 md:grid-cols-2 gap-6 mb-6`}>
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-bold text-lg mb-2 text-green-800">Combo Cart</h3>
          {comboCart.length === 0 ? (
            <div className="text-gray-500 text-sm">No items yet. Add items using "Add to Combo".</div>
          ) : (
            <ul className="divide-y">
              {comboCart.map(id => {
                const it = menu.find(m => m.id === id);
                if (!it) return null;
                return (
                  <li key={id} className="py-2 flex justify-between items-center">
                    <span>{it.name} <span className="text-gray-500">₹{it.price}</span></span>
                    <button onClick={() => removeFromCombo(id)} className="text-red-600 text-sm">Remove</button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3 flex justify-between items-center">
            <div className="font-bold">Total: ₹{menu.filter(m => comboCart.includes(m.id)).reduce((s, m) => s + m.price, 0)}</div>
            <button onClick={placeComboOrder} disabled={comboCart.length === 0} className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-300">Place Combo Order</button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-bold text-lg mb-2 text-blue-800">Recommended Today</h3>
          {recoToday.length === 0 ? <div className="text-gray-500 text-sm">No data yet.</div> : (
            <div className="space-y-2">
              {recoToday.map(r => (
                <div key={r.id} className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-gray-500 text-sm">₹{r.price}</div>
                  </div>
                  <button onClick={() => handleAddToCombo(r.id)} className="text-sm bg-blue-600 text-white px-3 py-1 rounded">Add</button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 text-xs text-gray-500">Queue: {queueSize}</div>
        </div>
      </div>
      <div className={`${activeTab === 'menu' ? '' : 'hidden'} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 transition-all duration-300`}>
        {filteredMenu.map(item => (
          <MenuCard key={item.id} {...item} onOrder={handleOrder} onAddToCombo={handleAddToCombo} />
        ))}
      </div>
      {/* Order Modal */}
      {showOrderModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 transition-all duration-200">
          <div className="bg-white rounded-xl p-8 shadow-2xl w-96 relative animate-fadeIn">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-red-600 text-2xl" onClick={() => setShowOrderModal(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-2">Order: {selectedItem.name}</h2>
            <div className="mb-2">Price: <span className="font-semibold">₹{selectedItem.price}</span></div>
            <div className="mb-2">Est. Prep Time: {selectedItem.estimatedPrepTime} min</div>
            <button onClick={placeOrder} className="w-full bg-green-700 text-white py-2 rounded-lg font-semibold mt-4 hover:bg-green-800 transition-all">Confirm Order</button>
            <button onClick={() => { handleAddToCombo(selectedItem.id); setShowOrderModal(false); }} className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold mt-2 hover:bg-blue-700 transition-all">Add to Combo</button>
            {recoWith.length > 0 && (
              <div className="mt-4">
                <div className="font-semibold mb-2">Frequently bought with {selectedItem.name}</div>
                <div className="space-y-2">
                  {recoWith.map(r => (
                    <div key={r.id} className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{r.name}</div>
                        <div className="text-gray-500 text-sm">₹{r.price}</div>
                      </div>
                      <button onClick={() => handleAddToCombo(r.id)} className="text-sm bg-blue-600 text-white px-3 py-1 rounded">Add</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Order Tracking */}
      <div className={`mt-10 ${activeTab === 'orders' ? '' : 'hidden'}`}>
        <h2 className="text-2xl font-bold mb-4 text-green-700">Your Orders</h2>
        <div className="space-y-4">
          {orders.length === 0 && <div className="text-gray-500">No orders yet.</div>}
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow p-4 flex flex-col md:flex-row md:items-center md:justify-between transition-all duration-200">
              <div>
                <div className="font-semibold">Order #{order.id}</div>
                <div className="text-gray-600 text-sm">Status: <span className="font-bold text-green-700">{order.status}</span></div>
                <div className="text-gray-600 text-sm">Placed: {new Date(order.orderTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
                {order.completedTime && <div className="text-gray-500 text-sm">Completed: {new Date(order.completedTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>}
                {order.couponCode && (
                  <div className="mt-1 inline-block bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-semibold">Coupon: {order.couponCode}</div>
                )}
                <div className="text-gray-700 text-sm">Items: {order.items.map(i => i.name).join(', ')}</div>
                <div className="text-gray-800 font-bold">Total: ₹{order.totalAmount}</div>
                {(order.status === 'PLACED' || order.status === 'PREPARING') && (
                  <div className="text-blue-700 text-sm mt-1">ETA: {etaMap[order.id] !== undefined ? `${etaMap[order.id]} min` : 'calculating...'}</div>
                )}
              </div>
              <div className="mt-2 md:mt-0 flex flex-col gap-2 items-end">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.status === 'COMPLETED' ? 'bg-green-200 text-green-800' : order.status === 'CANCELLED' ? 'bg-red-200 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{order.status}</span>
                {order.status === 'PLACED' && (
                  <>
                    <button
                      onClick={() => handlePay(order.id)}
                      disabled={payingOrderId === order.id}
                      className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-1 rounded-lg font-semibold shadow hover:from-blue-600 hover:to-blue-800 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {payingOrderId === order.id ? 'Paying...' : 'Pay Now'}
                    </button>
                    <button
                      onClick={() => handleCancel(order.id)}
                      disabled={cancellingOrderId === order.id}
                      className="bg-gradient-to-r from-red-400 to-red-600 text-white px-4 py-1 rounded-lg font-semibold shadow hover:from-red-500 hover:to-red-700 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {cancellingOrderId === order.id ? 'Cancelling...' : 'Cancel'}
                    </button>
                  </>
                )}
                {payStatus && payingOrderId === order.id && <div className="text-green-700 text-xs mt-1">{payStatus}</div>}
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
        <div className="bg-gradient-to-br from-blue-100 to-blue-300 rounded-xl p-6 shadow">
          <h3 className="font-bold text-lg mb-2 text-blue-900">Peak Hours</h3>
          <ul className="list-disc ml-5 text-blue-800">
            {analytics.peak && Object.entries(analytics.peak).map(([hour, count]: any) => <li key={hour}>{hour}: {count} orders</li>)}
          </ul>
        </div>
        <div className="bg-gradient-to-br from-purple-100 to-purple-300 rounded-xl p-6 shadow">
          <h3 className="font-bold text-lg mb-2 text-purple-900">Your Month Stats</h3>
          {(() => {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthOrders = orders.filter(o => new Date(o.orderTime) >= monthStart);
            const spent = monthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
            const counts: Record<string, number> = {};
            monthOrders.forEach(o => o.items.forEach(i => { counts[i.name] = (counts[i.name] || 0) + 1; }));
            const favorite = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
            return (
              <ul className="text-purple-900 space-y-1">
                <li><span className="font-semibold">Orders:</span> {monthOrders.length}</li>
                <li><span className="font-semibold">Spent:</span> ₹{spent.toFixed(0)}</li>
                <li><span className="font-semibold">Favorite:</span> {favorite}</li>
              </ul>
            );
          })()}
        </div>
      </div>
      {/* Coupon Modal */}
      {showCouponModal && couponData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 shadow-2xl w-96 relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-red-600 text-2xl" onClick={() => setShowCouponModal(false)}>&times;</button>
            <h2 className="text-2xl font-bold mb-4 text-green-800">Payment Success</h2>
            <div className="mb-2 text-gray-700">Order #{couponData.orderId}</div>
            {couponData.amount !== undefined && (
              <div className="mb-2 text-gray-700">Amount Paid: <span className="font-semibold">₹{couponData.amount}</span></div>
            )}
            {couponData.transactionId && (
              <div className="mb-4 text-gray-500 text-sm">Txn: {couponData.transactionId}</div>
            )}
            <div className="mb-2 text-gray-700">Your Coupon Code:</div>
            <div className="text-3xl font-extrabold tracking-widest text-green-700 bg-green-100 px-4 py-2 rounded text-center select-all">
              {couponData.code}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
