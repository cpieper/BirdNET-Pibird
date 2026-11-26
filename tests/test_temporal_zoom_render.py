"""Validate cold-cache encoding with a real encoder, including temporary files."""
import shutil
import subprocess
import wave
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from backend.app.routers.media import render_temporal_zoom_audio


@pytest.mark.skipif(not shutil.which('ffmpeg'), reason='ffmpeg is required for encoding integration test')
def test_cold_temporal_zoom_render_and_cache(tmp_path):
    filename = 'Bird-90-2026-10-03-birdnet-12:00:00.wav'
    folder = tmp_path / '2026-10-03' / 'Bird'
    folder.mkdir(parents=True)
    with wave.open(str(folder / filename), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(24000)
        audio.writeframes(b'\0\0' * 24000)
    settings = SimpleNamespace(by_date_dir=str(tmp_path))
    run = subprocess.run

    def without_sox(args, **kwargs):
        if args[0] == 'sox':
            raise FileNotFoundError('Exercise the ffmpeg fallback')
        return run(args, **kwargs)

    with patch('subprocess.run', side_effect=without_sox):
        path, output_name, cached = render_temporal_zoom_audio(settings, '2026-10-03', filename, '0.5')
    assert not cached
    assert path.name == output_name
    assert path.stat().st_size > 0
    # Decode the resulting MP3 to validate its encoding and slowed duration.
    decoded = run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 's16le',
                   '-ac', '1', '-ar', '24000', '-'], capture_output=True, check=True)
    assert 1.8 < len(decoded.stdout) / (24000 * 2) < 2.2
    assert list(path.parent.iterdir()) == [path]
    with patch('subprocess.run', side_effect=AssertionError('Cached audio must not be rendered again')):
        assert render_temporal_zoom_audio(settings, '2026-10-03', filename, '0.5') == (path, output_name, True)
