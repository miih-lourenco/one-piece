/**
 * troopjs-ef - 1.0.0-78-g73e687d
 */

define('troopjs-ef/config',{});

define('troopjs-ef/component/ef',[ "troopjs-core/pubsub/topic", "troopjs-utils/uri" ], function EFModule(Topic, URI) {
	var UNSHIFT = Array.prototype.unshift;

	return {
		route : function route(uri) {
			if(!(uri instanceof URI)) {
				uri = URI(uri);
			}

			window.location.hash = uri;
		},

		query : function query(query /*, query, query, query, */, deferred) {
			var self = this;

			// Add 'query' as the first argument
			UNSHIFT.call(arguments, Topic("query", self));

			// Apply internal publish
			self.publish.apply(self, arguments);

			return self;
		}
	};
});
define('troopjs-ef/component/widget',[ "troopjs-core/component/widget", "logger", "./ef" ], function EFWidgetModule(Widget, Logger, EF) {
	return Widget.extend(EF, Logger, {
		displayName : "ef/widget"
	});
});
define('troopjs-ef/blurb/widget',[ "../component/widget", "troopjs-utils/deferred" ], function BlurbWidgetModule(Widget, Deferred) {
    var RE = /(?:\^(\w+)\^)/g;
    var PATTERNS = {
        "default" : RE
    };

    return Widget.extend({
        "sig/start" : function onStart(signal, deferred) {
            var self = this;
            var $data = self.$element.data();

            // Make sure deferred was passed
            deferred = deferred || Deferred();

            // Defer query
            Deferred(function deferredQuery(dfdQuery) {
                // Query for blurb
                self.query("blurb!" + $data.blurbId, dfdQuery);
            })
            // Done
            .then(function doneQuery(blurb) {
                var pattern = $data.pattern;
                var values = $data.values;
                var translation = blurb.translation;

                if (translation && values) {
                    pattern = pattern
                        ? PATTERNS[pattern] || RegExp(pattern, "g")
                        : RE;

                        translation = translation.replace(pattern, function (match, key, position, original) { return values[key] || key; });
                }

                // Set text, pass deferred
                self.text(translation, deferred);
            },
            // Fail
            deferred.reject,
            // Progress
            deferred.notify);
        }
    });
});
define('troopjs-ef/widget/placeholder',[ "troopjs-core/widget/placeholder", "../component/ef" ], function EFPlaceholderWidgetModule(Placeholder, EF) {
    return Placeholder.extend(EF, {
        displayName : "ef/widget/placeholder"
    });
});
define('troopjs-ef/ccl/placeholder',[ "../widget/placeholder", "troopjs-utils/deferred" ], function CCLPlaceholderModule(Placeholder, Deferred) {
    var CCL = "ccl";
    var RE_BOOLEAN_TRUE = /^true$/i;

    return Placeholder.extend(function CCLPlaceholderWidget($element, name) {
        this[CCL] = $element.data("ccl");
    }, {
        "displayName" : "ef/ccl/placeholder",

        "hub:memory/context" : function onContext(topic, context) {
            var self = this;

            Deferred(function deferredQuery(dfd) {
                self.query("ccl!\"" + self[CCL] + "\"", dfd);
            })
            .done(function doneQuery(ccl) {
                if (RE_BOOLEAN_TRUE.test(ccl.value)) {
                    self.release();
                }
                else {
                    self.hold();
                }
            });
        }
    });
});
define('troopjs-ef/component/gadget',[ "troopjs-core/component/gadget", "logger", "./ef" ], function EFGadgetModule(Gadget, Logger, EF) {
    return Gadget.extend(EF, Logger, {
        displayName : "ef/gadget"
    });
});
define('troopjs-ef/component/service',[ "troopjs-core/component/service", "logger", "./ef" ], function EFServiceModule(Service, Logger, EF) {
	return Service.extend(EF, Logger, {
		displayName : "ef/service"
	});
});
define('troopjs-ef/data/cache', [ "../component/gadget" ], function CacheModule(Gadget) {
    var UNDEFINED;
    var FALSE = false;
    var NULL = null;
    var OBJECT = Object;
    var ARRAY = Array;

    var SECOND = 1000;
    var INTERVAL = "interval";
    var GENERATIONS = "generations";
    var AGE = "age";
    var HEAD = "head";
    var NEXT = "next";
    var EXPIRES = "expires";
    var CONSTRUCTOR = "constructor";
    var LENGTH = "length";

    var _ID = "id";
    var _MAXAGE = "maxAge";
    var _EXPIRES = "expires";
    var _INDEXED = "indexed";
    var _COLLAPSED = "collapsed";

    /**
     * Internal method to put a node in the cache
     * @param node Node
     * @param constructor Constructor of value
     * @param now Current time (seconds)
     * @returns Cached node
     */
    function _put(node, constructor, now) {
        var self = this;
        var result;
        var id;
        var i;
        var iMax;
        var expires;
        var expired;
        var head;
        var current;
        var next;
        var generation;
        var generations = self[GENERATIONS];
        var property;
        var value;

        // First add node to cache (or get the already cached instance)
        cache : {
            // Can't cache if there is no _ID
            if (!(_ID in node)) {
                result = node;          // Reuse ref to node (avoids object creation)
                break cache;
            }

            // Get _ID
            id = node[_ID];

            // In cache, get it!
            if (id in self) {
                result = self[id];
                break cache;
            }

            // Not in cache, add it!
            result = self[id] = node;   // Reuse ref to node (avoids object creation)

            // Update _INDEXED
            result[_INDEXED] = now;
        }

        // We have to deep traverse the graph before we do any expiration (as more data for this object can be available)

        // Check that this is an ARRAY
        if (constructor === ARRAY) {
            // Index all values
            for (i = 0, iMax = node[LENGTH]; i < iMax; i++) {

                // Keep value
                value = node[i];

                // Get constructor of value (safely, falling back to UNDEFINED)
                constructor = value === NULL || value === UNDEFINED
                    ? UNDEFINED
                    : value[CONSTRUCTOR];

                // Do magic comparison to see if we recursively put this in the cache, or plain put
                result[i] = (constructor === OBJECT || constructor === ARRAY && value[LENGTH] !== 0)
                    ? _put.call(self, value, constructor, now)
                    : value;
            }
        }

        // Check that this is an OBJECT
        else if (constructor === OBJECT) {
            // Index all properties
            for (property in node) {
                // Except the _ID property
                // or the _COLLAPSED property, if it's false
                if (property === _ID
                    || (property === _COLLAPSED && result[_COLLAPSED] === FALSE)) {
                    continue;
                }

                // Keep value
                value = node[property];

                // Get constructor of value (safely, falling back to UNDEFINED)
                constructor = value === NULL || value === UNDEFINED
                    ? UNDEFINED
                    : value[CONSTRUCTOR];

                // Do magic comparison to see if we recursively put this in the cache, or plain put
                result[property] = (constructor === OBJECT || constructor === ARRAY && value[LENGTH] !== 0)
                    ? _put.call(self, value, constructor, now)
                    : value;
            }
        }

        // Check if we need to move result between generations
        move : {
            // Break fast if id is NULL
            if (id === NULL) {
                break move;
            }

            // Calculate expiration and floor
            // '>>>' means convert anything other than posiitive integer into 0
            expires = 0 | now + (result[_MAXAGE] >>> 0);

            remove : {
                // Fail fast if there is no old expiration
                if (!(_EXPIRES in result)) {
                    break remove;
                }

                // Get current expiration
                expired = result[_EXPIRES];

                // If expiration has not changed, we can continue
                if (expired === expires) {
                    break move;
                }

                // Remove ref from generation (if that generation exists)
                if (expired in generations) {
                    delete generations[expired][id];
                }
            }

            add : {
                // Update expiration time
                result[_EXPIRES] = expires;

                // Existing generation
                if (expires in generations) {
                    // Add result to generation
                    generations[expires][id] = result;
                    break add;
                }

                // Create generation with expiration set
                (generation = generations[expires] = {})[EXPIRES] = expires;

                // Add result to generation
                generation[id] = result;

                // Short circuit if there is no head
                if (generations[HEAD] === UNDEFINED) {
                    generations[HEAD] = generation;
                    break add;
                }

                // Step through list as long as there is a next, and expiration is "older" than the next expiration
                for (current = head = generations[HEAD]; next = current[NEXT], next !== UNDEFINED && next[EXPIRES] < expires; current = next);

                // Check if we're still on the head and if we're younger
                if (current === head && current[EXPIRES] > expires) {
                    // Next generation is the current one (head)
                    generation[NEXT] = current;

                    // Reset head to new generation
                    generations[HEAD] = generation;
                    break add;
                }

                // Insert new generation between current and current.next
                generation[NEXT] = current[NEXT];
                current[NEXT] = generation;
            }
        }

        return result;
    }

    return Gadget.extend(function (age) {
        var me = this;

        me[AGE] = age || (60 * SECOND);
        me[GENERATIONS] = {};
    }, {
        "displayName" : "ef/data/cache",

        "sig/start" : function onStart(signal, deferred) {
            var self = this;
            var generations = self[GENERATIONS];

            // Create new sweep interval
            self[INTERVAL] = setInterval(function sweep() {
                // Calculate expiration of this generation
                var expires = 0 | new Date().getTime() / SECOND;

                var property = NULL;
                var current;

                // Get head
                current = generations[HEAD];

                // Fail fast if there's no head
                if (current === UNDEFINED) {
                    return;
                }

                do {
                    // Exit if this generation is to young
                    if (current[EXPIRES] > expires) {
                        break;
                    }

                    // Iterate all properties on current
                    for (property in current) {
                        // And is it not a reserved property
                        if (property === EXPIRES || property === NEXT || property === GENERATIONS) {
                            continue;
                        }

                        // Delete from self (cache)
                        delete self[property];
                    }

                    // Delete generation
                    delete generations[current[EXPIRES]];
                }
                // While there's a next
                while (current = current[NEXT]);

                // Reset head
                generations[HEAD] = current;
            }, self[AGE]);

            if (deferred) {
                deferred.resolve();
            }
        },

        "sig/stop" : function onStop(signal, deferred) {
            var self = this;
            var property = NULL;

            // Clear sweep interval (if it exists)
            if (INTERVAL in self) {
                clearInterval(self[INTERVAL]);
            }

            if (deferred) {
                deferred.resolve();
            }
        },

        "sig/finalize" : function onFinalize(signal, deferred) {
            var self = this;
            var property = NULL;

            // Iterate all properties on self
            for (property in self) {
                // Don't delete non-objects or objects that don't ducktype cachable
                if (self[property][CONSTRUCTOR] !== OBJECT || !(_ID in self[property])) {
                    continue;
                }

                // Delete from self (cache)
                delete self[property];
            }

            if (deferred) {
                deferred.resolve();
            }
        },

        /**
         * Puts a node into the cache
         * @param node Node to add (object || array)
         * @returns Cached node (if it existed in the cache before), otherwise the node sent in
         */
        put : function put(node) {
            var self = this;

            // Get constructor of node (safely, falling back to UNDEFINED)
            var constructor = node === NULL || node === UNDEFINED
                ? UNDEFINED
                : node[CONSTRUCTOR];

            // Do magic comparison to see if we should cache this object
            return constructor === OBJECT || constructor === ARRAY && node[LENGTH] !== 0
                ? _put.call(self, node, constructor, 0 | new Date().getTime() / SECOND)
                : node;
        }
    });
});

