# Stories We Keep

A bilingual family storybook for older people to pass memories to their families in Amharic and English. Record or upload audio, transcribe it with open speech models, review the words, and create a picture storybook with family photos. Add an optional family-reviewed translation yourself. Automatic translation and AI-generated illustrations are not connected in the hosted app.

## Try the app

[Open Stories We Keep](https://stories-we-keep.vercel.app/). Record or upload a memory, select its original language, and choose **Transcribe recording**. Review the words, give the memory a title, and choose **Create my storybook**. Visitors do not need a local server or API key.

## Bilingual story questions

Questions start in English. Use **Question language → አማርኛ** on the home question card or Story prompts page to switch all six prompts to Amharic. Your choice is remembered in this browser. These are fixed translations and do not need a model or API. Choosing **Use this question** saves the displayed question and its language with the memory, so the selected wording carries into the storybook and PDF. Question language and the recording’s original language are separate choices.

## Downloads: pictures, text, and voice

| Download | Story text | Pictures and captions | Original voice |
| --- | --- | --- | --- |
| **Download digital book** (HTML) | Yes, including any translation you add | Yes, the pictures you upload to the book | Embedded and playable offline, if a recording is attached |
| **Print / Save PDF** | Yes, including any translation you add | Yes, the pictures you upload to the book | No playable audio |
| **Download keepsake** (HTML) | Yes, including any translation you add | No storybook page pictures | Embedded and playable offline, if a recording is attached |

There is no separate audio-only download button yet. Download a digital book or keepsake to preserve the original recording alongside the words. A written-only memory has no audio to include. Keep the downloaded HTML file intact to retain its embedded voice and pictures.

Pictures currently come from your own uploads; the app does not generate them automatically. Saving a PDF uses your browser’s print dialog: choose **Save as PDF** as the destination.

## Create a picture storybook (no paid service)

Open a saved story or the written example and choose **Create my storybook**. The app splits the original text and optional translation into editable pages without rewriting the transcript. The original question appears before the story and before its translation so readers understand the answer. Prompt-based memories fill it in automatically. Use **Question that started this story** to edit it or add context for older memories; it is included in the digital book and PDF without rewriting the transcript or automatically translating the question. Older saved books keep their edited pages and pictures when this field is added.

Edit the cover, add a dedication, then select each page to add a photo/illustration and caption. Images are resized locally; no image-generation API is called. Add at least one picture before exporting the book. You can save an unfinished draft before adding pictures.

**Save storybook** stores the book with its memory in this browser. **Download digital book** creates a portable HTML book with pictures and any original recording embedded. **Print / Save PDF** opens a printable A5 book; use its print button and choose Save as PDF. PDFs include text and pictures, not playable audio. Long manually edited pages may continue onto another printed page; use Add a page to distribute text.

The speech service is running in the free Hugging Face ZeroGPU Space below. Automatic translation and AI illustrations remain unconnected. The project has a strict $0 budget; Render is not connected.

Run the export and speech-client checks with `node --test tests/*.test.mjs`.

## Deploy the frontend to Vercel first

This repository is ready for a static Vercel deployment. Model inference is hosted separately on the free Hugging Face Space.

1. Import this GitHub repository in Vercel.
2. Keep the root directory at the repository root. Framework preset: **Other**. The included `vercel.json` sets the output directory to `dist` and skips installation/builds.
3. Deploy. No environment variables or paid model API keys are needed for this frontend stage.
4. Verify recording/upload, written memories, local saving, search, and keepsake downloads. Transcription uses the configured Space; automatic translation remains unavailable in hosted mode.

### Free hosted speech

Space: https://huggingface.co/spaces/ladybug11/stories-we-keep-speech

The `huggingface/` directory contains the Space's `app.py`, `requirements.txt` and `packages.txt`. It uses Gradio on free ZeroGPU, with English and Amharic models loaded at startup. No paid API, Render server, billing credentials, or shared frontend secret is used. Keep the Space on ZeroGPU; do not upgrade hardware under the $0 budget.

The frontend's `speechSpaceUrl` in `dist/config.js` selects this speech service. `dist/speech-space.mjs` uploads audio, submits the named Gradio endpoint, and reads its queued SSE result. Requests go directly from the visitor's browser. Free unauthenticated GPU quotas and queues apply; this is a limited demo, not unlimited production hosting. No automatic paid fallback is configured. Validation: the actual client module transcribed a 6.28-second synthetic English clip in both WAV and browser-format WebM; both models loaded. The hosted upload filter explicitly accepts WebM, M4A/MP4, WAV, MP3, OGG, FLAC, AAC, and Opus, with ffmpeg validating the audio. Real Amharic speech accuracy and longer recordings still require evaluation. A typed custom backend address overrides hosted speech for self-hosters.

Automatic translation is visibly unavailable in hosted mode. Families can write/review a translation themselves. The separate local Python/Ollama backend below remains available for developers.

Visitors should not install Python, Ollama, or configure localhost. Local execution below is an optional developer/self-hosted mode.

See [PROJECT_PLAN.md](PROJECT_PLAN.md) for the preserved scope and remaining submission work.

## Run locally

Prerequisites: Python 3.10+, ffmpeg, and Ollama (for translation only).

```bash
# macOS: brew install ffmpeg
./start.sh
```

Open http://localhost:8000. In **Connection**, enter `http://localhost:8000`, choose a model actually installed in your Ollama (`ollama list`), and test the connection. Ollama normally runs at `http://127.0.0.1:11434`. Any model name shown by Ollama can be selected; Amharic quality varies and must be reviewed. The default name is a starting configuration, not a claim of validated Amharic translation.

To run with different settings, export environment variables before starting. `.env.example` documents them; the script does not automatically load `.env` files.

## Open models

- Amharic transcription: [`b1n1yam/shook-tiny-amharic-600hr`](https://huggingface.co/b1n1yam/shook-tiny-amharic-600hr), an Amharic fine-tune of Whisper Tiny, Apache-2.0. In the hosted Space, downloads at startup and runs on ZeroGPU. The optional local FastAPI backend downloads on first transcription and runs on CPU. Override `AMHARIC_MODEL` to compare compatible Whisper checkpoints.
- English transcription: [`openai/whisper-small.en`](https://huggingface.co/openai/whisper-small.en), Apache-2.0 on the Hugging Face checkpoint. The larger default prioritizes transcription quality over the earlier Tiny English configuration and needs more memory/CPU time. Override `ENGLISH_MODEL` as needed; existing environment overrides still take precedence.
- Translation: your selected downloadable Ollama language model. Its own license applies; Ollama is the runner. We have not established quality on real Amharic family recordings for this particular pipeline.

Audio processing does not call Addis AI's hosted API. Voice Lab and these downloaded weights are different deployments; their accuracy should not be assumed identical.

## What works without a backend

The web interface records audio, accepts uploads, lets you write/edit stories and translations, saves stories with audio to IndexedDB, searches/filters the storybook, opens the written fictional example, and exports an offline HTML keepsake with embedded audio. AI transcription/translation require a connected backend. There are no fake AI responses or automatic fabricated transcripts.

## Data and privacy

Stories are stored in this browser's IndexedDB, not synced or backed up to a cloud database. Clearing browser data removes them. **Download keepsake** saves a standalone HTML file containing the original audio and both texts. Keep that file as a backup; it can be opened offline.

When you click **Transcribe** in hosted mode, the recording is uploaded to the Hugging Face Space. The Space removes processed uploads in a finally block and cleans expired temporary cache files; its UI/API output may remain in the current session. Do not treat a public demo as a private archival service. With a custom backend, the recording goes to that backend instead. When you click **Translate**, its text is sent to that backend and then to its configured Ollama. The Python backend deletes temporary uploaded files, does not persist audio/transcripts, and does not log successful request bodies. Initial model downloads require internet; once cached, inference can run locally. External fonts are optional presentation assets and fall back to system fonts offline.

The example is a written fictional memory with an illustrative Amharic translation. Synthetic demo audio was removed from the interface. Real recordings are kept unmodified; Whisper transcribes audio and does not generate a voice.

## Optional self-hosting

A static host such as Vercel hosts the web interface only; Cloudflare Workers cannot run this Python/PyTorch model service. The included Dockerfile runs the full app on a suitable Python/container host. For deployment:

1. Provision enough CPU/RAM for your selected model; Whisper Small English uses more resources than Tiny, and model capacity has not been benchmarked for concurrent users.
2. Set `API_TOKEN` and `ALLOWED_ORIGINS` to your actual frontend origin. Put Ollama on the same machine or a private network via `OLLAMA_URL`.
3. Keep model caches on persistent storage to avoid downloading them on each restart. Models and hosting costs are separate.
4. Serve the backend over HTTPS for a hosted frontend. Do not expose Ollama directly to the public internet. Add authentication, per-user authorization/rate limiting before a public launch.
5. In the web app, enter the backend URL, access key, and installed translation model. The key is held in tab-session storage. A hosted page connecting to localhost may require local-network permission; the fully local URL avoids that issue.

No server has been rented and no paid API service is connected by this project.

## Limits

One voice at a time; 5-minute/30 MB uploads. Names, dates, dialects, and translation can be wrong. Review the transcript before translating; keep original audio. Save operations persist locally; individual deletes are permanent after confirmation. No account system, cloud family sharing, diarization, or automatic AI follow-up questions in this first version.

## License

App code: MIT (see LICENSE). Model weights retain their respective upstream licenses and attribution requirements.
