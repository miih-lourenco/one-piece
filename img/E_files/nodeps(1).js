/**
 * troopjs-ef - 2.0.2-ef.4
 */
define('troopjs-ef/component/ef',[ "troopjs-browser/route/uri", "logger" ], function EFModule(URI, Logger) {
	

	var ARRAY_PUSH = Array.prototype.push;

	return {
		"route" : function (uri) {
			if(!(uri instanceof URI)) {
				uri = URI(uri);
			}

			window.location.hash = uri;
		},

		"query" : function (query) {
			var me = this;
			var args = [ "query" ];

			// Append original arguments to args
			ARRAY_PUSH.apply(args, arguments);

			// Return publish wrapped in task
			return me.task(function (resolve) {
				resolve(me.publish.apply(me, args));
			});
		},

		"log" : Logger.log,
		"info" : Logger.info,
		"warn" : Logger.warn,
		"debug" : Logger.debug,
		"error" : Logger.error
	};
});
define('troopjs-ef/component/widget',[ "troopjs-browser/component/widget", "./ef" ], function EFWidgetModule(Widget, EF) {
	

	return Widget.extend(EF, {
		displayName : "ef/widget"
	});
});
define('troopjs-ef/blurb/widget',[ "../component/widget", "troopjs-browser/loom/config", "jquery" ], function BlurbWidgetModule(Widget, config, $) {

	/*
	Example for nested blurbs:
	child blurbs will replace into parent blurb's place holder

	<div data-blurb-id="679196" data-text-en="You've passed ^step title^" data-weave="troopjs-ef/blurb/widget">
		<span data-value-name="step title" data-blurb-id="490240" data-text-en="Group class" data-weave-delay="troopjs-ef/blurb/widget"></span>
	</div>
	*/

	var $ELEMENT = "$element";
	var ATTR_WEAVE = config["weave"];
	var ATTR_WEAVE_DELAY = ATTR_WEAVE + "-delay";
	var SELECTOR_WEAVE_DELAY = "[" + ATTR_WEAVE_DELAY + "]";
	var SELECTOR_DATA_BLURB_ID = "[data-blurb-id]";
	var SELECTOR_DATA_VALUE_NAME = "[data-value-name]";
	var RE = /(?:\^([^\^]+)\^)/g;
	var PATTERNS = {
		"default": RE
	};

	return Widget.extend({
		"sig/start": function onStart() {
			var me = this;
			var $data = me[$ELEMENT].data();

			//make first level children elements attribute "data-weave-delay" to "data-weave"
			me[$ELEMENT].children(SELECTOR_WEAVE_DELAY).each(function () {
				var $widgetElement = $(this);
				$widgetElement.attr(ATTR_WEAVE, $widgetElement.attr(ATTR_WEAVE_DELAY)).removeAttr(ATTR_WEAVE_DELAY);
			});

			//collect all blurbs in self and children blurb widget
			var blurbQ = ["blurb!" + $data.blurbId];
			me[$ELEMENT].find(SELECTOR_DATA_BLURB_ID).each(function () {
				blurbQ.push("blurb!" + $(this).data().blurbId);
			});

			//query all blurbs for caching, but only use the first result for current translation
			return me.query(blurbQ).then(function doneQuery(blurbItems) {
				var blurb = blurbItems[0];
				var values = $data.values || {};
				me[$ELEMENT].children(SELECTOR_DATA_VALUE_NAME).detach().each(function (index, element) {
					var $element = $(element);
					values[$element.data().valueName] = $element.wrap("<span></span>").parent().html();
				});

				var translation = blurb.translation;
				if (translation) {
					var pattern = $data.pattern;
					pattern = pattern
						? PATTERNS[pattern] || RegExp(pattern, "g")
						: RE;

					translation = translation.replace(pattern, function (match, key, position, original) {
						return values[key] || key;
					});
				}

				return me.html(translation);
			});
		}
	});
});

/*!
 * TroopJS widget/placeholder component
 * @license TroopJS Copyright 2012, Mikael Karon <mikael@karon.se>
 * Released under the MIT license.
 */
