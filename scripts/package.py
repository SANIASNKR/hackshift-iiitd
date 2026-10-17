"""Create and verify a secret-free project ZIP; run from any working directory."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED, BadZipFile

ROOT=Path(__file__).resolve().parent.parent
DEST=ROOT/'AyuStream_AI_Complete_Project.zip'
SKIP_PARTS={'.git','.venv','venv','node_modules','__pycache__','.pytest_cache','dist','build','.mypy_cache','.ruff_cache','.idea','.vscode','.next','coverage'}
SKIP_SUFFIX={'.db','.pyc','.pyo','.log','.zip'}
SKIP_NAMES={'.env','.DS_Store','npm-debug.log'}

def include(p):
    relative=p.relative_to(ROOT)
    return not any(part in SKIP_PARTS for part in relative.parts) and p.name not in SKIP_NAMES and p.suffix not in SKIP_SUFFIX

def main():
    files=sorted(p for p in ROOT.rglob('*') if p.is_file() and include(p))
    assert files,'No project source files found'
    with ZipFile(DEST,'w',compression=ZIP_DEFLATED,compresslevel=8) as z:
        for path in files:z.write(path,arcname=str(Path('AyuStream_AI')/path.relative_to(ROOT)))
    required={'AyuStream_AI/README.md','AyuStream_AI/PROJECT_STATUS.md','AyuStream_AI/DEMO_GUIDE.md','AyuStream_AI/WEBSOCKET_EVENTS.md','AyuStream_AI/backend/app/main.py','AyuStream_AI/frontend/package.json','AyuStream_AI/frontend/src/main.tsx','AyuStream_AI/backend/tests/test_workflow.py','AyuStream_AI/.env.example','AyuStream_AI/scripts/package.py','AyuStream_AI/scripts/package.sh','AyuStream_AI/docker-compose.yml','AyuStream_AI/docs/PRD.md','AyuStream_AI/docs/FUTURE_SCOPE.md','AyuStream_AI/docs/AMBULANCE_TRACKING.md'}
    with ZipFile(DEST) as z:
        bad=z.testzip()
        names=set(z.namelist())
        assert bad is None,f'Corrupted member: {bad}'
        assert required<=names,f'Missing required files: {required-names}'
        print('Validated archive:',DEST)
        print('Files:',len(names),'Uncompressed:',sum(i.file_size for i in z.infolist()),'bytes')
        print('ZIP size:',DEST.stat().st_size,'bytes')
if __name__=='__main__':main()
