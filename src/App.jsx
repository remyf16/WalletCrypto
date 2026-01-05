import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Wallet, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react';

const App = () => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fonction pour appeler notre backend
  const fetchBinancePortfolio = async () => {
    setLoading(true);
    setError(null);
    try {
      // Appel vers NOTRE serveur (le proxy), pas Binance direct
      const response = await axios.get('/api/portfolio');
      setPortfolio(response.data);
    } catch (err) {
      console.error(err);
      setError("Impossible de récupérer les données. Vérifiez vos clés API sur Render.");
    } finally {
      setLoading(false);
    }
  };

  // Chargement initial
  useEffect(() => {
    fetchBinancePortfolio();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 p-6 font-sans text-slate-200">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-10 border-b border-slate-700 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <Wallet className="w-8 h-8 text-yellow-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Mon Portefeuille Binance</h1>
              <p className="text-slate-400 text-sm flex items-center gap-1">
                <ShieldCheck size={14} className="text-green-500"/> Connexion sécurisée via Backend
              </p>
            </div>
          </div>
          <button 
            onClick={fetchBinancePortfolio}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            {loading ? "Actualisation..." : "Actualiser"}
          </button>
        </header>

        {/* Gestion d'erreur */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 flex items-center gap-3">
            <AlertTriangle /> {error}
          </div>
        )}

        {/* Liste des actifs */}
        <div className="grid gap-4">
          {portfolio.length === 0 && !loading && !error && (
            <div className="text-center py-12 text-slate-500 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
              Votre portefeuille Binance semble vide ou les clés ne sont pas configurées.
            </div>
          )}

          {portfolio.map((asset) => (
            <div key={asset.symbol} className="bg-slate-800 p-5 rounded-xl border border-slate-700 flex justify-between items-center shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg font-bold text-white">
                  {asset.symbol.substring(0, 1)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{asset.symbol}</h3>
                  <span className="text-xs text-slate-400">Actif sur Binance</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono text-white">{asset.total.toLocaleString()}</div>
                <div className="text-xs text-slate-500">
                  Dispo: {asset.free} | Bloqué: {asset.locked}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
