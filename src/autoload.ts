import { Application, Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { logRouterRequest } from './logger';
import { routeRegistry } from './registry';

let regRouter = new Set<string>();
let currentConfig: any = null;
let appInstance: Application;

export const initAutoLoad = (app: Application, config: any, configPath: string) => {
    appInstance = app;
    currentConfig = config;
    
    console.log('[✓] Auto Load Activated');
    
    const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';

    if (!isVercel) {
        if (fs.existsSync(configPath)) {
            fs.watch(configPath, (eventType, filename) => {
                if (filename && eventType === 'change') {
                    console.log(`Config file changed: ${filename}`);
                    try {
                        const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                        currentConfig = newConfig;
                        console.log('[✓] Config reloaded successfully');
                        reloadRouter();
                    } catch (error) {
                        console.error('[ㄨ] Failed to reload config:', error);
                    }
                }
            });
        }
    } else {
        console.log('[i] Running on Vercel: Watch mode disabled.');
    }
};

const reloadRouter = () => {
    console.log('Reloading all routes...');
    regRouter.clear();
    loadRouter(appInstance, currentConfig);
};

export const loadRouter = (app: Application, config: any) => {
    const tags = config.tags;
    const creatorName = config.settings.creator;

    if (!tags) {
        console.error("[!] Error: 'tags' not found in config.json");
        return;
    }

    Object.keys(tags).forEach((category) => {
        const routes = tags[category];
        routes.forEach((route: any) => {
            registerRoute(route, category, creatorName, app);
        });
    });
};

const registerRoute = (route: any, category: string, creatorName?: string, app?: Application) => {
    const targetApp = app || appInstance;
    const targetCreator = creatorName || currentConfig?.settings?.creator;
    
    if (!targetApp || !targetCreator) return;
    
    const routeKey = `${route.method}:${route.endpoint}`;
    
    if (regRouter.has(routeKey)) {
        return;
    }

    const registryKey = `${category}/${route.filename}`;
    const handlerModule = routeRegistry[registryKey];

    if (handlerModule) {
        try {
            const handler = handlerModule.default || handlerModule;

            if (typeof handler === 'function') {
                const wrappedHandler = async (req: Request, res: Response, next: NextFunction) => {
                    logRouterRequest(req, res);

                    const originalJson = res.json;
                    res.json = function (body) {
                        if (body && typeof body === 'object' && !Array.isArray(body)) {
                            const modifiedBody = {
                                creator: targetCreator,
                                ...body
                            };
                            return originalJson.call(this, modifiedBody);
                        }
                        return originalJson.call(this, body);
                    };

                    try {
                        await handler(req, res, next);
                    } catch (err) {
                        console.error(`Error in route ${route.endpoint}:`, err);
                        res.status(500).json({ status: false, error: 'Internal Server Error', message: err instanceof Error ? err.message : String(err) });
                    }
                };

                if (route.method === 'GET') targetApp.get(route.endpoint, wrappedHandler);
                else if (route.method === 'POST') targetApp.post(route.endpoint, wrappedHandler);
                
                regRouter.add(routeKey);
                console.log(`[✓] LOADED: ${route.method} ${route.endpoint}`);
            } else {
                console.error(`[ㄨ] Invalid handler type for ${registryKey}`);
            }
        } catch (error) {
            console.error(`[ㄨ] Failed to load route ${route.endpoint}:`, error);
        }
    } else {
        console.error(`[!] FILE NOT FOUND IN REGISTRY: ${registryKey}`);
    }
};
