var path = require('path'),
  fs = require('fs'),
  crypto = require('crypto'),
  Download = require('download'),
  downloadStatus = require('download-status'),
  Decompress = require('decompress'),
  helper = require('././helper.js'),
  config = require('./config.js');
var logger = helper.logger();
var exports = module.exports = {};
function downloadFile(url, destPath, fileName, callback) {
  if (fs.existsSync(path.join(destPath, fileName))) {
    logger.info(fileName + ' is exits ');
    setTimeout(function() {
      callback();
    }, 1)
  } else {
    logger.info('Download ' + fileName + ' ...');
    new Download({mode: '755', extract: false, strip: 1}).get(url).dest(destPath).use(downloadStatus()).run(function(error, files) {
      if (error) {
        logger.error(error);
        callback && callback(new Error('error: download ' + fileName + ' failed!!!'));
      } else {
        logger.info('Download ' + fileName + ' success!');
        callback && callback();
      }
    });
  }
}
function checkFileHash(filePath, fileName, md5, callback) {
  var md5sum = crypto.createHash('md5');
  logger.info('CheckHash of the file: ' + fileName);
  var s = fs.ReadStream(path.join(filePath, fileName));
  s.on('data', function(d) {
    md5sum.update(d);
  });
  s.on('end', function() {
    var d = md5sum.digest('hex');
    if (md5 === d) {
      callback && callback()
      logger.info(fileName + ' is correct.')
    } else {
      fs.unlinkSync(path.join(filePath, fileName));
      callback && callback(new Error(fileName + ' md5 is incorrect, please exec "webss setup" to download again'))
    }
  });
}
function decompressMaven(callback) {
  logger.info('Decompress ' + config.mvnName + ' ...')
  new Decompress({mode: '755'}).src(path.join(config.homePath, config.mvnName)).dest(config.mvnHome).use(Decompress.zip({strip: 1})).run(function(error) {
    if (error) {
      logger.error(error)
      logger.error('Decompress ' + config.mvnName + ' failed!!!')
      callback && callback(new Error('error: decompress ' + config.mvnName + ' failed!!!'));
    } else {
      logger.info('Decompress ' + config.mvnName + ' succeed')
      callback && callback();
    }
  });
}
exports.download = function(callback) {
  function run(generateFun) {
    var g = generateFun(resume);
    g.next();
    function resume(value) {
      if (value) {
        logger.error(value);
        return;
      }
      g.next();
    }
  }
  run(function * G(resume) {
    yield downloadFile(config.tomcatUrl, config.homePath, config.tomcatName, resume);
    yield downloadFile(config.mvnUrl, config.homePath, config.mvnName, resume);
    yield checkFileHash(config.homePath, config.tomcatName, config.tomcatMd5, resume);
    yield checkFileHash(config.homePath, config.mvnName, config.mvnMd5, resume);
    yield decompressMaven(resume);
    callback && callback();
  });
}
if (require.main === module) {
  exports.download()
}
