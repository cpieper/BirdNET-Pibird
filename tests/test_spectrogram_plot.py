import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from PIL import Image
from fastapi import HTTPException
from backend.app.routers import media


class TestSpectrogramPlot(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.source = Path(self.tmp.name) / 'Bird-90-2026-10-03-birdnet-12:00:00.wav'
        self.source.write_bytes(b'source audio')

    def render_image(self, args, **kwargs):
        # The renderer boundary supplies an axes-free 24 kHz plot with bounded work.
        self.assertIn('-r', args)
        self.assertIn('24k', args)
        self.assertEqual(kwargs['timeout'], 15)
        Image.new('RGB', (1200, 257)).save(args[-1], format='PNG')

    def test_plot_is_cached_and_rebuilt_when_audio_changes(self):
        with patch('subprocess.run', side_effect=self.render_image) as renderer:
            first = media.render_spectrogram_plot(self.source)
            self.assertTrue(first.exists())
            with Image.open(first) as img:
                self.assertEqual(img.size, (1200, 257))
            self.assertEqual(media.render_spectrogram_plot(self.source), first)
            self.assertEqual(renderer.call_count, 1)
            import os
            os.utime(self.source, (first.stat().st_mtime + 1, first.stat().st_mtime + 1))
            media.render_spectrogram_plot(self.source)
            self.assertEqual(renderer.call_count, 2)

    def test_failed_render_does_not_leave_partial_cache(self):
        import subprocess
        with patch('subprocess.run', side_effect=subprocess.TimeoutExpired('sox', 15)):
            with self.assertRaises(HTTPException) as error:
                media.render_spectrogram_plot(self.source)
        self.assertEqual(error.exception.status_code, 503)
        self.assertEqual(list(self.source.parent.glob('*.tmp.png')), [])
        self.assertFalse(self.source.with_name(f'.{self.source.name}.plot.png').exists())

    def test_busy_renderer_returns_retryable_error(self):
        with media.SPECTROGRAM_PLOT_LOCK:
            with self.assertRaises(HTTPException) as error:
                media.render_spectrogram_plot(self.source)
        self.assertEqual(error.exception.status_code, 503)

    def test_sibling_prefix_does_not_bypass_recording_directory(self):
        base = Path(self.tmp.name) / 'recordings'
        with self.assertRaises(HTTPException):
            media.validate_path(str(base), '../recordings-outside/secret.wav')


class TestSpectrogramPlotDeletion(unittest.IsolatedAsyncioTestCase):
    async def test_deleting_recording_also_removes_interactive_plot(self):
        import sqlite3
        from types import SimpleNamespace
        from backend.app.routers import detections

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            filename = 'Bird-90-2026-10-03-birdnet-12:00:00.wav'
            folder = root / '2026-10-03' / 'Bird'
            folder.mkdir(parents=True)
            audio = folder / filename
            image = folder / f'{filename}.png'
            plot = folder / f'.{filename}.plot.png'
            for asset in (audio, image, plot):
                asset.write_bytes(b'asset')
            db_path = root / 'test.db'
            db = sqlite3.connect(db_path)
            self.addCleanup(db.close)
            db.execute('CREATE TABLE detections (Date TEXT, File_Name TEXT)')
            db.execute('INSERT INTO detections VALUES (?, ?)', ('2026-10-03', filename))
            db.commit()
            settings = SimpleNamespace(by_date_dir=str(root), db_path=str(db_path))
            await detections.delete_detection(filename, user='test-user', db=db, settings=settings)
            self.assertFalse(plot.exists())
            self.assertFalse(audio.exists())
            self.assertFalse(image.exists())
            self.assertEqual(db.execute('SELECT COUNT(*) FROM detections').fetchone()[0], 0)
