import azure.cognitiveservices.speech as speechsdk
import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join("backend", ".env"), override=True)

speech_config = speechsdk.SpeechConfig(subscription=os.environ.get('AZURE_SPEECH_KEY', ''), region=os.environ.get('AZURE_SPEECH_REGION', ''))
synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
voices = synthesizer.get_voices_async().get().voices
for v in voices:
    if 'LK' in v.locale or 'en-US' in v.locale:
        print(f"{v.short_name} ({v.gender.name})")
