import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Truck, Calendar, User, TrendingUp } from "lucide-react";
import axios from "axios";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function InventoryManager() {
  const [state, setState] = useState({ residents: [], items: [] });
  const [activeTab, setActiveTab] = useState('inventory');
  const [selectedResidentId, setSelectedResidentId] = useState('');
  const [residentInput, setResidentInput] = useState('');
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState(0);
  const [newMin, setNewMin] = useState(0);
  const [newSource, setNewSource] = useState('購入');
  const [purchaseInputs, setPurchaseInputs] = useState({});
  const [priceInputs, setPriceInputs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const MAX_RESIDENTS = 60;
  const DIAPER_TYPES = ['Mテープ','Lテープ','LLテープ','Mパンツ','Lパンツ','尿取りパッド小','尿取りパッド大','おしりふき','防水シーツ','その他'];

  // API Functions
  const fetchResidents = async () => {
    try {
      const response = await axios.get(`${API}/residents`);
      return response.data;
    } catch (error) {
      console.error('Error fetching residents:', error);
      return [];
    }
  };

  const fetchItems = async (residentId = null) => {
    try {
      const url = residentId ? `${API}/items?resident_id=${residentId}` : `${API}/items`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching items:', error);
      return [];
    }
  };

  const createResident = async (name) => {
    try {
      const response = await axios.post(`${API}/residents`, { name });
      return response.data;
    } catch (error) {
      console.error('Error creating resident:', error);
      throw error;
    }
  };

  const updateResidentName = async (id, name) => {
    try {
      const response = await axios.put(`${API}/residents/${id}`, { name });
      return response.data;
    } catch (error) {
      console.error('Error updating resident:', error);
      throw error;
    }
  };

  const deleteResidentAPI = async (id) => {
    try {
      await axios.delete(`${API}/residents/${id}`);
    } catch (error) {
      console.error('Error deleting resident:', error);
      throw error;
    }
  };

  const createItem = async (itemData) => {
    try {
      const response = await axios.post(`${API}/items`, itemData);
      return response.data;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  };

  const deleteItemAPI = async (id) => {
    try {
      await axios.delete(`${API}/items/${id}`);
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  };

  const adjustQuantity = async (id, delta) => {
    try {
      const response = await axios.post(`${API}/items/${id}/adjust-quantity?delta=${delta}`);
      return response.data;
    } catch (error) {
      console.error('Error adjusting quantity:', error);
      throw error;
    }
  };

  const addUsage = async (id, qty) => {
    try {
      const response = await axios.post(`${API}/items/${id}/usage`, { qty });
      return response.data;
    } catch (error) {
      console.error('Error adding usage:', error);
      throw error;
    }
  };

  const addPurchase = async (id, qty, price) => {
    try {
      const response = await axios.post(`${API}/items/${id}/purchase`, { qty, price });
      return response.data;
    } catch (error) {
      console.error('Error adding purchase:', error);
      throw error;
    }
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [residents, items] = await Promise.all([
          fetchResidents(),
          fetchItems()
        ]);
        
        setState({ residents, items });
        
        if (residents.length > 0 && !selectedResidentId) {
          setSelectedResidentId(residents[0].id);
        }
      } catch (error) {
        setError('データの読み込みに失敗しました');
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const formatCurrency = (amount) => {
    return `¥${amount.toLocaleString()}`;
  };

  const getMonthKey = (date) => date.slice(0, 7); // YYYY-MM

  const addResident = async () => {
    const name = residentInput.trim();
    if (!name || state.residents.length >= MAX_RESIDENTS) return;
    
    try {
      const newResident = await createResident(name);
      setState(prev => ({ ...prev, residents: [...prev.residents, newResident] }));
      setResidentInput('');
      setSelectedResidentId(newResident.id);
    } catch (error) {
      setError('利用者の追加に失敗しました');
    }
  };

  const updateResidentNameHandler = async (id, name) => {
    try {
      await updateResidentName(id, name);
      setState(prev => ({
        ...prev,
        residents: prev.residents.map(r => (r.id === id ? { ...r, name } : r)),
      }));
    } catch (error) {
      setError('利用者名の更新に失敗しました');
    }
  };

  const deleteResident = async (id) => {
    if (state.residents.length === 1) return; // 最低1人は残す
    
    try {
      await deleteResidentAPI(id);
      setState(prev => ({
        ...prev,
        residents: prev.residents.filter(r => r.id !== id),
        items: prev.items.filter(i => i.residentId !== id)
      }));
      if (selectedResidentId === id) {
        setSelectedResidentId(state.residents.find(r => r.id !== id)?.id || '');
      }
    } catch (error) {
      setError('利用者の削除に失敗しました');
    }
  };

  const addItem = async () => {
    if (!newName.trim() || !selectedResidentId) return;
    
    try {
      const itemData = {
        residentId: selectedResidentId,
        name: newName.trim(),
        quantity: newQty,
        used: 0,
        min: newMin,
        source: newSource,
      };
      
      const newItem = await createItem(itemData);
      setState(prev => ({ ...prev, items: [...prev.items, newItem] }));
      setNewName(''); 
      setNewQty(0); 
      setNewMin(0);
    } catch (error) {
      setError('アイテムの追加に失敗しました');
    }
  };

  const updateQty = async (id, delta) => {
    try {
      const updatedItem = await adjustQuantity(id, delta);
      setState(prev => ({
        ...prev,
        items: prev.items.map(it => it.id === id ? updatedItem : it),
      }));
    } catch (error) {
      setError('在庫数の更新に失敗しました');
    }
  };

  const updateUsed = async (id, delta) => {
    if (delta > 0) {
      try {
        const updatedItem = await addUsage(id, delta);
        setState(prev => ({
          ...prev,
          items: prev.items.map(it => it.id === id ? updatedItem : it),
        }));
      } catch (error) {
        setError('使用量の更新に失敗しました');
      }
    } else {
      // Handle negative delta by adjusting used count locally
      setState(prev => ({
        ...prev,
        items: prev.items.map(it =>
          it.id === id ? { ...it, used: Math.max(0, it.used + delta) } : it,
        ),
      }));
    }
  };

  const deleteItem = async (id) => {
    try {
      await deleteItemAPI(id);
      setState(prev => ({ ...prev, items: prev.items.filter(it => it.id !== id) }));
    } catch (error) {
      setError('アイテムの削除に失敗しました');
    }
  };

  const handlePurchase = async (id) => {
    const qty = parseInt(purchaseInputs[id] || '0', 10);
    const price = parseFloat(priceInputs[id] || '0');
    if (!qty) return;
    
    try {
      const updatedItem = await addPurchase(id, qty, price);
      setState(prev => ({
        ...prev,
        items: prev.items.map(it => it.id === id ? updatedItem : it),
      }));
      setPurchaseInputs(prev => ({ ...prev, [id]: '' }));
      setPriceInputs(prev => ({ ...prev, [id]: '' }));
    } catch (error) {
      setError('仕入れの追加に失敗しました');
    }
  };

  const getResidentStats = (residentId) => {
    const items = state.items.filter(i => i.residentId === residentId);
    const totalUsed = items.reduce((sum, item) => sum + item.used, 0);
    const totalPurchased = items.reduce((sum, item) => 
      sum + item.purchases.reduce((pSum, p) => pSum + p.qty, 0), 0
    );
    const totalCost = items.reduce((sum, item) => 
      sum + item.purchases.reduce((pSum, p) => pSum + (p.price || 0), 0), 0
    );
    
    // 月別統計を作成
    const monthlyStats = {};
    items.forEach(item => {
      // 仕入れデータ
      item.purchases.forEach(p => {
        const month = getMonthKey(p.date);
        if (!monthlyStats[month]) {
          monthlyStats[month] = { purchased: 0, used: 0, cost: 0 };
        }
        monthlyStats[month].purchased += p.qty;
        monthlyStats[month].cost += p.price || 0;
      });
      
      // 使用データ
      item.usageHistory.forEach(u => {
        const month = getMonthKey(u.date);
        if (!monthlyStats[month]) {
          monthlyStats[month] = { purchased: 0, used: 0, cost: 0 };
        }
        monthlyStats[month].used += u.qty;
      });
    });
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonth = monthlyStats[currentMonth] || { purchased: 0, used: 0, cost: 0 };

    return {
      totalUsed,
      totalPurchased,
      totalCost,
      monthlyStats,
      thisMonth,
      itemCount: items.length,
      lowStockItems: items.filter(i => i.quantity <= i.min).length
    };
  };

  const getAllStats = () => {
    const allStats = state.residents.map(r => ({
      resident: r,
      stats: getResidentStats(r.id)
    }));

    const grandTotal = allStats.reduce((acc, { stats }) => ({
      totalUsed: acc.totalUsed + stats.totalUsed,
      totalPurchased: acc.totalPurchased + stats.totalPurchased,
      totalCost: acc.totalCost + stats.totalCost,
      thisMonthCost: acc.thisMonthCost + stats.thisMonth.cost,
      thisMonthUsed: acc.thisMonthUsed + stats.thisMonth.used
    }), { totalUsed: 0, totalPurchased: 0, totalCost: 0, thisMonthCost: 0, thisMonthUsed: 0 });

    return { allStats, grandTotal };
  };

  const getMonthlyData = () => {
    const monthlyData = {};
    
    // 全利用者のデータを月別に集計
    state.residents.forEach(resident => {
      const stats = getResidentStats(resident.id);
      Object.entries(stats.monthlyStats).forEach(([month, data]) => {
        if (!monthlyData[month]) {
          monthlyData[month] = { 
            month, 
            purchased: 0, 
            used: 0, 
            cost: 0,
            residents: {} 
          };
        }
        monthlyData[month].purchased += data.purchased;
        monthlyData[month].used += data.used;
        monthlyData[month].cost += data.cost;
        monthlyData[month].residents[resident.name] = data;
      });
    });
    
    return Object.values(monthlyData)
      .sort((a, b) => b.month.localeCompare(a.month))
      .slice(0, 12);
  };

  if (loading) {
    return (
      <div className="max-w-full mx-auto p-3 space-y-4 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">読み込み中...</div>
        </div>
      </div>
    );
  }

  const residentItems = state.items.filter(i => i.residentId === selectedResidentId);
  const currentResident = state.residents.find(r => r.id === selectedResidentId);
  const { allStats, grandTotal } = getAllStats();
  const monthlyData = getMonthlyData();

  return (
    <div className="max-w-full mx-auto p-3 space-y-4 bg-gray-50 min-h-screen">
      {/* エラーメッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <span 
            className="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer"
            onClick={() => setError('')}
          >
            ×
          </span>
        </div>
      )}

      {/* ヘッダー - iPhone対応 */}
      <h1 className="text-xl font-bold text-gray-800 text-center">在庫・使用量管理システム</h1>
      
      {/* タブナビゲーション - iPhone最適化 */}
      <div className="grid grid-cols-4 bg-gray-200 p-1 rounded-lg gap-1">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`py-3 px-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'inventory'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          📦 在庫管理
        </button>
        <button
          onClick={() => setActiveTab('residents')}
          className={`py-3 px-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'residents'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          👥 利用者
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`py-3 px-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'stats'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          📊 統計
        </button>
        <button
          onClick={() => setActiveTab('monthly')}
          className={`py-3 px-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'monthly'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          📅 月別
        </button>
      </div>

      {/* 概要統計 - iPhone用グリッド */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="text-center">
            <p className="text-xs text-gray-600">総使用量</p>
            <p className="text-lg font-bold text-red-600">{grandTotal.totalUsed}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="text-center">
            <p className="text-xs text-gray-600">総仕入量</p>
            <p className="text-lg font-bold text-green-600">{grandTotal.totalPurchased}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="text-center">
            <p className="text-xs text-gray-600">総仕入金額</p>
            <p className="text-sm font-bold text-blue-600">{formatCurrency(grandTotal.totalCost)}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="text-center">
            <p className="text-xs text-gray-600">今月金額</p>
            <p className="text-sm font-bold text-yellow-600">{formatCurrency(grandTotal.thisMonthCost)}</p>
          </div>
        </div>
      </div>

      {activeTab === 'inventory' && (
        <>
          {/* 利用者選択 - iPhone最適化 */}
          <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">利用者選択:</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-3 bg-white text-base"
                value={selectedResidentId}
                onChange={e => setSelectedResidentId(e.target.value)}
              >
                <option value="">選択してください</option>
                {state.residents.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {currentResident && (
                <p className="text-sm text-gray-600 text-center">
                  (商品数: {residentItems.length}件)
                </p>
              )}
            </div>
          </div>

          {/* 新しい在庫追加 - iPhone最適化 */}
          {selectedResidentId && (
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
              <h2 className="text-lg font-semibold text-gray-800 text-center">
                新しい在庫を追加 ({currentResident?.name})
              </h2>
              <div className="space-y-3">
                <input
                  list="diaper-list"
                  placeholder="商品名"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                />
                <datalist id="diaper-list">
                  {DIAPER_TYPES.map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    placeholder="初期数量"
                    value={newQty}
                    onChange={e => setNewQty(parseInt(e.target.value || '0', 10))}
                    min="0"
                    className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                  />
                  <input
                    type="number"
                    placeholder="最小在庫"
                    value={newMin}
                    onChange={e => setNewMin(parseInt(e.target.value || '0', 10))}
                    min="0"
                    className="border border-gray-300 rounded-lg px-3 py-3 text-base"
                  />
                  <select
                    className="border border-gray-300 rounded-lg px-3 py-3 bg-white text-base"
                    value={newSource}
                    onChange={e => setNewSource(e.target.value)}
                  >
                    <option value="購入">購入</option>
                    <option value="サンプル">サンプル</option>
                  </select>
                </div>
                <button
                  onClick={addItem}
                  disabled={!newName.trim()}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors font-medium"
                >
                  追加
                </button>
              </div>
            </div>
          )}

          {/* 在庫一覧 - iPhone最適化 */}
          {selectedResidentId && (
            <div className="space-y-3">
              {residentItems.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <p className="text-gray-500 text-center">
                    この利用者の在庫がまだ登録されていません。<br />
                    上記フォームから新しい在庫を追加してください。
                  </p>
                </div>
              ) : (
                residentItems.map(i => (
                  <div
                    key={i.id}
                    className={`rounded-lg shadow-sm bg-white p-4 ${
                      i.quantity <= i.min ? 'border-2 border-red-500' : 'border border-gray-200'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-lg text-gray-800">{i.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                              {i.source}
                            </span>
                            {i.quantity <= i.min && (
                              <span className="text-red-600 text-xs font-medium bg-red-50 px-2 py-1 rounded">
                                在庫僅少
                              </span>
                            )}
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteItem(i.id)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-center">
                          <span className="text-gray-500 block">現在庫</span>
                          <span className="font-bold text-lg">{i.quantity}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-gray-500 block">使用累計</span>
                          <span className="font-bold text-lg">{i.used}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-gray-500 block">最小在庫</span>
                          <span className="font-bold text-lg">{i.min}</span>
                        </div>
                      </div>

                      {/* 操作ボタン - iPhone最適化 */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-2">
                          <span className="text-xs text-gray-500 block text-center">在庫調整</span>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => updateQty(i.id, -1)}
                              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <Minus className="w-4 h-4 mx-auto" />
                            </button>
                            <button 
                              onClick={() => updateQty(i.id, 1)}
                              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              <Plus className="w-4 h-4 mx-auto" />
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <span className="text-xs text-blue-600 block text-center">使用</span>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => updateUsed(i.id, -1)}
                              className="flex-1 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Minus className="w-4 h-4 mx-auto" />
                            </button>
                            <button 
                              onClick={() => updateUsed(i.id, 1)}
                              className="flex-1 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Plus className="w-4 h-4 mx-auto" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 仕入入力 - iPhone最適化 */}
                      <div className="space-y-2">
                        <span className="text-xs text-gray-500 block">仕入</span>
                        <div className="grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            className="border border-gray-300 rounded-lg px-3 py-2 text-base"
                            placeholder="数量"
                            value={purchaseInputs[i.id] || ''}
                            onChange={e => setPurchaseInputs(prev => ({ ...prev, [i.id]: e.target.value }))}
                            min="1"
                          />
                          <input
                            type="number"
                            className="border border-gray-300 rounded-lg px-3 py-2 text-base"
                            placeholder="金額"
                            value={priceInputs[i.id] || ''}
                            onChange={e => setPriceInputs(prev => ({ ...prev, [i.id]: e.target.value }))}
                            min="0"
                          />
                          <button
                            onClick={() => handlePurchase(i.id)}
                            disabled={!purchaseInputs[i.id] || parseInt(purchaseInputs[i.id]) <= 0}
                            className="py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                          >
                            <Truck className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      </div>

                      {/* 仕入履歴 */}
                      {i.purchases.length > 0 && (
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                            仕入履歴 ({i.purchases.length}件)
                          </summary>
                          <div className="mt-2 bg-gray-50 rounded-lg p-3">
                            <div className="space-y-1 text-sm">
                              {i.purchases.slice().reverse().slice(0, 3).map((p, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{p.date}</span>
                                  <span className="font-medium">
                                    +{p.qty} {p.price ? `(${formatCurrency(p.price)})` : ''}
                                  </span>
                                </div>
                              ))}
                              {i.purchases.length > 3 && (
                                <div className="text-gray-500 text-xs">...他{i.purchases.length - 3}件</div>
                              )}
                            </div>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!selectedResidentId && state.residents.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm p-4">
              <p className="text-yellow-800 text-center py-4">
                利用者を選択してください
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === 'residents' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 text-center">利用者管理</h2>
          
          {/* 新しい利用者追加 */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold mb-3">新しい利用者を追加</h3>
            <div className="space-y-3">
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-3 text-base"
                placeholder="利用者名"
                value={residentInput}
                onChange={e => setResidentInput(e.target.value)}
              />
              <button
                onClick={addResident}
                disabled={!residentInput.trim() || state.residents.length >= MAX_RESIDENTS}
                className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors font-medium"
              >
                <User className="w-4 h-4 inline mr-2" />
                追加 ({state.residents.length}/{MAX_RESIDENTS})
              </button>
            </div>
          </div>

          {/* 利用者一覧 */}
          <div className="space-y-3">
            {state.residents.map(resident => {
              const stats = getResidentStats(resident.id);
              const items = state.items.filter(i => i.residentId === resident.id);
              return (
                <div key={resident.id} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base font-semibold mr-2"
                      value={resident.name}
                      onChange={e => updateResidentNameHandler(resident.id, e.target.value)}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedResidentId(resident.id);
                          setActiveTab('inventory');
                        }}
                        className="px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        在庫管理
                      </button>
                      {state.residents.length > 1 && (
                        <button
                          onClick={() => deleteResident(resident.id)}
                          className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <p className="text-lg font-bold text-blue-600">{stats.itemCount}</p>
                      <p className="text-xs text-gray-600">商品種類</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-lg font-bold text-green-600">{stats.totalPurchased}</p>
                      <p className="text-xs text-gray-600">総仕入量</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-1 text-sm">今月実績</h4>
                      <div className="text-xs space-y-1">
                        <p>仕入: <span className="font-bold">{stats.thisMonth.purchased}</span></p>
                        <p>使用: <span className="font-bold">{stats.thisMonth.used}</span></p>
                        <p>金額: <span className="font-bold">{formatCurrency(stats.thisMonth.cost)}</span></p>
                      </div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-1 text-sm">在庫状況</h4>
                      <div className="text-xs">
                        {stats.lowStockItems > 0 ? (
                          <p className="text-red-600 font-bold">⚠ {stats.lowStockItems}件 在庫注意</p>
                        ) : (
                          <p className="text-green-600">✓ 在庫正常</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 text-center">統計分析</h2>
          <div className="space-y-4">
            {allStats.map(({ resident, stats }) => (
              <div key={resident.id} className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="text-lg font-semibold mb-3 text-center">{resident.name}</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xl font-bold text-blue-600">{stats.itemCount}</p>
                    <p className="text-xs text-gray-600">商品種類</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold text-green-600">{stats.totalPurchased}</p>
                    <p className="text-xs text-gray-600">総仕入量</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-xl font-bold text-red-600">{stats.totalUsed}</p>
                    <p className="text-xs text-gray-600">総使用量</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-lg font-bold text-yellow-600">{formatCurrency(stats.totalCost)}</p>
                    <p className="text-xs text-gray-600">総仕入金額</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">今月の実績</h4>
                    <div className="text-sm space-y-1">
                      <p>仕入量: <span className="font-bold">{stats.thisMonth.purchased}</span></p>
                      <p>使用量: <span className="font-bold">{stats.thisMonth.used}</span></p>
                      <p>仕入金額: <span className="font-bold">{formatCurrency(stats.thisMonth.cost)}</span></p>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold mb-2 text-sm">その他</h4>
                    <div className="text-sm space-y-1">
                      <p>在庫切れ注意: <span className="font-bold text-red-600">{stats.lowStockItems}件</span></p>
                      <p>平均単価: <span className="font-bold">
                        {stats.totalPurchased > 0 ? formatCurrency(Math.round(stats.totalCost / stats.totalPurchased)) : '¥0'}
                      </span></p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 text-center">月別分析</h2>
          {monthlyData.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <p className="text-gray-500 text-center">
                まだ月別データがありません。<br />
                仕入れや使用を記録すると、こちらに月別の統計が表示されます。
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {monthlyData.map(monthData => (
                <div key={monthData.month} className="bg-white rounded-lg shadow-sm p-4">
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold flex items-center justify-center gap-2 mb-2">
                      <Calendar className="w-5 h-5" />
                      {monthData.month}月の実績
                    </h3>
                    <div className="text-sm text-center space-y-1">
                      <p><span className="text-green-600">仕入: {monthData.purchased}個</span></p>
                      <p><span className="text-red-600">使用: {monthData.used}個</span></p>
                      <p><span className="text-blue-600 font-semibold">金額: {formatCurrency(monthData.cost)}</span></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <p className="text-lg font-bold text-green-600">{monthData.purchased}</p>
                      <p className="text-xs text-gray-600">仕入量</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-lg font-bold text-red-600">{monthData.used}</p>
                      <p className="text-xs text-gray-600">使用量</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-bold text-blue-600">{formatCurrency(monthData.cost)}</p>
                      <p className="text-xs text-gray-600">仕入金額</p>
                    </div>
                  </div>

                  {/* 利用者別詳細 */}
                  <details className="mb-3">
                    <summary className="cursor-pointer text-sm font-semibold text-gray-800 mb-2">
                      利用者別詳細
                    </summary>
                    <div className="grid grid-cols-1 gap-2">
                      {Object.entries(monthData.residents).map(([residentName, data]) => (
                        <div key={residentName} className="p-2 bg-gray-50 rounded-lg">
                          <h5 className="font-medium text-sm mb-1">{residentName}</h5>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center">
                              <span className="font-bold text-green-600">{data.purchased}</span>
                              <p className="text-gray-600">仕入</p>
                            </div>
                            <div className="text-center">
                              <span className="font-bold text-red-600">{data.used}</span>
                              <p className="text-gray-600">使用</p>
                            </div>
                            <div className="text-center">
                              <span className="font-bold text-blue-600">{formatCurrency(data.cost)}</span>
                              <p className="text-gray-600">金額</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* 分析情報 */}
                  {monthData.purchased > 0 && monthData.used > 0 && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>在庫バランス:</span>
                          <span className={monthData.purchased >= monthData.used ? 'text-green-600 font-bold' : 'text-orange-600 font-bold'}>
                            {monthData.purchased >= monthData.used ? '✓ 適正' : '⚠ 使用過多'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>差分 (仕入-使用):</span>
                          <span className={monthData.purchased - monthData.used >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                            {monthData.purchased - monthData.used > 0 ? '+' : ''}{monthData.purchased - monthData.used}個
                          </span>
                        </div>
                        {monthData.cost > 0 && monthData.used > 0 && (
                          <div className="flex justify-between">
                            <span>使用量あたり単価:</span>
                            <span className="font-bold">{formatCurrency(Math.round(monthData.cost / monthData.used))}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* 月別サマリー */}
              {monthlyData.length > 1 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-sm p-4">
                  <h3 className="text-lg font-semibold mb-3 text-blue-800 flex items-center justify-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    月別分析サマリー
                  </h3>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-lg font-bold text-green-600">
                        {Math.round(monthlyData.reduce((sum, m) => sum + m.purchased, 0) / monthlyData.length)}
                      </p>
                      <p className="text-xs text-gray-600">月平均仕入量</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-lg font-bold text-red-600">
                        {Math.round(monthlyData.reduce((sum, m) => sum + m.used, 0) / monthlyData.length)}
                      </p>
                      <p className="text-xs text-gray-600">月平均使用量</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg">
                      <p className="text-sm font-bold text-blue-600">
                        {formatCurrency(Math.round(monthlyData.reduce((sum, m) => sum + m.cost, 0) / monthlyData.length))}
                      </p>
                      <p className="text-xs text-gray-600">月平均金額</p>
                    </div>
                  </div>

                  {monthlyData.length >= 2 && (
                    <div className="p-3 bg-white rounded-lg">
                      <h4 className="font-semibold mb-2 text-sm text-center">前月比トレンド</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>仕入量:</span>
                          <span className={
                            monthlyData[0].purchased >= monthlyData[1].purchased 
                              ? 'text-green-600 font-bold' 
                              : 'text-red-600 font-bold'
                          }>
                            {monthlyData[0].purchased >= monthlyData[1].purchased ? '↗' : '↘'} 
                            {Math.abs(monthlyData[0].purchased - monthlyData[1].purchased)}個
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>使用量:</span>
                          <span className={
                            monthlyData[0].used >= monthlyData[1].used 
                              ? 'text-red-600 font-bold' 
                              : 'text-green-600 font-bold'
                          }>
                            {monthlyData[0].used >= monthlyData[1].used ? '↗' : '↘'} 
                            {Math.abs(monthlyData[0].used - monthlyData[1].used)}個
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>金額:</span>
                          <span className={
                            monthlyData[0].cost >= monthlyData[1].cost 
                              ? 'text-red-600 font-bold' 
                              : 'text-green-600 font-bold'
                          }>
                            {monthlyData[0].cost >= monthlyData[1].cost ? '↗' : '↘'} 
                            {formatCurrency(Math.abs(monthlyData[0].cost - monthlyData[1].cost))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
