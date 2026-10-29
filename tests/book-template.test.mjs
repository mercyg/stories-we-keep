import test from 'node:test';
import assert from 'node:assert/strict';
import {splitPages, makeBook, pageHtml, documentHtml} from '../dist/book-template.mjs';

test('pagination preserves English and Ethiopic text without adding story details',()=>{
 for(const text of ['A walk home. '+ 'We remembered the old house. '.repeat(80),'አክስቴ አውቶቡስ ጣቢያ ተቀበለችኝ። '.repeat(100),'🎈'.repeat(1500)]){
  const pages=splitPages(text);
  assert.equal(pages.join(''),text.trim());
  assert.ok(pages.length>1);
  assert.ok(pages.every(p=>Array.from(p).length<=620));
 }
});
test('translation has its own language and original story is unchanged',()=>{
 const story={title:'Our home',person:'A family member',language:'am',text:'ትዝታ',translation:'A memory'};
 const before=structuredClone(story),book=makeBook(story);
 assert.deepEqual(story,before);
 assert.equal(book.pages[0].language,'am');assert.equal(book.pages[1].language,'en');assert.ok(book.pages[1].translation);
});
test('exports include page images, captions, Ethiopic and original WebM audio',()=>{
 const book=makeBook({title:'Our home',person:'Family',language:'am',text:'አክስቴ ተቀበለችኝ።'});
 book.pages[0].photo='data:image/png;base64,AAAA';book.pages[0].caption='A family photo';
 const html=documentHtml(book,'data:audio/webm;codecs=opus;base64,AAAA');
 assert.ok(html.includes('data:image/png;base64,AAAA'));assert.ok(html.includes('<figcaption>A family photo</figcaption>'));
 assert.ok(html.includes('data:audio/webm;codecs=opus;base64,AAAA'));assert.ok(html.includes('lang="am"'));assert.ok(html.includes('@page{size:A5'));
});
test('user text and malformed image URLs cannot inject export markup',()=>{
 const book=makeBook({title:'</title><script>alert(1)</script>',language:'en',text:'<img src=x onerror=alert(1)>'});
 book.photo='javascript:alert(1)';book.pages[0].photo='data:image/png;base64,AAA" onerror="alert(1)';
 const html=documentHtml(book);
 assert.ok(!html.includes('<script>alert(1)'));assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('javascript:'));
 assert.ok(html.includes('&lt;img'));assert.ok(!pageHtml(book,1).includes('<figure'));
});
