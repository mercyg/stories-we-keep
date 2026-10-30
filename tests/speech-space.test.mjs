import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spaceTranscribe} from '../dist/speech-space.mjs';
import {bytesToBase64,transcriptRecipient} from '../dist/transcript-crypto.mjs';

async function envelope(publicKey,result){
 const rsa=await crypto.subtle.importKey('spki',Uint8Array.from(atob(publicKey),c=>c.charCodeAt(0)),{name:'RSA-OAEP',hash:'SHA-256'},false,['wrapKey']);
 const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('swk-transcript-v1')},key,new TextEncoder().encode(JSON.stringify(result)));
 const wrapped=await crypto.subtle.wrapKey('raw',key,rsa,{name:'RSA-OAEP'});
 return {v:1,algorithm:'RSA-OAEP-256+A256GCM',iv:bytesToBase64(iv),wrapped_key:bytesToBase64(new Uint8Array(wrapped)),ciphertext:bytesToBase64(new Uint8Array(ciphertext))};
}

test('speech client bypasses file uploads and decrypts a split Ethiopic result',async()=>{
 const original=globalThis.fetch,calls=[];
 globalThis.fetch=async(url,options)=>{
  calls.push([url,options]);
  if(calls.length===1)return Response.json({event_id:'job-1'});
  const recipient=JSON.parse(calls[0][1].body).data[2];
  const encrypted=await envelope(recipient,{text:'ትዝታ',duration:2});
  const bytes=new TextEncoder().encode('event: heartbeat\ndata: null\n\nevent: complete\ndata: '+JSON.stringify([encrypted])+'\n\n');
  return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close()}}));
 };
 try{
  const result=await spaceTranscribe('https://example.test/',new Blob(['audio'],{type:'audio/webm'}),'am');
  assert.equal(result.text,'ትዝታ');
  assert.equal(calls.length,2);assert.equal(calls[0][0],'https://example.test/gradio_api/call/transcribe_private');
  assert.deepEqual(JSON.parse(calls[0][1].body).data.slice(0,2),[btoa('audio'),'am']);
  assert.ok(calls.every(([url])=>!url.includes('/upload')));
 }finally{globalThis.fetch=original}
});

test('a copied queue result cannot be decrypted by a different browser recipient',async()=>{
 const owner=await transcriptRecipient(),other=await transcriptRecipient();
 const encrypted=await envelope(owner.publicKey,{text:'Private fictional test'});
 assert.equal((await owner.decrypt(encrypted)).text,'Private fictional test');
 await assert.rejects(other.decrypt(encrypted),/securely opened/);
 const tampered={...encrypted,ciphertext:encrypted.ciphertext.slice(0,-4)+'AAAA'};
 await assert.rejects(owner.decrypt(tampered),/securely opened/);
});

test('GPU errors are shown without creating an empty transcript',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>++calls===1?Response.json({event_id:'job'}):new Response('event: error\ndata: "GPU quota exhausted"\n\n');
 try{await assert.rejects(spaceTranscribe('https://example.test',new Blob(['audio']),'en'),/GPU quota exhausted/)}
 finally{globalThis.fetch=original}
});

test('structured Gradio errors preserve the actual cause instead of guessing GPU quota',async()=>{
 const original=globalThis.fetch;
 try {
  for(const reason of ['This file could not be decoded as audio.','You have exceeded your GPU quota.']){
   let calls=0;
   globalThis.fetch=async()=>++calls===1?Response.json({event_id:'job'}):new Response('event: error\ndata: '+JSON.stringify({error:reason,duration:10,visible:true,title:'Error'})+'\n\n');
   await assert.rejects(spaceTranscribe('https://example.test',new Blob(['audio']),'en'),{message:reason});
  }
  let calls=0;
  globalThis.fetch=async()=>++calls===1?Response.json({event_id:'job'}):new Response('event: error\ndata: null\n\n');
  await assert.rejects(spaceTranscribe('https://example.test',new Blob(['audio']),'en'),/did not provide a reason/);
 }finally{globalThis.fetch=original}
});
