YUI 3 combo handler built on NodeJS that supports versioning, either for
individual modules or for bundles of modules.  The major advance over other
combo handlers is that you can upload new versions of individual modules or
bundles at any time, but this will not break existing appliations, because
the old versions will still be available.

The name "stockpile" was chosen because it's a synonym of gallery, but
without the glamorous connotation.

[![Build Status](https://secure.travis-ci.org/jafl/YUI-3-Stockpile.png?branch=master)](http://travis-ci.org/jafl/YUI-3-Stockpile)

Code Organization
-----------------

    combo.js        Combo handler
    combo-dev.js    Combo handler for development mode
    manager.js      Admin UI
    cli             Command line tools
    client          Client modules
    server          Server modules
    views           Client web pages
    test            Automated test suite

    This application includes portions of syntaxhighlighter-3.0.83, under
    the MIT license.

Installation
------------

Install nodejs >= 0.8.0 and then install these packages:

    cd YUI-3-Stockpile
    npm install yui@3.6.0 express@2.5.11 request hbs handlebars gzip \
        optimist formidable mkdirp long-stack-traces

On computers that will be used to upload modules to the stockpile, use cpan
to install the required Perl modules:

    sudo cpan JSON

Usage
-----

Start the combo handler:

    cd YUI-3-Stockpile
    node combo.js [--config path_to_json_config_file]
                  [--path path_to_repository] [--port port]
                  [--cache [size_MB] [--cache-log path_to_dump_logs]
                   [--cache-log-interval log_dump_interval_hours]]
                  [--no-cluster] [--debug]

Start the admin UI:

    node manager.js [--config path_to_json_config_file]
                  [--address bind_address] [--port port] [--adminport port]
                  [--path path_to_repository] [--combo combo_handler_url]
                  [--auth type] [--cert https_crt_file] [--key https_key_file]
                  [--admins admin_list] [--mailserver mail_server_hostname]
                  [--title title_to_display]
                  [--debug]

The default config files are:

    combo server:  /usr/share/yui3-stockpile/combo.json
    admin UI:      /usr/share/yui3-stockpile/manager.json

The config files are JSON.  The keys are the names of the command line
parameters.  Command line arguments override the values in the config
files.

The default paths are:

    combo server repository: /var/yui3-stockpile
    combo server cache log:  /var/log/yui3-stockpile

Repository
----------

Versioning individual modules requires this directory structure:

    {namespace}/
        sp-{namespace}-{module-name}/
            {version}/
                sp-{namespace}-{module-name}-min.js

Versioning a module bundle requires this directory structure:

    {bundle-name}/
        {version}/
            {module-name}/
                {module-name}-min.js

The raw and debug versions of the JavaScript are optional.  The assets
directory is also optional.  Stockpile supports images inside the assets
directory, but for optimal performance, all images should be served from a
CDN, e.g., Akamai.

Namespaces avoid naming collisions between modules from different teams.
The top-level namespace directory helps avoid the file system's limit on
the number of subdirectories:  each namespace can have the maximum number
of modules, instead of the limit being global.

Important:  The name of a namespace cannot contain any hyphens.

Version numbers for individual modules must be specified by configuring
each of the patterns in the YUI Loader group with this configFn:

```js
function insertVersion(m)
{
    var s  = /^sp-([^-]+)-([^\/]+)/.exec(m.path);
    if (s && s.length)
    {
        m.path = m.path.replace(s[0],
                    s[1] + '/' + s[2] + '/' + moduleVersion[s[0]]);
    }
}
```

where moduleVersion is a map of module names to version numbers.  Prefixing
all modules with "sp-" makes it easy to define a single YUI Loader group
with this configFn.

The version number for a module bundle must be specified by configuring the
root of the YUI Loader group:

    myGroup:
    {
        root: 'uifwk/14.2.0.0.253/'
    }

The advantage of using a bundle is that when modules are requested,
dependencies within the bundle are automatically resolved and loaded.  This
reduces the number of modules you need to list in your `YUI().use()`
statement and also reduces the number of requests made by YUI Loader.

The disadvantage of using a bundle is that all the modules must be
published simultaneously, inside the {bundle-name}/{version}/ directory.

Examples of using modules and bundles can be found in test/*.js

Deployment
----------

You should publishing only your minified code to your public deployment of
YUI 3 Stockpile, so you can keep your commented code private.

Uploading
---------

The upload.pl script (in the cli directory) lets you upload either a module
or a bundle:

    upload.pl manager_url (namespace module | bundle) version build_directory

This script assumes that you are using YUI Builder.  If you upload a
module, build_directory must contain a single module.  If you upload a
bundle, build_directory must contain all the modules in the bundle.  (You
can serve your own copy of YUI 3 by uploading it as a bundle.)

The script will ask you for the required information, e.g., password,
descriptions, or release notes.

Run upload.pl without arguments to get additional usage information.

Authentication
--------------

All users must authenticate themselves when using the command line tools.
The authentication method is configured via `--auth`.  The built-in
authentication method is called "localhost".  This requires that
`--address` is `127.0.0.1` so users authenticate by logging into the
machine.

You can build your own authentication plugin, install it via npm, and then
configure `--auth` to be the name of your module.  The API is demonstrated
in `./server/auth/testauth.js`.

Any authentication method that requires a password should only be run over
https.  Simply configure `--cert` and `--key`, and `--adminport` will
automatically use https instead of http.

To make it easy to contact the owner of a module, all user names are email
addresses.  If all users are on the same mail server, then configure
`--mailserver` so users only have to type their username when invoking the
command line tools.

Authorization
-------------

Authorization is based on user groups.  First, configure `--admins` with
the list of users who have access to all groups.  All other users are only
allowed to access groups to which they belong.  If a user belongs to a
group, he/she can add other users to that group.  Adding `*` to a group
allows all users to access that group.  Any user can create a new group.

Each namespace or bundle is managed by a single group.  The group name is
displayed when browsing.

The cli script manage-group.pl lets you create groups and add or remove
users from a group.  Run the script without arguments to get usage
information.

Development Mode
----------------

To enable rapid iteration during development, configure an instance of
combo-dev.js to load your local files for the modules you are currently
working on.  All other modules will be requested from the fallback combo
handler, usually an instance of combo.js.

combo-dev.js requires a config file, because you typically run a separate
instance for each project that you are working on:

    cd YUI-3-Stockpile
    node combo-dev.js --config path_to_json_config_file
                      [--port port] [--debug]

Command line arguments override the values in the config files.

A typical config file looks like this:

```js
{
    "port":8080,

    "combo":"http://my-nightly-build-combo-server/combo?",

    "root":"/Users/johndoe/yui3-stockpile/dev",
    "code":
    {
        "sp-test-blah.js": "sp-test-blah/sp-test-blah-debug.js",
        "sp-test-foo.css": "sp-test-foo/skin/sam/sp-test-foo.css"
    },
    "image":
    {
        "warn.png": "sp-test-foo/sam/warn.png"
    }
}
```

Requests for the JavaScript for module sp-test-blah or the CSS for module
sp-test-foo or an image named warn.png will return the local files.  All
other requests will be routed to the combo handler.

Caching
-------

Stockpile only caches the results for minified requests.  Raw and debug
versions are typically requested only in debug mode, which is rare.
Unfortunately, not all requests will accept compressed responses, so the
cache must store both raw and gzipped versions.

The cache key is the sorted list of requested files.  The cache itself is a
map of keys to `{ response data, reference to MRU item }`.  The MRU items
(each of which stores a key) are stored in a doubly linked list to allow
easy re-ordering and dropping of oldest items.

The cache is memory-limited, so when an item is added, the total size is
updated, and then items are removed from the end of the MRU linked list
until the size drops back within the prescribed limit.

For tuning, the cache logs the following data:  total # of hits and a map
of cache keys to `{ # of puts, # of gets, response size }`.  This can be
plotted on a graph of log(response size) vs % of total hits.  Keys with
high percentages indicate thrashing.  The response size helps determine how
much the cache should be expanded.

Images are not cached because these should be uploaded separately to a CDN.
Images are supported only to simplify the development process.

Leveraging a CDN
----------------

In addition to the standard format (`/combo?a&b&c`), Stockpile also accepts a
custom format to allow caching by a CDN like CloudFlare:  `/combo~a~b~c`

To use this format, configure the group for YUI Loader as follows:

    comboBase: 'http://host:port/combo~',
    comboSep:  '~'

Clustering
----------

Clustering is turned on by default in the combo handler.  To turn it off,
pass `--no-cluster` as a command-line argument or add `"cluster":false` in
your configuration file.

Dependency Optimization
-----------------------

When a bundle is uploaded, the "requires" configuration for each module is
updated to include transitive dependencies within the bundle.  This ensures
that YUI Loader will only have to make two requests to get all the required
modules within the bundle.

Unit Tests
----------

To run the test suite, first search test/config/* for "vagrant" and add
your username to the lists.  Then execute `./test/main`.

Why Perl?
---------

Perl was chosen for the command line tools because it is available
everywhere.  We did not want to require installation of NodeJS on machines
which only need to deploy to Stockpile.

Why gzip instead of NodeJS zlib?
--------------------------------

The gzip module spawns a separate process, so it can run on a separate core.
