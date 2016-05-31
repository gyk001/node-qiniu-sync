import assert from 'assert';
import msg from '../lib/msg';
import nodeQiniuSync from '../lib';
import chai from 'chai';
const getEtag = require('../lib/qetag');

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

    beforeEach(function(done) {
      var key = 'file-upload/test.png';
      nodeQiniuSync.removeFile({key, key})
        .then(function (data) {
          done();
        },function (err) {
          done();
        });
    });

    it('should upload fail when file not exist', function(done) {
      this.timeout(5000);
      var fileNotExist = 'not-exist/not-exist.png';
      var key = 'not-exist/not-exist.png';
      nodeQiniuSync.uploadFile({
        file: fileNotExist,
        key: key
      }).then(function (data) {
        expect(data).to.not.have.property('hash');
        done();
      }, function(error) {
        should.exist(error);
        expect(error).to.have.property('code');
        expect(error).to.have.property('error');
        expect(error.error).to.equal('文件不存在');
        done();
      });
    });

    it('should upload success: remote file not exist ', function(done) {

      var file = __dirname+'/file-upload/test.png';
      var key = 'file-upload/test.png';
      getEtag(file, function (fileHash) {
        nodeQiniuSync.uploadFile({
          file: file,
          key: key
        }).then(function (data) {
          expect(data).to.have.property('key').to.equal(key);
          expect(data).to.have.property('hash').to.equal(fileHash);
          done();
        }, function (error) {
          assert.fail(error.code, null, error.error);
          done();
        });
      });
    });

    it('should upload success: not overwrite remote file', function(done) {
      // this.timeout(10000);
      var file = __dirname+'/file-upload/b.png';
      var key = 'file-upload/exist.jpg';

      nodeQiniuSync.stat({
        key: key
      }).then(function(ret){
        var remoteHash = ret.hash;

        getEtag(file, function (fileHash) {

          nodeQiniuSync.uploadFile({
            file: file,
            key: key,
            overwrite: false
          }).then(function(data){
            expect(fileHash).to.not.equal(remoteHash);
            expect(data).to.have.property('hash').to.equal(remoteHash);
            expect(data).to.have.property('key').to.equal(key);
            done();
          },function(error) {
            //assert.fail(error.code, null, error.error);
            console.log(error);
            expect(false).to.be.true;
            done();
          });
        });


      });




    });

    it('should upload success: overwrite remote file', function(done) {
      this.timeout(10000);
      var file = __dirname+'/file-upload/b.png';
      var key = 'file-upload/test.png';
      getEtag(file, function (fileHash) {
        nodeQiniuSync.uploadFile({
          file: file,
          key: key,
          overwrite: true
        }).then(function (data) {
          expect(data).to.have.property('hash').to.equal(fileHash);
          expect(data).to.have.property('key').to.equal(key);
          // expect(data.key).to.equal(key);
          // expect(data.hash).to.equal(fileHash);
          done();
        }, function (error) {
          //assert.fail(error.code, null, error.error);
          expect(false).to.be.true;
          done();
        });
      });
    });
  });
});
