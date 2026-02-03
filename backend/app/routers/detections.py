"""Detection API endpoints."""
import sqlite3
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..config import get_settings, Settings
from ..dependencies import get_db, verify_credentials
from ..models.schemas import Detection, DetectionList, DetectionSummary

router = APIRouter()


@router.get("/detections", response_model=DetectionList)
async def get_detections(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    date: Optional[str] = None,
    species: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db),
):
    """Get paginated list of detections.
    
    Args:
        limit: Maximum number of results
        offset: Number of results to skip
        date: Filter by date (YYYY-MM-DD)
        species: Filter by scientific name
    """
    # Build WHERE clause
    conditions = []
    params = []
    
    if date:
        conditions.append("Date = ?")
        params.append(date)
    if species:
        conditions.append("Sci_Name = ?")
        params.append(species)
    
    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""
    
    # Get total count
    count_sql = f"SELECT COUNT(*) FROM detections{where_clause}"
    total = db.execute(count_sql, params).fetchone()[0]
    
    # Get detections
    select_sql = f"""
        SELECT Date, Time, Sci_Name, Com_Name, Confidence, Lat, Lon, 
               Cutoff, Week, Sens, Overlap, File_Name
        FROM detections
        {where_clause}
        ORDER BY Date DESC, Time DESC
        LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    
    cursor = db.execute(select_sql, params)
    rows = cursor.fetchall()
    
    detections = [Detection.model_validate(dict(row)) for row in rows]
    
    return DetectionList(
        detections=detections,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/detections/today")
async def get_todays_detections(
    limit: int = Query(50, ge=1, le=500),
    search: Optional[str] = None,
    db: sqlite3.Connection = Depends(get_db),
):
    """Get today's detections.
    
    Args:
        limit: Maximum number of results
        search: Search term for species name
    """
    today = datetime.now().strftime("%Y-%m-%d")
    
    conditions = ["Date = ?"]
    params = [today]
    
    if search:
        conditions.append("(Com_Name LIKE ? OR Sci_Name LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])
    
    where_clause = " WHERE " + " AND ".join(conditions)
    
    select_sql = f"""
        SELECT Date, Time, Sci_Name, Com_Name, Confidence, Lat, Lon,
               Cutoff, Week, Sens, Overlap, File_Name
        FROM detections
        {where_clause}
        ORDER BY Time DESC
        LIMIT ?
    """
    params.append(limit)
    
    cursor = db.execute(select_sql, params)
    rows = cursor.fetchall()
    
    return {
        "detections": [dict(row) for row in rows],
        "date": today,
    }


@router.get("/detections/latest")
async def get_latest_detection(
    db: sqlite3.Connection = Depends(get_db),
):
    """Get the most recent detection."""
    select_sql = """
        SELECT Date, Time, Sci_Name, Com_Name, Confidence, Lat, Lon,
               Cutoff, Week, Sens, Overlap, File_Name
        FROM detections
        ORDER BY Date DESC, Time DESC
        LIMIT 1
    """
    cursor = db.execute(select_sql)
    row = cursor.fetchone()
    
    if not row:
        return None
    
    return dict(row)


@router.get("/detections/stats", response_model=DetectionSummary)
async def get_detection_stats(
    db: sqlite3.Connection = Depends(get_db),
):
    """Get detection statistics."""
    # Total count
    total = db.execute("SELECT COUNT(*) FROM detections").fetchone()[0]
    
    # Today's count
    todays = db.execute(
        "SELECT COUNT(*) FROM detections WHERE Date = DATE('now', 'localtime')"
    ).fetchone()[0]
    
    # Last hour count
    hour = db.execute(
        """SELECT COUNT(*) FROM detections 
           WHERE Date = DATE('now', 'localtime') 
           AND Time >= TIME('now', 'localtime', '-1 hour')"""
    ).fetchone()[0]
    
    # Today's species count
    todays_species = db.execute(
        "SELECT COUNT(DISTINCT Sci_Name) FROM detections WHERE Date = DATE('now', 'localtime')"
    ).fetchone()[0]
    
    # Total species count
    total_species = db.execute(
        "SELECT COUNT(DISTINCT Sci_Name) FROM detections"
    ).fetchone()[0]
    
    return DetectionSummary(
        total_count=total,
        todays_count=todays,
        hour_count=hour,
        todays_species_tally=todays_species,
        species_tally=total_species,
    )


@router.get("/detections/dates")
async def get_detection_dates(
    db: sqlite3.Connection = Depends(get_db),
):
    """Get all dates that have detections."""
    cursor = db.execute(
        "SELECT DISTINCT Date FROM detections ORDER BY Date DESC"
    )
    rows = cursor.fetchall()
    return {"dates": [row[0] for row in rows]}


@router.get("/detections/by-file/{filename:path}")
async def get_detection_by_file(
    filename: str,
    db: sqlite3.Connection = Depends(get_db),
):
    """Get detection by filename."""
    cursor = db.execute(
        """SELECT Date, Time, Sci_Name, Com_Name, Confidence, Lat, Lon,
                  Cutoff, Week, Sens, Overlap, File_Name
           FROM detections
           WHERE File_Name = ?
           ORDER BY Date DESC, Time DESC""",
        (filename,)
    )
    row = cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    return dict(row)


@router.delete("/detections/{filename:path}")
async def delete_detection(
    filename: str,
    user: str = Depends(verify_credentials),
    db: sqlite3.Connection = Depends(get_db),
    settings: Settings = Depends(get_settings),
):
    """Delete a detection and its associated files.
    
    Requires authentication.
    """
    import os
    import subprocess
    
    # Get the detection to find the file path
    cursor = db.execute(
        "SELECT Date, Sci_Name FROM detections WHERE File_Name = ?",
        (filename,)
    )
    row = cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail="Detection not found")
    
    detection_date = row[0]
    sci_name = row[1]
    
    # Build file paths
    base_path = os.path.join(settings.by_date_dir, detection_date, sci_name)
    audio_path = os.path.join(base_path, filename)
    spectrogram_path = audio_path + '.png'
    
    # Delete from database (using a new writable connection)
    write_db = sqlite3.connect(settings.db_path)
    try:
        write_db.execute("DELETE FROM detections WHERE File_Name = ?", (filename,))
        write_db.commit()
    finally:
        write_db.close()
    
    # Delete files
    deleted_files = []
    for path in [audio_path, spectrogram_path]:
        if os.path.exists(path):
            try:
                os.remove(path)
                deleted_files.append(path)
            except PermissionError:
                # Try with sudo
                subprocess.run(['sudo', 'rm', path], check=True)
                deleted_files.append(path)
    
    return {
        "message": "Detection deleted",
        "filename": filename,
        "deleted_files": deleted_files,
    }