/*global define:true */
define('troopjs-ef/widget/placeholder',[ "../component/widget", "troopjs-browser/loom/config", "troopjs-browser/loom/weave", "troopjs-browser/loom/unweave", "when" ], function WidgetPlaceholderModule(Widget, config, weave, unweave, when) {
	/*jshint strict:false, laxbreak:true */

	var HOLDING = "holding";
	var $ELEMENT = "$element";
	var TARGET = "target";

	function release(/* arg, arg, arg*/) {
		var me = this;
		var $element = me[$ELEMENT];

		// We're already holding something, resolve with me[HOLDING]
		if (HOLDING in me) {
			return when.resolve(me[HOLDING]);
		}
		else {
			// Set weave attribute to me[TARGET]
			$element.attr(config.weave, me[TARGET]);

			return weave
				// Weave (passing arguments)
				.apply($element, arguments)
				// We're only interested in the first woven element - spread
				.spread(function (widgets) {
					// Store first widget as HOLDING
					var widget = me[HOLDING] = widgets[0];

					// Trigger element released event
					$element.triggerHandler("released", [ widget ]);

					// Return widget
					return widget;
				});
		}
	}

	function hold() {
		var me = this;
		var widget;
		var $element = me[$ELEMENT];

		// Check that we are holding
		if (HOLDING in me) {
			// Get what we're holding
			widget = me[HOLDING];

			// Cleanup
			delete me[HOLDING];

			// Set unweave attribute to widget
			$element.attr(config.unweave, widget);

			return unweave
				// Unweave (passing arguments)
				.apply($element, arguments)
				// Wait for it
				.then(function () {
					// Trigger element held event
					$element.triggerHandler("held", [ widget ]);
				});
		}
		else {
			return when.resolve();
		}
	}

	return Widget.extend(function WidgetPlaceholder($element, name, target) {
		this[TARGET] = target;
	}, {
		displayName : "troopjs-ef/widget/placeholder",

		"sig/finalize" : function finalize() {
			return this.hold();
		},

		release : release,
		hold : hold
	});
});
define('troopjs-ef/ccl/placeholder',[ "../widget/placeholder" ], function CCLPlaceholderModule(Placeholder) {
	

	var CCL = "ccl";
	var VALUE = "value";

	return Placeholder.extend(function CCLPlaceholderWidget($element) {
		this[CCL] = $element.data(CCL);
	}, {
		"displayName" : "ef/ccl/placeholder",

		"hub:memory/context" : function onContext() {
			var me = this;

			me.query("ccl!\"" + me[CCL] + "\"").spread(function doneQuery(ccl) {
				if (ccl && VALUE in ccl && ccl[VALUE].toLowerCase() === "true") {
					me.release();
				}
				else {
					me.hold();
				}
			});
		}
	});
});

define('troopjs-ef/component/service',[ "troopjs-core/component/service", "./ef" ], function EFServiceModule(Service, EF) {
	

	return Service.extend(EF, {
		displayName : "ef/service"
	});
});
define('troopjs-ef/command/service',[ "../component/service", "troopjs-utils/merge" ], function CommandServiceModule(Service, merge) {
	

	var NAME = "name";
	var CONFIGURATION = "configuration";
	var CACHE = "cache";

	function command(data) {
		var me = this;
		var cache = me[CACHE];

		return me.publish("ajax", merge.call({}, me[CONFIGURATION], {
			data : JSON.stringify(data),
				processData : false
			}))
			.then(function doneAction(data) {
				cache.put(data);
				return data;
			});
	}

	return Service.extend(function CommandService(name, cache) {
		var me = this;

		if (!name) {
			throw new Error("no name provided");
		}

		if (!cache) {
			throw new Error("no cache provided");
		}

		me[NAME] = me.displayName = name;
		me[CACHE] = cache;
	}, {
		"displayName" : "ef/command/service",

		"sig/initialize" : function onInitialize() {
			var me = this;

			me.subscribe(me[NAME], command);
		},

		"sig/finalize" : function onFinalize() {
			var me = this;

			me.unsubscribe(me[NAME], command);
		}
	});
});

