"""Use ordinary CPU inference when ZeroGPU declines a short recording."""
MAX_CPU_SECONDS = 60


def recognize_with_fallback(gpu, cpu, wave, language, seconds):
    try:
        return gpu(wave, language), 'gpu'
    except Exception as error:
        message = str(error).lower()
        quota = ('quota' in message or 'runs limit' in message) and ('gpu' in message or 'zerogpu' in message)
        if not quota:
            raise
        if seconds > MAX_CPU_SECONDS:
            raise ValueError('The free GPU quota is unavailable. Record a clip of 60 seconds or less to use free CPU transcription, or try the longer recording later.') from None
        return cpu(wave, language), 'cpu'
