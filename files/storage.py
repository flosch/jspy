import webby        # see files/webby.py
import webstorage   # see files/webstorage.py

print "Hi, I'm using HTML5's WebStorage!"

if not webstorage.has_key('name'):
    name = webby.prompt("What's your name?")
    if not name:
        print "Aww, don't wanna say me your name?! Ok, then not."
    else:
        webstorage.set('name', name)
        print name, "- nice to meet you!"
        print "Try rerunning this app to see the effect."
else:
    print "Welcome back,", webstorage.get('name')
    print "I've removed your name."
    webstorage.clear()