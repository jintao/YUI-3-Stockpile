#!/usr/bin/env node

/* Copyright (c) 2012 Yahoo! Inc.  All rights reserved.
 *
 * The copyrights embodied in the content of this file are licensed by
 * Yahoo! Inc. under the BSD (revised) open source license.
 */

var YUI = require('yui').YUI;
YUI({
	gallery: 'gallery-2012.08.15-20-00'
}).use(
	'json', 'escape', 'parallel', 'datatype-date',
	'gallery-funcprog', 'gallery-sort-extras',
	'gallery-log-filter',
function(Y) {
"use strict";

var mod_os      = require('os'),
	mod_fs      = require('fs'),
	mod_path    = require('path'),
	mod_express = require('express'),
	mod_hbs     = require('express-hbs');

// init hbs helpers

require('./server/hbs-helpers.js');

// options

var optimist = require('optimist');

var argv = optimist
	.option('config',
	{
		default:  '/usr/share/yui3-stockpile/manager.json',
		describe: 'Path to configuration file'
	})
	.argv;

try
{
	var defaults = Y.JSON.parse(mod_fs.readFileSync(argv.config, 'utf8'));
}
catch (e)
{
	defaults = {};
}

var argv = optimist
	.usage('usage: $0')
	.option('path',
	{
		default:  defaults.path || '/var/yui3-stockpile',
		describe: 'Path to repository'
	})
	.option('logpath',
	{
		default:  defaults.logpath || '/var/log/yui3-stockpile',
		describe: 'Path to combo.js log files'
	})
	.option('combo',
	{
		demand:   true,
		default:  defaults.combo,
		describe: 'URL of combo handler'
	})
	.option('auth',
	{
		default:  defaults.auth || 'localhost',
		describe: 'Authentication method for uploading'
	})
	.option('key',
	{
		default:  defaults.key || '/usr/share/yui3-stockpile/stockpile.key',
		describe: 'Private key for https'
	})
	.option('cert',
	{
		default:  defaults.cert || '/usr/share/yui3-stockpile/stockpile.crt',
		describe: 'Certificate for https'
	})
	.option('address',
	{
		default:  defaults.address,
		describe: 'Network address to listen on (default: all)'
	})
	.option('port',
	{
		default:  defaults.port || 80,
		describe: 'Port to listen on for public UI'
	})
	.option('adminport',
	{
		default:  defaults.adminport || 443,
		describe: 'Port to listen on for admin functions'
	})
	.option('admins',
	{
		demand:   true,
		default:  defaults.admins,
		describe: 'Comma-separated list of admin usernames (config file can use array)'
	})
	.option('mailserver',
	{
		default:  defaults.mailserver,
		describe: 'mail server for all users'
	})
	.option('title',
	{
		default:  defaults.title || 'YUI 3 Stockpile Manager',
		describe: 'Server name'
	})
	.option('copyright',
	{
		default:  defaults.copyright || '/* Copyright {year} {company}.  All rights reserved. */',
		describe: 'Copyright template to insert at top of JS/CSS files, if "company" is configured'
	})
	.option('company',
	{
		default:  defaults.company,
		describe: 'Name of company to insert into copyright comment'
	})
	.option('debug',
	{
		boolean:  true,
		default:  defaults.debug,
		describe: 'Turn on debugging'
	})
	.option('test',
	{
		describe: 'Name of file to create when initialization is finished'
	})
	.argv;

var log_levels = ['info', 'warn', 'error'];
if (argv.debug)
{
	require('long-stack-traces');
	log_levels.push('debug');
}
Y.LogFilter.addLevelFilter(log_levels);

if (Y.Lang.isString(argv.admins))
{
	argv.admins = Y.Lang.trim(argv.admins).split(/\s*,\s*/);
}

require('./server/manager-util.js').init(Y, argv);

var log_addr = argv.address || mod_os.hostname();

var app = mod_express();
app.use(mod_express.static(__dirname + '/client'));

require('./server/browse-util.js').init(Y);
require('./server/browse.js').configure(Y, app, argv);
require('./server/browse-groups.js').configure(Y, app, argv);

Y.log('browse on http://' + log_addr + ':' + argv.port + '/browse', 'info', 'manager');
app.listen(argv.port, argv.address);

var admin = require('./server/admin.js').init(Y, mod_express, argv, log_addr);

var hbs = mod_hbs.express3({ partialsDir: __dirname + '/views/partials' });
app.engine('hbs', hbs);
admin.app.engine('hbs', hbs);

if (argv.test)
{
	mod_fs.writeFileSync(argv.test, 'ready', 'utf8');
}

});
