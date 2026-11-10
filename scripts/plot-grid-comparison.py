import json,sys
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap,BoundaryNorm
root=Path(sys.argv[1]);report=json.loads((root/'report.json').read_text());out=Path('dist/reports');out.mkdir(exist_ok=True)
(out/'grid-validation.json').write_text(json.dumps(report,indent=2))
colors=ListedColormap(['#ff0000','#fea900','#a9fe00','#00fe00','#00fea9','#00a9fe','#0000ff']);colors.set_bad('#eeeeee');bounds=[-105,-95,-85,-75,-65,-55,-45,20];norm=BoundaryNorm(bounds,colors.N)
fig,axes=plt.subplots(2,2,figsize=(11,10),constrained_layout=True)
for ax,row in zip(axes.flat,report['results']):
 n=row['n'];a=np.fromfile(root/f"rssi-{row['spacing']}.bin",dtype='<f4').reshape(n,n);a=np.ma.masked_where(~np.isfinite(a)|(a< -105),a)
 im=ax.imshow(a,extent=[-10,10,-10,10],origin='upper',cmap=colors,norm=norm,interpolation='nearest');ax.set_xlim(-5,5);ax.set_ylim(-5,5);ax.plot(0,0,'k+',ms=9);ax.set_title(f"Grid {row['actualM']:.1f} m | {row['valid']:,} computed points\nHoldout MAE {row['meanAbsoluteDb']:.2f} dB; P95 {row['p95AbsoluteDb']:.2f} dB");ax.set_xlabel('East from station (km)');ax.set_ylabel('North from station (km)')
fig.suptitle('Actual terrain calculation: 18.106857, 102.227164\n857 MHz | DEM + Bullington | radius 10 km | TX 43 dBm | height 50 / 1.5 m\nSame DEM and path sampling; native RF grids shown without display smoothing',fontsize=12)
fig.colorbar(im,ax=axes,ticks=bounds[:-1],label='Downlink RSSI (dBm)',shrink=.75)
fig.savefig(out/'grid-comparison.png',dpi=150);plt.close(fig)
