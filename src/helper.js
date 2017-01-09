var path = require('path'),
  fs = require('fs'),
  log4js = require('log4js');

var logger = log4js.getLogger();
var helper = {
  osHomePath: process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'],
  isWin: process.platform == 'win32' ? true : false,
  logger: function () {
    return logger;
  },
  run: function(generateFun) {
    var g = generateFun(resume);
    g.next();

    function resume(value) {
      if (value) {
        logger.error(value);
        return;
      }
      g.next();
    }
  },
  mkdir: function(dirpath, root) {
    var dirs = dirpath.split(path.sep),
      dir = dirs.shift(),
      root = path.join(root || '', dir);

    logger.log(dirs.join(path.sep));
    try {
      fs.mkdirSync(root);
    } catch (e) {
      //dir wasn't made, something went wrong
      logger.log(dirpath);
      logger.log(root);
      if (!fs.statSync(root).isDirectory()) throw new Error(e);
    }
    return !dirs.length || helper.mkdir(dirs.join(path.sep), root);
  },
  mkdirSync: function(path) {
    try {
      fs.mkdirSync(root);
    } catch (e) {}
  },
  /**
   *
   * @param src
   * @param dest
   * @param opts { overwrite, basename }
   * @param cb
   */
  copy: function(src, dest, opts, cb) {
    var basename, read, write;
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }
    opts = Object.assign({
      overwrite: true,
      basename: ''
    }, opts);

    try {
      fs.accessSync(dest, fs.F_OK);
    } catch (e) {
      //util.mkdir(dest)
      fs.mkdirSync(dest);
    }
    basename = opts.basename !== '' ? opts.basename : path.basename(src);

    dest = path.join(dest, basename);

    read = fs.createReadStream(src);
    read.on('error', function(err) {});
    read.on('data', function(data) {});
    read.on('end', function() {});

    write = fs.createWriteStream(dest, {
      flags: opts.overwrite ? 'w' : 'wx'
    });
    write.on('error', function(err) {
      cb && cb(err);
    });
    write.on('close', function() {
      cb && cb();
    })

    read.pipe(write);
  }
}
module.exports = helper;
