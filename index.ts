import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';

// 1. IMPORT DIRECT (Bypass Autoload untuk Vercel)
import bratHandler from './router/maker/brat';
// Import handler lain di sini jika ingin didaftarkan manual
// import tiktokHandler from './router/download/tiktok';

const app: Application = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', true);

// Mencari file config di berbagai kemungkinan path (Vercel vs Lokal)
const configPaths = [
    path.join(process.cwd(), 'src', 'config.json'),
    path.join(__dirname, 'src', 'config.json'),
    path.join(__dirname, '..', 'src', 'config.json'),
    '/var/task/src/config.json'
];

let configPath = '';
for (const p of configPaths) {
    if (fs.existsSync(p)) {
        configPath = p;
        break;
    }
}

if (!configPath) {
    console.error('[✗] Config file not found');
    process.exit(1);
}

let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const visitor_db = path.join('/tmp', 'visitors.json');
const recentRequests: string[] = [];

// Helper Functions
const visit = (): number => {
    try {
        if (fs.existsSync(visitor_db)) {
            return JSON.parse(fs.readFileSync(visitor_db, 'utf-8')).count;
        }
        return parseInt(config.settings.visitors || "0");
    } catch { return 0; }
};

const incrementVisitor = () => {
    try {
        let count = visit() + 1;
        fs.writeFileSync(visitor_db, JSON.stringify({ count }));
    } catch {}
};

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
};

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger & Recent Requests
app.use((req: Request, res: Response, next: NextFunction) => {
    res.on('finish', () => {
        const ignored = ['/stats', '/stats/data', '/src', '/docs', '/config', '/favicon.ico', '/'];
        if (!ignored.some(p => req.path.startsWith(p) || req.path === '/')) {
            const logLine = `[${req.method}] [${res.statusCode}] ${req.protocol}://${req.get('host')}${req.originalUrl.split('=')[0]}=`;
            recentRequests.push(logLine);
            if (recentRequests.length > 50) recentRequests.shift();
        }
    });
    next();
});

// Static Files
app.use(express.static(path.join(process.cwd(), 'public')));
app.use('/src', express.static(path.join(process.cwd(), 'src')));

// --- CUSTOM ROUTING LOGIC ---

// Interceptor untuk menyuntikkan creator name ke JSON response
const injectCreator = (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    res.json = function (body) {
        if (body && typeof body === 'object' && !Array.isArray(body)) {
            return originalJson.call(this, { creator: config.settings.creator, ...body });
        }
        return originalJson.call(this, body);
    };
    next();
};

// 2. DAFTARKAN ENDPOINT SECARA MANUAL (Pasti tembus Vercel)
app.get('/api/maker/brat', injectCreator, async (req: Request, res: Response) => {
    try {
        await bratHandler(req, res);
    } catch (err: any) {
        res.status(500).json({ status: false, message: err.message });
    }
});

// API Dasar
app.get('/config', (req, res) => {
    const currentConfig = { ...config };
    currentConfig.settings.visitors = visit().toString();
    res.json({ creator: config.settings.creator, ...currentConfig });
});

app.get('/stats/data', (req, res) => {
    const totalMem = os.totalmem();
    const usedMem = totalMem - os.freemem();
    res.json({
        status: true,
        server: {
            uptime: formatUptime(os.uptime()),
            memory: { total: formatBytes(totalMem), used: formatBytes(usedMem), percent: Math.round((usedMem / totalMem) * 100) },
            cpu: { model: os.cpus()[0].model, cores: os.cpus().length }
        },
        requests: recentRequests
    });
});

// Pages
app.get('/', (req, res) => { incrementVisitor(); res.sendFile(path.join(process.cwd(), 'public', 'landing.html')); });
app.get('/docs', (req, res) => { res.sendFile(path.join(process.cwd(), 'public', 'docs.html')); });
app.get('/stats', (req, res) => { res.sendFile(path.join(process.cwd(), 'public', 'stats.html')); });

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ status: false, creator: config.settings.creator, message: "Route not found" });
});

// Server Listen (Hanya untuk Lokal)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
