
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import cors from 'cors';

const app = express();
const PORT = 8080;

app.use(cors());

// Proxy API requests to Backend
app.use('/api', createProxyMiddleware({
    target: 'http://localhost:5000/api',
    changeOrigin: true,
    ws: true,
    logLevel: 'debug'
}));

// Proxy all other requests to Frontend
app.use('/', createProxyMiddleware({
    target: 'http://localhost:5173',
    changeOrigin: true,
    ws: true, // Important for Vite HMR
    logLevel: 'debug'
}));

app.listen(PORT, () => {
    console.log(`Proxy server running on http://localhost:${PORT}`);
    console.log(`- /api/* -> http://localhost:5000`);
    console.log(`- /*     -> http://localhost:5173`);
});
