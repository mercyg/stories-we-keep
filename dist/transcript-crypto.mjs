export function bytesToBase64(bytes){
  const chunks=[];for(let i=0;i<bytes.length;i+=32768)chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
  return btoa(chunks.join(''));
}
const fromBase64=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
export async function transcriptRecipient(){
  // A new non-extractable private key for every request. Never sent to the server.
  const pair=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},false,['wrapKey','unwrapKey']);
  const publicKey=bytesToBase64(new Uint8Array(await crypto.subtle.exportKey('spki',pair.publicKey)));
  return {publicKey,async decrypt(envelope){
    if(envelope?.v!==1||envelope.algorithm!=='RSA-OAEP-256+A256GCM')throw new Error('The speech service returned an unsupported response.');
    try{
      const key=await crypto.subtle.unwrapKey('raw',fromBase64(envelope.wrapped_key),pair.privateKey,{name:'RSA-OAEP'},{name:'AES-GCM'},false,['decrypt']);
      const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(envelope.iv),additionalData:new TextEncoder().encode('swk-transcript-v1')},key,fromBase64(envelope.ciphertext));
      return JSON.parse(new TextDecoder().decode(data));
    }catch{throw new Error('The transcript could not be securely opened in this browser. Please retry the transcription.');}
  }};
}
