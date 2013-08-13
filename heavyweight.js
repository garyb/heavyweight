/*jshint es5: true, node: true, bitwise: true, camelcase: true, curly: false, 
eqeqeq: true, forin: true, immed: true, indent: 4, latedef: true, newcap: false,
noarg: true, noempty: true, nonew: true, undef: true, unused: true, 
strict: true, sub: true, quotmark: double */
"use strict";

var _ = require("underscore");

/**
 * Replace characters that would break an attribute value by replacing them 
 * with charcode entities.
 */
var escapeAttr = function (value) {
    return value.replace(/"/g, "&#34;");
};

/**
 * Escape content that contains tag-like structures with CDATA, for use as the 
 * inner content of a tag.
 */
var escapeInner = function (value) {
    if (/[<>]/.test(value) && value.indexOf("<![CDATA[") !== 0) {
        return "<![CDATA[" + value.replace("]]>", "]]]]><![CDATA[>") + "]]>";
    }
    return value;
};

/**
 * Performs a simple conversion of a JS object to XML. `json` is the data to 
 * convert, `tag` is the name of the surrounding tag, `options` can contain 
 * functions `formatInner` and `formatAttr` for mapping tag inner content and 
 * attribute values before converting them to XML.
 */
var toXML = function (json, tag, options) {

    if (json == null) {
        if (tag) return "<" + tag + "/>";
        return "";
    }

    if (_.isArray(json)) {
        return _.map(json, function (item) {
            return toXML(item, tag, options);
        }).join("\n");
    }
    
    if (_.isDate(json)) {
        return tag ? "<" + tag + ">" + json.getTime() + "</" + tag + ">"
                   : json.getTime();
    }
    
    if (_.isObject(json)) {
    
        var items = _.groupBy(_.keys(json), function (k) {
            return k.indexOf("@") === 0 ? "attr" : "tag";
        });

        if (items.attr && tag == null) {
            throw new Error("Cannot add attrs when no tag is specified");
        }
        
        var result = tag ? "<" + tag : "";
        
        if (items.attr) {
            var attrs = _.map(items.attr, function (a) {
                var name = a.substring(1);
                var value = json[a].toString();
                
                if (options && options.formatAttr) {
                    value = options.formatAttr(value, name);
                }
    
                return name + "=\"" + escapeAttr(value) + "\"";
            });
            result += " " + attrs.join(" ");
        }
        
        if (items.tag) {
            if (tag) result += ">\n";
            
            result += _.map(items.tag, function (tag) {
                return "    " + toXML(json[tag], tag, options)
                    .replace(/\n/g, "\n    ");
            }).join("\n");
            
            
            if (tag) result += "\n</" + tag + ">";
        }
        else {
            result += " />";
        }

        return result;
    
    }
    
    var inner = json.toString();
    
    if (options && options.formatInner) {
        inner = options.formatInner(inner);
    }
    
    inner = escapeInner(inner);
    
    return tag ? "<" + tag + ">" + inner + "</" + tag + ">" 
               : inner;
};

/**
 * Creates a version of toXML with default options filled in. The options can 
 * still be overridden by calling them in the usual manner.
 */
toXML.defaults = function (defaults) {
    return function (json, tag, options) {
        return toXML(json, tag, _.defaults(options || {}, defaults));
    };
};

module.exports = { toXML: toXML };