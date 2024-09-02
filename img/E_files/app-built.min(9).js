// mediaelement-plugin-ef - 1.0.2 @ 2018-02-13 17:35:06 
define("mediaelement-plugin-ef/mepjs",["mediaelement-and-player"],function(a){return a}),define("mediaelement-plugin-ef/plugin/translations",["../mepjs"],function(a){"use strict";var b=a.$,c="ef-ef";b.extend(a.MepDefaults,{translations:{}}),a.MediaElementPlayer.prototype.buildTranslations=function(d,e,f,g){var h=d.options.translations;a.i18n.locale.strings[c]=h,a.i18n.locale.language=c,b.extend(d.options,{playText:a.i18n.t("Play"),pauseText:a.i18n.t("Pause"),muteText:a.i18n.t("Mute Toggle"),fullscreenText:a.i18n.t("Fullscreen"),tracksText:a.i18n.t("Captions/Subtitles"),skipBackText:a.i18n.t("Skip back %1 seconds"),postrollCloseText:a.i18n.t("Close"),subtitleText:a.i18n.t("Subtitle"),switchQualityText:a.i18n.t("Switch Quality"),outOfTimeRangeText:a.i18n.t("Out of time range")})}}),define("mediaelement-plugin-ef/plugin/utility/event-manager",["../../mepjs"],function(a){function b(a,b,d){var e=c(a);if(b&&d){e.off(b,d),e.on(b,d);var f=b.indexOf("."),g=f>0?b.substring(0,f):b,h=c._data(e[0],"events")||e.data("events"),i=h[g];if(i.length-i.delegateCount>1){var j=i.pop();i.splice(i.delegateCount,0,j)}}}var c=a.$;return{prependJQueryEventHandler:b}}),define("mediaelement-plugin-ef/plugin/ignore-key-event",["../mepjs","./utility/event-manager"],function(a,b){a.$;a.MediaElementPlayer.prototype.buildIgnoreKeyEvent=function(a,c,d,e){a.options.enableKeyboard=!1;var f=c.find(".mejs-time-total");b.prependJQueryEventHandler(f,"keydown.time-range-restrict",function(a){a.stopImmediatePropagation()})}}),define("mediaelement-plugin-ef/plugin/switch-quality",["../mepjs"],function(a){"use strict";function b(a){var b=e(a.domNode),c=b.attr("src");return c||(c=b.find("source:eq(0)").attr("src")),c}function c(a){var c=e(a.domNode),d=c.data("switch-src");return d||(d=c.find('source[src="'+b(a)+'"]').data("switch-src")),d}function d(a,b,c,d){if(!a._switchingQuality){a._switchingQuality=!0,a._durationchangeTriggered=!1,a._timeupdateTriggered=!1;var g=e(b);if(c.originalSrc&&c.switchSrc){c.currentSrc===c.originalSrc?(c.currentSrc=c.switchSrc,d.addClass(f)):(c.currentSrc=c.originalSrc,d.removeClass(f));var h=b.paused;h||b.pause();var i=b.currentTime;if(b.setSrc(c.currentSrc),!i)return void(a._switchingQuality=!1);"native"===b.pluginType?(g.one("durationchange.switch-quality",function(){a._durationchangeTriggered=!0,a._durationchangeTriggered&&a._timeupdateTriggered&&(a._switchingQuality=!1),b.setCurrentTime(i),!h&&b.play()}),g.one("timeupdate.switch-quality",function(){a._timeupdateTriggered=!0,a._durationchangeTriggered&&a._timeupdateTriggered&&(a._switchingQuality=!1),(!b.currentTime||b.currentTime<i)&&(b.setCurrentTime(i),!h&&b.play())})):g.one("play.switch-quality",function(){setTimeout(function(){a._switchingQuality=!1,b.setCurrentTime(i)},50)}),b.load(),!h&&b.play()}}}var e=a.$,f="mejs-quality-switched";e.extend(a.MepDefaults,{switchQualityText:a.i18n.t("Switch Quality")}),e.extend(a.MepDefaults,{showSwitchQualityButton:!0}),a.MediaElementPlayer.prototype.buildSwitchQuality=function(a,f,g,h){var i=this,j={currentSrc:"",originalSrc:b(a),switchSrc:c(a)};j.currentSrc=j.originalSrc;var k=e('<div class="mejs-button mejs-switch-quality-button"><button type="button" aria-controls="'+i.id+'" title="'+a.options.switchQualityText+'" aria-label="'+a.options.switchQualityText+'"></button></div>').appendTo(f);a.switchQuality=function(){d(a,h,j,k)},a.showSwitchQualityButton=function(){k.css({width:"",visibility:"",marginLeft:"",marginRight:"",paddingLeft:"",paddingRight:""}),this.setControlsSize()},a.hideSwitchQualityButton=function(){k.css({width:"0",visibility:"hidden",marginLeft:"0",marginRight:"0",paddingLeft:"0",paddingRight:"0"}),this.setControlsSize()},k.click(function(){a.switchQuality()});var l=a.options.showSwitchQualityButton;l||a.hideSwitchQualityButton()}}),define("mediaelement-plugin-ef/plugin/subtitles",["../mepjs"],function(a){"use strict";function b(a){return a.sort(function(a,b){return a.start-b.start})}function c(a,b){for(var c=0,d=a.length-1;d>=c;){var e=Math.floor((c+d)/2),f=a[e];if(b>=f.start&&b<f.end)return f;if(b>=f.end)c=e+1;else{if(!(b<f.start))break;d=e-1}}}function d(a,b,d){var e=b.currentTime,f=c(d,e);f&&(f.text||f.html)?(f.html?a.subtitlesContent.html(f.html):a.subtitlesContent.text(f.text),a.subtitlesLayer.show()):a.subtitlesLayer.hide()}var e=a.$,f="mejs-subtitles-enabled",g=function(a,b,c,g){a.subtitlesEnabled||(a.subtitlesEnabled=!0,a.subtitlesLayer.addClass(f),g.addClass(f),e(b).on("timeupdate.subtitles",function(){d(a,b,c)}),d(a,b,c))},h=function(a,b,c){a.subtitlesEnabled&&(a.subtitlesEnabled=!1,a.subtitlesLayer.removeClass(f),c.removeClass(f),e(b).off("timeupdate.subtitles"),a.subtitlesLayer.hide())};e.extend(a.MepDefaults,{subtitleText:a.i18n.t("Subtitle")}),e.extend(a.MepDefaults,{subtitles:[],showToggleSubtitlesButton:!0}),a.MediaElementPlayer.prototype.buildSubtitles=function(a,c,d,f){var i=this;a.subtitlesLayer=e('<div class="mejs-overlay mejs-layer mejs-subtitles-layer"><div class="mejs-subtitles-content"></div></div>').prependTo(d).hide(),a.subtitlesContent=a.subtitlesLayer.find(".mejs-subtitles-content");var j=e('<div class="mejs-button mejs-subtitle-button"><button type="button" aria-controls="'+i.id+'" title="'+a.options.subtitleText+'" aria-label="'+a.options.subtitleText+'"></button></div>').appendTo(c);a.subtitlesEnabled=!1;var k;a.setSubtitles=function(a){k=b(a)},a.enableSubtitles=function(){g(a,f,k,j)},a.disableSubtitles=function(){h(a,f,j)},a.showToggleSubtitlesButton=function(){j.css({width:"",visibility:"",marginLeft:"",marginRight:"",paddingLeft:"",paddingRight:"",borderLeft:"",borderRight:""}),this.setControlsSize()},a.hideToggleSubtitleButton=function(){j.css({width:"0",visibility:"hidden",marginLeft:"0",marginRight:"0",paddingLeft:"0",paddingRight:"0",borderLeft:"0",borderRight:"0"}),this.setControlsSize()},j.click(function(){a.subtitlesEnabled?a.disableSubtitles():a.enableSubtitles()});var l=a.options.subtitles;a.setSubtitles(l);var m=a.options.showToggleSubtitlesButton;m||a.hideToggleSubtitleButton()}}),define("mediaelement-plugin-ef/plugin/utility/time-range-restrict",["../../mepjs","./event-manager"],function(a,b){"use strict";function c(a){return void 0!==a.pageX?a.pageX:a.originalEvent&&a.originalEvent.touches&&a.originalEvent.touches.length?a.originalEvent.touches[0].pageX:void 0}function d(a,b){void 0!==a.pageX&&(a.pageX=b)}function e(a,b,c,d,e,f,g,h){var i=a.currentTime,j=a.duration;if(j){var k,l=Math.min(b,j),m=Math.min(c,j);if(k=l>i?p:i>=m?r:q,i!==h.lastInvalidTime){var o;!f&&k===p&&l-d>i?(h.lastInvalidTime=i,o=l,a.setCurrentTime(o)):g||k!==r||(a.pause(),i>m+e&&(h.lastInvalidTime=i,o=m,a.setCurrentTime(o)))}k===r&&h.lastRangeState!==k&&n(a).trigger("current_restrict_time_range_ended"),h.lastRangeState=k}}function f(a,b,d){var e=n(b),f=e.width()||0,g=e.offset(),h=c(a)-g.left;0>h?h=0:h>f&&(h=f);var i=h/f*d||0;return i}function g(a,b,c,e){var f=n(b),g=f.width()||0,h=f.offset(),i=e/c*g||0;d(a,i+h.left)}function h(a,b,c,d,e){var g=b.duration,h=f(a,e,g);if(c>h||h>d){var i=e.find(".mejs-time-float");i.hide(),a.stopImmediatePropagation()}}function i(a,b,c,d,e){var h=b.currentTime||0,i=b.duration,j=f(a,e,i);c>j?h>c&&i?g(a,e,i,c):a.stopImmediatePropagation():j>d&&(d>h&&i?g(a,e,i,d):a.stopImmediatePropagation())}function j(a,b,c){m&&clearTimeout(m),b.css("left",a.offsetX+"px"),b.addClass(o),m=setTimeout(function(){k(b)},c)}function k(a){m&&(clearTimeout(m),m=0,a.removeClass(o))}var l,m,n=a.$,o="mejs-tips-show",p=1,q=2,r=3;n.extend(a.MepDefaults,{outOfTimeRangeText:a.i18n.t("Out of time range")}),n.extend(a.MepDefaults,{outOfTimeRangeTipsTimeout:3e3,allowPlayingBeforeRestrictRange:!1,continueOnEndOfRestrictRange:!1}),a.MediaElementPlayer.prototype.buildTimeRange=function(a,c,d,g){var m,o,p,q,r,s=!1,t=c.find(".mejs-time-total"),u=n(a.node.ownerDocument||document),v=a.options.outOfTimeRangeTipsTimeout,w=a.options.restrictDeviationBefore,x=a.options.restrictDeviationAfter,y=a.options.allowPlayingBeforeRestrictRange,z=a.options.continueOnEndOfRestrictRange,A=g.pluginType,B=n('<span class="mejs-time-range-tips"></span>').appendTo(t),C=n('<span class="mejs-time-range-tips-item"></span>').text(a.options.outOfTimeRangeText).appendTo(B),D=function(){e(g,m,o,w,x,y,z,r)},E=function(a){h(a,g,m,o,t)},F=function(){b.prependJQueryEventHandler(u,"mousemove.time-range-restrict",E)},G=function(){u.off("mousemove.time-range-restrict",E)},H=function(a){var c=g.duration;if(c){var d=f(a,this,c);d>=m&&o>d?(k(C),p=m,q=o,b.prependJQueryEventHandler(u,"mousemove.time-range-restrict",J),b.prependJQueryEventHandler(u,"touchmove.time-range-restrict",J)):(j(a,C,v),a.stopImmediatePropagation())}},I=function(a){u.off("mousemove.time-range-restrict",J),u.off("touchmove.time-range-restrict",J)},J=function(a){i(a,g,p,q,t)},K=g.play,L=function(){var a=this;return!z&&(a.currentTime<m||a.currentTime>=o)&&a.setCurrentTime(m),K.apply(a,arguments)},M=K;g.play=function(){return M.apply(this,arguments)};var N=function(){var a=n(g);a.on("timeupdate.time-range-restrict",D),a.on("loadedmetadata.time-range-restrict",D),a.on("durationchange.time-range-restrict",D),a.on("play.time-range-restrict",D),a.on("ended.time-range-restrict",D),D(),t.on("mouseenter.time-range-restrict",F),t.on("mouseleave.time-range-restrict",G),b.prependJQueryEventHandler(t,"mousedown.time-range-restrict",H),b.prependJQueryEventHandler(t,"touchstart.time-range-restrict",H),u.on("mouseup.time-range-restrict",I),u.on("touchend.time-range-restrict",I),M=L},O=function(){var b=n(g),c=n(a.node.ownerDocument||document);b.off("timeupdate.time-range-restrict",D),b.off("loadedmetadata.time-range-restrict",D),b.off("durationchange.time-range-restrict",D),b.off("play.time-range-restrict",D),b.off("ended.time-range-restrict",D),t.off("mouseenter.time-range-restrict",F),t.off("mouseleave.time-range-restrict",G),c.off("mousemove.time-range-restrict",E),t.off("mousedown.time-range-restrict",H),t.off("touchstart.time-range-restrict",H),c.off("mousemove.time-range-restrict",J),c.off("mouseup.time-range-restrict",I),c.off("touchend.time-range-restrict",I),M=K};a._setRestrictPlayingTimeRange=function(a,b,c){if(m=Number(a),o=Number(b),isNaN(m)||isNaN(o)||0>m||0>o||m>o)throw new Error("Incorrect time range");r={mode:A,lastInvalidTime:l,lastRangeState:l};var d=g.paused;c&&(g.duration&&g.setCurrentTime(m),!d&&g.play()),s||(N(),s=!0)},a._unsetRestrictPlayingTimeRange=function(){O(),s=!1},a._setRestrictDeviationBefore=function(a){w=a},a._setRestrictDeviationAfter=function(a){x=a},a._setAllowPlayingBeforeRestrictRange=function(){y=!0},a._unsetAllowPlayingBeforeRestrictRange=function(){y=!1},a._setContinueOnEndOfRestrictRange=function(){z=!0},a._unsetContinueOnEndOfRestrictRange=function(){z=!1}}}),define("mediaelement-plugin-ef/plugin/utility/time-separators",["../../mepjs"],function(a){"use strict";function b(a){a.empty()}function c(a,c,f){if(b(f),a.duration&&c){var g=d([]);c.forEach(function(b){var c=b/a.duration*e;0>c?c=0:c>e&&(c=e);var f=d('<span class="mejs-time-separator-item"></span>');f.css("left",c+"%"),g=g.add(f)}),f.append(g)}}var d=a.$,e=100;a.MediaElementPlayer.prototype.buildTimeSeparators=function(a,e,f,g){var h,i=e.find(".mejs-time-slider"),j=d('<span class="mejs-time-separators"></span>').appendTo(i);a._refreshTimeSeparator=function(){c(g,h,j)},a._setTimeSeparators=function(b){h=b;var c=d(g);c.off("loadedmetadata.time-separators",a._refreshTimeSeparator),g.duration?a._refreshTimeSeparator():c.one("loadedmetadata.time-separators",a._refreshTimeSeparator)},a._unsetTimeSeparators=function(){h=void 0,b(j),d(g).off("loadedmetadata.time-separators",a._refreshTimeSeparator)}}}),define("mediaelement-plugin-ef/plugin/time-ranges",["../mepjs","./utility/time-range-restrict","./utility/time-separators"],function(a,b,c){"use strict";function d(a,b){if(!isNaN(b))for(var c=0;c<a.length;c++){var d=a[c];if(b>=d[k]&&b<d[l])return c}}function e(a,b,c,d){if(!(0>c||c>b.length)){var e=b[c][k],f=b[c][l];a._setRestrictPlayingTimeRange(e,f,d)}}function f(a,b,c){if(!(0>c||c>b.length)){var d=b[c][k];a.duration&&a.setCurrentTime(d)}}function g(a,b,c){j(a).trigger("restrict_time_range_ended",{index:b,continueOnEnd:c})}function h(a,b,c){j(a).trigger("time_range_changed",{oldIndex:b,newIndex:c})}var i,j=a.$,k=0,l=1;j.extend(a.MepDefaults,{timeRangeSeparators:[],restrictPlayingTimeRange:!1,restrictDeviationBefore:0,restrictDeviationAfter:0,allowPlayingBeforeRestrictRange:!1,continueOnEndOfRestrictRange:!1}),a.MediaElementPlayer.prototype.buildTimeRanges=function(a,b,c,m){var n=j(m),o=i,p=i,q=i,r=i,s=i,t=i,u=function(b,c){var d=q;if(q=0>b?0:b>p.length?p.length:b,r){var g=c!==i?c:!s;e(a,o,q,g)}else f(n,o,q);q!==d&&h(m,d,q)},v=function(){g(m,q,t)},w=function(){if(!o||!o.length)return void(q=i);var b=q,c=d(o,m.currentTime);c!==i&&c!==b&&(q=c,r?t&&c>b&&(e(a,o,q,!1),h(m,b,q)):h(m,b,q))},x=function(){var a=j(m);a.off("current_restrict_time_range_ended.time-ranges",v),r&&a.on("current_restrict_time_range_ended.time-ranges",v),a.off("timeupdate.time-ranges, loadedmetadata.time-ranges, play.time-ranges, ended.time-ranges",w),(!r||t)&&(a.on("timeupdate.time-ranges, loadedmetadata.time-ranges, play.time-ranges, ended.time-ranges",w),w())};a.setTimeRanges=function(b,c){b&&b.length?(o=b.slice().sort(function(a,b){return a[k]-b[k]}),p=o.map(function(a){return a[l]}),p[p.length-1]===1/0&&p.pop(),a._setTimeSeparators(p),u(c!==i?c:0)):this.unsetTimeRanges()},a.setTimeRangeSeparators=function(b,c){if(b&&b.length){p=b.slice().sort(function(a,b){return a-b}),o=[];for(var d=p.length,e=0;d>e;e++)if(0===e)o.push([0,p[e]]);else if(p[e]===p[e-1]){var f=o[o.length-1];o.push(f.slice())}else o.push([p[e-1],p[e]]);o.push([p[d-1],1/0]),a._setTimeSeparators(p),u(c!==i?c:0)}else this.unsetTimeRanges()},a.unsetTimeRanges=function(){o=i,p=i,a._unsetTimeSeparators(),r&&a._unsetRestrictPlayingTimeRange(),q=i},a.enableRestrictPlayingTimeRange=function(a){r=!0,x(),u(a!==i?a:0)},a.disableRestrictPlayingTimeRange=function(){r&&(r=!1,a._unsetRestrictPlayingTimeRange(),x())},a.setRestrictDeviationBefore=a._setRestrictDeviationBefore,a.setRestrictDeviationAfter=a._setRestrictDeviationAfter,a.enableAllowPlayingBeforeRestrictRange=function(){s=!0,a._setAllowPlayingBeforeRestrictRange()},a.disableAllowPlayingBeforeRestrictRange=function(){s=!1,a._unsetAllowPlayingBeforeRestrictRange()},a.enableContinueOnEndOfRestrictRange=function(){t=!0,a._setContinueOnEndOfRestrictRange(),x()},a.disableContinueOnEndOfRestrictRange=function(){t&&(t=!1,a._unsetContinueOnEndOfRestrictRange(),x())},a.getCurrentRangeIndex=function(){return q},a.goToTimeRange=function(a,b){u(a,b)},a.restartCurrentTimeRange=function(){u(q,!0)},a.previousTimeRange=function(a){u(q-1,a)},a.nextTimeRange=function(a){u(q+1,a)},a.buildTimeRange(a,b,c,m),a.buildTimeSeparators(a,b,c,m);var y=a.options.timeRangeSeparators,z=a.options.timeRanges;r=a.options.restrictPlayingTimeRange,s=a.options.allowPlayingBeforeRestrictRange,t=a.options.continueOnEndOfRestrictRange,z?a.setTimeRanges(z):a.setTimeRangeSeparators(y),x()}}),define("mediaelement-plugin-ef/plugin/all",["../mepjs","./translations","./ignore-key-event","./switch-quality","./subtitles","./time-ranges"],function(a){return a}),define("mediaelement-plugin-ef/main",["./mepjs","./plugin/all"],function(a){return a}),define("mediaelement-plugin-ef",["mediaelement-plugin-ef/main"],function(a){return a});