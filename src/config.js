var fs = require('fs'),
  path = require('path'),
  helper = require('./helper.js');
var exports = module.exports = {};
var config = {
  "webPath": "/",
  "port": "8888",
  "pageAutoReload": true,
  "proxies": [
    {
      "remoteUrl": "http://127.0.0.1:8888/",
      "localPort": "5050",
      "desc": "Running local web service proxy."
    }
  ],
  "middleware": []
};
if (fs.existsSync('./webss.json')) {
  config = JSON.parse(fs.readFileSync('./webss.json'));
} else {
  fs.writeFileSync('./webss.json', JSON.stringify(config));
}
var currentPath = path.resolve('./');
var tomcatSource = {
  '6': {
    name: 'apache-tomcat-6.0.44.zip',
    url: 'https://archive.apache.org/dist/tomcat/tomcat-6/v6.0.44/bin/apache-tomcat-6.0.44.zip',
    md5: '409e93f383ec476cde4c9b87f2427dbf'
  },
  '7': {
    name: 'apache-tomcat-7.0.73.zip',
    url: 'https://archive.apache.org/dist/tomcat/tomcat-7/v7.0.73/bin/apache-tomcat-7.0.73.zip',
    md5: '60bf0985c436819acfbb93efceea601d'
  }
}
var mvnSource = {
  '3': {
    name: 'apache-maven-3.3.3-bin.zip',
    url: 'http://ftp.jaist.ac.jp/pub/apache/maven/maven-3/3.3.3/binaries/apache-maven-3.3.3-bin.zip',
    md5: '6e5da03a3324f616493a0fd09d6383fc'
  }
}
exports.port = config.port;
exports.pageAutoReload = config.pageAutoReload === false
  ? false
  : true;
exports.tomcatUrl = config.tomcatUrl || tomcatSource['7'].url;
exports.tomcatName = config.tomcatName || tomcatSource['7'].name;
exports.tomcatMd5 = config.tomcatMd5 || tomcatSource['7'].md5;
exports.mvnUrl = config.mvnUrl || mvnSource[3].url;
exports.mvnName = config.mvnName || mvnSource[3].name;
exports.mvnMd5 = config.mvnMd5 || mvnSource[3].md5;
exports.contextName = 'ROOT'; // 不依赖pom.xml 中的finalName了
exports.homePath = path.join(helper.osHomePath, '/.node_mvn_javaweb/');
exports.sourceDir = path.join(currentPath, config.webPath, '/src/main/webapp');
exports.tomcatHome = path.join(exports.homePath, '/server/' + exports.port);
exports.targetDir = path.join(exports.tomcatHome, '/webapps/' + exports.contextName);
exports.sourceWarDir = path.join(currentPath + config.webPath, '/target/');
exports.mvnHome = path.join(exports.homePath, '/maven');
exports.proxies = config.proxies;
exports.webPath = path.join(currentPath, config.webPath)
exports.currentPath = path.resolve('./');
exports.middleware = config.middleware || [];
exports.wsServerPort = Math.floor(Math.random() * 40000) + 10000; // websocket服务器地址，随机生成小于65535（TCP/IP协议规则）
