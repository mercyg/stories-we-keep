export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Layout only: never summarize, translate, or invent content.
export function splitPages(text, limit = 620) {
  const chars = Array.from(String(text || '').trim());
  const pages = [];
  if (!Number.isInteger(limit) || limit < 40) throw new Error('Page length must be at least 40 characters.');
  while (chars.length) {
    let end = Math.min(limit, chars.length);
    if (end < chars.length) {
      const minimum = Math.floor(limit * .4);
      let boundary = -1;
      for (let i = minimum; i < end; i++) if (/[.!?።\n]/u.test(chars[i])) boundary = i + 1;
      if (boundary < 0) for (let i = minimum; i < end; i++) if (/\s/u.test(chars[i])) boundary = i + 1;
      if (boundary > 0) end = boundary;
    }
    pages.push(chars.splice(0, end).join(''));
  }
  return pages;
}
export function makeBook(story) {
  return { version:1, title:story.title || 'A family story', person:story.person || '', dedication:'', photo:'', pages:[
    ...splitPages(story.text).map(text => ({text, photo:'', caption:'', language:story.language || 'en', translation:false})),
    ...splitPages(story.translation).map(text => ({text, photo:'', caption:'', language:story.language === 'am' ? 'en' : 'am', translation:true}))
  ]};
}
const safePhoto = value => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value || '') ? value : '';
export function pageHtml(book, index) {
  const e=escapeHtml;
  if (index === 0) return `<section class="book-page book-cover" aria-label="Book cover"><span class="book-imprint">Stories We Keep</span>${safePhoto(book.photo)?`<img class="book-cover-photo" src="${safePhoto(book.photo)}" alt="Family photograph">`:''}<div class="book-cover-title"><h2>${e(book.title)}</h2>${book.person?`<p>A story told by<br><strong>${e(book.person)}</strong></p>`:''}</div>${book.dedication?`<p class="book-dedication">${e(book.dedication)}</p>`:''}<span class="book-cover-foot">A family memory, kept close.</span></section>`;
  const page=book.pages[index-1];
  if (!page) return '';
  return `<section class="book-page book-text-page" aria-label="Page ${index}"><div class="book-running-head"><span>${e(book.title)}</span><span>${page.language==='am'?'አማርኛ':'English'}${page.translation?' translation':''}</span></div>${safePhoto(page.photo)?`<figure class="book-page-figure"><img src="${safePhoto(page.photo)}" alt="${e(page.caption||'Family photograph accompanying this memory')}">${page.caption?`<figcaption>${e(page.caption)}</figcaption>`:''}</figure>`:''}<p class="book-page-text" lang="${page.language==='am'?'am':'en'}">${e(page.text)}</p><div class="book-page-foot"><span>${page.translation?'Translation: review with your family.':e(book.person || 'In their own words.')}</span><span>${index}</span></div></section>`;
}
export const bookCss = `
:root{--book-paper:#fffaf2;--book-ink:#49333e;--book-muted:#735a64;--book-cover:#f9d3ba;--book-rule:#dcc5ba;--book-font:'DM Sans','Noto Sans Ethiopic',Arial,sans-serif;--book-head:'Bricolage Grotesque','Noto Sans Ethiopic',Arial,sans-serif;--book-space:24px}
.book-page{box-sizing:border-box;background:var(--book-paper);color:var(--book-ink);font-family:var(--book-font);width:100%;max-width:530px;min-height:680px;padding:40px;display:flex;flex-direction:column;position:relative;border-radius:4px;overflow-wrap:break-word}
.book-cover{background:var(--book-cover);gap:24px}.book-imprint,.book-cover-foot{font-size:13px;line-height:1.5}.book-cover-title{margin-block:auto;min-width:0}.book-cover-title h2{font-family:var(--book-head);font-size:44px;line-height:1.13;letter-spacing:-.035em;font-weight:700;margin:0 0 24px;overflow-wrap:break-word}.book-cover-title p{font-size:17px;line-height:1.7;margin:0}.book-dedication{font-size:15px;line-height:1.7;white-space:pre-wrap;margin:0}.book-cover-photo{width:100%;max-height:240px;object-fit:contain;border-radius:8px}.book-running-head,.book-page-foot{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;font-size:11px;line-height:1.5;color:var(--book-muted)}.book-running-head{padding-bottom:16px;border-bottom:1px solid var(--book-rule)}.book-running-head>span{max-width:60%;overflow-wrap:break-word}.book-page-text{font-size:18px;line-height:1.9;white-space:pre-wrap;margin:32px 0;max-width:65ch}.book-page-figure{margin:24px 0 0}.book-page-figure img{display:block;width:100%;max-height:240px;object-fit:contain;border-radius:8px}.book-page-figure figcaption{font-size:12px;line-height:1.5;color:var(--book-muted);margin-top:8px}.book-page:has(.book-page-figure) .book-page-text{font-size:16px;line-height:1.7;margin-top:20px}.book-page-foot{margin-top:auto;padding-top:16px;border-top:1px solid var(--book-rule)}
@media(max-width:600px){.book-page{min-height:500px;padding:24px}.book-cover-title h2{font-size:34px}.book-page-text{font-size:16px;line-height:1.9;margin:24px 0}.book-cover-photo{max-height:180px}}
@media print{@page{size:A5;margin:0}.book-page{width:148mm;max-width:none;min-height:210mm;height:auto;padding:14mm;border-radius:0;break-before:page;break-after:page;print-color-adjust:exact;-webkit-print-color-adjust:exact}.book-page:first-of-type{break-before:auto}.book-cover{min-height:210mm}.book-cover-title h2{font-size:32pt}.book-page-text{font-size:12pt;line-height:1.8;margin:10mm 0}.book-cover-photo{max-height:65mm}.book-page-figure img{max-height:68mm}.book-page-figure{margin-top:6mm}.book-page:has(.book-page-figure) .book-page-text{font-size:11pt;line-height:1.7;margin-top:6mm}.book-running-head,.book-page-foot{font-size:8pt}.book-page-foot{padding-top:5mm}.book-toolbar,.book-audio{display:none!important}body{margin:0!important;padding:0!important;background:var(--book-paper)!important}}
`;
export function documentHtml(book, audio = '', example = false) {
  const safeAudio=/^data:audio\/[a-zA-Z0-9.+-]+(?:;[a-zA-Z0-9.+-]+=[a-zA-Z0-9.+-]+)*;base64,[A-Za-z0-9+/=]+$/.test(audio) ? audio : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(book.title)}: Stories We Keep</title><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700&family=DM+Sans:wght@400;700&family=Noto+Sans+Ethiopic:wght@400;700&display=swap" rel="stylesheet"><style>${bookCss}body{margin:0;padding:24px;background:var(--book-rule);font-family:var(--book-font);color:var(--book-ink)}.book-page{margin:0 auto 24px}.book-toolbar,.book-audio{max-width:530px;margin:0 auto 24px;font-size:14px;line-height:1.7}.book-toolbar button{font:inherit;padding:12px 20px;border:1px solid var(--book-ink);background:var(--book-paper);color:var(--book-ink);border-radius:24px;cursor:pointer}.book-toolbar button:focus-visible{outline:2px solid var(--book-ink);outline-offset:4px}audio{width:100%}</style></head><body><div class="book-toolbar"><button id="printBook">Print / Save as PDF</button><p>Choose “Save as PDF” in the print dialog. Audio stays in the digital book; a printed PDF has text and pictures.${example?' This example story is fictional.':''}</p></div>${safeAudio?`<div class="book-audio"><p>Listen to the original recording</p><audio controls src="${safeAudio}"></audio></div>`:''}${Array.from({length:book.pages.length+1},(_,i)=>pageHtml(book,i)).join('')}<script>document.getElementById('printBook').onclick=()=>window.print();</script></body></html>`;
}
