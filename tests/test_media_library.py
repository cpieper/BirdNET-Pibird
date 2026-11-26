import asyncio
import sqlite3
from types import SimpleNamespace

from backend.app.routers.media import list_species_with_recordings


def test_library_counts_saved_audio_and_opens_surviving_date(tmp_path):
    by_date = tmp_path / 'By_Date'
    saved = by_date / '2026-09-28' / 'American_Robin'
    saved.mkdir(parents=True)
    (saved / 'robin.mp3').write_bytes(b'audio')
    (saved / 'robin.mp3.png').write_bytes(b'image')
    # Cleanup may leave an empty species directory behind.
    (by_date / '2026-09-29' / 'American_Robin').mkdir(parents=True)
    db_path = tmp_path / 'birds.db'
    with sqlite3.connect(db_path) as conn:
        conn.execute('CREATE TABLE detections (Sci_Name, Com_Name, Date, Time, File_Name)')
        conn.executemany('INSERT INTO detections VALUES (?, ?, ?, ?, ?)', [
            ('Turdus migratorius', 'American Robin', '2026-09-28', '10:00:00', 'robin.mp3'),
            ('Turdus migratorius', 'American Robin', '2026-09-29', '10:00:00', 'deleted.mp3'),
            ('Corvus corax', 'Common Raven', '2026-09-29', '11:00:00', 'deleted-raven.mp3'),
        ])

    result = asyncio.run(list_species_with_recordings(SimpleNamespace(
        by_date_dir=str(by_date), db_path=str(db_path),
    )))

    assert result['species'] == [{
        'name': 'American_Robin', 'count': 1, 'latest_date': '2026-09-28',
        'sci_name': 'Turdus migratorius', 'com_name': 'American Robin',
    }]
    species = result['species'][0]
    assert (by_date / species['latest_date'] / species['name'] / 'robin.mp3').is_file()


def test_library_includes_saved_files_without_detection_history(tmp_path):
    by_date = tmp_path / 'By_Date'
    for date in ['2026-09-27', '2026-09-28']:
        folder = by_date / date / 'Coopers_Hawk'
        folder.mkdir(parents=True)
        (folder / 'hawk.mp3').write_bytes(b'audio')
    result = asyncio.run(list_species_with_recordings(SimpleNamespace(
        by_date_dir=str(by_date), db_path=str(tmp_path / 'missing.db'),
    )))
    assert result['species'] == [{
        'name': 'Coopers_Hawk', 'count': 2, 'latest_date': '2026-09-28',
    }]
