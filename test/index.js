import assert from 'assert';
import msg from '../lib/msg';
import nodeQiniuSync from '../lib';
import chai from 'chai';

const expect = chai.expect;
var should = require('chai').should();

describe('sync', function() {
  describe('#config', function() {
    it('should have AK!', function() {
      assert.throws(function() {
        nodeQiniuSync.init({})
      }, Error, msg.NO_AK);
    });

    it('should have SK!', function() {
      assert.throws(function() {
        nodeQiniuSync.init({
          AK: 'aa'
        })
      }, Error, msg.NO_SK);
    });

    it('should OK with AK and SK!', function() {
      nodeQiniuSync.init({
        AK: 'aa',
        SK: 'aa'
      })
    });
  });

  describe('#upload', function() {
    before(function() {
      nodeQiniuSync.init({
        AK: 'PLqCzvSJFXf7IvYq7RJUqP2pKmQTCQx4QonoaixM',
        SK: '6omVezcNzUs4Klf07W4D8Y82MD4lTl5gSRxnhipV',
        bucket: 'public'
      });
    });

    it('should upload fail when file not exist', function(done) {
      this.timeout(5000);
      var fileNotExist = 'not-exist/not-exist.png';
      var key = 'not-exist/not-exist.png';
      nodeQiniuSync.uploadFile({
        file: fileNotExist,
        key: key
      }).once('error', function(error) {
        // TODO: error会触发两次,不知道原因,先用once监听
        // console.log('yyyyyyyyyyyyyyyy', error);
        should.exist(error);
        expect(error).to.have.property('code');
        expect(error).to.have.property('error');

        done();
      }).once('success', function(ret) {
        expect(ret).to.not.have.property('hash');
        done();
        // console.log('xxxxxxxxxxxxxxxxx')
      });
    });
  //
    it('should upload success', function(done) {
      var file = __dirname+'/file-upload/test.png';
      var key = 'file-upload/test.png';
      nodeQiniuSync.uploadFile({
        file: file,
        key: key
      }).on('error', function(error) {
        assert.fail(error.code, null, error.error);
        done();
      }).on('success', function(ret) {
        //console.log(ret)
        expect(ret).to.have.property('hash');
        expect(ret).to.have.property('key');
        expect(ret.key).to.equal(key);
        done();
      });
    });
  });
});
