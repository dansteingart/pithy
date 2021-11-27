#! /Users/dan/.pyenv/shims/python3

from __future__ import print_function
import numpy
import matplotlib
import time
import io
import urllib.request, urllib.parse, urllib.error
import base64
from subprocess import getoutput as go
from glob import glob
matplotlib.use('agg')
from pylab import *
rcParams['mathtext.fontset'] = 'stixsans'
from matplotlib import rc, font_manager
import json 

font_dirs = ['/Users/dan/Code/pityh/fonts/']
font_files = font_manager.findSystemFonts(fontpaths=font_dirs)
for font_file in font_files:
    try:
        font_manager.fontManager.addfont(font_file)
    except: None

#Set Font Size and enable "normal font" for subscripts
matplotlib.rcParams.update({'font.size': 10,'mathtext.default': 'regular' })

#Set Font
rc('font',**{'family':'sans-serif','sans-serif':['Helvetica']})


fig, ax = plt.subplots()

#Figure Defaults
#rcParams['font.family'] = "Arial"


#hack to make things worth from PIL

def showint():
    print((mpld3.fig_to_d3(fig).replace("\n","\r")))

def himg(fn):
    print(("<img src='%s'>" % fn))

def showimg(im,tip=".png",width=None,dpi=150):
    tim = str(int(time.time()))    
    #imname = imname.replace("/","-")
    image = 'images/pithy_img_'+str(int(time.time()*1000))+tip
    im.save(image,dpi=dpi)
    
    if width != None:
        print("<img src='%s' style='width:%s'>" % (image,str(width)), end=' ')
    else: print('##_holder_##:',"/"+image)
    


def showme(tip="png",kind="encode",width=None,height=None,css=None,inline=False,dpi=150):
    tim = str(int(time.time()))	
    image = 'images/pithy_img_'+str(int(time.time()*1000))+"."+tip

    s = w = h = None
    if css != None: s = json.dumps(css)
    if width != None: w = "width:"+str(width)+"px;"
    if height != None: h = "height:"+str(height)+"px;"
    if s == None: s = "style='%s%s'" %(w,h)    

    if kind == "encode": 
        print(imager64(tip=tip,dpi=dpi,style=s), end=' ')
        if not inline: print("")
 
    elif (kind == "static"):
        savefig(image,dpi=dpi,bbox_inches="tight")
        print(f'<img src="{image}" style="{s}">')

    else: 
        savefig(image,dpi=dpi,bbox_inches="tight")
        print('##_dynamic_##:',kind,':',tim,':',"/"+image)



def imager64(tip="svg",dpi=80,style=None):
    imgdata = io.BytesIO()
    savefig(imgdata,dpi=dpi,format=tip,bbox_inches="tight")
    imgdata.seek(0)  # rewind the data
    preload = 'data:image/%s;base64,'% tip 
    if tip == "svg":
        preload = 'data:image/svg+xml;base64,' 
    uri =  preload+urllib.parse.quote(base64.b64encode(imgdata.getvalue()))
    return '<img %s src = "%s"/>' % (style,uri)

#A smoothing function I use
def smooth(x,window_len=11,window='flat'):
    if x.ndim != 1:
        raise ValueError("smooth only accepts 1 dimension arrays.")

    if x.size < window_len:
        raise ValueError("Input vector needs to be bigger than window size.")

    if window_len<3:
        return x

    if not window in ['flat', 'hanning', 'hamming', 'bartlett', 'blackman']:
        raise ValueError("Window is on of 'flat', 'hanning', 'hamming', 'bartlett', 'blackman'")

    s=numpy.r_[x[window_len-1:0:-1],x,x[-1:-window_len:-1]]
    #print(len(s))
    if window == 'flat': #moving average
        w=numpy.ones(window_len,'d')
    else:
        w=eval('numpy.'+window+'(window_len)')

    y=numpy.convolve(w/w.sum(),s,mode='valid')
    
    y = list(y)
    #account for windowing shift 2012-08-02
    for j in range(0,int(window_len)):
        y.pop(0)

    
    return array(y)





def strrip(string,ff,fl):
    part1 = string.find(ff)
    part2 = string.find(fl)
    return string[part1+len(ff):part2]

#line # hack from http://code.activestate.com/recipes/145297-grabbing-the-current-line-number-easily/
def lineno():
    """Returns the current line number in our program."""
    return inspect.currentframe().f_back.f_lineno

def refresh(interval = 5):
    print("<meta http-equiv='refresh' content='%i'>" % interval)


clf()

if __name__ == "__main__":
    print(rcParams['figure.figsize'])
    print(rcParams['figure.dpi'])
    
    a = linspace(0,1,100)
    for i in logspace(-1,1,10):
        plot(a,a**i)
    showme(tip="svg")
    clf()
