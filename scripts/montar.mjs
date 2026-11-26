// scripts/montar.mjs · Versão 2 · 26/11/2026
// Copia a biblioteca d3 (instalada pelo npm) para a pasta publicada.
import { copyFileSync, mkdirSync } from 'node:fs';

const destino = new URL('../public/vendor/', import.meta.url);
mkdirSync(destino, { recursive: true });
copyFileSync(new URL('../node_modules/d3/dist/d3.min.js', import.meta.url), new URL('d3.min.js', destino));
copyFileSync(new URL('../node_modules/d3/LICENSE', import.meta.url), new URL('d3.LICENSE.txt', destino));
console.log('d3 copiado para public/vendor.');
