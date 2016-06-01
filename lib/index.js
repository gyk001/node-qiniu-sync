const qiniu = require('qiniu');
const fs = require('fs');
const path = require('path');
const getEtag = require('./qetag');
const Promise = require('bluebird');
// const chokidar = require('chokidar');
// const minimatch = require('minimatch');

var defaultConfig = {};

// 构建bucketmanager对象
const client = new qiniu.rs.Client();

/**
 *
 * @param {Object} opt 配置对象
 * @param {String} opt.AK
 * @param {String} opt.SK
 * @param {String} opt.bucket 默认bucket
 */
function init(opt) {
  if (!opt.AK) {
    throw new Error('请配置AK,详见:https://portal.qiniu.com/user/key');
  }
  if (!opt.SK) {
    throw new Error('请配置SK,详见:https://portal.qiniu.com/user/key');
  }
  qiniu.conf.ACCESS_KEY = opt.AK;
  qiniu.conf.SECRET_KEY = opt.SK;
  defaultConfig = {
    bucket: opt.bucket || false
  };
}

/**
 * 删除文件
 * @param {Object} opt 配置对象
 * @param {String} opt.key 需要删除的七牛key
 * @param {String} opt.bucket 七牛空间名,不传则使用全局配置的
 * @returns {Promise.<{{key: String}}>} 返回删除的key
 */
function removeInNeeded(opt) {
  var bucket = opt.bucket || defaultConfig.bucket;
  var key = opt.key;
  return new Promise(function (resolve) {
    // 删除资源
    client.remove(bucket, key, function (err, reject) {
      if (err) {
        if (err.code === 612) {
          console.log('远端文件不存在,无需删除');
          resolve({key: key});
        } else {
          console.log('远端文件存在,删除失败', err.error);
          reject(err);
        }
      } else {
        console.log('远端文件存在,已删除');
        resolve({key: key});
      }
    });
  });
}

function stat(opt) {
  var bucket = opt.bucket || defaultConfig.bucket;
  var key = opt.key;
  return new Promise(function (resolve, reject) {
    client.stat(bucket, key, function (err, ret) {
      if (err) {
        reject(err);
      } else {
        resolve(ret);
      }
    });
  });
}

/**
 * 必要时上传文件,
 * 满足如下条件会上传:
 *  1. 七牛上没有对应文件
 *  2. 七牛上有对应文件,但是hash值和本地文件不一致,且设置了强制覆写选项
 * @param {Object} opt 配置对象
 * @param {String} opt.file 需要上传的文件名
 * @param {String} opt.key 上传到七牛的key
 * @param {String} opt.overwrite 是否覆盖已经存在的,false则不会覆盖已有文件
 * @param {String} opt.bucket 七牛空间名,不传则使用全局配置的
 * @returns {Promise.<Array>} 返回扫描到的文件列表
 */
function uploadIfNeeded(opt) {
  var bucket = opt.bucket || defaultConfig.bucket;
  var file = opt.file;
  var key = opt.key;
  var overwrite = opt.overwrite || false;

  return new Promise(function (resolve, reject) {
    if (!fs.existsSync(file)) {
      reject({code: 99, error: '文件不存在'});
      return;
    }

    // 获取文件信息
    client.stat(bucket, key, function (err, ret) {
      if (err) {
        // 有错误
        if (err.code === 612) {
          console.log('远端不存在文件');
          // 文件不存在
          resolve(uploadFile(opt));
        } else {
          console.log('检测远端文件状态失败');
          // 其他错误
          reject(err);
          return;
        }
      } else {
        // 无错误
        getEtag(file, function (hash) {
          if (hash === ret.hash) {
            console.log('远端存在文件且hash一致');
            resolve({hash: hash, key: key});
          } else if (overwrite) {
            console.log('远端存在文件,覆盖');
            resolve(uploadFile(opt));
          } else {
            console.log('远端存在文件,不覆盖');
            resolve({hash: ret.hash, key: key});
          }
        });
      }
    });
  });
}

