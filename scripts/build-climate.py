"""Convert user Drive P.530 CSVs and official P.837-7 rain map to lossless float64-LE bands.
Usage: python scripts/build-climate.py SOURCE_DIR
SOURCE_DIR contains drive/*.csv and downloaded rain-maps-entry.bin (first ZIP entry).
"""
import sys,array,json,hashlib,struct,zlib,zipfile,io,math,random
from pathlib import Path
src=Path(sys.argv[1]);out=Path(__file__).resolve().parents[1]/'dist/climate';out.mkdir(exist_ok=True)
for axis in ['Latitude','Longitude']:
 rows=[list(map(float,l.split(','))) for l in (src/'drive'/f'{axis}QuarterDegree.csv').read_text().splitlines()]
 assert len(rows)==721
 for i,row in enumerate(rows):
  assert len(row)==1441
  assert all(v==(90-i*.25 if axis=='Latitude' else -180+j*.25) for j,v in enumerate(row))
b=(src/'rain-maps-entry.bin').read_bytes();v=struct.unpack_from('<4s5H3I2H',b);start=30+v[-2]+v[-1];raw=zlib.decompress(b[start:start+v[7]],-15);assert zlib.crc32(raw)==v[6]
z=zipfile.ZipFile(io.BytesIO(raw));rainzip=zipfile.ZipFile(io.BytesIO(z.read('P.837_R001_Maps.zip')));rain=rainzip.read('R001.TXT');(src/'R001.TXT').write_bytes(rain)
for axis in ['LAT','LON']:
 for i,line in enumerate(rainzip.read(axis+'_R001.TXT').decode().splitlines()):
  row=list(map(float,line.split()));assert len(row)==2881
  assert all(v==(-90+i*.125 if axis=='LAT' else -180+j*.125) for j,v in enumerate(row))
folder='https://drive.google.com/drive/folders/1KD_aZCMZNI1dnjCgEpXsFsxRR0VazQJu'
meta={'release':'p530-18_p837-7-drive-v1','encoding':'float64-le','bandDegrees':10,'latitudeOrder':'90 to -90','longitudeOrder':'-180 to 180','interpolation':'bilinear on map values','driveFolder':folder,'importDate':'2026-10-27','maps':{}}
pts=[(18.116615,102.222684),(18.106857,102.227164),(8.12264,100.26483),(0,0),(90,180),(-90,-180),(10,180),(10,-180),(9.9999,102),(10.0001,102),(-33.87,151.21),(51.5,-.12)];rng=random.Random(530);pts +=[(rng.uniform(-85,85),rng.uniform(-180,180)) for _ in range(15)];refs=[{'lat':lat,'lon':lon} for lat,lon in pts]
for name,file,step,rev,url in [('logK',src/'drive/LogK.csv',.25,False,'https://drive.google.com/file/d/1QY5xen0Mk-ww0c-roJuux2ovbG6r50B7/view'),('dN75',src/'drive/dN75.csv',.25,False,'https://drive.google.com/file/d/1HY5conqurzOgLwqul6IuvohHvDZS6eYI/view'),('r001',src/'R001.TXT',.125,True,'https://www.itu.int/dms_pubrec/itu-r/rec/p/R-REC-P.837-7-201706-S!!ZIP-E.zip')]:
 rows=[array.array('d',map(float,line.replace(',',' ').split())) for line in file.read_text().splitlines() if line.strip()];assert len(rows)==int(180/step)+1 and all(len(r)==int(360/step)+1 for r in rows)
 for ref in refs:
  y=(ref['lat']+90)/step if rev else (90-ref['lat'])/step;x=(ref['lon']+180)/step;i=min(len(rows)-2,math.floor(y));j=min(len(rows[0])-2,math.floor(x));dy=y-i;dx=x-j
  ref[name]=sum(rows[i+di][j+dj]*(dy if di else 1-dy)*(dx if dj else 1-dx) for di in [0,1] for dj in [0,1])
 if rev:rows.reverse()
 stride=int(10/step)
 for band in range(18):
  data=array.array('d')
  for r in rows[band*stride:(band+1)*stride+1]:data.extend(r)
  if sys.byteorder!='little':data.byteswap()
  (out/f'{name}-{band:02}.bin').write_bytes(data.tobytes())
 meta['maps'][name]={'sourceFile':file.name,'sourceSHA256':hashlib.sha256(file.read_bytes()).hexdigest(),'sourceURL':url,'step':step,'rows':len(rows),'columns':len(rows[0]),'sourceLatitudeOrder':'south-to-north' if rev else 'north-to-south'};print(name,len(rows),len(rows[0]))
(out/'manifest.json').write_text(json.dumps(meta,indent=2)+'\n');(Path(__file__).parent/'climate-reference.json').write_text(json.dumps(refs,indent=2)+'\n')
