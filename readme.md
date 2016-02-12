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

http://alljoynportable.github.io/AllJoynTypescript/projects/TypeScriptHtmlApp/index.html

Alternatively you can just clone our repository and open following solution in Visual Studio 2015:

...\AllJoynTypescript\projects\TypeScriptHtmlApp\AllJoynTypeScriptHtml.sln



What is the future?
-------------------

**Converting AJ.TS to Other Languages**

We are currently experimenting with TypeScript compiler. We are intending create customised emitters for C# and ANSI C. The goal is to maintain single TypeScript version of our protocol stack implementation, that can be easily transformed into C# anc C. In order to make this possible base protocol implementation must use restricted subset of JavaScript/TypeScript.

**AJ.TS for Cortex M**

We are considering ways of deoploying AJ.TS to even smaller devices.

