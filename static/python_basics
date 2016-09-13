#Hello there.

#We're going to work together to learn python.  

#Briefly, Python is an efficienct object oriented langauge that combines many of the best features of scripting langauges, mathematically oriented langauges (e.g. fortran and matlab), as well as 'proper modern' langauges like C++, and Java.

#Comments are defined with a '#' sign.  Nothing to the right of a '#' in python is executed

#This is how we import libraries
from pithy import *
#Pithy is a helper library that abstracts many helper function.  abstracting, roughly, means you don't have to worry about it (until something breaks).

#let's get started

print "<b>Variable Assignment Section</b>"
#this is how you set a variable
a = "apple"
b = 1
c = ['apple',3,'whatever']

#This is how you show a variable (look to the right -->)

print a
print b
print c
#throw them together
print a,b,c
print ""
#some math stuff

print "<b>Math Section</b>"


d = 7.0 #use decimals to indicate you would like to do math with a float
e = 9.0
print "d =",d
print "e =",e
print "d+e =",d+e
print "d-e =",d-e
print "d*e =",d*e
print "d/e =",d/e
print "d^2 =",d**2
print "e^2 =",e**2
print "PEMDAS COUNTS!"
print ""


#Notice how python doesn't seem to care what type of data you assigned to a variable.  This is because python trusts you to know what you are doing and gives you plenty of rope to hang yourself.  please don't hang yourself.  For more about this go here: http://bit.ly/python-typing

#Here's where it can get tricky:
print "<b>Error Handling Section</b>"
try:
    ab = a+b
    print ab
except Exception as err:
    print "<span style='color:red'>",err,"</span>"
    
print "why did that happen?"
    
#Notice what we did up there: we used try and except to try a risky function ("try:") and then handle ("except Exception as err:") error that risk function might have created.  If we did not handle the error the programe would have stopped dead in its tracks.

#Notice, also, that I indented code above.  python uses "whitespace" to delimit code. let's examine this with some common programming concepts
print ""
print "<b>Conditional Section</b>"

a = 5
b = 4
if a > b:
    print "a is larger"
elif b<a:
    print "b is larger"
else:
    print "a and b are the same"
    
#if whitespace is not consistent, an error is thrown

print ""
print "<b>Iterators and Lists Section</b>"
#iteration in python is more similar to matlab than c.  below we will use a range operator

#let's make a list of numbers from 1 to 9
a = range(1,10)
print 'a = ', a

#now, to interate through:
print "now let's count"
for i in a:
    print i
print ""
#now, to interate through:

print "now be a bit tricky"
for i in a:
    print str(i)+"^"+str(i)+" = ",i**i
#what did I just do there?
print ""
print "now for a casting error that python will pass to your frustration"
print ""
for i in a:
    print str(i)+"/5 = ",i/5
print ""    
print "wait, that's not right"
print ""    
for i in a:
    print str(i)+"/5 = ",i/float(5)
print "much better, what did I change?"

print "finally, a while conditional"
a = 0
while a < 10:
    print a
    a += 1

print "what happens if the condition is never met?"

print ""
print "<b>Function Defining Section</b>"
#to define a function
def myfunction(a,b):
    return a+b
    
print myfunction(10,2)
print ""
print "<b>Array Math</b>"
print "we are using a library that allow matlab like functions, such as element-wise multipcation"

#make a list
a = range(0,100,10)
a = array(a) #turn the list to an array that we can treat like a vector
print "a = ",a
print "2*a = ", 2*a
print "a^2 =", a**2

print ""
print "<b>Plotting Section</b>"

#this is how we plot
plot(a,3*a**(.5),label="3*a^(1/2)") #plot a on the x-axis, sqrt(a) on the y-axis, and label "a^(1/2") 
plot(a,2*a,label="2*a")
plot(a,a,label="a")
legend() #show a legend
ylabel("Y-Axis") #label your axes
xlabel("X-Axis") #label your axes
showme(kind="still") #show the plot
clf() #clear the data on the plot, IMPORTANT TO USE






