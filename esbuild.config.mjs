import {build} from 'esbuild';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {adaptApp,adaptModel} from './src/adapt-app.mjs';
await mkdir('dist',{recursive:true});
const frame=await build({entryPoints:['src/frame-entry.js'],bundle:true,format:'esm',target:'es2022',platform:'browser',write:false,plugins:[{name:'vault-adapter',setup(b){
  b.onLoad({filter:/vendor[\\/]atlas[\\/]app\.js$/},async args=>({contents:adaptApp(await readFile(args.path,'utf8')),loader:'js'}));
  b.onLoad({filter:/vendor[\\/]atlas[\\/]model\.js$/},async args=>({contents:adaptModel(await readFile(args.path,'utf8')),loader:'js'}));
}}]});
let html=await readFile('vendor/atlas/index.html','utf8');
const css=(await Promise.all(['styles.css','graph.css','workflow.css'].map(p=>readFile('vendor/atlas/'+p,'utf8')))).join('\n');
html=html.replace(/<link[^>]*>/g,'').replace(/<script[^>]*src="app.js"[^>]*><\/script>/,'');
html=html.replace('</head>',`<style>${css}</style></head>`).replace('Same browser, same address.','Saved with your Obsidian vault.').replace('https://github.com/Louanna1208/research-atlas/issues','https://github.com/Louanna1208/research-atlas-obsidian/issues');
html=html.replace('<p class="local-note">Your workspace opens where you left it.', '<p class="local-note">Your workspace opens where you left it.');
html=html.replace('<nav id="navigation"', '<nav id="navigation"');
// Payload contains only bundled, reviewed code and static HTML; no user notes.
await writeFile('dist/frame.json',JSON.stringify({html,script:frame.outputFiles[0].text}));
const assetPaths=['agent-skill/research-atlas-memory.zip','agent-skill/research-atlas-memory/SKILL.md','agent-skill/research-atlas-memory/references/schema.md'];
const assets=Object.fromEntries(await Promise.all(assetPaths.map(async path=>[path,(await readFile('vendor/atlas/'+path)).toString('base64')])));
await writeFile('dist/assets.json',JSON.stringify(assets));
await build({entryPoints:['src/main.ts'],bundle:true,external:['obsidian'],format:'cjs',target:'es2018',platform:'browser',outfile:'main.js',sourcemap:false,minify:false,logLevel:'info'});
