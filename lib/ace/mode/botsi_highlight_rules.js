/* ***** BEGIN LICENSE BLOCK *****
 * Distributed under the BSD license:
 *
 * Copyright (c) 2010, Ajax.org B.V.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of Ajax.org B.V. nor the
 *       names of its contributors may be used to endorse or promote products
 *       derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL AJAX.ORG B.V. BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * ***** END LICENSE BLOCK ***** */

define(function(require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

    // exports is for Haml
    var constantOtherSymbol = exports.constantOtherSymbol = {
        token: "constant.language", // atoms, @attribute
        regex: "(?:[@:][A-Za-z_]*)" // |[@$](?=[a-zA-Z0-9_]))[a-zA-Z0-9_]*[!=?]?
    };

    var qqString = exports.qqString = {
        token: "string", // single line
        regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]'
    };

    var constantNumericHex = exports.constantNumericHex = {
        token: "constant.numeric", // hex
        regex: "0[xX][0-9a-fA-F](?:[0-9a-fA-F]|_(?=[0-9a-fA-F]))*\\b"
    };

    var constantNumericFloat = exports.constantNumericFloat = {
        token: "constant.numeric", // float
        regex: "[+-]?\\d(?:\\d|_(?=\\d))*(?:(?:\\.\\d(?:\\d|_(?=\\d))*)?(?:[eE][+-]?\\d+)?)?\\b"
    };

    var BotsiHighlightRules = function() {

      var buildinConstants = (
        // botsi builtins
        "dialogflow|event|moment|web|image|location|audio|video|event|expecting|quick_replies|class|preview_image|trigger|random|title|subtitle|image_url|default_action|hide_modal|webview_height_ratio|messenger_extensions|fallback_url|webview_share_button|url|open|intent|entity|match|label|as|to|name"
        // umbrella builtins
          + "|query|reply|chat_link|oauth_link|get_full_token|get_token_info|get_access_token|delete_token|spawn_group"
        );

        var builtinFunctions = (

          // botsi
          "accumulate|if|else|after|once|when|branch|do|end|import|repeat|in|accumulate|dialog|task|test|elixir|def|defp|say|ask|await|emit|expect|log|invoke|perform|stop|reset|show|http_post|http_get|http_put|http_patch|http_delete|pause|type|remember|forget|tag|untag|gallery_template|list_template|buttons"
          // umbrella statement functions
          + "|mail|cancel_emit"
        );

        var keywords = (
            "__unknown__|__root__|__error__|__main__|__master__|__group__|__resume__|delay|timeout|typing_indicator|__unknown_location__|__unknown_attachment__|__unknown_event__|__timeout__|__ask_timeout__|__returning__"
        );

        var builtinVariables = "";

        var keywordMapper = this.$keywords = this.createKeywordMapper({
            "keyword": keywords,
            "constant.language": buildinConstants,
            "variable.language": builtinVariables,
            "support.function": builtinFunctions,
            "invalid.deprecated": "debugger" // TODO is this a remnant from js mode?
        }, "identifier");

        // regexp must not have capturing parentheses. Use (?:) instead.
        // regexps are ordered -> the first match is used

        this.$rules = {
            "start": [{
                    token: "comment",
                    regex: "#.*$"
                }, {
                    token: "comment", // multi line comment
                    regex: "^=begin(?:$|\\s.*$)",
                    next: "comment"
                }, {
                    token: "string.regexp",
                    regex: "[/](?:(?:\\[(?:\\\\]|[^\\]])+\\])|(?:\\\\/|[^\\]/]))*[/]\\w*\\s*(?=[).,;]|$)"
                },

                [{
                    regex: "[{}]",
                    onMatch: function(val, state, stack) {
                        this.next = val == "{" ? this.nextState : "";
                        if (val == "{" && stack.length) {
                            stack.unshift("start", state);
                            return "paren.lparen";
                        }
                        if (val == "}" && stack.length) {
                            stack.shift();
                            this.next = stack.shift();
                            if (this.next.indexOf("string") != -1)
                                return "paren.end";
                        }
                        return val == "{" ? "paren.lparen" : "paren.rparen";
                    },
                    nextState: "start"
                }, {
                    token: "i18nstring.start",
                    regex: /_\("/,
                    push: [{
                        token : "constant.language.escape",
                        regex : /\\(?:[nsrtvfbae'"\\]|c.|C-.|M-.(?:\\C-.)?|[0-7]{3}|x[\da-fA-F]{2}|u[\da-fA-F]{4})/
                    }, {
                        token: "i18nstring.end",
                        regex: /"\)/,
                        next: "pop"
                    }, {
                        defaultToken: "i18nstring"
                    }]
                }, {
                    token: "i18nstring.start",
                    regex: /_"/,
                    push: [{
                        token : "constant.language.escape",
                        regex : /\\(?:[nsrtvfbae'"\\]|c.|C-.|M-.(?:\\C-.)?|[0-7]{3}|x[\da-fA-F]{2}|u[\da-fA-F]{4})/
                    }, {
                        token: "i18nstring.end",
                        regex: /"/,
                        next: "pop"
                    }, {
                        defaultToken: "i18nstring"
                    }]
                }, {
                    token: "string.start",
                    regex: /"/,
                    push: [{
                        token: "constant.language.escape",
                        regex: /\\(?:[nsrtvfbae'"\\]|c.|C-.|M-.(?:\\C-.)?|[0-7]{3}|x[\da-fA-F]{2}|u[\da-fA-F]{4})/
                    }, {
                        token: "paren.start",
                        regex: /#{/,
                        push: "start"
                    }, {
                        token: "string.end",
                        regex: /"/,
                        next: "pop"
                    }, {
                        defaultToken: "string"
                    }]
                }],

                constantOtherSymbol,
                constantNumericHex,
                constantNumericFloat,

                {
                    token: "constant.language.boolean",
                    regex: "(?:true|false|nil)\\b"
                }, {
                    token: keywordMapper,
                    // TODO: Unicode escape sequences
                    // TODO: Unicode identifiers
                    regex: "[a-zA-Z_$][a-zA-Z0-9_$]*\\b"
                }, {
                    token: "punctuation.separator.key-value",
                    regex: "=>"
                }, {
                    token: "string.character",
                    regex: "\\B\\?."
                }, {
                    token: "keyword.operator",
                    regex: "!|\\$|%|&|\\*|\\-\\-|\\-|\\+\\+|\\+|~|===|==|=|!=|!==|<=|>=|<<=|>>=|>>>=|<>|<|>|!|&&|\\|\\||\\?\\:|\\*=|%=|\\+=|\\-=|&=|\\^="
                }, {
                    token: "paren.lparen",
                    regex: "[[({]"
                }, {
                    token: "paren.rparen",
                    regex: "[\\])}]"
                }, {
                    token: "text",
                    regex: "\\s+"
                }
            ],
            "comment": {
                token: "comment", // comment spanning whole line
                regex: ".+"
            }
        };

        this.normalizeRules();
    };

    oop.inherits(BotsiHighlightRules, TextHighlightRules);

    exports.BotsiHighlightRules = BotsiHighlightRules;
});
