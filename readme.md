AllJoyn Typescript (Part of the AllJoyn Portable Project)
=========================================================

What is AJ.TS project?
----------------------

AJ.TS is a lightweight AllJoyn protocol implementation made in TypeScript. We have selected TypeScript as our base implementation, as we believe that TypeScript is the most portable option. Our current implementation can run everywhere:
* in any browser, which means easy deploynment of AllJoyn to any mobile device
* as a part of Apache Cordova application
* as WinJS application
* in Node.JS, which means we can easy deploy AllJoyn services in the cloud, as well as on any IoT device running Node.JS - we are currently testing MTK MT7688 and Tessel 2 boards

How to start?
----------------------

This repository is under heavy development right now, and  not all the features are enabled yet.

In a meanwhile you can preview our sample AJ.TS HTML Application here:

http://htmlpreview.github.io/?https://github.com/AllJoynPortable/AllJoynTypescript/master/projects/TypeScriptHtmlApp/index.html

Allow a few seconds before entire page loads, as it's pulled directly from our git repo.

Alternatively you can just clone our repository and open following solution in Visual Studio 2015:

...\AllJoynTypescript\projects\TypeScriptHtmlApp\AllJoynTypeScriptHtml.sln



What is the future?
-------------------

**Converting AJ.TS to Other Languages**

We are currently experimenting with TypeScript compiler. We are intending create customised emitters for C# and ANSI C. The goal is to maintain single TypeScript version of our protocol stack implementation, that can be easily transformed into C# anc C. In order to make this possible base protocol implementation must use restricted subset of JavaScript/TypeScript.

**Compiling to Native**

We are considering LLILUM project (https://github.com/NETMF/llilum) to enable porting of AJ.TS to Cortex M class devices. Thanks to porting restrictions mentioned in previous paragraph, we can achieve this easily, and the target footprint shall be very small.

**Ultra small TypeScript Interpreter**

We have been experimenting with **xsts** - ultra-small TypeScript interpreter with target footprint of around 40k (code), and 8k RAM required for running.  


