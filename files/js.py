import webby

webby.js_eval('alert("Hi! This is a message from python.");')
if webby.ask('Do you want visit google?'):
    webby.redirect('http://www.google.de')