define('troopjs-ef/service/config',[
	"module",
	"../component/service",
	"../command/service",
	"troopjs-browser/route/uri",
	"troopjs-utils/merge",
	"poly/array",
	"poly/object"
], function EFConfigServiceModule(module, EFService, CommandService, URI, merge) {

	var CACHE = "cache";
	var PARAMS = "params";

	return EFService.extend(function ConfigService(cache, params) {
		if (!cache) {
			throw new Error("no cache provided");
		}
		this[CACHE] = cache;
		this[PARAMS] = params;
	}, {
		displayName: "ef/service/config",
		"sig/start": function onStart() {
			var me = this;
			// Before querying anything, query the shared global context for C parameters.
			return me.query("context!current").spread(function(context) {
				return me.publish("registry/get", "data/query/service").spread(function(queryService) {
					if (!queryService) {
						throw new Error('Query service not found');
					}

					var config = queryService.configure();

					// Merge the configured URL query with C-parameters from the context.
					var url = URI(config.url);
					
					// From URL Query C-parameters
					var href = URI(window.location.href);
					var cParams_href = {};
					href.query && 
					href.query.c && 
					href.query.c.split("|").forEach(function(entry, entryIndex){
						cParams_href[entry.split("=")[0]] = {
							"value": entry.split("=")[1]
						};
					});
					
					// Merge with CONTEXT data
					var cParams = merge.call({}, context["values"], typeof me[PARAMS] === "object" ? me[PARAMS] : {}, cParams_href);
					
					var query = url.query = URI.Query(url.query || {});
					query.c = Object.keys(cParams).map(function(key) {
						return key + "=" + cParams[key]["value"];
					}).join("|");

					queryService.configure({
						"url": url.toString()
					});
				});
			})
			.then(function() {
					// Get all components from registry
					return me.publish("registry/get").then(function(components) {
						// Iterate API endpoints
						return me.query("command!*").spread(function(command) {
							var commands = command["results"];
							Object.keys(commands).forEach(function(cmd) {
								var config = commands[cmd];
								// Map service name
								var service;
								// Find components matching the name
								var existing = components.filter(function(component) {
									return cmd === component.displayName;
								});

								// If there are command services that already exist, just re-configure.
								if (existing.length) {
									// Iterate
									existing.forEach(function(index, component) {
										// Configure
										component.configure(config);
									});
								}
								// Otherwise create, configure and start a new action service
								else {
									// Create new ActionService
									service = CommandService(cmd, me[CACHE]);
									// Configure
									service.configure(config);
									// Start
									service.start();
								}
							});
						});
					});
				});
		}
	});
});

