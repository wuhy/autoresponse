var pathUtil = require('path');
var fs = require('fs');
var fileUtil = require('../lib/util/file-util');

describe('fiel utils', function () {
    describe('file extname', function () {
        it('should get the right file extname', function () {
            expect(fileUtil.getFileExtName('d:/a/b.JS')).toBe('JS');
            expect(fileUtil.getFileExtName('d:/a/b.js')).toBe('js');
            expect(fileUtil.getFileExtName('/a/.npmignore')).toBe('npmignore');
        });

        it('no extname', function () {
            expect(fileUtil.getFileExtName('abc')).toBe('');
        });
    });

    describe('mkdirs sync', function () {
        it('should create correct directory based the given path', function () {
            var aPath = pathUtil.join(__dirname, 'a');
            var bPath = pathUtil.join(aPath, 'b.js');
            fileUtil.mkdirsSyn(aPath);
            fileUtil.mkdirsSyn(bPath);

            expect(fs.statSync(aPath).isDirectory()).toBeTruthy();
            expect(fs.statSync(bPath).isDirectory()).toBeTruthy();

            fs.rmdir(bPath, function (err) {
                if (err) {
                    console.log('unlink file error:' + err);
                }
                else {
                    fs.rmdir(aPath, function (err) {
                        err && console.log('unlink file error:' + err);
                    });
                }
            });
        });
    });

    describe('relative path', function () {
        it('should be a relative file path', function () {
            expect(fileUtil.isRelativePath('./a/b.js')).toBeTruthy();
            expect(fileUtil.isRelativePath('a/b/')).toBeTruthy();
            expect(fileUtil.isRelativePath('../a/b')).toBeTruthy();
        });
        it('should be not a relative file path', function () {
            var isWin = /^win/.test(process.platform);
            if (isWin) {
                expect(fileUtil.isRelativePath('d:/a/b.js')).not.toBeTruthy();
            }
            else {
                expect(fileUtil.isRelativePath('/a/b.js')).not.toBeTruthy();
            }
        });
    });
});