import test from 'node:test';
import assert from 'node:assert/strict';
import {indexedDB,IDBObjectStore} from 'fake-indexeddb';
import {createVault} from '../dist/vault.mjs';
globalThis.indexedDB=indexedDB;
async function open(name,version=2){return new Promise((ok,no)=>{const r=indexedDB.open(name,version);r.onupgradeneeded=()=>r.result.createObjectStore('stories',{keyPath:'id'});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function all(db){return new Promise((ok,no)=>{const r=db.transaction('stories').objectStore('stories').getAll();r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function write(db,value){return new Promise((ok,no)=>{const tx=db.transaction('stories','readwrite');tx.objectStore('stories').put(value);tx.oncomplete=ok;tx.onabort=()=>no(tx.error)})}

test('legacy migration is atomic; locked/reloaded vault rejects access and wrong password preserves data',async()=>{
 const name='migration';const legacy=await open(name,1);
 await write(legacy,{id:'private',title:'Grandmother private',text:'ትዝታ',audio:new Blob(['original voice'],{type:'audio/webm'})});legacy.close();
 const vault=createVault(name);await vault.setup('test-only unique password');
 const db=await open(name),raw=await all(db);
 assert.deepEqual(Object.keys(raw[0]).sort(),['data','encrypted','id','iv']);assert.equal(raw[0].encrypted,1);
 assert.equal((await vault.list())[0].title,'Grandmother private');
 vault.lock();await assert.rejects(vault.list(),/Unlock/);await assert.rejects(vault.put({id:'new',text:'no'}),/Unlock/);
 await assert.rejects(vault.unlock('incorrect password'),/incorrect/);assert.deepEqual(await all(db),raw);
 const reloaded=createVault(name);assert.deepEqual(await reloaded.state(),{configured:true,unlocked:false});
 await reloaded.unlock('test-only unique password');assert.equal(await (await reloaded.list())[0].audio.text(),'original voice');
 await reloaded.put({id:'new',text:'another memory'});assert.equal((await all(db)).length,2);
 await reloaded.remove('new');assert.equal((await all(db)).length,1);db.close();
});

test('failed migration rolls back plaintext replacement and metadata together',async()=>{
 const name='rollback';const legacy=await open(name,1);await write(legacy,{id:'old',text:'must not disappear'});legacy.close();
 const vault=createVault(name);await vault.state();
 const put=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(value,...args){if(value.encrypted===1)throw new DOMException('Test quota full','QuotaExceededError');return put.call(this,value,...args)};
 try{await assert.rejects(vault.setup('test-only rollback password'),/quota full/)}finally{IDBObjectStore.prototype.put=put}
 assert.deepEqual(await vault.state(),{configured:false,unlocked:false});assert.equal((await vault.list())[0].text,'must not disappear');
});
