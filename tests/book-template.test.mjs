import test from 'node:test';
import assert from 'node:assert/strict';
import {splitPages, makeBook, restoreBook, pageHtml, documentHtml} from '../dist/book-template.mjs';

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

test('original question precedes each language section without rewriting answers',()=>{
 const question='What happened next? <script>bad()</script>';
 const story={prompt:question,title:'Sundays',language:'en',text:'Yes, every Sunday. '.repeat(70),translation:'እሁድ እሁድ።'};
 const before=structuredClone(story),book=makeBook(story);
 assert.equal(book.question,question);assert.deepEqual(story,before);
 const first=pageHtml(book,1);
 assert.ok(first.indexOf('book-question')<first.indexOf('book-page-text'));
 assert.ok(first.includes('&lt;script&gt;'));assert.ok(!first.includes('<script>bad'));
 assert.ok(!pageHtml(book,2).includes('class="book-question"'));
 const translation=book.pages.findIndex(p=>p.translation)+1;
 assert.ok(pageHtml(book,translation).includes('Original question'));
 assert.equal((documentHtml(book).match(/class="book-question"/g)||[]).length,2);
 assert.equal(book.pages.filter(p=>!p.translation).map(p=>p.text).join(''),story.text.trim());
});
test('older books gain question context without losing edited pages or photos',()=>{
 const story={prompt:'ቤትዎ ምን ይመስል ነበር?',text:'Original answer',book:{version:1,title:'Saved book',pages:[{text:'Edited page',photo:'data:image/png;base64,AAAA',language:'en'}]}};
 const before=structuredClone(story),book=restoreBook(story);
 assert.equal(book.question,story.prompt);assert.deepEqual(book.pages,story.book.pages);assert.deepEqual(story,before);
 story.book.question='';assert.equal(restoreBook(story).question,'');
 assert.ok(!pageHtml(restoreBook(story),1).includes('class="book-question"'));
});
