(function(){
var rkHost = "http://mattlong.org/redditkeys/";

var RedditKeys = function() {
	var self = this;
	var initialize = function() {
		setupUI();
		addEventListeners();
	}
	
	jItems = null;
	jCurrent = null;
	currentIndex = -1;

	var getItems = function() {
	    return $('#siteTable .link:visible:not(.promoted)');

	}
	
	var setupUI = function() {
	    jItems = getItems();
	    jItems.prepend('<div class="rk_thing"><img class="rk_arrow" src="'+rkHost+'right-arrow.png" /><input type="checkbox"/></div>');
		
	    goToNextLink();
	}
	
	var addEventListeners = function() {
		$(document).keypress(function(e) {
			switch(e.which) {
				case 106: //j
					goToNextLink();
					break;
				case 107: //k
					goToPrevLink();
					break;
				case 111: //o
					openCurrentLink();
					break;
				case 99: //c
					commentCurrent();
					break;
				case 115: //s
					toggleSavedCurrent();
					break;
				case 101: //e
					upvoteCurrent();
					break;
				case 100: //d
					downvoteCurrent();
					break;
				case 120: //x
					toggleChecked();
					break;
				case 35: //#, shift+3
					deleteChecked();
					break;
				default:
					//console.warn(e.which);
			}
		});
		
		var formsToHandle = jItems.find('form.unsave-button, form.save-button, form.hide-button');
		formsToHandle.find('a').attr('onclick',null);
		formsToHandle.live('click', function(e) {
			var jElem = $(this).parents('.link');
			if (jElem.length > 0 && jElem.is(':visible')) {
				handleActionForm($(this));
				return false;
			}
		});
	}
	
	var goToNextLink = function() {
		setCurrent(Math.min(currentIndex+1,jItems.length-1));
	}
	
	var goToPrevLink = function() {
		setCurrent(Math.max(currentIndex-1,0));
	}
	
	var setCurrent = function(index) {
		if (jCurrent !== null) {
			jCurrent.removeClass('current');
		}
		
		currentIndex = index;
		jCurrent = $(jItems[currentIndex]).find('.rk_thing');
		jCurrent.addClass('current');
	}
	
	var isCurrent = function() {
		return jCurrent === null || jCurrent.is(":visible");
	}
	
	var openLink = function(jA) {
		var href = jA.attr('href');
		window.open(href,'_blank');
	}
	
	var toggleChecked = function() {
		if (jCurrent === null) return;
		
		var cb = jCurrent.find('input[type=checkbox]');
		var wasChecked = cb.attr('checked');
		cb.attr('checked', !wasChecked);
		
		jCurrent.parents('.link').toggleClass('checked', !wasChecked);
	}
	
	var openCurrentLink = function() {
		if (!isCurrent()) return;
		
		click_thing(jCurrent.get(0));
		openLink(jCurrent.parents('.link').find('a.title'));
	}
	
	var prepareParams = function(parameters) {
		parameters = $.with_default(parameters, {});
		
		/* set the subreddit name if there is one */
		if (reddit.post_site)
			parameters.r = reddit.post_site;
		
		/* flag whether or not we are on a cname */
		if (reddit.cnameframe)
			parameters.cnameframe = 1;
		
		/* add the modhash if the user is logged in */
		if (reddit.logged)
			parameters.uh = reddit.modhash;
		
		parameters.renderstyle = reddit.renderstyle;
		return parameters
	}
	
	var doAPICall = function(command, params) {
		params = prepareParams(params);
		
		$.ajax({
			type:'POST',
			url:'/api/'+command,
			data: params,
			dataType: 'json', //$.with_default(null, "json"),
			success: function(){/*console.warn(arguments);*/},
			error: function(){/*console.warn(arguments);*/}
		});
	}
	
	var upvoteCurrent = function() {
		if (!isCurrent()) return;
		jCurrent.parents('.link').find('div.arrow.up,div.arrow.upmod').click();
	}
	
	var downvoteCurrent = function() {
		if (!isCurrent()) return;
		jCurrent.parents('.link').find('div.arrow.down,div.arrow.downmod').click();
	}
	
	var commentCurrent = function() {
		if (!isCurrent()) return;
		openLink(jCurrent.parents('.link').find('a.comments'));
	}
	
	var handleActionForm = function(jForm) {
		var action = jForm.find('a').text();
		var id = jForm.thing_id();
		var params = {id:id};
		
		doAPICall(action,params);
		
		if (action == 'save') {
			newForm = getNewForm('unsave');
			jForm.replaceWith(newForm);
		} else if (action == 'unsave') {
			newForm = getNewForm('save');
			jForm.replaceWith(newForm);
		} else if (action == 'hide') {
			jForm.parents('.link').addClass('deleted').hide();
			refreshItems();
		}
		
		return false;
	}
	
	var toggleSavedCurrent = function() {
		//var toSave = jItems.find(':checked').parents('.rk_thing'); //this saves all checked
		var toSave = jCurrent;
		if (toSave === null || toSave.length === 0) return;
		
		toSave.each(function(i,elem){
			var id = $(elem).thing_id();
			var params = {id:id};
			
			var newForm = null;
			var form = $(elem).parents('.link').find('form.save-button');
			if (form.length > 0) {
				handleActionForm(form);
			} else {
				form = $(elem).parents('.link').find('form.unsave-button');
				if (form.length > 0) {
					handleActionForm(form);
				}
			}
		});
	}
	
	var getNewForm = function(action) {
		//<input type="hidden" value="unsaved" name="executed">
		return $('<form class="state-button '+action+'-button" method="post" action="/post/'+action+'"><span><a href="javascript:void(0)">'+action+'</a></span></form>');
	}
	
	var deleteChecked = function() {
		var toDelete = jItems.find(':checked').parents('.link');
		
		var hideBtns = $(this).find('form.hide-button');
		var useAPI = hideBtns.length > 0;
		toDelete.each(function(i,elem) {
			if (useAPI) {
			    handleActionForm(hideBtns);
			} else {
			    $(this).addClass('deleted').hide();
			    refreshItems();
			}
			
		});
		
		refreshItems();
	}
	
	var refreshItems = function() {
		while (!isShowing(jCurrent) && currentIndex < jItems.length-1) {
			goToNextLink();
		}
		
		while (!isShowing(jCurrent) && currentIndex > 0) {
			goToPrevLink();
		}
		
		if (!isShowing(jCurrent)) { //no items remain
			jCurrent = null;
		} else {
		    jItems = getItems();
			currentIndex = jItems.find('.rk_thing').index(jCurrent); // uses index as of version 1.3.1
		}
	}

	var isShowing = function(jItem) {
		return !jItem.parents('.link').hasClass('deleted');
	}
	
	initialize();
}
if (location.host === 'www.reddit.com') {
	if (typeof(window.rk_random_name) == 'undefined') {
		$('<link rel="stylesheet" type="text/css" href="' + rkHost + 'reddit_keys.css?v=' + (new Date()).getTime() + '"/>').appendTo('head');
		window.rk_random_name = new RedditKeys();
	}
} else if (confirm('redditKeys can only be used at reddit.com. Go there now?')) { 
		window.location = 'http://www.reddit.com';
}

})();