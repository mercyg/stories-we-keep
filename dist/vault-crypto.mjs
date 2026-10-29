const encoder=new TextEncoder(),decoder=new TextDecoder();
export const ITERATIONS=600000;
export async function passwordKey(password,salt){
  const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export async function seal(key,bytes,context){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(context)},key,bytes);
  return {iv,data};
}
export async function unseal(key,record,context){
  return crypto.subtle.decrypt({name:'AES-GCM',iv:record.iv,additionalData:encoder.encode(context)},key,record.data);
}
export async function packStory(story){
  const {audio,...fields}=story;
  const header=encoder.encode(JSON.stringify({fields,audioType:audio?.type||'',hasAudio:Boolean(audio)}));
  const size=new Uint8Array(4);new DataView(size.buffer).setUint32(0,header.length);
  return new Blob([size,header,...(audio?[audio]:[])]).arrayBuffer();
}
export function unpackStory(bytes){
  const length=new DataView(bytes).getUint32(0);
  if(length>bytes.byteLength-4)throw new Error('Invalid encrypted story.');
  const {fields,audioType,hasAudio}=JSON.parse(decoder.decode(bytes.slice(4,4+length)));
  return {...fields,audio:hasAudio?new Blob([bytes.slice(4+length)],{type:audioType}):null};
}
