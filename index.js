/**
* @Date:   2017-01-06T15:33:10+08:00
* @Last modified time: 2017-01-19T15:08:33+08:00
*/
var fs = require('fs'),
  path = require('path'),
  chokidar = require('chokidar'),
  del = require('del'),
  cp = require('child_process'),
  WebSocketServer = require('websocket').server,
  http = require('http'),
  minimatch = require("minimatch");
var helper = require('./src/helper.js'),
  config = require('./src/config.js'),
  downloadZip = require('./src/download-zip.js'),
  deployWar = require('./src/deploy-war.js'),
  transfer = require('./src/proxy.js');

var logger = helper.logger();

var arg,
  wsServerObj,
  startTomcatExec = helper.isWin
    ? 'startup.bat'
    : 'startup.sh',
  shutdownTomcatExec = helper.isWin
    ? 'shutdown.bat'
    : 'shutdown.sh';

var storeData = {}; // 子进程之间共享数据

function checkEnv(callback) {
  cp.exec('java -version', {
    cwd: config.currentPath
  }, function(error, stdout, stderr) {
    if (error || process.env['JAVA_HOME'] === undefined) {
      logger.info('Please install Java SDK and set JAVA_HOME environment variable !!!')
    } else {
      callback && callback();
    }
  });
}
function setup() {
  checkEnv(function () {
    downloadZip.download(function() {
      logger.info('Setup ready!')
      logger.info('Please modify your webss.json file in your project dir, then exec "yzb deploy."')
    });
  });
}
function deploy(options) {
  checkEnv(function () {
    deployWar.deploy(options, function() {
      logger.info('Deploy success!')
    });
  });
}
function server() {
  checkEnv(function () {
    middlewareHandle(function() {
      synchFiles();
      transfer.transfer();
      wsServerObj = new wsServer();
    })
    shutdownTomcat(startupTomcat);
  });
}
function wsServer() {
  this.server = http.createServer(function(request, response) {
    // process HTTP request. Since we're writing just WebSockets server
    // we don't have to implement anything.
  });
  this.server.listen(config.wsServerPort, function() {
    logger.info('Web server listen on http://127.0.0.1:' + config.port);
  });
  // create the server
  this.wsServer = new WebSocketServer({httpServer: this.server});
  this.connection = undefined;
  var self = this
  // WebSocket server
  this.wsServer.on('request', function(request) {
    self.connection = request.accept(null, request.origin);
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    self.connection.on('message', function(message) {
      if (message.type === 'utf8') {
        // process WebSocket message
      }
    });
    self.connection.on('close', function(connection) {
      // close user connection
    });
  });
  this.sendMessage = function() {
    if (self && self.connection && self.connection.sendUTF) {
      self.connection.sendUTF('reload');
    }
  }
}
function middlewareHandle(callback, filePath) {
  // 中间件
  if (config.middleware && config.middleware.length > 0) {
    var funs = [];
    config.middleware.map(function(obj) {
      var isCallms = false;
      obj.scope = [].concat(obj.scope);
      isCallms = obj.scope.some(function(s) {
        if (filePath === undefined)
          return true; // 程序启动时，首次执行
        return minimatch(filePath, s);
      })
      if (isCallms) {
        funs.push(function(resume) {
          logger.info(path.resolve(obj.bin))
          var n = cp.fork(path.resolve(obj.bin), filePath === undefined
            ? []
            : [
              "-f", filePath
            ], {
            "cwd": path.dirname(path.resolve(obj.bin))
          })
          var isError = false
          var msg = []
          n.on('message', function(m) {
            isError = m.type === 'error'
            if (m.type === 'share') {
              storeData = m.data
            }
          })
          n.on('exit', function() {
            if (isError) {
              resume(new Error(msg.join('')))
            } else {
              resume()
            }
          })
          n.send({type: "start", data: storeData})
        })
      }
    })
    helper.run(function * G(resume) {
      for (var i = 0, len = funs.length; i < len; i++) {
        yield funs[i](resume)
      }
      callback && callback()
    })
  } else {
    callback && callback()
  }
}
function synchFiles() {
  chokidar.watch(config.sourceDir, {
    ignored: /node_modules\\|\.idea|\.plugins|\.git|\.jar|\.xml|\.class/,
    ignoreInitial: true,
    alwaysStat: true,
    usePolling: true,
    interval: 1000,
    //binaryInterval: 5000,
    //awaitWriteFinish: {
    //    stabilityThreshold: 5000,
    //    pollInterval: 5000
    //}
  }).on('all', function(event, filePath) {
    var filePathArray = filePath.split(helper.isWin
        ? '\\'
        : '/'),
      fileName = filePathArray[filePathArray.length - 1],
      distPath = filePath.replace(config.sourceDir, config.targetDir),
      distDictionary = filePath.replace(config.sourceDir, config.targetDir).replace(fileName, '');
    middlewareHandle(function() {}, filePath)
    if (event === 'unlink') {
      del([distPath]).then(function(paths) {
        logger.info('Delete file -> :\n', distPath);
      });
    } else {
      fs.unlink(distPath, function() {
        //cpy([filePath], distDictionary, function (err) {
        try {
          if (fs.lstatSync(filePath).isDirectory())
            return
        } catch (ex) {}
        helper.copy(filePath, distDictionary, function(err) {
          logger.info('Update file -> \n' + distPath);
          if (config.pageAutoReload) {
            wsServerObj.sendMessage();
          }
        });
      });
    }
  });
}
function shutdownTomcat(callback) {
  logger.info('Shutdown tomcat ...');
  cp.exec(path.join(config.tomcatHome, '/bin/', shutdownTomcatExec), {
    cwd: path.join(config.tomcatHome, '/bin')
  }, function(err, stdout, stderr) {
    callback && callback();
  });
}
function startupTomcat(callback) {
  logger.info('Start tomcat ...');
  fs.stat(path.join(config.tomcatHome, '/bin/', startTomcatExec), function(err) {
    if (err) {
      logger.error('Please re-exec "webss deploy"  !!!')
      logger.info(err)
    } else {
      cp.exec(path.join(config.tomcatHome, '/bin/', startTomcatExec), {
        cwd: path.join(config.tomcatHome, '/bin')
      }, function(err, stdout, stderr) {
        callback && callback();
      });
    }
  })
}

exports.setup = setup;
exports.deploy = deploy;
exports.server = server;
