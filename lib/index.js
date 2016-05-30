const events = require('events');
const qiniu = require('qiniu');

var log = {
  i: function (msg) {
    console.log(msg);
  }
};

var defaultConfig = {};

function init(opt) {
  if(! opt.AK){
    throw new Error('请配置AK,详见:https://portal.qiniu.com/user/key');
  }
  if(! opt.SK){
    throw new Error('请配置SK,详见:https://portal.qiniu.com/user/key');
  }
  qiniu.conf.ACCESS_KEY = opt.AK;
  qiniu.conf.SECRET_KEY = opt.SK;
  defaultConfig = {
    bucket: opt.bucket || false
  }
}

function uploadFile(opt) {
  var bucket = opt.bucket || defaultConfig.bucket;
  var file = opt.file;
  var key = opt.key;
  var eventEmitter = new events.EventEmitter();

  if(! bucket){
    eventEmitter.emit('error', {code: 99, error:'请指定bucket'});
    return eventEmitter;
    //throw new Error('请指定bucket');
  }
  if(! file){
    eventEmitter.emit('error', {code: 99, error:'请指定上传文件'});
    return eventEmitter;
    //throw new Error('请指定上传文件');
  }
  // 上传key和必须指定
  if(! key){
    eventEmitter.emit('error', {code: 99, error:'请指定上传路径'});
    return eventEmitter;
    //throw new Error('请指定上传路径');
  }

  var putPolicy = new qiniu.rs.PutPolicy(bucket+":"+key);
  var token = putPolicy.token();
  var extra = new qiniu.io.PutExtra();

  qiniu.io.putFile(token, key, file, extra, function(err, ret) {
    if(!err) {
      eventEmitter.emit('success', ret);
      // 上传成功， 处理返回值
      console.log(ret.hash, ret.key, ret.persistentId);
    } else {
      eventEmitter.emit('error', err);
      // 上传失败， 处理返回代码
      //console.log(err);
    }
    eventEmitter.emit('complete');
  });
  return eventEmitter;
}

export default {
  init: init,
  uploadFile: uploadFile
};
