const qiniu = require('qiniu');
const fs = require('fs');
const Promise = require('bluebird');

var defaultConfig = {};

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

export default {
  init: init,
  uploadFile: uploadFile
};
