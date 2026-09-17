import {App, ItemView, Modal, Notice, Plugin, PluginSettingTab, Setting, SuggestModal, TFile, WorkspaceLeaf} from 'obsidian';
import frame from '../dist/frame.json';
import assets from '../dist/assets.json';
import {VaultStore, validateFolder, validateRaw, ensureFolder, safeName, MAX_BYTES} from './vault-store.mjs';
import {markdownSnapshot} from './markdown.mjs';
import {frameDocument} from './frame-document.mjs';

const VIEW='research-atlas-workspace';
const CHANNEL='research-atlas-v1';
interface Settings {folder:string}
interface Message {channel:string;token:string;type:string;[key:string]:unknown}

class NotePicker extends SuggestModal<TFile> {
  constructor(app:App, private choose:(file:TFile)=>void) {super(app);this.setPlaceholder('Choose a Markdown note to link');}
  getSuggestions(query:string) {return this.app.vault.getMarkdownFiles().filter(f=>f.path.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0,80);}
  renderSuggestion(file:TFile, el:HTMLElement) {el.setText(file.path);}
  onChooseSuggestion(file:TFile) {this.choose(file);}
}
class ConfirmReload extends Modal {
  constructor(app:App, private confirmed:()=>void){super(app);}
  onOpen(){
    this.contentEl.createEl('h2',{text:'Reopen the saved vault copy?'});
    this.contentEl.createEl('p',{text:'This replaces the open view, including unsaved changes. Export the current workspace first if saving has failed.'});
    new Setting(this.contentEl).addButton(b=>b.setButtonText('Cancel').onClick(()=>this.close())).addButton(b=>b.setButtonText('Reopen saved copy').setWarning().onClick(()=>{this.close();this.confirmed();}));
  }
  onClose(){this.contentEl.empty();}
}

class AtlasView extends ItemView {
  iframe?:HTMLIFrameElement;
  store:VaultStore;
  token=crypto.randomUUID();
  raw:string|null=null;
  loadError='';
  isReady=false;
  closed=false;
  pendingCapture:{file:TFile;selection:string}|null=null;
  constructor(leaf:WorkspaceLeaf, readonly plugin:AtlasPlugin){super(leaf);this.store=new VaultStore(this.app.vault,plugin.settings.folder);}
  getViewType(){return VIEW;}
  getDisplayText(){return 'Research Atlas';}
  getIcon(){return 'network';}
  async onOpen(){
    this.contentEl.empty();this.contentEl.addClass('research-atlas-host');
    const bar=this.contentEl.createDiv({cls:'research-atlas-hostbar'});
    bar.createSpan({text:`Vault · ${this.store.path}`,cls:'research-atlas-location'});
    const capture=bar.createEl('button',{text:'Capture vault note'});
    capture.addEventListener('click',()=>new NotePicker(this.app,f=>this.capture(f)).open());
    const exportButton=bar.createEl('button',{text:'Export linked Markdown'});
    exportButton.addEventListener('click',()=>void this.exportMarkdown());
    const reload=bar.createEl('button',{text:'Reopen saved copy'});
    reload.addEventListener('click',()=>new ConfirmReload(this.app,()=>void this.reload()).open());
    try {this.raw=await this.store.load();} catch(error){this.raw=this.store.baseline;this.loadError=String(error);}
    if(this.closed)return;
    const iframe=this.contentEl.createEl('iframe',{cls:'research-atlas-frame',attr:{title:'Research Atlas workspace',sandbox:'allow-scripts allow-forms allow-downloads'}});
    this.iframe=iframe;
    const ownerWindow=this.contentEl.ownerDocument.defaultView;
    if(!ownerWindow)throw new Error('The workspace window is unavailable.');
    this.registerDomEvent(ownerWindow,'message',event=>{
      if(event.source!==iframe.contentWindow || !event.data || event.data.channel!==CHANNEL || event.data.token!==this.token)return;
      void this.handle(event.data as Message).catch(error=>new Notice(`Research Atlas: ${String(error)}`,10000));
    });
    iframe.srcdoc=frameDocument(frame,this.token);
  }
  post(type:string,payload:Record<string,unknown>={}){this.iframe?.contentWindow?.postMessage({channel:CHANNEL,token:this.token,type,...payload},'*');}
  async handle(message:Message){
    if(this.closed)return;
    if(message.type==='ready'){this.post('init',{raw:this.raw,error:this.loadError});return;}
    if(message.type==='app-ready'){this.isReady=true;if(this.pendingCapture){const {file,selection}=this.pendingCapture;this.pendingCapture=null;this.capture(file,selection);}return;}
    if(message.type==='save'){
      if(typeof message.raw!=='string'||typeof message.seq!=='number'||!Number.isSafeInteger(message.seq))return;
      try {await this.store.save(message.raw);this.raw=message.raw;this.post('saved',{seq:message.seq});}
      catch(error){this.post('save-error',{seq:message.seq,error:String(error)});new Notice('Research Atlas could not save. Export your current work before closing.',10000);}
      return;
    }
    if(message.type==='export'){
      if(typeof message.name!=='string'||typeof message.text!=='string'||new TextEncoder().encode(message.text).length>MAX_BYTES)throw new Error('Invalid or oversized export.');
      const file=await this.exportFile(message.name,message.text);new Notice(`Export saved: ${file.path}`);return;
    }
    if(message.type==='asset'){
      if(typeof message.path!=='string'||!Object.hasOwn(assets,message.path))return;
      const data=(assets as Record<string,string>)[message.path];
      const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
      const file=await this.exportFile(message.path.split('/').pop()!,bytes.buffer);new Notice(`Agent resource saved: ${file.path}`);return;
    }
    if(message.type==='choose-note'&&typeof message.nodeId==='string'){
      new NotePicker(this.app,file=>this.post('note-selected',{nodeId:message.nodeId,path:file.path})).open();return;
    }
    if(message.type==='open-note'&&typeof message.path==='string'){
      const file=this.app.vault.getAbstractFileByPath(message.path);
      if(!(file instanceof TFile)||file.extension!=='md')throw new Error('Linked note not found. Use Link a vault note to select its current location.');
      await this.app.workspace.getLeaf('tab').openFile(file);return;
    }
    if(message.type==='external'&&typeof message.url==='string'){
      const url=new URL(message.url);if(!['https:','http:'].includes(url.protocol))return;
      this.contentEl.ownerDocument.defaultView?.open(url.href,'_blank','noopener,noreferrer');
    }
  }
  capture(file:TFile,selection=''){
    if(!this.isReady){this.pendingCapture={file,selection};return;}
    if(selection.length>30000){new Notice('Select at most 30,000 characters to capture; the linked note can hold the full source.');return;}
    this.post('import-note',{path:file.path,title:file.basename,selection});
  }
  async exportFile(name:string,content:string|ArrayBuffer){
    const folder=`${this.store.folder}/Exports`;await ensureFolder(this.app.vault,folder);
    const ext=name.match(/\.[a-z0-9]{1,8}$/i)?.[0]||'.txt';
    const stem=safeName(name.slice(0,name.endsWith(ext)?-ext.length:undefined));
    const path=`${folder}/${stem}-${crypto.randomUUID()}${ext}`;
    return typeof content==='string'?this.app.vault.create(path,content):this.app.vault.createBinary(path,content);
  }
  async exportMarkdown(){
    try{
      await this.store.tail;
      if(!this.store.baseline)throw new Error('Start a personal workspace before exporting Markdown.');
      if(this.store.blocked)throw new Error('Vault saving is paused. Export your current JSON inside Atlas first; Markdown export uses the last saved workspace.');
      const data=validateRaw(this.store.baseline), folder=`${this.store.folder}/Exports/Atlas snapshot ${crypto.randomUUID()}`;
      await ensureFolder(this.app.vault,folder);
      for(const file of markdownSnapshot(data))await this.app.vault.create(`${folder}/${file.name}`,file.text);
      new Notice(`Linked Markdown snapshot saved to ${folder}.`);
      await this.app.workspace.openLinkText(`${folder}/Atlas index.md`,'',true);
    }catch(error){new Notice(`Research Atlas: ${String(error)}`,10000);}
  }
  async reload(){await this.store.tail;await this.leaf.setViewState({type:'empty'});await this.leaf.setViewState({type:VIEW,active:true});}
  async onClose(){this.closed=true;await this.store.tail;this.contentEl.empty();}
}