define('troopjs-ef/data/query', [ "troopjs-core/component/base" ], function QueryModule(Component) {
    var UNDEFINED;
    var TRUE = true;
    var FALSE = false;
    var OBJECT = Object;
    var ARRAY = Array;
    var CONSTRUCTOR = "constructor";
    var LENGTH = "length";

    var OP = "op";
    var OP_ID = "!";
    var OP_PROPERTY = ".";
    var OP_PATH = ",";
    var OP_QUERY = "|";
    var TEXT = "text";
    var RAW = "raw";
    var RESOLVED = "resolved";
    var _ID = "id";
    var _EXPIRES = "expires";
    var _COLLAPSED = "collapsed";
    var _AST = "_ast";
    var _QUERY = "_query";

    var RE_TEXT = /("|')(.*?)\1/;
    var TO_RAW = "$2";
    var RE_RAW = /!(.*[!,|.\s]+.*)/;
    var TO_TEXT = "!'$1'";

    return Component.extend(function Query(query) {
       var me = this;

       if (query !== UNDEFINED) {
           me[_QUERY] = query;
       }
    }, {
        parse : function parse(query) {
            var me = this;

            // Reset _AST
            delete me[_AST];

            // Set _QUERY
            query = me[_QUERY] = (query || me[_QUERY] || "");

            var i;          // Index
            var l;          // Length
            var c;          // Current character
            var m;          // Current mark
            var q;          // Current quote
            var o;          // Current operation
            var ast = [];   // _AST

            // Step through the query
            for (i = m = 0, l = query[LENGTH]; i < l; i++) {
                c = query.charAt(i);

                switch (c) {
                    case "\"" : // Double quote
                    case "'" :  // Single quote
                        // Set / unset quote char
                        q = q === c
                            ? UNDEFINED
                            : c;
                        break;

                    case OP_ID :
                        // Break fast if we're quoted
                        if (q !== UNDEFINED) {
                            break;
                        }

                        // Init new op
                        o = {};
                        o[OP] = c;
                        break;

                    case OP_PROPERTY :
                    case OP_PATH :
                        // Break fast if we're quoted
                        if (q !== UNDEFINED) {
                            break;
                        }

                        // If there's an active op, store TEXT and push on _AST
                        if (o !== UNDEFINED) {
                            o[RAW] = (o[TEXT] = query.substring(m, i)).replace(RE_TEXT, TO_RAW);
                            ast.push(o);
                        }

                        // Init new op
                        o = {};
                        o[OP] = c;

                        // Set mark
                        m = i + 1;
                        break;

                    case OP_QUERY :
                    case " " :  // Space
                    case "\t" : // Horizontal tab
                    case "\r" : // Carriage return
                    case "\n" : // Newline
                        // Break fast if we're quoted
                        if (q !== UNDEFINED) {
                            break;
                        }

                        // If there's an active op, store TEXT and push on _AST
                        if (o !== UNDEFINED) {
                            o[RAW] = (o[TEXT] = query.substring(m, i)).replace(RE_TEXT, TO_RAW);
                            ast.push(o);
                        }

                        // Reset op
                        o = UNDEFINED;

                        // Set mark
                        m = i + 1;
                        break;
                }
            }

            // If there's an active op, store TEXT and push on _AST
            if (o !== UNDEFINED) {
                o[RAW] = (o[TEXT] = query.substring(m, l)).replace(RE_TEXT, TO_RAW);
                ast.push(o);
            }

            // Set _AST
            me[_AST] = ast;

            return me;
       },

        reduce : function reduce(cache) {
            var me = this;
            var now = 0 | new Date().getTime() / 1000;

            // If we're not parsed - parse
            if (!(_AST in me)) {
                me.parse();
            }

            var ast = me[_AST]; // _AST
            var result = [];    // Result
            var i;              // Index
            var j;
            var c;
            var l;              // Length
            var o;              // Current operation
            var x;              // Current raw
            var r;              // Current root
            var n;              // Current node
            var k = FALSE;      // Keep flag

            // First step is to resolve what we can from the _AST
            for (i = 0, l = ast[LENGTH]; i < l; i++) {
                o = ast[i];

                switch (o[OP]) {
                    case OP_ID :
                        // Set root
                        r = o;

                        // Get e from o
                        x = o[RAW];

                        // Do we have this item in cache
                        if (x in cache) {
                            // Set current node
                            n = cache[x];
                            // Set RESOLVED if we're not collapsed or expired
                            o[RESOLVED] = n[_COLLAPSED] !== TRUE && !(_EXPIRES in n) || n[_EXPIRES] > now;
                        }
                        else {
                            // Reset current root and node
                            n = UNDEFINED;
                            // Reset RESOLVED
                            o[RESOLVED] = FALSE;
                        }
                        break;

                    case OP_PROPERTY :
                        // Get e from o
                        x = o[RAW];

                        // Do we have a node and this item in the node
                        if (n && x in n) {
                            // Set current node
                            n = n[x];

                            // Get constructor
                            c = n[CONSTRUCTOR];

                            // If the constructor is an array
                            if (c === ARRAY) {
                                // Set naive resolved
                                o[RESOLVED] = TRUE;

                                // Iterate backwards over n
                                for (j = n[LENGTH]; j-- > 0;) {
                                    // Get item
                                    c = n[j];

                                    // If the constructor is not an object
                                    // or the object does not duck-type _ID
                                    // or the object is not collapsed
                                    // and the object does not duck-type _EXPIRES
                                    // or the objects is not expired
                                    if (c[CONSTRUCTOR] !== OBJECT
                                        || !(_ID in c)
                                        || c[_COLLAPSED] !== TRUE
                                        && !(_EXPIRES in c)
                                        || c[_EXPIRES] > now) {
                                        continue;
                                    }

                                    // Change RESOLVED
                                    o[RESOLVED] = FALSE;
                                    break;
                                }
                            }
                            // If the constructor is _not_ an object or n does not duck-type _ID
                            else if (c !== OBJECT || !(_ID in n)) {
                                o[RESOLVED] = TRUE;
                            }
                            // We know c _is_ and object and n _does_ duck-type _ID
                            else {
                                // Change OP to OP_ID
                                o[OP] = OP_ID;
                                // Update RAW to _ID and TEXT to escaped version of RAW
                                o[TEXT] = (o[RAW] = n[_ID]).replace(RE_RAW, TO_TEXT);
                                // Set RESOLVED if we're not collapsed or expired
                                o[RESOLVED] = n[_COLLAPSED] !== TRUE && !(_EXPIRES in n) || n[_EXPIRES] > now;
                            }
                        }
                        else {
                            // Reset current node and RESOLVED
                            n = UNDEFINED;
                            o[RESOLVED] = FALSE;
                        }
                        break;

                    case OP_PATH :
                        // Get e from r
                        x = r[RAW];

                        // Set current node
                        n = cache[x];

                        // Change OP to OP_ID
                        o[OP] = OP_ID;

                        // Copy properties from r
                        o[TEXT] = r[TEXT];
                        o[RAW] = x;
                        o[RESOLVED] = r[RESOLVED];
                        break;
                }
            }

            // After that we want to reduce 'dead' operations from the _AST
            while (l-- > 0) {
                o = ast[l];

                switch(o[OP]) {
                    case OP_ID :
                        // If the keep flag is set, or the op is not RESOLVED
                        if (k || o[RESOLVED] !== TRUE) {
                            result.unshift(o);
                        }

                        // Reset keep flag
                        k = FALSE;
                        break;

                    case OP_PROPERTY :
                        result.unshift(o);

                        // Set keep flag
                        k = TRUE;
                        break;
                }
            }

            // Update _AST
            me[_AST] = result;

            return me;
        },

        ast : function ast() {
            var me = this;

            // If we're not parsed - parse
            if (!(_AST in me)) {
                me.parse();
            }

            return me[_AST];
        },

        rewrite : function rewrite() {
            var me = this;

            // If we're not parsed - parse
            if (!(_AST in me)) {
                me.parse();
            }

            var ast = me[_AST]; // AST
            var result = "";    // Result
            var l;              // Current length
            var i;              // Current index
            var o;              // Current operation

            // Step through AST
            for (i = 0, l = ast[LENGTH]; i < l; i++) {
                o = ast[i];

                switch(o[OP]) {
                    case OP_ID :
                        // If this is the first OP_ID, there's no need to add OP_QUERY
                        result += i === 0
                            ? o[TEXT]
                            : OP_QUERY + o[TEXT];
                        break;

                    case OP_PROPERTY :
                        result += OP_PROPERTY + o[TEXT];
                        break;
                }
            }

            return result;
        }
    });
});
define('troopjs-ef/logger/widget',["../component/widget"], function LoggerWidgetModule(Widget) {
    var $ELEMENT = "$element";

    return Widget.extend({
        "sig/start" : function(topic, deferred){
            var self = this;

            self[$ELEMENT].get(0).onerror = function (message, filename, lineno){
                self.log({
                    source : filename,
                    lineNo : lineno,
                    msg : message
                });
            };

            deferred && deferred.resolve();
        },

        "sig/stop" : function(topic,deferred) {
            this[$ELEMENT].get(0).onerror = null;

            deferred && deferred.resolve();
        }
    });
});
define('troopjs-ef/logger/appender/command',[ "../../component/gadget" ], function CommandAppenderModule(Gadget) {
    var ARRAY_PUSH = Array.prototype.push;
    var LENGTH = "length";
    var BATCHES = "batches";
    var INTERVAL = "interval";

    return Gadget.extend(function CommandAppender() {
        this[BATCHES] = [];
    }, {
        "displayName" : "ef/logger/appender/command",

        "sig/start" : function start(signal, deferred) {
            var self = this;

            if (!(INTERVAL in self)) {
                self[INTERVAL] = setInterval(function batchInterval() {
                    if(self[BATCHES][LENGTH] === 0) {
                        return;
                    }

                    var batches = self[BATCHES];
                    self[BATCHES] = [];

                    self.publish("action/logger/Log", {
                        "logParam": batches
                    });

                }, 200);
            }

            if (deferred) {
                deferred.resolve();
            }
        },

        "sig/stop" : function stop(signal, deferred) {
            var self = this;

            function tryStop() {
                // Check if BATCHES is empty
                if (self[BATCHES][LENGTH] === 0) {
                    // Only do this if we have an interval
                    if (INTERVAL in self) {
                        // Clear interval
                        clearInterval(self[INTERVAL]);

                        // Reset interval
                        delete self[INTERVAL];
                    }

                    if (deferred) {
                        deferred.resolve();
                    }
                }
                else {
                    setTimeout(tryStop, 200);
                }
            }

            tryStop();
        },

        "append" : function append() {
            ARRAY_PUSH.apply(this[BATCHES], arguments);
        }
    });
});
define('troopjs-ef/logger/appender/filter_ccl',[ "../../component/gadget", "troopjs-utils/deferred" ], function FilterCCLAppenderModule(Gadget, Deferred) {
    var ENABLED = "enabled";
    var VARIABLE = "variable";
    var APPENDER = "appender";
    var STARTDFD = 'startDfd';

    return Gadget.extend(function FilterCCLAppender(variable, appender) {
        var self = this;
        self[STARTDFD] = Deferred();
        self[VARIABLE] = variable;
        self[APPENDER] = appender;
    }, {
        "sig/start" : function (topic, deferred) {
            var self = this;

            self[STARTDFD].then(function(){
                Deferred(function (dfd) {
                    self.query("ccl!'" + self[VARIABLE] + "'", dfd);
                })
                .done(function (ccl) {
                    self[ENABLED] = !!(ccl.value === 'true');
                    self[APPENDER].start(deferred);
                })
                .fail(deferred.reject)
                .progress(deferred.progress);
            });
        },

        "sig/stop" : function (topic, deferred) {
            this[APPENDER].stop(deferred);
        },

        "append" : function () {
            var self = this;
            var appender = self[APPENDER];

            if (self[ENABLED]) {
                appender.append.apply(appender, arguments);
            }
        },

        "hub:memory/context" : function onContext(topic, context) {
            this[STARTDFD].resolve();
        }
    });
});
define('troopjs-ef/service/action',[ "../component/service", "troopjs-utils/deferred", "troopjs-utils/merge" ], function ActionServiceModule(Service, Deferred, merge) {
    var NAME = "name";
    var API = "api";
    var CACHE = "cache";

    function act(topic, data, deferred) {
        var me = this;
        var cache = me[CACHE];

        deferred = deferred || Deferred();

        Deferred(function deferredAction(dfdAction) {
            me.publish("ajax", merge.call(me[API], {
                data : JSON.stringify(data),
                processData : false
            }), dfdAction);
        }).then([ function doneAction(data) {
            cache.put(data);
        }, deferred.resolve ], deferred.reject, deferred.notify);

        return me;
    }

    return Service.extend(function ActionService(name, api, cache) {
        var me = this;

        me[NAME] = name;
        me[API] = api;
        me[CACHE] = cache;

        me.displayName = "ef/service/action/" + name;
    }, {
        "sig/initialize" : function onInitialize(signal, deferred) {
            var me = this;

            me.subscribe(me[NAME], me, act);

            if (deferred) {
                deferred.resolve();
            }
        },

        "sig/finalize" : function onFinalize(signal, deferred) {
            var me = this;

            me.unsubscribe(me[NAME], act);

            if (deferred) {
                deferred.resolve();
            }
        }
    });
});
define('troopjs-ef/service/query',[ "../component/service", "../data/query", "troopjs-core/pubsub/topic", "troopjs-utils/deferred", "troopjs-utils/merge" ], function QueryServiceModule(Service, Query, Topic, Deferred, merge) {
    var UNDEFINED;
    var ARRAY_PROTO = Array.prototype;
    var SLICE = ARRAY_PROTO.slice;
    var CONCAT = ARRAY_PROTO.concat;
    var PUSH = ARRAY_PROTO.push;
    var LENGTH = "length";
    var BATCHES = "batches";
    var INTERVAL = "interval";
    var CACHE = "cache";
    var TOPIC = "topic";
    var QUERIES = "queries";
    var RESOLVED = "resolved";
    var RAW = "raw";
    var ID = "id";
    var Q = "q";

    return Service.extend(function QueryService(cache) {
        var me = this;

        me[BATCHES] = [];
        me[CACHE] = cache;
    }, {
        displayName : "ef/service/query",

        "sig/start" : function start(signal, deferred) {
            var me = this;
            var cache = me[CACHE];

            // Set interval (if we don't have one)
            me[INTERVAL] = INTERVAL in me
                ? me[INTERVAL]
                : setInterval(function batchInterval() {
                var batches = me[BATCHES];

                // Return fast if there is nothing to do
                if (batches[LENGTH] === 0) {
                    return;
                }

                // Reset batches
                me[BATCHES] = [];

                Deferred(function deferredRequest(dfdRequest) {
                    var q = [];
                    var topics = [];
                    var batch;
                    var i;

                    // Iterate batches
                    for (i = batches[LENGTH]; i--;) {
                        batch = batches[i];

                        // Add batch[TOPIC] to topics
                        PUSH.call(topics, batch[TOPIC]);

                        // Add batch[Q] to q
                        PUSH.apply(q, batch[Q]);
                    }

                    // No q, might as well resolve
                    if (q[LENGTH] === 0) {
                        dfdRequest.resolve(q);
                    }
                    // Otherwise request from backend
                    else {
                        // Publish ajax
                        me.publish(Topic("ajax", me, topics), merge.call({
                            "data": {
                                "q": q.join("|")
                            }
                        }, me.config.api.query), dfdRequest);
                    }
                })
                    .done(function doneRequest(data /* , textStatus, jqXHR */) {
                        var batch;
                        var queries;
                        var id;
                        var i;
                        var j;

                        // Add all new data to cache
                        cache.put(data);

                        // Iterate batches
                        for (i = batches[LENGTH]; i--;) {
                            batch = batches[i];
                            queries = batch[QUERIES];
                            id = batch[ID];

                            // Iterate queries
                            for (j = queries[LENGTH]; j--;) {
                                // If we have a corresponding ID, fetch from cache
                                if (j in id) {
                                    queries[j] = cache[id[j]];
                                }
                            }

                            // Resolve batch
                            batch.resolve.apply(batch, queries);
                        }
                    })
                    .fail(function failRequest() {
                        var batch;
                        var i;

                        // Iterate batches
                        for (i = batches[LENGTH]; i--;) {
                            batch = batches[i];

                            // Reject (with original queries as argument)
                            batch.reject.apply(batch, batch[QUERIES]);
                        }
                    })
                    .progress(deferred.notify);
            }, 200);

            if (deferred) {
                deferred.resolve();
            }
        },

        "sig/stop" : function stop(signal, deferred) {
            var me = this;

            // Only do this if we have an interval
            if (INTERVAL in me) {
                // Clear interval
                clearInterval(me[INTERVAL]);

                // Reset interval
                delete me[INTERVAL];
            }

            if (deferred) {
                deferred.resolve();
            }
        },

        "hub/query" : function query(topic /* query, query, query, .., */, deferred) {
            var me = this;
            var length = arguments[LENGTH] - 1;
            var batches = me[BATCHES];
            var cache = me[CACHE];

            // Slice and flatten queries
            var queries = CONCAT.apply(ARRAY_PROTO, SLICE.call(arguments, 1, length));

            // Update deferred to be the last argument
            deferred = arguments[length];

            // Deferred batch
            Deferred(function deferredBatch(batch) {
                var query;
                var q = [];
                var id = [];
                var ast;
                var i;
                var j;
                var iMax;

                // Iterate queries
                for (i = 0, iMax = queries[LENGTH]; i < iMax; i++) {
                    // Init Query
                    query = Query(queries[i]);

                    // Get AST
                    ast = query.ast();

                    // If we have an ID
                    if (ast[LENGTH] > 0) {
                        // Store raw ID
                        id[i] = ast[0][RAW];
                    }

                    // Get reduced AST
                    ast = query.reduce(cache).ast();

                    // Step backwards through AST
                    for (j = ast[LENGTH]; j-- > 0;) {
                        // If this op is not resolved
                        if (!ast[j][RESOLVED]) {
                            //  Add string version of reduced query to q
                            PUSH.call(q, query.rewrite())
                            break;
                        }
                    }
                }

                // If all queries were fully reduced, we can quick resolve
                if (q[LENGTH] === 0) {
                    // Iterate queries
                    for (i = 0; i < iMax; i++) {
                        // If we have a corresponding ID, fetch from cache
                        if (i in id) {
                            queries[i] = cache[id[i]];
                        }
                    }

                    // Resolve batch
                    batch.resolve.apply(batch, queries);
                }
                else {
                    // Store properties on batch
                    batch[TOPIC] = topic;
                    batch[QUERIES] = queries;
                    batch[ID] = id;
                    batch[Q] = q;

                    // Add batch to batches
                    batches.push(batch);
                }
            })
            .then(deferred.resolve, deferred.reject, deferred.notify);
        }
    });
});

define('troopjs-ef/widget/application',[ "troopjs-core/widget/application", "../component/ef" ], function EFApplicationWidgetModule(Application, EF) {
    return Application.extend(EF, {
        displayName : "ef/widget/application"
    });
});
define('troopjs-ef/tracking/service',[
	"../component/service",
	"when",
	"troopjs-utils/merge",
	"troopjs-utils/unique",
	"client-state",
	"client-tracking"
], function (Service, when, merge, unique, cs, ct) {
	"use strict";

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

		"hub/tracking/track" : function (_topic, name, state, tracking) {
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
	"use strict";

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

		"hub:memory/route" : function (_topic, uri) {
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
define('troopjs-ef/package',{"name":"troopjs-ef","description":"TroopJS EF","version":"1.0.1-SNAPSHOT","author":{"name":"Mikael Karon","email":"mikael@karon.se"},"repository":{"type":"git","url":"https://stash.englishtown.com/scm/share/troopjs-ef.git"},"devDependencies":{"grunt":"~0.4.1","grunt-contrib-requirejs":"~0.4.1","grunt-contrib-uglify":"~0.2.2","grunt-contrib-clean":"~0.4.1","grunt-banner":"~0.1.4","grunt-plugin-buster":"~2.0.0","grunt-git-describe":"~2.0.2","grunt-git-dist":"~0.3.0","grunt-json-replace":"~0.1.2","buster":"~0.6.12"}});
define('troopjs-ef', ['troopjs-ef/package'], function (main) { return main; });
