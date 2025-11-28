import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  readyTime?: string;
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
  const [prevOpen, setPrevOpen] = useState(false);
  const [visibleMenuCount, setVisibleMenuCount] = useState<number>(15);
  const parseDate = (s?: any) => {
    if (!s) return new Date(NaN);
    if (s instanceof Date) return s;
    if (Array.isArray(s)) {
      const [y, m, d, hh = 0, mi = 0, ss = 0, ns = 0] = s as number[];
      const ms = Math.floor((ns || 0) / 1_000_000);
      const dt = new Date(y, (m || 1) - 1, d || 1, hh, mi, ss, ms);
      return dt;
    }
    if (typeof s === 'number') return new Date(s);
    if (typeof s === 'string') {
      const str = s.includes('T') ? s : s.replace(' ', 'T');
      return new Date(str);
    }
    try {
      return new Date(s);
    } catch {
      return new Date(NaN);
    }
  };
  const toIST = (s?: any) => {
    const d = parseDate(s);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  };

  const orderIndexMap = useMemo(() => {
    const unique = Array.from(new Map(orders.map(o => [o.id, o])).values());
    const sorted = unique.sort((a, b) => parseDate(a.orderTime).getTime() - parseDate(b.orderTime).getTime());
    const map: Record<number, number> = {};
    sorted.forEach((o, idx) => { map[o.id] = idx + 1; });
    return map;
  }, [orders]);

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

  // Reset visible rows when filters change
  useEffect(() => {
    setVisibleMenuCount(15);
  }, [category, search]);

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
              setNotification({ message: `Order #${orderIndexMap[o.id] || o.id} is READY for pickup!`, type: 'success' });
            } else if (o.status === 'COMPLETED') {
              setNotification({ message: `Order #${orderIndexMap[o.id] || o.id} has been COMPLETED. Enjoy!`, type: 'success' });
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
      apiFetch('/api/analytics/peak-hours')
        .then((peak) => setAnalytics((a: any) => ({ ...a, peak })))
        .catch(() => {});
    }, 10000);
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

  const handleMockPay = async (orderId: number) => {
    setPayingOrderId(orderId);
    setPayStatus('');
    try {
      const result = await apiFetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ orderId, method: 'MOCK' })
      });
      if (result?.paymentStatus === 'SUCCESS') {
        setPayStatus('Payment successful!');
        setNotification({ message: 'Payment successful!', type: 'success' });
        setCouponData({
          code: result.couponCode,
          orderId: result.orderId,
          transactionId: result.transactionId,
          amount: result.orderSummary?.totalAmount,
        });
        setShowCouponModal(true);
      } else {
        setPayStatus('Payment failed!');
        setNotification({ message: 'Payment failed!', type: 'error' });
      }
      const uid = getUserId();
      if (uid) apiFetch(`/api/orders/user/${uid}`).then(setOrders);
    } catch (e: any) {
      setPayStatus('Payment failed!');
      setNotification({ message: e?.message || 'Payment failed!', type: 'error' });
    } finally {
      setPayingOrderId(null);
      setTimeout(() => setPayStatus(''), 2000);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayPay = async (order: Order) => {
    setPayingOrderId(order.id);
    setPayStatus('');
    try {
      const ok = await loadRazorpayScript();
      if (!ok || !(window as any).Razorpay) {
        throw new Error('Unable to load payment gateway. Please try again later.');
      }
      const data = await apiFetch('/api/payments/razorpay/order', {
        method: 'POST',
        body: JSON.stringify({ orderId: order.id })
      });

      const options: any = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.razorpayOrderId,
        name: 'RBU Smart Canteen',
        description: `Order #${orderIndexMap[order.id] || order.id}`,
        handler: async (response: any) => {
          try {
            const verifyResp = await apiFetch('/api/payments/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify({
                orderId: order.id,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            if (verifyResp?.paymentStatus === 'SUCCESS') {
              setPayStatus('Payment successful!');
              setNotification({ message: 'Payment successful!', type: 'success' });
              setCouponData({
                code: verifyResp.couponCode,
                orderId: verifyResp.orderId,
                transactionId: verifyResp.transactionId,
                amount: verifyResp.orderSummary?.totalAmount,
              });
              setShowCouponModal(true);
              const uid = getUserId();
              if (uid) apiFetch(`/api/orders/user/${uid}`).then(setOrders);
            } else {
              setPayStatus('Payment failed!');
              setNotification({ message: 'Payment verification failed!', type: 'error' });
            }
          } catch (e: any) {
            setPayStatus('Payment failed!');
            setNotification({ message: e?.message || 'Payment verification failed!', type: 'error' });
          } finally {
            setPayingOrderId(null);
            setTimeout(() => setPayStatus(''), 2000);
          }
        },
        theme: { color: '#16a34a' },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setPayStatus('Payment failed!');
        setNotification({ message: resp?.error?.description || 'Payment was cancelled or failed.', type: 'error' });
        setPayingOrderId(null);
        setTimeout(() => setPayStatus(''), 2000);
      });
      rzp.open();
    } catch (e: any) {
      setPayStatus('Payment failed!');
      setNotification({ message: e?.message || 'Unable to start payment.', type: 'error' });
      setPayingOrderId(null);
      setTimeout(() => setPayStatus(''), 2000);
    }
  };

  const handleCancel = async (orderId: number) => {
    setCancellingOrderId(orderId);
    try {
      await apiFetch(`/api/orders/${orderId}/cancel`, { method: 'PUT' });
      setNotification({ message: 'Order cancelled.', type: 'info' });
      const uid = getUserId();
      if (uid) apiFetch(`/api/orders/user/${uid}`).then(setOrders);
    } catch (e: any) {
      setNotification({ message: e?.message || 'Failed to cancel order.', type: 'error' });
    }
    setCancellingOrderId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 animate-fadeIn">
      <div className="p-6 max-w-7xl mx-auto animate-slideUp">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      {/* User Profile Section */}
      <div className="flex items-center gap-4 mb-8 bg-white/80 backdrop-blur rounded-2xl shadow-lg p-4">
        <div className="w-14 h-14 rounded-full bg-green-200 flex items-center justify-center text-2xl font-bold text-green-800">{initial || 'U'}</div>
        <div>
          <div className="font-bold text-lg text-green-900">{displayName}</div>
          {displayEmail && <div className="text-gray-500 text-sm">{displayEmail}</div>}
        </div>
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">Welcome to RBU Smart Canteen</h1>
      <div className="mb-4 flex gap-2 animate-slideUp">
        <button onClick={() => setActiveTab('menu')} className={`px-4 py-2 rounded-full font-semibold transition-all ${activeTab === 'menu' ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow' : 'bg-white/80 hover:bg-white text-gray-700 shadow-sm'}`}>Menu</button>
        <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 rounded-full font-semibold transition-all ${activeTab === 'orders' ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow' : 'bg-white/80 hover:bg-white text-gray-700 shadow-sm'}`}>Orders</button>
        <button onClick={() => setActiveTab('analytics')} className={`px-4 py-2 rounded-full font-semibold transition-all ${activeTab === 'analytics' ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow' : 'bg-white/80 hover:bg-white text-gray-700 shadow-sm'}`}>Analytics</button>
      </div>
      <div className={`mt-6 grid grid-cols-1 md:grid-cols-3 gap-6 ${activeTab === 'analytics' ? '' : 'hidden'}`}>
        {(() => {
          const istMonthKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
          const monthOrders = orders.filter(o => {
            const d = parseDate((o as any).orderTime);
            if (isNaN(d.getTime())) return false;
            const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
            return key === istMonthKey;
          }).filter(o => o.status === 'COMPLETED');
          const spent = monthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
          const aov = monthOrders.length ? spent / monthOrders.length : 0;
          return (
            <>
              <div className="bg-gradient-to-br from-emerald-100 to-emerald-300 rounded-xl p-5 shadow">
                <div className="text-sm text-emerald-900">This Month Orders</div>
                <div className="text-2xl font-extrabold text-emerald-900">{monthOrders.length}</div>
              </div>
              <div className="bg-gradient-to-br from-rose-100 to-rose-300 rounded-xl p-5 shadow">
                <div className="text-sm text-rose-900">Spent This Month</div>
                <div className="text-2xl font-extrabold text-rose-900">₹{spent.toFixed(0)}</div>
              </div>
              <div className="bg-gradient-to-br from-indigo-100 to-indigo-300 rounded-xl p-5 shadow">
                <div className="text-sm text-indigo-900">Avg Order Value</div>
                <div className="text-2xl font-extrabold text-indigo-900">₹{aov.toFixed(0)}</div>
              </div>
            </>
          );
        })()}
      </div>
      <div className={`mt-6 grid grid-cols-1 md:grid-cols-2 gap-6 ${activeTab === 'analytics' ? '' : 'hidden'}`}>
        <div className="bg-white rounded-xl p-6 shadow relative" style={{ backgroundImage: 'repeating-linear-gradient(to top, rgba(0,0,0,0.04) 0, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 32px)' }}>
          <h3 className="font-bold text-lg mb-2 text-gray-800">Your Daily Orders (7 days)</h3>
          {(() => {
            const today = new Date();
            const days: string[] = [];
            for (let i = 6; i >= 0; i--) {
              const d = new Date(today);
              d.setDate(today.getDate() - i);
              days.push(d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
            }
            const counts: Record<string, number> = Object.fromEntries(days.map(k => [k, 0]));
            orders.forEach(o => {
              const d = parseDate((o as any).orderTime);
              if (isNaN(d.getTime())) return;
              const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
              if (key in counts) counts[key] += 1;
            });
            const entries = Object.entries(counts);
            const max = Math.max(1, ...entries.map(([, v]) => v));
            return (
              <div className="h-56 flex items-end gap-3">
                {entries.map(([day, count]) => {
                  const scale = 160;
                  const hPx = count > 0 ? Math.max(12, (count / max) * scale) : 4;
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
          })()}
        </div>
        <div className="bg-white rounded-xl p-6 shadow">
          <h3 className="font-bold text-lg mb-2 text-gray-800">Your Category Mix (MTD)</h3>
          {(() => {
            const istMonthKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
            const monthOrders = orders.filter(o => {
              const d = parseDate((o as any).orderTime);
              if (isNaN(d.getTime())) return false;
              const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
              return key === istMonthKey;
            });
            const catCounts: Record<string, number> = {};
            monthOrders.forEach(o => o.items.forEach(i => { const c = i.category || 'Other'; catCounts[c] = (catCounts[c] || 0) + 1; }));
            const entries = Object.entries(catCounts).sort((a, b) => (b[1] as number) - (a[1] as number));
            const max = Math.max(1, ...entries.map(([, v]) => Number(v) || 0));
            if (entries.length === 0) return <div className="text-gray-500 text-sm">No data</div>;
            return (
              <div className="space-y-2">
                {entries.map(([cat, count]) => {
                  const w = Math.max(6, (Number(count) / max) * 100);
                  return (
                    <div key={cat} className="flex items-center gap-3" title={`${cat}: ${count}`}>
                      <div className="w-28 text-sm text-gray-800 truncate">{cat}</div>
                      <div className="flex-1 bg-indigo-200 rounded h-3">
                        <div className="bg-gradient-to-r from-indigo-500 to-indigo-300 h-3 rounded" style={{ width: `${w}%` }} />
                      </div>
                      <div className="w-8 text-right text-sm text-gray-800">{count}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
      <div className={`mb-6 flex flex-wrap gap-2 items-center ${activeTab === 'menu' ? '' : 'hidden'}`}>
        <input
          type="text"
          placeholder="Search menu..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-full bg-white/80 shadow focus:outline-none focus:ring-2 focus:ring-green-400 transition-all"
        />
        <button onClick={() => setCategory('')} className={`px-4 py-2 rounded-full font-semibold transition-all ${!category ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow' : 'bg-white/80 hover:bg-white text-gray-700 shadow-sm'}`}>All</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} className={`px-4 py-2 rounded-full font-semibold transition-all ${category === cat ? 'bg-gradient-to-r from-green-600 to-blue-600 text-white shadow' : 'bg-white/80 hover:bg-white text-gray-700 shadow-sm'}`}>{cat}</button>
        ))}
      </div>
      {/* Combo cart and recommendations */}
      <div className={`${activeTab === 'menu' ? '' : 'hidden'} grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 animate-fadeIn`}>
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
      <div className={`${activeTab === 'menu' ? '' : 'hidden'} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 transition-all duration-300 animate-fadeIn`}>
        {Array.from(new Map(filteredMenu.map(i => [i.id, i])).values())
          .slice(0, visibleMenuCount)
          .map(item => (
            <div className="animate-pop">
              <MenuCard key={item.id} {...item} onOrder={handleOrder} onAddToCombo={handleAddToCombo} />
            </div>
          ))}
      </div>
      {activeTab === 'menu' && Array.from(new Map(filteredMenu.map(i => [i.id, i])).values()).length > visibleMenuCount && (
        <div className="mb-10">
          <button
            onClick={() => setVisibleMenuCount(c => c + 15)}
            className="mx-auto block bg-white/80 hover:bg-white text-gray-700 shadow px-4 py-2 rounded-full"
          >
            Show more
          </button>
        </div>
      )}
      {/* Order Modal */}
      {showOrderModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 transition-all duration-200 animate-fadeIn">
          <div className="bg-white/95 backdrop-blur rounded-xl p-8 shadow-2xl w-96 relative animate-pop">
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
      <div className={`mt-10 ${activeTab === 'orders' ? '' : 'hidden'} animate-fadeIn`}>
        <h2 className="text-2xl font-bold mb-4 text-green-700">Your Orders</h2>
        {(() => {
          if (orders.length === 0) return <div className="text-gray-500">No orders yet.</div>;
          const uniqueOrders = Array.from(new Map(orders.map(o => [o.id, o])).values());
          const sorted = uniqueOrders.sort((a, b) => parseDate(b.orderTime).getTime() - parseDate(a.orderTime).getTime());
          // Up to 3 current active orders
          const currentActive = sorted.filter(o => o.status === 'PLACED' || o.status === 'PREPARING' || o.status === 'READY').slice(0, 3);
          const prev = sorted.filter(o => !currentActive.includes(o));
          const Card = ({ order }: { order: Order }) => (
            <div className="bg-white/90 rounded-xl shadow-lg p-4 border-l-4 border-green-300/70 hover:shadow-xl flex flex-col md:flex-row md:items-center md:justify-between transition-all duration-200">
              <div>
                <div className="font-semibold">Order #{orderIndexMap[order.id] || order.id}</div>
                <div className="text-gray-600 text-sm">Status: <span className="font-bold text-green-700">{order.status}</span></div>
                <div className="text-gray-600 text-sm">Placed: {toIST(order.orderTime) || '-'}</div>
                {order.readyTime && (toIST(order.readyTime)) && <div className="text-gray-500 text-sm">Ready: {toIST(order.readyTime)}</div>}
                {order.completedTime && (toIST(order.completedTime)) && <div className="text-gray-500 text-sm">Completed: {toIST(order.completedTime)}</div>}
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
                      onClick={() => handleMockPay(order.id)}
                      disabled={payingOrderId === order.id}
                      className="bg-white border border-blue-400 text-blue-700 px-4 py-1 rounded-lg font-semibold shadow-sm hover:bg-blue-50 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      {payingOrderId === order.id ? 'Processing...' : 'Mock Payment (Demo)'}
                    </button>
                    <button
                      onClick={() => handleRazorpayPay(order)}
                      disabled={payingOrderId === order.id}
                      className="bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-1 rounded-lg font-semibold shadow hover:from-blue-600 hover:to-blue-800 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {payingOrderId === order.id ? 'Processing...' : 'Pay Now (Razorpay)'}
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
          );
          return (
            <div className="space-y-4">
              {currentActive.length > 0 && (
                <div>
                  <div className="text-sm text-gray-500 mb-2">Current Orders</div>
                  <div className="space-y-3">
                    {currentActive.map(co => <Card key={co.id} order={co} />)}
                  </div>
                </div>
              )}
              <div className="bg-white/80 rounded-xl shadow p-4">
                <button onClick={() => setPrevOpen(v => !v)} className="w-full flex justify-between items-center">
                  <span className="font-semibold text-gray-800">Previous Orders</span>
                  <span className="text-sm text-gray-500">{prev.length}</span>
                </button>
                <div className={`${prevOpen ? 'mt-3 space-y-3' : 'hidden'}`}>
                  {prev.map(o => <Card key={o.id} order={o} />)}
                </div>
              </div>
            </div>
          );
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
        <div className="bg-gradient-to-br from-purple-100 to-purple-300 rounded-xl p-6 shadow">
          <h3 className="font-bold text-lg mb-2 text-purple-900">Your Month Stats</h3>
          {(() => {
            const istMonthKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
            const monthOrders = orders.filter(o => {
              const d = parseDate((o as any).orderTime);
              if (isNaN(d.getTime())) return false;
              const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
              return key === istMonthKey;
            }).filter(o => o.status === 'COMPLETED');
            const spent = monthOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
            const counts: Record<string, number> = {};
            monthOrders.forEach(o => o.items.forEach(i => { counts[i.name] = (counts[i.name] || 0) + 1; }));
            const favorite = Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || '-';
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
            <div className="mb-2 text-gray-700">Order #{orderIndexMap[couponData.orderId] || couponData.orderId}</div>
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
    </div>
  );
};

export default StudentDashboard;
