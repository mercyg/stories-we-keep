"""Free ZeroGPU speech service. Run with Gradio; no paid inference API."""
import os
os.environ['GRADIO_ANALYTICS_ENABLED'] = 'False'
import spaces  # Must be imported before torch for ZeroGPU.
import subprocess
from starlette.middleware import Middleware
from private_transport import decode_recording, browser_public_key, encrypt_result, PrivateFilesMiddleware
import gradio as gr
import numpy as np
import torch
from transformers import pipeline

MODELS = {'am': 'b1n1yam/shook-tiny-amharic-600hr', 'en': 'openai/whisper-small.en'}
# Place models on CUDA at startup as required by ZeroGPU's CUDA emulation.
PIPES = {lang: pipeline('automatic-speech-recognition', model=model,
    device='cuda:0', dtype=torch.float16) for lang, model in MODELS.items()}

def decode(data):
    try:
        result = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', 'pipe:0',
            '-t', '301', '-f', 'f32le', '-ar', '16000', '-ac', '1', 'pipe:1'],
            input=data, capture_output=True, timeout=35, check=False)
    except (subprocess.TimeoutExpired, FileNotFoundError):
        raise gr.Error('The recording could not be decoded. Try WAV, MP3, M4A or WebM.')
    if result.returncode or not result.stdout:
        raise gr.Error('This file could not be decoded as audio.')
    wave = np.frombuffer(result.stdout, dtype=np.float32).copy()
    seconds = len(wave) / 16000
    if not 0.3 <= seconds <= 300:
        raise gr.Error('Use a recording between one second and five minutes.')
    if not np.isfinite(wave).all() or float(np.sqrt(np.mean(wave ** 2))) < 0.0002:
        raise gr.Error('This recording is silent or too quiet. Please record closer to the microphone.')
    return wave, seconds

@spaces.GPU(duration=60)
def recognize(wave, language):
    options = {'language': 'amharic', 'task': 'transcribe'} if language == 'am' else {}
    with torch.inference_mode():
        result = PIPES[language]({'raw': wave, 'sampling_rate': 16000},
            chunk_length_s=25, stride_length_s=4, generate_kwargs=options)
    return str(result.get('text', '')).strip()

def transcribe_private(payload, language, recipient):
    if language not in MODELS:
        raise gr.Error('Choose English or Amharic.')
    try:
        key = browser_public_key(recipient)
        data = decode_recording(payload)
    except ValueError as error:
        raise gr.Error(str(error)) from None
    try:
        wave, seconds = decode(data)
        text = recognize(wave, language)
        if not text:
            raise gr.Error('No speech was recognized. Try a clearer recording.')
        return encrypt_result({'text': text, 'language': language, 'duration': round(seconds, 2),
                'model': MODELS[language], 'review_required': True}, key)
    finally:
        # No audio file is created. The framework may retain request buffers in memory;
        # these references are dropped after processing, without claiming secure erasure.
        del payload, data

with gr.Blocks(title='Stories We Keep — Private Speech Transport', delete_cache=(60, 60)) as demo:
    gr.Markdown('# Stories We Keep\nEnglish and Amharic transcription for family memories.\n\n'
        'Use [Stories We Keep](https://stories-we-keep.vercel.app/) to record a story. '
        'This API processes audio in memory, disables file uploads/downloads, and encrypts '
        'transcript results for the requesting browser. The model still reads the audio on '
        'Hugging Face infrastructure; this is not end-to-end private processing. Free GPU limits apply.')
    payload = gr.Textbox(visible=False, label='Audio bytes (base64)')
    language = gr.Textbox(visible=False, label='Original language')
    recipient = gr.Textbox(visible=False, label='One-request browser public key')
    output = gr.JSON(visible=False, label='Encrypted transcript')
    submit = gr.Button(visible=False)
    submit.click(transcribe_private, inputs=[payload, language, recipient], outputs=output, api_name='transcribe_private', concurrency_limit=1)
    gr.Markdown('Open models: [Addis AI Shook Tiny](https://huggingface.co/b1n1yam/shook-tiny-amharic-600hr) '
        'and [Whisper Small English](https://huggingface.co/openai/whisper-small.en). '
        '[Source](https://github.com/mercyg/stories-we-keep).')

demo.queue(max_size=4).launch(max_file_size='1kb', show_error=False,
    app_kwargs={'middleware': [Middleware(PrivateFilesMiddleware)]})
