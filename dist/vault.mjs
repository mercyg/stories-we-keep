import {passwordKey,seal,unseal,packStory,unpackStory} from './vault-crypto.mjs';
const CHECK=new TextEncoder().encode('Stories We Keep vault v1');
const fingerprint=rows=>JSON.stringify(rows.map(r=>({...r,audio:r.audio?{size:r.audio.size,type:r.audio.type}:null})));
export function createVault(name='stories-we-keep'){
  let key=null;
  const ready=new Promise((resolve,reject)=>{
    const request=indexedDB.open(name,2);let blocked=false;
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('stories'))db.createObjectStore('stories',{keyPath:'id'});if(!db.objectStoreNames.contains('privacy'))db.createObjectStore('privacy',{keyPath:'id'});};
    request.onsuccess=()=>{if(blocked){request.result.close();return}request.result.onversionchange=()=>request.result.close();resolve(request.result)};
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>{blocked=true;reject(new Error('Close other Stories We Keep tabs, then reload to enable protected storage.'))};
  });
  async function read(store,method,arg){const db=await ready;return new Promise((resolve,reject)=>{const r=db.transaction(store).objectStore(store)[method](arg);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});}
  const metadata=()=>read('privacy','get','vault');
  const rows=()=>read('stories','getAll');
  async function state(){return {configured:Boolean(await metadata()),unlocked:Boolean(key)}}
  async function setup(password){
    if(password.length<12)throw new Error('Use at least 12 characters. A long, unique phrase is best.');
    if(await metadata())throw new Error('Protection already exists. Unlock with your existing password.');
    const old=await rows();
    if(old.some(r=>r.encrypted))throw new Error('Storage needs recovery; existing records were not changed.');
    const salt=crypto.getRandomValues(new Uint8Array(16)),candidate=await passwordKey(password,salt);
    const check=await seal(candidate,CHECK,'vault-check');
    const encrypted=await Promise.all(old.map(async story=>({id:story.id,encrypted:1,...await seal(candidate,await packStory(story),'story:'+story.id)})));
    const db=await ready;
    // Commit metadata and encrypted replacements together; quota errors roll back all changes.
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(['privacy','stories'],'readwrite');let problem;
      const abort=message=>{problem=new Error(message);tx.abort()};
      tx.oncomplete=resolve;tx.onabort=()=>reject(problem||tx.error||new Error('Protection could not be saved. Existing stories were not changed.'));tx.onerror=()=>{};
      const meta=tx.objectStore('privacy').get('vault');
      meta.onsuccess=()=>{if(meta.result){abort('Protection was enabled in another tab. Reload and unlock.');return}
        const current=tx.objectStore('stories').getAll();
        current.onsuccess=()=>{if(fingerprint(current.result)!==fingerprint(old)){abort('Stories changed in another tab. Close it and try again.');return}
          try{tx.objectStore('stories').clear();for(const item of encrypted)tx.objectStore('stories').put(item);
          tx.objectStore('privacy').put({id:'vault',version:1,salt,check});}catch(error){problem=error;tx.abort();}};};
    });
    key=candidate;

  }
  async function unlock(password){
    const meta=await metadata();if(!meta)throw new Error('Set a password first.');
    const candidate=await passwordKey(password,meta.salt);
    try{await unseal(candidate,meta.check,'vault-check')}catch{throw new Error('The password is incorrect, or the protected storage is damaged. No stories were changed.')}
    key=candidate;
  }
  async function list(){
    const meta=await metadata();if(meta&&!key)throw new Error('Unlock your stories first.');
    const data=await rows();
    if(!meta)return data;
    if(data.some(r=>r.encrypted!==1))throw new Error('Unprotected data was written by an older tab. Close old tabs before continuing.');
    return Promise.all(data.map(async record=>unpackStory(await unseal(key,record,'story:'+record.id))));
  }
  async function put(story){
    if(!key||!await metadata())throw new Error('Unlock protected storage before saving.');
    const item={id:story.id,encrypted:1,...await seal(key,await packStory(story),'story:'+story.id)};
    const db=await ready;return new Promise((resolve,reject)=>{const tx=db.transaction('stories','readwrite');tx.objectStore('stories').put(item);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};});
  }
  async function remove(id){if(!key)throw new Error('Unlock your stories first.');const db=await ready;return new Promise((resolve,reject)=>{const tx=db.transaction('stories','readwrite');tx.objectStore('stories').delete(id);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);tx.onerror=()=>{};});}
  return {state,setup,unlock,list,put,remove,lock(){key=null}};
}
