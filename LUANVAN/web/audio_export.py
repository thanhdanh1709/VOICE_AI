"""
Audio format export — WAV, MP3, OGG via ffmpeg.
Requires ffmpeg in PATH.
"""
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Tuple

SUPPORTED_FORMATS = {'wav', 'mp3', 'ogg'}
ALLOWED_BITRATES = {64, 96, 128, 192, 256, 320}

_MIMETYPES = {
    'wav': 'audio/wav',
    'mp3': 'audio/mpeg',
    'ogg': 'audio/ogg',
}


def ffmpeg_available() -> bool:
    return shutil.which('ffmpeg') is not None


def export_audio(source_wav: Path, fmt: str, bitrate: int = 192) -> Tuple[Path, str, str]:
    """
    Convert WAV source to requested format.
    Returns (output_path, download_name, mimetype).
    Raises ValueError / RuntimeError on failure.
    """
    fmt = (fmt or 'wav').lower()
    if fmt not in SUPPORTED_FORMATS:
        raise ValueError(f'Unsupported format: {fmt}')
    if fmt in ('mp3', 'ogg'):
        bitrate = int(bitrate)
        if bitrate not in ALLOWED_BITRATES:
            raise ValueError(f'Invalid bitrate: {bitrate}')

    if fmt == 'wav':
        return source_wav, source_wav.name, _MIMETYPES['wav']

    if not ffmpeg_available():
        raise RuntimeError('ffmpeg not installed')

    out_suffix = f'.{fmt}'
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=out_suffix)
    tmp.close()
    out_path = Path(tmp.name)
    stem = source_wav.stem
    download_name = f'{stem}.{fmt}'

    cmd = ['ffmpeg', '-y', '-i', str(source_wav), '-hide_banner', '-loglevel', 'error']
    if fmt == 'mp3':
        cmd += ['-codec:a', 'libmp3lame', '-b:a', f'{bitrate}k']
    elif fmt == 'ogg':
        # Vorbis quality scale ~ -q:a 3-9 maps to decent bitrates
        q = 4 if bitrate <= 128 else (6 if bitrate <= 192 else 8)
        cmd += ['-codec:a', 'libvorbis', '-q:a', str(q)]
    cmd.append(str(out_path))

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not out_path.exists() or out_path.stat().st_size == 0:
        out_path.unlink(missing_ok=True)
        err = (result.stderr or result.stdout or 'ffmpeg failed').strip()
        raise RuntimeError(err[:300])

    return out_path, download_name, _MIMETYPES[fmt]
