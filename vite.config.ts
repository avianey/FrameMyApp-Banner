import { defineConfig, loadEnv, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { load as loadYaml } from 'js-yaml';

interface AiModelConfig {
  id: string;
  name: string;
  description?: string;
  default?: boolean;
}

interface IaYamlConfig {
  models?: AiModelConfig[];
}

// Alias automatiques si un nom de modèle de config.ia.yaml est un alias convivial
const MODEL_ID_ALIASES: Record<string, string> = {
  'gemini-4-argon': 'gemini-3.1-flash-image',
  'imagen-4': 'gemini-3.1-flash-image',
  'imagen-4.0-generate-001': 'gemini-3.1-flash-image',
  'imagen-4.0-fast-generate-001': 'gemini-3.1-flash-lite-image'
};

function aiBackendPlugin(geminiApiKey: string): Plugin {
  let warnedMissingKey = false;

  const checkAndWarnKey = () => {
    const hasKey = Boolean(geminiApiKey && geminiApiKey.trim().length > 0);
    if (!hasKey && !warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        '\x1b[33m[FrameMyApp AI] ⚠️ Variable d\'environnement GEMINI_API_KEY manquante ou vide. La génération d\'arrière-plan par IA est désactivée.\x1b[0m'
      );
    }
    return hasKey;
  };

  const loadModelsFromConfig = (): AiModelConfig[] => {
    try {
      const configPath = path.resolve(process.cwd(), 'config.ia.yaml');
      if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf-8');
        const parsed = loadYaml(raw) as IaYamlConfig | AiModelConfig[] | null;
        if (Array.isArray(parsed)) {
          return parsed;
        }
        if (parsed && Array.isArray(parsed.models)) {
          return parsed.models;
        }
      }
    } catch (e) {
      console.warn('[FrameMyApp AI] Erreur lors de la lecture de config.ia.yaml :', e);
    }
    return [
      {
        id: 'gemini-3.1-flash-image',
        name: 'Gemini 3.1 Flash Image',
        description: 'Modèle par défaut',
        default: true
      }
    ];
  };

  const listAvailableImageModels = async (apiKey: string): Promise<string[]> => {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const data: any = await res.json();
      const models: any[] = data?.models || [];
      return models
        .map(m => String(m.name || '').replace(/^models\//, ''))
        .filter(name => name.includes('image') || name.includes('imagen'));
    } catch {
      return [];
    }
  };

  const setupMiddleware = (middlewares: any) => {
    checkAndWarnKey();

    middlewares.use('/api/ai/status', (req: any, res: any, next: any) => {
      if (req.method !== 'GET') return next();
      const hasApiKey = checkAndWarnKey();
      const models = loadModelsFromConfig();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ hasApiKey, models }));
    });

    middlewares.use('/api/ai/generate-background', (req: any, res: any, next: any) => {
      if (req.method !== 'POST') return next();

      const hasApiKey = checkAndWarnKey();
      if (!hasApiKey) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'GEMINI_API_KEY manquante sur le serveur' }));
        return;
      }

      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk.toString();
      });

      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const {
            model: requestedModel = 'gemini-2.5-flash-image',
            prompt = '',
            width = 1080,
            height = 1920,
            aspectRatio = '9:16'
          } = payload;

          if (!prompt || !prompt.trim()) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Le prompt est requis' }));
            return;
          }

          const cleanRequested = String(requestedModel).replace(/^models\//, '').trim();
          const targetModel = MODEL_ID_ALIASES[cleanRequested] || cleanRequested;

          const enrichedPrompt = `${prompt.trim()}\n\nBackground format constraints: target resolution ${width}x${height}px, aspect ratio ${aspectRatio}. Generate a clean, high-quality background image at ${width}x${height} (${aspectRatio}).`;

          const validAspectRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
          const normalizedRatio = validAspectRatios.includes(aspectRatio) ? aspectRatio : '1:1';

          const apiKey = geminiApiKey.trim();
          let base64Image: string | null = null;
          let mimeType = 'image/png';
          const errors: string[] = [];

          console.log(
            `\x1b[36m[FrameMyApp AI] ➡️ Requête reçue : model="${requestedModel}"${
              targetModel !== cleanRequested ? ` (résolu en "${targetModel}")` : ''
            }, format=${aspectRatio} (API ratio=${normalizedRatio}, scène=${width}x${height}px)\x1b[0m`
          );
          console.log(`\x1b[90m[FrameMyApp AI] Prompt : "${prompt.trim()}"\x1b[0m`);

          const isImagenModel = targetModel.toLowerCase().startsWith('imagen');

          const tryPredictEndpoint = async (m: string) => {
            const safeUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:predict?key=***`;
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:predict?key=${encodeURIComponent(apiKey)}`;
            const reqPayload = {
              instances: [{ prompt: enrichedPrompt }],
              parameters: {
                sampleCount: 1,
                aspectRatio: normalizedRatio
              }
            };
            console.log(`\x1b[34m[FrameMyApp AI] 🌐 Appel Gemini API POST ${safeUrl}\x1b[0m`);
            const startTime = Date.now();
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reqPayload)
            });
            const elapsed = Date.now() - startTime;
            const data: any = await response.json().catch(() => ({}));
            if (!response.ok) {
              const errMsg = data?.error?.message || `HTTP ${response.status} on :predict`;
              console.error(
                `\x1b[31m[FrameMyApp AI] ❌ Échec :predict (${response.status} en ${elapsed}ms) : ${errMsg}\x1b[0m`
              );
              throw new Error(errMsg);
            }
            const pred = data?.predictions?.[0];
            const b64 = pred?.bytesBase64Encoded || pred?.image?.bytesBase64Encoded;
            if (b64) {
              base64Image = b64;
              mimeType = pred?.mimeType || pred?.image?.mimeType || 'image/png';
              console.log(
                `\x1b[32m[FrameMyApp AI] ✅ Succès :predict (${response.status} en ${elapsed}ms) — image reçue (${mimeType}, ${Math.round(base64Image!.length / 1024)} KB base64)\x1b[0m`
              );
              return true;
            }
            console.warn(
              `\x1b[33m[FrameMyApp AI] ⚠️ Réponse :predict (${response.status} en ${elapsed}ms) sans image dans predictions[0]\x1b[0m`
            );
            return false;
          };

          const tryGenerateContentEndpoint = async (m: string, includeImageConfig: boolean) => {
            const safeUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=***`;
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const generationConfig: Record<string, any> = {
              responseModalities: ['TEXT', 'IMAGE']
            };
            if (includeImageConfig) {
              generationConfig.imageConfig = {
                aspectRatio: normalizedRatio
              };
            }
            const reqPayload = {
              contents: [
                {
                  parts: [{ text: enrichedPrompt }]
                }
              ],
              generationConfig
            };
            console.log(
              `\x1b[34m[FrameMyApp AI] 🌐 Appel Gemini API POST ${safeUrl} (imageConfig=${includeImageConfig})\x1b[0m`
            );
            const startTime = Date.now();
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(reqPayload)
            });
            const elapsed = Date.now() - startTime;
            const data: any = await response.json().catch(() => ({}));
            if (!response.ok) {
              const errMsg = data?.error?.message || `HTTP ${response.status} on :generateContent`;
              console.error(
                `\x1b[31m[FrameMyApp AI] ❌ Échec :generateContent (${response.status} en ${elapsed}ms) : ${errMsg}\x1b[0m`
              );
              throw new Error(errMsg);
            }
            const parts = data?.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if (part?.inlineData?.data) {
                base64Image = part.inlineData.data;
                mimeType = part.inlineData.mimeType || 'image/png';
                console.log(
                  `\x1b[32m[FrameMyApp AI] ✅ Succès :generateContent (${response.status} en ${elapsed}ms) — image reçue (${mimeType}, ${Math.round(base64Image!.length / 1024)} KB base64)\x1b[0m`
                );
                return true;
              }
            }
            console.warn(
              `\x1b[33m[FrameMyApp AI] ⚠️ Réponse :generateContent (${response.status} en ${elapsed}ms) sans inlineData image\x1b[0m`
            );
            return false;
          };

          if (isImagenModel) {
            try {
              await tryPredictEndpoint(targetModel);
            } catch (err: any) {
              errors.push(err.message);
            }
          } else {
            try {
              await tryGenerateContentEndpoint(targetModel, true);
            } catch (err: any) {
              errors.push(err.message);
              // Si imageConfig n'est pas supporté sur ce modèle (ex: gemini-2.0-flash-exp), retenter sans imageConfig
              if (err.message && (err.message.includes('imageConfig') || err.message.includes('Unknown name'))) {
                try {
                  await tryGenerateContentEndpoint(targetModel, false);
                } catch (err2: any) {
                  errors.push(err2.message);
                }
              }
            }
          }

          if (!base64Image) {
            let finalErrMsg = errors[0] || `Aucune image retournée par le modèle ${targetModel}`;
            if (finalErrMsg.includes('not found') || finalErrMsg.includes('not supported')) {
              const available = await listAvailableImageModels(apiKey);
              if (available.length > 0) {
                console.log(
                  `\x1b[33m[FrameMyApp AI] 💡 Modèles image disponibles pour votre clé API : ${available.join(', ')}\x1b[0m`
                );
                finalErrMsg += ` — Modèles image disponibles sur votre clé : ${available.join(', ')}`;
              }
            }
            console.error(`\x1b[31m[FrameMyApp AI] ⛔ Échec final pour "${targetModel}" : ${finalErrMsg}\x1b[0m`);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: finalErrMsg
              })
            );
            return;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              dataUrl: `data:${mimeType};base64,${base64Image}`,
              mimeType
            })
          );
        } catch (err: any) {
          console.error('[FrameMyApp AI] Erreur génération image :', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Erreur interne du serveur' }));
        }
      });
    });
  };

  return {
    name: 'framemyapp-ai-backend',
    configureServer(server) {
      setupMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      setupMiddleware(server.middlewares);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const geminiApiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';

  return {
    plugins: [react(), aiBackendPlugin(geminiApiKey)],
    server: {
      port: 3000,
      open: true
    }
  };
});
