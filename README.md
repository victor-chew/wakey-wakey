# Wakey Wakey

Wakey Wakey is a network alarm clock system. 

I repurpose old Android mobile phones (from the KitKat and Lollipop era) to use as alarm clocks in my 3 young kids' rooms. It gets pretty tiresome syncing up the alarm clocks (eg. when the next day is a public holiday and you want to disable the alarm just for that day so that everyone can get a bit more sleep). 

I thought it would be pretty cool if I could update all the alarm clocks remotely from a webapp. I couldn't find anything that does that, so I decided to implement my own.

For the web end of things, I decided to repurpose a previous project [Shopping Buddy](https://github.com/victor-chew/shopping-buddy) for this purpose. As with Shopping Buddy, data entered are stored on [CouchDB](http://couchdb.apache.org).

The Android client that interfaces with the backend database is available in a separate Github repository:

[https://github.com/victor-chew/wakey-wakey-android-client](https://github.com/victor-chew/wakey-wakey-android-client)

# Screenshots
![Screenshot](https://wakey.randseq.org/screenshots/screenshot01.png "Screenshot 1")
![Screenshot](https://wakey.randseq.org/screenshots/screenshot02.png "Screenshot 2")

# Libraries used

* [Onsen UI](https://onsen.io) for the UI. As a personal preference, I chose to fix the look-and-feel (Material) instead of letting it vary with the platform. 

* [CouchDB](http://couchdb.apache.org) as the backend database.

* [pouchdb](https://pouchdb.com/) to connect to CouchDB in Javascript. This helps take care of the synchronization of data between different instances of the app.

* [PHPOnCouch](https://php-on-couch.readthedocs.io/) to allow the backend PHP script to connect to CouchDB

# Live Demo
The webapp can be accessed here:
[https://wakey.randseq.org/](https://wakey.randseq.org/ "Wakey Wakey Live Demo")

