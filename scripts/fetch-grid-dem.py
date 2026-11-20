import math,urllib.request,concurrent.futures,json,sys
from pathlib import Path
directory=Path(sys.argv[1] if len(sys.argv)>1 else "/tmp/rf-grid-dem");directory.mkdir(parents=True,exist_ok=True)
from PIL import Image
import numpy as np
lat,lon,r,z=18.106857,102.227164,10,13
pts=[]
for dx in [-r,r]:
 for dy in [-r,r]:
  la=lat+dy/111.195;lo=lon+dx/(111.195*math.cos(math.radians(lat)))
  pts.append(((lo+180)/360*2**z*256,(1-math.asinh(math.tan(math.radians(la)))/math.pi)/2*2**z*256))
jobs=[(x,y) for y in range(int(min(p[1] for p in pts)//256)-1,int(max(p[1] for p in pts)//256)+2) for x in range(int(min(p[0] for p in pts)//256)-1,int(max(p[0] for p in pts)//256)+2)]
def fetch(p):
 x,y=p;path=directory/f'{x}-{y}.png'
 if not path.exists():
  with urllib.request.urlopen(f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',timeout=60) as response:path.write_bytes(response.read())
 a=np.array(Image.open(path).convert('RGBA'));h=a[:,:,0].astype(float)*256+a[:,:,1]+a[:,:,2]/256-32768;h[a[:,:,3]==0]=np.nan;h.astype('<f4').tofile(directory/f'{x}-{y}.bin');return [x,y]
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:out=list(pool.map(fetch,jobs))
json.dump({'z':z,'tiles':out},open(directory/'manifest.json','w'));print('Downloaded actual Terrarium DEM:',len(out),'tiles')