define('troopjs-ef/component/gadget',[ "troopjs-core/component/gadget", "./ef" ], function EFGadgetModule(Gadget, EF) {
	

	return Gadget.extend(EF, {
		displayName : "ef/gadget"
	});
});
define('troopjs-ef/route/placeholder',[ "../widget/placeholder" ], function RoutePlaceholderModule(Placeholder) {
	

	var NULL = null;
	var ROUTE = "route";

	return Placeholder.extend(function RoutePlaceholderWidget($element, name) {
		this[ROUTE] = RegExp($element.data("route"));
	}, {
		"displayName" : "core/route/placeholder",

		"hub:memory/route" : function onRoute(topic, uri) {
			var me = this;
			var matches = me[ROUTE].exec(uri.path);

			if (matches !== NULL) {
				me.release.apply(me, matches.slice(1));
			}
			else {
				me.hold();
			}
		}
	});
});
define('troopjs-ef/tracking/service',[ "../component/service", "when", "troopjs-utils/merge", "troopjs-utils/unique", "client-state", "client-tracking" ], function (Service, when, merge, unique, cs, ct) {
	

	var UNDEFINED;
	var TOPICS = "topics";
	var ARRAY_PROTO = Array.prototype;
	var ARRAY_CONCAT = ARRAY_PROTO.concat;
	var STATE = "state";
	var TRACKING = "tracking";

	return Service.extend(function RouteService(topics) {
		if (topics === UNDEFINED) {
			throw new Error("no topics provided");
		}

		this[TOPICS] = topics;
	}, {
		"displayName": "ef/tracking/service",

		"hub/tracking/track" : function (name, state, tracking) {
			var topics = this[TOPICS];

			// Get topic or default topic
			var topic = topics[name] || {};

			// Merge topic[STATE] and state
			state = merge.call({}, topic[STATE] || {}, state || {});
			// Concat topic[TRACKING] and tracking
			tracking = ARRAY_CONCAT.call(ARRAY_PROTO, topic[TRACKING] || [], tracking || []);
			// Filter tracking to only contain unique values
			unique.call(tracking, function (a, b) {
				return a === b;
			});

			// Put all state keys and value into cs (async)
			// Trigger all tracking events on ct (async)
			when
				.map(Object.keys(state), function (key) {
					return cs.put(key, state[key]);
				})
				.then(function () {
					return when.map(tracking, function (event) {
						return ct.trigger(event);
					});
				});
		}
	});
});
define('troopjs-ef/tracking/tracker/route',[ "../../component/service", "troopjs-utils/merge" ], function (Service, merge) {
	

	var UNDEFINED;
	var TOPICS = "topics";
	var PATH = "path";
	var ROUTE = "route";
	var STATE = "state";
	var TRACKING = "tracking";

	return Service.extend(function RouteService(topics) {
		if (topics === UNDEFINED) {
			throw new Error("no topics provided");
		}

		this[TOPICS] = topics;
	}, {
		"displayName" : "ef/tracking/tracker/route",

		"hub:memory/route" : function (uri) {
			var me = this;
			var topics = me[TOPICS];
			var path = PATH in uri
				? uri[PATH].toString()
				: "";

			Object
				.keys(topics)
				.forEach(function (name) {
					var topic = topics[name];
					var matches;

					// Get or default route, state and tracking
					var route = topic[ROUTE];
					var state = merge.call({}, topic[STATE] || {});
					var tracking = topic[TRACKING] || [];

					// If the route matches capture matches
					if (route && (matches = route.exec(path))) {
						Object
							.keys(state)
							.forEach(function (key) {
								// Replace value with matches (if possible)
								state[key] = state[key].replace(/\$(\d+)/g, function (original, token) {
									return matches[token] || original;
								});
							});

						// Publish tracking
						me.publish("tracking/track", name, state, tracking);
					}
				});
		}
	});
});
define('troopjs-ef/widget/application',[ "troopjs-browser/application/widget", "../component/ef" ], function EFApplicationWidgetModule(Application, EF) {
	

	return Application.extend(EF, {
		displayName : "ef/widget/application"
	});
});
define('troopjs-ef/spinner/widget',[ "../component/widget", "when/delay" ], function (Widget, delay) {
	var TASKS = "tasks";
	var SPINNING = "ets-spinning";
	var $ELEMENT = "$element";
	var DELAY_START = "delayStart";
	var DELAY_STOP = "delayStop";

	/**
	 * This spinner is to be used in an element basis.
	 */
	return Widget.extend(function () {
		this[TASKS] = 0;
	}, {
		// Show the spinner until the promise is done.
		spinning: function (promise) {
			var me = this;
			var $element = me[$ELEMENT];
			delay($element.data(DELAY_START)).then(function () {
				$element.toggleClass(SPINNING, ++me[TASKS] > 0);
			});

			delay($element.data(DELAY_STOP), promise).ensure(function () {
				$element.toggleClass(SPINNING, --me[TASKS] > 0);
			});
		},

		// Spinning upon the custom "task" DOM event.
		"dom/task": function ($event, task) {
			this.spinning(task);
		}
	});
});

define('troopjs-ef/spinner/global',[ "./widget" ], function (Spinner) {

	/**
	 * This spinner is to be used in a page-wide manner.
	 */
	return Spinner.extend({
		// Spinning upon the "task" hub event.
		"hub/task": function (task) {
			this.spinning(task);
		}
	});
});

