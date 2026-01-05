import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config'; // Charge les variables d'environnement

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration pour servir le frontend (fichiers statiques)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// --- LOGIQUE BINANCE ---
const BINANCE_API_KEY = process.env.BINANCE_API_KEY;
const BINANCE_SECRET_KEY = process.env.BINANCE_SECRET_KEY;
const BASE_URL = 'https://api.binance.com';

// Fonction de signature HMAC (Traduction du Python get_signature)
const getSignature = (queryString) => {
  return crypto
    .createHmac('sha256', BINANCE_SECRET_KEY)
    .update(queryString)
    .digest('hex');
};

// Route API : Récupérer le solde du compte
app.get('/api/portfolio', async (req, res) => {
  if (!BINANCE_API_KEY || !BINANCE_SECRET_KEY) {
    return res.status(500).json({ error: "Clés API manquantes sur le serveur" });
  }

  try {
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}&recvWindow=5000`;
    const signature = getSignature(queryString);

    const url = `${BASE_URL}/api/v3/account?${queryString}&signature=${signature}`;

    const response = await axios.get(url, {
      headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
    });

    // On filtre pour ne garder que les cryptos avec un solde > 0
    const activeBalances = response.data.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
    
    // On formate les données pour le frontend
    const formattedData = activeBalances.map(item => ({
      symbol: item.asset,
      free: parseFloat(item.free),
      locked: parseFloat(item.locked),
      total: parseFloat(item.free) + parseFloat(item.locked)
    }));

    res.json(formattedData);

  } catch (error) {
    console.error("Erreur Binance:", error.response?.data || error.message);
    res.status(500).json({ error: "Erreur lors de la récupération du portefeuille" });
  }
});

// Route "Catch-All" : Renvoie l'app React pour n'importe quelle autre requête
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});
