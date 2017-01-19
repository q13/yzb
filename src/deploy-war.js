/**
* @Date:   2016-06-13T11:07:46+08:00
* @Last modified time: 2017-01-19T16:11:56+08:00
*/
var path = require('path'),
  fs = require('fs'),
  Decompress = require('decompress'),
  helper = require('./helper.js'),
  cp = require('child_process'),
  del = require('del'),
  config = require('./config.js');

var logger = helper.logger();

var exports = module.exports = {};
var packageExec = path.join(config.mvnHome, '/bin/mvn'),
  startTomcatExec = helper.isWin
    ? 'startup.bat'
    : 'startup.sh',
  shutdownTomcatExec = helper.isWin
    ? 'shutdown.bat'
    : 'shutdown.sh';
function deleteFolderRecursive(path) {
  logger.info(path.replace(/\\/g, '/') + '/**')
  del.sync([path.replace(/\\/g, '/') + '/**'], {force: true})
}
function updateTomcatPort() {
  var serverConfig = fs.readFileSync(path.join(config.tomcatHome, '/conf/server.xml')).toString();
  var httpPort = config.port;
  var ajpPort = 8009 + (parseInt(config.port) - 8080);
  var shutdownPort = 8005 + (parseInt(config.port) - 8080);
  serverConfig = serverConfig.replace('port="8080"', 'port="' + httpPort + '" URIEncoding="UTF-8"');
  serverConfig = serverConfig.replace('port="8009"', 'port="' + ajpPort + '"');
  serverConfig = serverConfig.replace('port="8005"', 'port="' + shutdownPort + '"');
  fs.writeFileSync(path.join(config.tomcatHome, '/conf/server.xml'), serverConfig);
}
function shutdownTomcat(callback) {
  logger.info('Shutdown tomcat ...');
  cp.exec(shutdownTomcatExec, {
    cwd: path.join(config.tomcatHome, '/bin')
  }, function(err, stdout, stderr) {
    callback && callback();
  });
}
function execMaven(mvnExec, arg, exts, callback) {
  logger.info('mvn ' + arg + ' ...')
  var args = [];
  exts = exts || [];
  if (helper.isWin) {
    args.unshift(mvnExec);
    args.unshift('/c'),
    args.unshift('/s');
    //args = exts.concat(args);
    args.push(arg);
    args = args.concat(exts);
    args.push('-Dmaven.test.skip=true');
    mvnExec = process.env.COMSPEC || 'cmd.exe';
  } else {
    //args = exts.concat(args);
    args.push(arg);
    args = args.concat(exts);
  }
  var mvnPackage = cp.spawn(mvnExec, args, {
    cwd: config.currentPath,
    env: process.env
  });
  mvnPackage.stdout.on('data', function(data) {
    logger.info(data.toString());
  });
  mvnPackage.stderr.on('data', function(data) {
    logger.info('Stderr: ' + data);
  });
  mvnPackage.on('exit', function(code) {
    if (arg[0] === 'clean') {
      callback && callback()
      return
    }
    var sourceWar;
    fs.readdir(config.sourceWarDir, function(err, files) {
      if (err) {
        logger.error('.war is not found!!!');
      } else {
        var warFile = files.filter(function(name) {
          return name.match(/.*\.war$/)
        })
        if (warFile.length === 1) {
          sourceWar = warFile[0];
          //cpy([path.join(config.sourceWarDir, sourceWar)], path.join(config.tomcatHome, '/webapps'), function (err) {
          // 去掉url上的contextName http://stackoverflow.com/questions/715506/tomcat-6-how-to-change-the-root-application
          helper.copy(path.join(config.sourceWarDir, sourceWar), path.join(config.tomcatHome, '/webapps'), {
            basename: 'ROOT.war'
          }, function(err) {
            logger.info('Deploy : \n' + sourceWar + ' success.')
            logger.info('    ' + path.join(config.tomcatHome, '/webapps'))
            callback && callback();
          });
        } else {
          logger.error('.war is not found!!!');
        }
      }
    })
  });
}
exports.deploy = function(options, callback) {
  if (!fs.existsSync(config.homePath + '/' + config.tomcatName) || !fs.existsSync(config.homePath + '/' + config.mvnName)) {
    logger.info('Please exec webss setup first !!!');
    callback && callback('error');
    return;
  }
  let commandArgs = [];
  if (options.updateSnapshots) {
    commandArgs.push('-U');
  }
  logger.info('Svn update ...');
  cp.exec('Svn update', {
    cwd: config.currentPath
  }, function(err, stdout, stderr) {
    logger.info(stdout);
    //log('deploy ' + config.contextName + '.war to ' + 'server/ '+port);
    //if (fs.existsSync(removeContextPath + '.war')) {
    //    fs.unlinkSync(removeContextPath + '.war');
    //}
    // TODO
    shutdownTomcat(function() {
      //删除tomcat解压目录
      deleteFolderRecursive(config.tomcatHome)
      logger.info('Decompress ' + config.tomcatName + ' ...');
      new Decompress({mode: '777'}).src(path.join(config.homePath, config.tomcatName)).dest(config.tomcatHome).use(Decompress.zip({strip: 1})).run(function(error) {
        fs.readdirSync(path.join(config.tomcatHome, '/bin')).map(function(file) {
          fs.chmodSync(path.join(config.tomcatHome, '/bin/', file), '777')
          //logger.info(arguments)
        })
        //fs.chmodSync(config.tomcatHome, '+x');
        var removeContextPath = path.join(config.tomcatHome, '/webapps/');
        deleteFolderRecursive(removeContextPath);
        if (error) {
          logger.error('Decompress ' + config.tomcatName + ' failed !!!')
        } else {
          logger.info('Decompress ' + config.tomcatName + ' succeed')
          updateTomcatPort();
          execMaven(packageExec, ['clean'], commandArgs, function() {
            execMaven(packageExec, ['package'], commandArgs, function() {
              callback && callback()
            })
          })
        }
      })
    })
  });
}
if (require.main === module) {
  exports.deploy()
}
