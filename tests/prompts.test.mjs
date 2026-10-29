import test from 'node:test';
import assert from 'node:assert/strict';
import {prompts,promptContext,promptText} from '../dist/prompts.mjs';
import {makeBook,documentHtml} from '../dist/book-template.mjs';

test('English is the default; selected Amharic question survives book export',()=>{
 assert.equal(promptText(prompts[0]),prompts[0][1]);
 for(const prompt of prompts){
  const context=promptContext(prompt,'am');
  assert.match(context.prompt,/[\u1200-\u137f]/u);
  assert.equal(context.promptLanguage,'am');
  assert.equal(context.promptTranslations.en,prompt[1]);
  const book=makeBook({...context,language:'am',text:'ትዝታ'});
  assert.ok(documentHtml(book).includes(context.prompt));
 }
 assert.equal(promptContext(undefined).prompt,'');
});
