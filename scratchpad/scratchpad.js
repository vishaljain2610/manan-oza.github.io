$(function(){
  
    
  // Scratchpad Intro
  //--------------------------------------------------------------------------------
  var intro = 
  ['<style>',
  '  body {background: #0006B2;}',
  '  .container {',
  '    background: #fff;',
  '    padding: 50px;',
  '    margin: 50px auto;',
  '    width: 400px;',
  '    font-family: sans-serif;',
  '    border-radius: 4px;',
  '  }',
  '</style>',
  '<div class="container">',
  '  <h1><img src="/img/logo-dark.png" alt="Scratchpad"></h1>',
  '  <p>Hello!</p>',
  '  <p>My name is <a target="blank" href="http://twitter.com/nbashaw">Nathan Bashaw</a> and I am a designer and hacker living in San Francisco. I built Scratchpad to make it simpler for beginners to learn HTML and CSS. It\'s also a supplement to the book I\'m writing called <a target="blank" href="http://enoughtobedanger.us">Enough To Be Dangerous</a> &mdash;  a step-by-step guide to coding your first web application. Happy hacking!</p>',
  "  <b>How to use Scratchpad:</b>",
  "  <ol>",
  "    <li>Write HTML &amp; CSS &mdash; watch it render instantly</li>",
  "    <li>Press &#8984; + i to toggle fullscreen view</li>",
  "    <li>Share the URL with friends (it updates in realtime)</li>",
  "  </ol>",
  "  <em>Et Voil&agrave;!</em>",
  '</div>'].join('\n');
  
  
  // Ace code edtor
  //--------------------------------------------------------------------------------
  var editor = ace.edit("editor");
  editor.setTheme("ace/theme/tomorrow_night_eighties");
  editor.getSession().setMode("ace/mode/html");
  editor.setHighlightActiveLine(false);
  editor.getSession().setTabSize(2);
  document.getElementById('editor').style.fontSize='11px';
  editor.commands.removeCommand('gotoline');
  editor.setShowPrintMargin(false);
  editor.commands.addCommand({
    name: 'showHelp',
    bindKey: {win: 'Ctrl-/',  mac: 'Command-/'},
    exec: function(editor) {
        $('#help').toggleClass('visible');
    }
  });
  editor.commands.addCommand({
    name: 'toggleFullscreen',
    bindKey: {win: 'Ctrl-i',  mac: 'Command-i'},
    exec: function(editor) {
        toggleFullscreen();
    }
  });

  // Set up iframe.
  var iframe = document.getElementById('preview'),
    iframedoc = iframe.contentDocument || iframe.contentWindow.document;
  iframedoc.body.setAttribute('tabindex', 0);
  
  // Base firebase ref
  //--------------------------------------------------------------------------------
  var scratchpadRef = new Firebase('https://scratchpad.firebaseio.com/' + Scratchpad.document_id);
  var now = new Date();
  scratchpadRef.child('updatedAt').set(now.toString());
  
  
  // Multiple client stuff
  //--------------------------------------------------------------------------------
  
  // Push a new child to clients that kills itself on disconnect
  var thisClientRef = scratchpadRef.child('clients').push('idle');
  thisClientRef.removeOnDisconnect();
  
  // Keep track of the number of active connections
  scratchpadRef.child('clients').on('value', function(dataSnapshot){
    
    if (dataSnapshot.val() === null) {
      scratchpadRef.child('clients').set({});
    } else {
      
      var numClients = dataSnapshot.numChildren();

      // Label the tooltip appropriately
      $('#connections-tooltip').remove();
      if (numClients === 2) {
        $('#connections').after('<span id="connections-tooltip"> 1 other viewer</span>');
      } else if (numClients === 1) {
        // do nothing
      } else {
        $('#connections').after('<span id="connections-tooltip"> '+ (numClients - 1) + ' other viewers</span>');
      }
      
      // Append proper number of dots
      $('#connections').html('');
      for (i = 1; i < dataSnapshot.numChildren(); i++) {
        $('#connections').append('<li>&nbsp;</li>');
      }
      
    }
    
  });
  
  $('#connections').hover(function(){
    $('#connections-tooltip').css('opacity', 1);
  }, function(){
    $('#connections-tooltip').css('opacity', 0);
  });
  
  
  // Code Editing
  //--------------------------------------------------------------------------------
  var scratchpadEditorRef = scratchpadRef.child('editor');
  
  // When code changes, put it into the editor
  scratchpadEditorRef.on('value', function(dataSnapshot) {
    
    var thisClientStatus;
    thisClientRef.once('value', function(dataSnapshot){
      thisClientStatus = dataSnapshot.val();
    });
    
    // If this is a new scratchpad, put in our intro
    var clearReadOnlyMode;
    if (dataSnapshot.child('code').val() == null) {
      editor.setValue(intro);
    } else if (thisClientStatus == 'typing') {
      // do nothing, we're the ones typing in the first place
    } else {
      window.clearTimeout(clearReadOnlyMode);
      editor.setReadOnly(true);
      editor.setValue(dataSnapshot.child('code').val());
      clearReadOnlyMode = setTimeout(function(){
        editor.setReadOnly(false);
      }, 2000);
    }
    
    // Clear selection and move cursor to where it needs to be
    editor.clearSelection();
    editor.moveCursorToPosition(dataSnapshot.child('cursor').val());
  });
  
  // On keyup, save the code and cursor data to firebase
  var typingTimeout;
  $('#editor').on('keyup', function(){
    
    // Tell firebase who is editing
    window.clearTimeout(typingTimeout);
    thisClientRef.set('typing')
    
    // Get cursor position
    var startrow = editor.selection.getRange().start.row;
    var startcolumn = editor.selection.getRange().start.column;
    var endrow = editor.selection.getRange().end.row;
    var endcolumn = editor.selection.getRange().end.column;
    
    // If nothing is highlighted, ship contents of editor and cursor data to Firebase
    if (startrow == endrow && startcolumn == endcolumn) {
      scratchpadEditorRef.set({code: editor.getValue(), cursor: editor.selection.getCursor()});
    }
    
    // Set a timeout for 2 seconds that tells firebase who is typing
    typingTimeout = setTimeout(function(){
      thisClientRef.set('idle')
    }, 2000) ;
    
  });
  
  // On data change, re-render the code in the iframe.
  editor.getSession().on('change', function(e) {
    iframedoc.body.innerHTML = editor.getValue();
    // Resize the menu icon if appropriate
    var linesOfCode = editor.session.getLength();
    if (linesOfCode < 10) {
      $('#menu').attr('class', 'small')
    } else if ( linesOfCode > 9 && linesOfCode < 99) {
      $('#menu').attr('class', 'medium')
    } else if ( linesOfCode > 99 && linesOfCode < 999) {
      $('#menu').attr('class', 'large')
    } else if (linesOfCode > 999){
      $('#menu').attr('class', 'x-large')
    }
  });
  
  
  // Filename Stuff
  //--------------------------------------------------------------------------------  
  var scratchpadTitleRef = scratchpadRef.child('title');
  
  // Show title on top, keep updated from server
  scratchpadTitleRef.on('value', function(titleSnapshot) {
    if (titleSnapshot.val() == null) {
      scratchpadTitleRef.set('Untitled document');
    } else {
      $('#title').text(titleSnapshot.val());
    }
    document.title = titleSnapshot.val();
  });
  
  // Let users update title when they click it
  $('#title').click(function(){
    var newTitle = prompt('What do you want to name your file?', $(this).text());
    if (newTitle != null) {
      scratchpadTitleRef.set(newTitle);
    }
  });
  
  // Stupid (webkit only?) hover bug fix
  $('#title').hover(function(){$(this).addClass('hover')}, function(){$(this).removeClass('hover')});
  
  
  // Fullscreen mode stuff
  //--------------------------------------------------------------------------------
  
  // Toggle fullscreen mode.
  function toggleFullscreen() {
    if ($('#scratchpad').hasClass('menu')) {
      $('#scratchpad').removeClass('menu');
    }
    $('#scratchpad').toggleClass('fullscreen');
    location.hash = $('#scratchpad').attr('class');
  }
  
  // When the button is clicked, call toggleFullscreen.
  $('#toggle-fullscreen').click(function() {
    toggleFullscreen();
  });
  
  // Even when iframe has focus, still toggleFullscreen
  $("#preview").contents().find("body").on('keydown', function(e){
    if (e.keyCode == 73) {
      toggleFullscreen();
    }
  });
  
  // For good measure, always toggleFullscreen
  key('⌘+i, ctrl+i', function(){
    toggleFullscreen();
  });
  
  // Automatically go into fullscreen mode when pageload includes #fullscreen
  if (location.hash == '#fullscreen') {
    $('#scratchpad').toggleClass('fullscreen');
  }
  
  
  // History (Recent Scratchpads)
  //--------------------------------------------------------------------------------
  if (typeof(Storage)!=="undefined") {
    
    // Initialize recentScratchpads row in localStorage if needed
    if (localStorage['recentScratchpads'] === undefined) {
      localStorage['recentScratchpads'] = JSON.stringify([]);
    }
    
    function getRecentScratchpads() {
      var scratchpadIds = JSON.parse(localStorage['recentScratchpads']);
      return scratchpadIds;
    }
    
    function addToRecentScratchpads(id) {
      var recentScratchpadsArr = [];
      recentScratchpadsArr = JSON.parse(localStorage['recentScratchpads']) || [];
      if (!_.contains(recentScratchpadsArr, id)) {
        recentScratchpadsArr.push(id);
        localStorage['recentScratchpads'] = JSON.stringify(recentScratchpadsArr);
      } else {
        recentScratchpadsArr = _.without(recentScratchpadsArr, id);
        recentScratchpadsArr.push(id);
        localStorage['recentScratchpads'] = JSON.stringify(recentScratchpadsArr);
      }
    }
    
    function renderRecentScratchpads(listOfRecentScratchpads) {
      
      if (listOfRecentScratchpads.length > 1) {
        
        // Clear the loading text, save state that it's been loaded
        $('#recent-scratchpads').html('');
        var recentScratchpadTemplate = '<li><a class="recent-scratchpad" href="/<%= scratchpadId %>" target="_blank"><%= thisScratchpadTitle %> <time><%= dateTemplate %></time></a><a class="delete" data-id="<%= scratchpadId %>" href="javascript:void(0)">&times;</a></li>';
        
        _.each(listOfRecentScratchpads, function(scratchpadId) {
          if (Scratchpad.document_id != scratchpadId) {
            
            var thisScratchpadRef = new Firebase('https://scratchpad.firebaseio.com/' + scratchpadId);
            thisScratchpadRef.once('value', function(dataSnapshot) {
              var thisScratchpadTitle = dataSnapshot.child('title').val();
              dateObj = new Date(dataSnapshot.child('updatedAt').val());
              dateTemplate = dateObj.getDate() +'/'+ dateObj.getMonth() +'/'+ dateObj.getFullYear();
              thisScratchpadTemplate = _.template(recentScratchpadTemplate, {scratchpadId: scratchpadId, thisScratchpadTitle: thisScratchpadTitle, dateTemplate: dateTemplate});
              $('#recent-scratchpads').prepend(thisScratchpadTemplate);
            });
            
          }
        });
        
      } else {
        $('#recent-scratchpads').html('<li>No recent scratchpads!</li>');
      }
      Scratchpad.loadedRecentScratchpads = true;
    }
    
    function deleteRecentScratchpadFromList (id) {
      
      // Delete from localstore
      var recentScratchpadsArr;
      recentScratchpadsArr = JSON.parse(localStorage['recentScratchpads']);
      recentScratchpadsArr = _.without(recentScratchpadsArr, id);
      localStorage['recentScratchpads'] = JSON.stringify(recentScratchpadsArr);
            
      // Delete from DOM
      $('#recent-scratchpads li').each(function(index){
        if ($(this).children('.delete').data('id') == id) {
          $(this).remove();
        }
      });
    }
    
    $('#recent-scratchpads').on('click', '.delete', function(e) {
      deleteRecentScratchpadFromList($(this).data('id'));
    });
    
    addToRecentScratchpads(Scratchpad.document_id);
    
  } else {
    // Sorry! No web storage support.
    $('#recent-scratchpads').html('Sorry! Your browser doesn\'t support HTML5 local storage.');
  }
  
  
  // Menu stuff
  //--------------------------------------------------------------------------------
  
  // Toggle fullscreen mode on menu click
  $('#menu').click(function(){
    $('#scratchpad').toggleClass('menu');
    mixpanel.track("Menu toggle");
    if (Scratchpad.loadedRecentScratchpads != true) {
      renderRecentScratchpads(getRecentScratchpads());
    }
  })
  
  // Show different tooltip for Windows users.
  var isMac = navigator.platform.toUpperCase().indexOf('MAC')!==-1;
  if (isMac != true) {
    $('.tooltip').html('Keyboard Shortcut: Control + i');
  }
  
});