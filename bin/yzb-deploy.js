/**
* @Date:   2017-01-06T16:59:57+08:00
* @Last modified time: 2017-01-19T15:07:42+08:00
*/
var program = require('commander');
var pkgConfig = require('../package.json');
var main = require('../index.js');
program
  .version(pkgConfig.version)
  .option('-U, --update-snapshots', '强制更新releases、snapshots类型的插件或依赖库(否则maven一天只会更新一次snapshot依赖)')
  .parse(process.argv);
main.deploy({
  updateSnapshots: program.updateSnapshots
});
