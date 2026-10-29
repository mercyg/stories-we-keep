// Fixed bilingual prompts; switching language does not call an AI service.
export const prompts = [
  ['Childhood','What did home look like when you were little?','⌂','በልጅነትዎ የሚኖሩበት ቤት ምን ይመስል ነበር?'],
  ['People','Who taught you something you still carry with you?','❋','እስከ ዛሬ የሚጠቅምዎትን ነገር ያስተማርዎት ማን ነው?'],
  ['Beginnings','What do you remember about your first day in a new place?','↗','አዲስ ቦታ ስለሄዱበት የመጀመሪያ ቀን ምን ያስታውሳሉ?'],
  ['Traditions','Which family tradition would you like us to keep?','✧','የትኛውን የቤተሰብ ባህል እንድናስቀጥል ይፈልጋሉ?'],
  ['Everyday life','What was an ordinary day like when you were seventeen?','☀','የአሥራ ሰባት ዓመት ልጅ ሳሉ የዕለት ተዕለት ኑሮዎ ምን ይመስል ነበር?'],
  ['A message','What would you like the next generation to know?','♡','ለሚቀጥለው ትውልድ ምን ማሳወቅ ይፈልጋሉ?']
];
export const promptText = (prompt, language='en') => prompt?.[language==='am'?3:1] || '';
export function promptContext(prompt, language='en') {
  return {prompt:promptText(prompt,language),promptLanguage:language,
    promptTranslations:prompt?{en:prompt[1],am:prompt[3]}:{}};
}
