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

  var files = fs.readdirSync(dir);
  files.forEach(function (file) {
    var fileName = path.join(String(dir), String(file));
    console.log('sync', fileName);
    var stat = fs.lstatSync(fileName);
    if (stat.isDirectory() === true) {
      sync(path.join(String(dir), String(file)));
    } else {
      var key = path.join(keyPrefix, file).replace(/\\/g, '/').replace(/^\//g, '');

      // if (isIgnoringFiles) {
      uploadIfNeeded({
        key: key,
        file: fileName,
        overwrite: overwrite
      });
        // check_upload(fname, name);
      // } else {
      //   // ignoring_log && log.i(name + ' ignoring.'.yellow);
      // }
    }
  });
}

export default {
  init: init,
  uploadFile: uploadIfNeeded,
  removeFile: removeInNeeded,
  stat: stat,
  sync: sync
};
