#!/usr/bin/env node

/**
 * @Date:   2017-01-06T15:33:10+08:00
* @Last modified time: 2017-01-06T17:03:26+08:00
 */
var program = require('commander');
var pkgConfig = require('../package.json');
program.version(pkgConfig.version)
  .command('setup', 'Install maven/tomcat dependencies.')
  .command('deploy', 'Compile package project, Deploy the war to tomcat dir.')
  .command('server', 'Start tomcat server.')
  .parse(process.argv);
