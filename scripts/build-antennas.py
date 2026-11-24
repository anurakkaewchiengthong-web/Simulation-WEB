import zipfile,re,json,hashlib,math,sys
from pathlib import Path
from collections import defaultdict
out=Path('dist/antennas');out.mkdir(exist_ok=True);groups=defaultdict(list)
for file,kind in [('3.Yagis_Planet.zip','Yagi'),('4.Collinear_Omnis_Planet.zip','Omni')]:
 with zipfile.ZipFile(Path(sys.argv[1])/file) as z:
  for name in z.namelist():
   if not name.lower().endswith('.prn'):continue
   lines=z.read(name).decode('utf-8-sig').splitlines();meta={};cuts={};i=0
   while i<len(lines):
    parts=lines[i].split(maxsplit=1);i+=1
    if not parts:continue
    key=parts[0].upper();value=parts[1].strip() if len(parts)>1 else ''
    if key in ['HORIZONTAL','VERTICAL']:
     count=int(value);pairs=[list(map(float,line.split())) for line in lines[i:i+count]];i+=count
     assert count==360 and all(len(p)==2 and p[0]==j and math.isfinite(p[1]) and p[1]>=0 for j,p in enumerate(pairs)),name
     cuts[key]=[p[1] for p in pairs]
    else:meta[key]=value
   assert meta['GAIN'].endswith('dBi') and len(cuts)==2,name
   model=re.sub(r'_\d+(?:\.\d+)?\.prn$','',name,flags=re.I)
   groups[(kind,model)].append(dict(f=float(meta['FREQUENCY']),gain=float(meta['GAIN'].split()[0]),h=cuts['HORIZONTAL'],v=cuts['VERTICAL'],source=name,tilt=meta.get('TILT','')))
manifest=[];issues=[]
for (kind,name),patterns in sorted(groups.items()):
 patterns.sort(key=lambda p:p['f'])
 unique={};conflicts=[]
 for row in patterns:
  previous=unique.get(row['f'])
  if previous and any(previous[k]!=row[k] for k in ['gain','h','v']):conflicts.append([previous['source'],row['source']])
  else:unique[row['f']]=row
 if conflicts:
  issues.append(dict(name=name,kind=kind,reason='Different patterns claim the same FREQUENCY',conflicts=conflicts));continue
 patterns=list(unique.values())
 id=hashlib.sha256((kind+name).encode()).hexdigest()[:16];entry=dict(id=id,name=name,kind=kind,min=patterns[0]['f'],max=patterns[-1]['f'],frequencies=[p['f'] for p in patterns])
 (out/(id+'.json')).write_text(json.dumps(dict(**entry,patterns=patterns),separators=(',',':')));manifest.append(entry)
expected={m['id']+'.json' for m in manifest}
for old in out.glob('*.json'):
 if re.fullmatch(r'[0-9a-f]{16}\.json',old.name) and old.name not in expected:old.unlink()
(out/'issues.json').write_text(json.dumps(issues,indent=2))
(out/'catalog.json').write_text(json.dumps(manifest,separators=(',',':')))
print('Validated',sum(len(v) for v in groups.values()),'PRN files;',len(manifest),'eligible models;',len(issues),'models withheld for conflicting data')
