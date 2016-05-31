const events = require('events');
const qiniu = require('qiniu');
const fs = require("fs");
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

function p() {

}

function uploadFile(opt) {
  var bucket = opt.bucket || defaultConfig.bucket;
  var file = opt.file;
  var key = opt.key;
  return new Promise(function (resove, reject) {

    if (!bucket) {
      reject({code: 99, error: '请指定bucket'});
      // eventEmitter.emit('error', {code: 99, error: '请指定bucket'});
      return ;// eventEmitter;
    }
    if (!file) {
      // eventEmitter.emit('error', {code: 99, error: '请指定上传文件'});
      reject({code: 99, error: '请指定上传文件'});
      // return eventEmitter;
      return;
    }
    // 上传key和必须指定
    if (!key) {
      reject({code: 99, error: '请指定上传路径'});
      return;
      // eventEmitter.emit('error', {code: 99, error: '请指定上传路径'});
      // return eventEmitter;
    }

    var putPolicy = new qiniu.rs.PutPolicy(bucket + ':' + key);
    var token = putPolicy.token();
    var extra = new qiniu.io.PutExtra();


    if (!fs.existsSync(file)) {
      reject({code: 99, error: '文件不存在'});
      // eventEmitter.emit('error1', {code: 99, error: '文件不存在'});
      // console.log('xxxxxxxxxxxxxxxxxxxxxxxxxx',file);
      // return eventEmitter;
      return;
    }

    qiniu.io.putFile(token, key, file, extra, function (err, ret) {
      if (err) {
        // console.log('YYYYYYYYYYYYYYYYYYYY', err);
        //eventEmitter.emit('error', err);
        // 上传失败， 处理返回代码
        reject(err);
      } else {
        // eventEmitter.emit('success', ret);
        // 上传成功， 处理返回值
        // console.log(ret.hash, ret.key);
        resove(ret)
      }
      //eventEmitter.emit('complete');
    });
    //return eventEmitter;
  });

}

export default {
  init: init,
  uploadFile: uploadFile
};
