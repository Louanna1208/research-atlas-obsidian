// Run the upstream state-machine regressions against the actual adapted app too.
import {readFile} from 'node:fs/promises';
const upstream=new URL('../vendor/atlas/',import.meta.url);
const adapter=new URL('../src/adapt-app.mjs',import.meta.url).href;
let source=await readFile(new URL('app-state.test.mjs',upstream),'utf8');
source=`import {adaptApp,adaptModel} from ${JSON.stringify(adapter)};\n`+source;
for(const file of ['model.js','workflow-ui.js','guide.js'])source=source.replace(`from './${file}';`,`from ${JSON.stringify(new URL(file,upstream).href)};`);
for(const [file,adapt] of [['app.js','adaptApp'],['model.js','adaptModel']]){
  source=source.replace(`readFile(new URL('./${file}', import.meta.url), 'utf8')`,`readFile(new URL(${JSON.stringify(new URL(file,upstream).href)}), 'utf8').then(${adapt})`);
}
source=source.replace('localStorage: store,',`localStorage: store,
    __atlasStorage: store,
    __atlasHost: {initialError:()=>'',paint(){},status:()=>'',exportFile(){},send(){}},
    __atlasMentoring: {guides:{},fields:{}},`);
source=source.replace(/test\('/g,"test('vault adapter: ");
await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
