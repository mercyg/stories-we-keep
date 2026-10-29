# Stories We Keep: delivery plan

Updated October 29, 2026.

## Goal

A family oral-history app for parents and grandparents to pass stories to their families in Amharic and English. Preserve original audio alongside an editable transcript; provide reviewed translations and portable keepsake downloads. Keep the approved warm peach, butter yellow, and berry design.

## Hacktoberfest Week 4

Challenge: https://dev.to/challenges/hacktoberfest-week4-2026-10-26
Theme: Ghost in the Machine, interpreted as honoring the past through family stories.
Deadline: October 31, 2026, 11:59 p.m. PDT. Writing quality is weighted most heavily. Explain the open models, their benefits, and real limitations; do not claim hosted inference is offline or that unverified translations are accurate.

## Delivery order

1. Push the complete project to GitHub.
2. Deploy the static frontend to Vercel. No inference backend yet; show that state clearly.
3. Redeem/check partner credits and deploy the Python transcription backend on Render with sufficient measured resources. Wire its public HTTPS address into the frontend once. Visitors never configure localhost.
4. Test a real Amharic recording and a real English recording end to end: record/upload, transcribe, review, save, reopen, download and play the original voice from the keepsake.
5. Validate Amharic/English translation separately, including names, dates, uncertainty, and cultural expressions. The current Ollama integration needs a running reachable model service; do not confuse a deployed speech backend with working translation.
6. Publish a working demo, public source, and the English DEV submission. Explain the personal motivation, demonstrated bilingual results, architecture, open-model licenses, and limitations. Enter Render's category only if actually used.

## Current implementation

- Browser recording/upload and local IndexedDB story storage.
- Written memories, original transcript/translation editing, search/language filters, offline HTML keepsake export.
- Python FastAPI transcription service, not hosted yet.
- Amharic: b1n1yam/shook-tiny-amharic-600hr; English: openai/whisper-small.en.
- Translation: configurable Ollama model, not hosted/quality-validated.
- Example is fictional written text with an illustrative translation. Synthetic sample audio is removed from the interface.

## Boundaries

No AI video, voice cloning, or fabricated family memories. No account system or cross-device sync in this submission version. Public frontend does not make locally saved stories public. Keep original recordings and allow correction rather than silently rewriting what someone said.
