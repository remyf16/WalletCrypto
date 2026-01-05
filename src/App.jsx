import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import { format } from 'date-fns';
import { PlusCircle, Wallet, TrendingUp, Trash2, ArrowUpRight, ArrowDownRight, Save } from 'lucide-react';

// Configuration des cryptos disponibles
const AVAILABLE_COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'ripple', symbol: 'XRP', name: 'Ripple' }
];

const App = () => {
  // --- GESTION CLE API ---
  const API_KEY = import.meta.env.VITE_COINGECKO_API_KEY;

  const axiosConfig = {
    headers: API_KEY ? { 'x-cg-demo-api-key': API_KEY } : {}
  };

  // --- 1. ÉTATS ---
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('crypto_wallet_tx');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedCoin, setSelectedCoin] = useState(AVAILABLE_COINS[0].id);
  const [chartData, setChartData] = useState([]);
  const [currentPrices, setCurrentPrices] = useState({}); 
  const [loadingGraph, setLoadingGraph] = useState(false);
  
  const [form, setForm] = useState({
    coinId: AVAILABLE_COINS[0].id,
    amount: '',
    price: '',
    date: new Date().toISOString().split('T')[0]
  });

  // --- 2. EFFETS ---

  // Sauvegarde localStorage
  useEffect(() => {
    localStorage.setItem('crypto_wallet_tx', JSON.stringify(transactions));
  }, [transactions]);

  // Récupération des prix actuels (PnL)
  useEffect(() => {
    const fetchCurrentPrices = async () => {
      try {
        const ids = AVAILABLE_COINS.map(c => c.id).join(',');
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
          ...axiosConfig,
          params: { ids: ids, vs_currencies: 'usd' }
        });
        setCurrentPrices(response.data);
      } catch (error) {
        console.error("Erreur prix:", error);
      }
    };
    fetchCurrentPrices();
  }, []);

  // Récupération du graphique (C'est ici que tu avais l'erreur)
  useEffect(() => {
    const fetchMarketData = async () => {
      setLoadingGraph(true);
      try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${selectedCoin}/market_chart`, {
          ...axiosConfig,
          params: { vs_currency: 'usd', days: '365', interval: 'daily' }
        });
        
        const formattedData = response.data.prices.map(([timestamp, price]) => ({
          date: timestamp,
          price: price,
          formattedDate: format(new Date(timestamp), 'dd/MM/yyyy')
        }));
        
        setChartData(formattedData);
      } catch (error) {
        console.error("Erreur API Graphique:", error);
      } finally {
        setLoadingGraph(false);
      }
    };

    fetchMarketData();
  }, [selectedCoin]); // Dépendance: relance quand on change de crypto

  // --- 3. GESTIONNAIRES ---

  const handleAddTransaction = (e) => {
    e.preventDefault();
    const newTx = {
      id: Date.now(),
      coinId: form.coinId,
      amount: parseFloat(form.amount),
      price: parseFloat(form.price),
      date: form.date,
    };
    setTransactions([...transactions, newTx]);
    setForm({ ...form, amount: '', price: '' });
  };

  const removeTransaction = (id) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  // --- 4. LOGIQUE PnL ---
  const getPnLData = (tx) => {
    const currentPrice = currentPrices[tx.coinId]?.usd;
    if (!currentPrice) return null;

    const initialValue = tx.amount * tx.price;
    const currentValue = tx.amount * currentPrice;
    const pnlValue = currentValue - initialValue;
    const pnlPercent = ((currentPrice - tx.price) / tx.price) * 100;

    return {
      currentPrice,
      pnlValue,
      pnlPercent,
      isPositive: pnlPercent >= 0
    };
  };

  // --- 5. CALCUL POINTS GRAPHIQUE ---
  const purchasePoints = useMemo(() => {
    const relevantTx = transactions.filter(t => t.coinId === selectedCoin);
    
    return relevantTx.map(tx => {
      const txTime = new Date(tx.date).getTime();
      const closestPoint = chartData.reduce((prev, curr) => 
        Math.abs(curr.date - txTime) < Math.abs(prev.date - txTime) ? curr : prev
      , chartData[0]);

      return closestPoint ? {
        ...closestPoint,
        purchasePrice: tx.price,
      } : null;
    }).filter(Boolean);
  }, [transactions, selectedCoin, chartData]);

  // --- RENDER ---
  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto font-sans text-slate-200">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/50">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">CryptoFolio</h1>
            <p className="text-slate-400 text-sm">Suivi PnL & Historique</p>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20">
          <Save size={14} /> Auto-save active
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* GAUCHE : Formulaire & Liste */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800/80 backdrop-blur p-6 rounded-2xl border border-slate-700 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-400">
              <PlusCircle size={20} /> Ajouter Transaction
            </h2>
            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Crypto</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={form.coinId}
                  onChange={e => setForm({...form, coinId: e.target.value})}
                >
                  {AVAILABLE_COINS.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Quantité</label>
                  <input 
                    type="number" step="any" required placeholder="0.00"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Prix Achat ($)</label>
                  <input 
                    type="number" step="any" required placeholder="$$$"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={form.price}
                    onChange={e => setForm({...form, price: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase font-bold text-slate-500 mb-1">Date</label>
                <input 
                  type="date" required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={form.date}
                  onChange={e => setForm({...form, date: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition shadow-lg shadow-blue-900/50">
                Enregistrer
              </button>
            </form>
          </div>

          <div className="bg-slate-800/80 backdrop-blur p-6 rounded-2xl border border-slate-700 shadow-xl max-h-[500px] overflow-y-auto custom-scrollbar">
            <h3 className="text-lg font-semibold mb-4 text-slate-200">Portefeuille</h3>
            <div className="space-y-3">
              {transactions.length === 0 && (
                <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                  Aucune transaction enregistrée.
                </div>
              )}
              {transactions.slice().reverse().map(tx => {
                const coin = AVAILABLE_COINS.find(c => c.id === tx.coinId);
                const pnl = getPnLData(tx); 
                return (
                  <div key={tx.id} className="group relative bg-slate-900/50 hover:bg-slate-900 p-4 rounded-xl border border-slate-700/50 transition-all hover:border-slate-600">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-800 text-blue-400 font-bold px-2 py-0.5 rounded text-sm border border-slate-700">
                          {coin?.symbol}
                        </span>
                        <span className="text-xs text-slate-500">{tx.date}</span>
                      </div>
                      <button onClick={() => removeTransaction(tx.id)} className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-white font-medium">{tx.amount} unités</div>
                        <div className="text-xs text-slate-400">Acheté à ${tx.price}</div>
                      </div>
                      <div className="text-right">
                        {pnl ? (
                          <>
                            <div className={`flex items-center justify-end gap-1 font-bold ${pnl.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                              {pnl.isPositive ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>}
                              {pnl.pnlPercent > 0 ? '+' : ''}{pnl.pnlPercent.toFixed(2)}%
                            </div>
                            <div className={`text-xs ${pnl.isPositive ? 'text-green-400/60' : 'text-red-400/60'}`}>
                              {pnl.pnlValue > 0 ? '+' : ''}${pnl.pnlValue.toFixed(2)}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500 animate-pulse">Calcul...</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DROITE : Graphique */}
        <div className="lg:col-span-2">
          <div className="bg-slate-800/80 backdrop-blur p-6 rounded-2xl border border-slate-700 shadow-xl h-[640px] flex flex-col">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <TrendingUp className="text-blue-400" /> 
                Analyse {AVAILABLE_COINS.find(c => c.id === selectedCoin)?.name}
              </h2>
              <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
                {AVAILABLE_COINS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCoin(c.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      selectedCoin === c.id 
                        ? 'bg-blue-600 text-white shadow' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {c.symbol}
                  </button>
                ))}
              </div>
            </div>

            {loadingGraph ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                Chargement des données...
              </div>
            ) : (
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(unix) => format(new Date(unix), 'MMM yy')}
                      stroke="#64748b"
                      tick={{fill: '#64748b', fontSize: 12}}
                      minTickGap={40}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      stroke="#64748b"
                      tickFormatter={(val) => `$${val.toLocaleString()}`}
                      tick={{fill: '#64748b', fontSize: 12}}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#3b82f6' }}
                      labelFormatter={(label) => format(new Date(label), 'dd MMM yyyy')}
                      formatter={(value) => [`$${value.toLocaleString()}`, 'Prix']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#3b82f6" 
                      strokeWidth={3} 
                      dot={false}
                      activeDot={{ r: 8, strokeWidth: 0 }}
                      fill="url(#colorPrice)"
                    />
                    {purchasePoints.map((point, index) => (
                      <ReferenceDot
                        key={index}
                        x={point.date}
                        y={point.price}
                        r={6}
                        fill="#22c55e"
                        stroke="#0f172a"
                        strokeWidth={3}
                        isFront={true}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
               <span className="w-3 h-3 rounded-full bg-green-500 border-2 border-slate-900 block"></span>
               Vos achats sont marqués par des points verts sur la courbe.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