define('troopjs-ef/logger/widget',[ "../component/widget" ], function LoggerWidgetModule(Widget) {
	var $ELEMENT = "$element";
	var PREVIOUS_ON_ERROR = "_previousOnError";

	var MAX_STACK_LENGTH = 5000;

	return Widget.extend(function(){
		this[PREVIOUS_ON_ERROR] = null;
	},{
		"sig/start" : function () {
			var me = this;

			var node = me[$ELEMENT].get(0);
			var onerror = this[PREVIOUS_ON_ERROR] = node.onerror;
			node.onerror = function (msg, source, lineNo, colNo, error) {
				if (onerror) {
					try {
						onerror.apply(this, arguments);
					} catch(onerrorException) {
						me.log({
							"stack": onerrorException.stack,
							"msg": "onerror exception: " + onerrorException
						});
					}
				}

				var stack;
				try {
					//overly secure code, really don't want an error here
					if (error) {
						var errorStack = error.stack;
						if (errorStack) {
							stack = errorStack.toString();
							if (stack.length > MAX_STACK_LENGTH) {
								stack = stack.substr(0, MAX_STACK_LENGTH) + '...';
							}
						}
					}
				} catch (ignored) {
				}

				me.log({
					"source": source,
					"lineNo": lineNo,
					"colNo": colNo,
					"stack": stack,
					"msg": msg
				});
			}
		},

		"sig/stop" : function () {
			this[$ELEMENT].get(0).onerror = this[PREVIOUS_ON_ERROR];
		}
	})
});
define('troopjs-ef/logger/appender/command',[ "../../component/gadget", "troopjs-utils/merge" ], function CommandAppenderModule(Gadget, merge) {
	var ARRAY_PUSH = Array.prototype.push;
	var LENGTH = "length";
	var BATCHES = "batches";
	var INTERVAL = "interval";
	var UA = navigator.userAgent;

	// Added UA and window location as extra log payload.
	function augment(obj) {
		return merge.call({
			"href": window.location.href,
			"browser": UA
		}, obj);
	}

	return Gadget.extend(function CommandAppender() {
		this[BATCHES] = [];
	}, {
		"sig/start": function () {
			var me = this;

			if (!(INTERVAL in me)) {
				me[INTERVAL] = setInterval(function batchInterval() {
					if (me[BATCHES][LENGTH] === 0) {
						return;
					}

					var batches = me[BATCHES];
					me[BATCHES] = [];

					me.publish("school/logger/Log", {
						"logParam": batches
					});
				}, 200);
			}
		},

		"sig/stop": function () {
			var me = this;

			function tryStop() {
				if (me[BATCHES][LENGTH] === 0) {
					if (INTERVAL in me) {
						clearInterval(me[INTERVAL]);

						delete me[INTERVAL];
					}
				}
				else {
					setTimeout(tryStop, 200);
				}
			}

			tryStop();
		},

		"append": function(obj) {
			ARRAY_PUSH.call(this[BATCHES], augment(obj));
		}
	});
});

define('troopjs-ef/logger/appender/filter_ccl',[ "../../component/gadget" ], function FilterCCLAppenderModule(Gadget) {
	var ENABLED = "enabled";
	var VARIABLE = "variable";
	var APPENDER = "appender";
	var PROMISE = "promise";
	var RESOLVE = "resolve";

	return Gadget.extend(function FilterCCLAppender(variable, appender) {
		var me = this;

		me[VARIABLE] = variable;
		me[APPENDER] = appender;
		me[PROMISE] = me.task(function (resolve) {
			me[RESOLVE] = resolve;
		});
	}, {
		"sig/start": function () {
			var me = this;

			return me[PROMISE].then(function () {
				return me
					.query("ccl!'" + me[VARIABLE] + "'")
					.spread(function (ccl) {
						me[ENABLED] = !!(ccl.value === "true");
						return me[APPENDER].start();
					});
			});
		},

		"sig/stop": function () {
			return this[APPENDER].stop();
		},

		"append": function() {
			var me = this;
			var appender = me[APPENDER];

			if (me[ENABLED]) {
				appender.append.apply(appender, arguments);
			}

			return me;
		},

		"hub:memory/context": function (context) {
			this[RESOLVE](context);
		}
	});
});
define('troopjs-ef/package',{"name":"troopjs-ef","description":"TroopJS EF","version":"2.0.2","author":{"name":"Mikael Karon","email":"mikael@karon.se"},"repository":{"type":"git","url":"https://stash.englishtown.com/scm/share/troopjs-ef.git"},"devDependencies":{"grunt":"~0.4.1","grunt-contrib-requirejs":"~0.4.1","grunt-contrib-uglify":"~0.2.2","grunt-contrib-clean":"~0.5.0","grunt-banner":"~0.1.4","grunt-plugin-buster":"~2.0.0","grunt-git-describe":"~2.0.2","grunt-git-dist":"~0.3.0","grunt-json-replace":"~0.1.2","buster":"~0.6.12"}});
define('troopjs-ef', ['troopjs-ef/package'], function (main) { return main; });

