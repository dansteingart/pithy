# pithy is

```
1. concise and forcefully expressive, or
2. containing much pith
```

Code should be 1, not 2.

Sometimes you want to share code and see what it does on the same page. sometimes you want to do this for python with scientific computing. enter pithy.

pithy has code on the left, and output on the right. all changes are saved, and the url is freely shareable. pithy has been tested against sophomores and juniors in chemical and mechanical engineering classes successfully since 2011.

pithy is python for sharing plots and numerical output, among other things. It's really pretty cool, but you have to play with it for a bit to see why. Go to the [this site](https://www.notion.so/ceecnyc/pithy-f6f3546b84634327b7e623c9e1f3d767) to get a sense of what it can do, but have this taste:

![pithy_show](https://user-images.githubusercontent.com/152047/120088467-bd77db00-c0be-11eb-81ee-bb2410544fd5.gif)

## You might say

pithy is just like [juptyer notebook](http://juptyer.org/), or the [adafruit learning system IDE](http://learn.adafruit.com/), or `<insert your favorite web ide here>`, and I'd be flattered. But it's got differences, and the best way to understand them is this:

The incomparable [Aaron Swartz](https://en.wikipedia.org/wiki/Aaron_Swartz) made a couple of web page/wiki/blog/information engines that are awesome and (imho) radically under-appreciated. They are [jottit](https://www.jottit.com/) and [infogami](https://github.com/infogami/infogami). The beauty of these programs is the expansiveness of what they can do coupled with the minimal overhead of what you need to get something done.

Here's why they're great: 

You go to a url. 
If the url exists, you can read what's there. 
          You might be able to add to it. 
If the url doesn't exist, then within 5 seconds you can make it exist. 

Minimal (if any) logging in, and close to zero friction between you and new content. No laborious wizards nor setup queues. No "file menu". no "really?". Just writing. if you needed to go back, you could.

I learned python because Aaron spoke highly of it, and pithy is inspired by Aaron's approach to adding content to the web, but rather that verbally expressive content this is intended for quantitative analyses.

Why is this useful? Imagine you write an analysis of a dynamic dataset in r, or matlab, or whatever. Now imagine if that analysis could be viewed, edited non-destructively, rolled back and/or forked instantaneously by anyone without a login or cumbersome sign-in steps. Now imagine that this analysis is also a standalone web page that can be automatically refreshed.

This is pithy. It does that.

## Big warning

Pithy runs arbitrary python on your machine and sends the output back to the browser in a fairly clear manner. this is convenient, this is also potentially SUPER DANGEROUS. thus far there is an optional attempt at code scrubbing to stop people from writing local files, reading local files and `rm -rf`-ing your stuff, but it is most definitely not sandboxed nor bullet proof. it is currently *not enabled*. thus, pithy should be run on a server:

1. that is routinely backed up (like all good servers should be)
2. has nothing that you don't want the world to see that is not encrypted (ditto)
3. that can suffer some downtime if someone does something stupid

The [raspberry pi](http://www.raspberrypi.org/) is an awesome server for this very thing. it runs not bad on an rpi2 and really well on an rpi4.

Because pithy just runs from a directory, standard http authentication can be applied to make stuff safe(r), herein we use some very simple stuff.

## Let's Do It

### The easiest way to use pithy is just spin out a docker container

This will get you up and running right quick

```bash
docker run -dit -e UPDATE=true -p 8080:8080 -p 8081:8081 \
--name pithy_trial \
steingart/pithy
```

For those not well versed in docker this will 

- pull (a rather large at ~`1.1 GB`) docker image called `steingart/pithy` your way with a lot of python libraries built in (in both `python2` and `python3`) to do science-y data-y stuff.
- Including libs....

  ```bash
  numpy
  scipy
  matplotlib
  pandas
  scikit-learn
  pymongo
  pillow
  plotly
  sympy
  xlrd
  ```

- map ports `8080` and `8081` to the pithy editor and viewer
- change the first number in each to  map otherwise, not the latter. 
(e.g. `-p 9000:8080 -p 9001:8081`)
- sets the `UPDATE` flag to `true`, this tells the docker image to pull the latest version of pithy web framework
- Detaches a session `-dit` so it's running in the background
- With a name of `pithy_trial`

If you want to save the code on the host, add a `-v [YOUR HOST DIR]:/pithy` flag to the above docker line.

Obviously, if you know docker, go to town and make it fit your needs with networking etc etc.

### But you don't need to use Docker

If you just want to use pithy on your host, all you need is 
- node version > 16  available
- python3 available

```bash
git clone http://github.com/dansteingart/pithy
```

and then in that directory 

```bash
bash start.sh
```
## More Details
Coming