function uploadFile(opt) {
  var bucket = opt.bucket || defaultConfig.bucket;
  var file = opt.file;
  var key = opt.key;

  return new Promise(function (resove, reject) {
    if (!bucket) {
      reject({code: 99, error: '请指定bucket'});
      return;
    }

    if (!file) {
      reject({code: 99, error: '请指定上传文件'});
      return;
    }
    // 上传key和必须指定
    if (!key) {
      reject({code: 99, error: '请指定上传路径'});
      return;
    }

    var putPolicy = new qiniu.rs.PutPolicy(bucket + ':' + key);
    var token = putPolicy.token();
    var extra = new qiniu.io.PutExtra();

    if (!fs.existsSync(file)) {
      reject({code: 99, error: '文件不存在'});
      return;
    }

    qiniu.io.putFile(token, key, file, extra, function (err, ret) {
      if (err) {
        reject(err);
      } else {
        resove(ret);
      }
    });
  });
}

/**
 * 忽略指定文件
 * @param  {String}  path 文件路径
 * @return {Boolean}
 */
// function isIgnoringFiles(path){
//   if (!ignoring_files.length) return false;
//
//   for (var i = 0, l = ignoring_files.length; i < l; i++){
//     if (minimatch(path, ignoring_files[i])) return true;
//   }
//
//   return false;
// }

function sync(opt) {
  var dir = opt.dir || '';
  var keyPrefix = opt.prefix || '';
  var overwrite = opt.overwrite || false;

  scan({
    dir: dir
  }).then(function (files) {
    files.forEach(function (file) {
      var uploadOpt = {
        file: file,
        key: keyPrefix,
        overwrite: overwrite
      };
      uploadIfNeeded(uploadOpt);
    });
  });
  //
  // var files =  fs.readdirSync(dir);
  // files.forEach(function (file) {
  //   var fileName = path.join(String(dir), String(file));
  //   console.log('sync', fileName);
  //   var stat = fs.lstatSync(fileName);
  //   if (stat.isDirectory() === true) {
  //     sync(path.join(String(dir), String(file)));
  //   } else {
  //     var key = path.join(keyPrefix, file).replace(/\\/g, '/').replace(/^\//g, '');
  //
  //     // if (isIgnoringFiles) {
  //     uploadIfNeeded({
  //       key: key,
  //       file: fileName,
  //       overwrite: overwrite
  //     });
  //       // check_upload(fname, name);
  //     // } else {
  //     //   // ignoring_log && log.i(name + ' ignoring.'.yellow);
  //     // }
  //   }
  // });
}

/**
 *
 * @param {Object} opt 扫描配置对象
 * @param {String} opt.dir 需要扫描的目录
 * @param {String} opt.base 返回结果的相对路径
 * @returns {Promise.<Array>} 返回扫描到的文件列表
 */
function scan(opt) {
  // 待扫描目录
  var dir = path.resolve(opt.dir || '');
  // 输出结果基准目录,否则递归调用会只返回文件名
  var base = path.resolve(opt.base || dir);
  return new Promise(function (resolve, reject) {
    fs.readdir(dir, function (err, files) {
      if (err) {
        reject(err);
      } else {
        var p = [];
        files.forEach(function (file) {
          var fullFileName = path.resolve(dir, file);
          var stat = fs.lstatSync(fullFileName);
          if (stat.isDirectory() === true) {
            // 递归调用scan
            var nopt = Object.assign({}, opt, {dir: fullFileName, base: base});
            p.push(scan(nopt));
          } else {
            p.push(Promise.resolve(path.relative(base, fullFileName)));
          }
        });
        resolve(Promise.all(p));
      }
    });
  }).then(function (files) {
    // 扁平化,否则是数组套数组
    return [].concat.apply([], files);
  });
}

export default {
  init: init,
  uploadFile: uploadIfNeeded,
  removeFile: removeInNeeded,
  stat: stat,
  sync: sync,
  scan: scan
};