class AtlasSettings extends PluginSettingTab {
  constructor(app:App,private plugin:AtlasPlugin){super(app,plugin);}
  display(){
    this.containerEl.empty();
    let draft=this.plugin.settings.folder;
    new Setting(this.containerEl).setName('Workspace folder').setDesc('Vault-relative folder containing workspace.json, Backups, and Exports. Changing this opens a different workspace next time; existing files are not moved.').addText(t=>t.setValue(draft).onChange(v=>draft=v)).addButton(b=>b.setButtonText('Save folder').onClick(async()=>{
      try{this.plugin.settings.folder=validateFolder(draft);await this.plugin.saveData(this.plugin.settings);new Notice('Folder saved. Close and reopen Research Atlas to use it.');}catch(error){new Notice(String(error));}
    }));
    this.containerEl.createEl('p',{text:'Research Atlas is free and works offline. It makes no AI calls and sends no vault content to a server. The complete workspace is stored in JSON; Markdown exports are snapshots. Back up your vault regularly.'});
  }
}
export default class AtlasPlugin extends Plugin {
  settings:Settings={folder:'Research Atlas'};
  async onload(){
    const saved=await this.loadData();
    try{if(saved?.folder)this.settings.folder=validateFolder(saved.folder);}catch{new Notice('Research Atlas folder setting was invalid; using Research Atlas.');}
    this.registerView(VIEW,leaf=>new AtlasView(leaf,this));
    this.addRibbonIcon('network','Open Research Atlas',()=>void this.activate());
    this.addCommand({id:'open-workspace',name:'Open workspace',callback:()=>void this.activate()});
    this.addCommand({id:'capture-current-note',name:'Capture current note or selected text',editorCallback:async(editor,view)=>{
      if(!view.file)return;const file=view.file,selection=editor.getSelection();const atlas=await this.activate();
      atlas?.capture(file,selection);
    }});
    this.addSettingTab(new AtlasSettings(this.app,this));
  }
  async activate(){
    let leaf=this.app.workspace.getLeavesOfType(VIEW)[0];
    if(!leaf){leaf=this.app.workspace.getLeaf('tab');await leaf.setViewState({type:VIEW,active:true});}
    this.app.workspace.setActiveLeaf(leaf,{focus:true});
    return leaf.view instanceof AtlasView?leaf.view:undefined;
  }
}
