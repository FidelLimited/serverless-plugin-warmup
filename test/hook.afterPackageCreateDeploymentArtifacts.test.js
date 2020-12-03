/* global jest beforeEach describe it expect */

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readdir: jest.fn(),
    unlink: jest.fn(),
    writeFile: jest.fn(),
    rmdir: jest.fn(),
  },
}));
const fs = require('fs').promises;
const path = require('path');
const WarmUp = require('../src/index');
const { getServerlessConfig } = require('./utils/configUtils');

const files = ['index.js'];

describe('Serverless warmup plugin after:package:createDeploymentArtifacts hook', () => {
  beforeEach(() => {
    fs.readdir.mockClear();
    fs.unlink.mockClear();
    fs.rmdir.mockClear();
  });

  it('Should clean the temporary folder if cleanFolder is set to true', async () => {
    fs.readdir.mockResolvedValueOnce(files);
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            default: {
              enabled: true,
              cleanFolder: true,
            },
          },
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } },
      },
    });
    const plugin = new WarmUp(serverless, {});

    await plugin.hooks['after:package:createDeploymentArtifacts']();

    expect(fs.unlink).toHaveBeenCalledTimes(files.length);
    files.forEach((file, i) => expect(fs.unlink).toHaveBeenNthCalledWith(i + 1, path.join('testPath', '_warmup', 'default', file)));
    expect(fs.rmdir).toHaveBeenCalledTimes(1);
    expect(fs.rmdir).toHaveBeenCalledWith(path.join('testPath', '_warmup', 'default'));
  });

  it('Should clean the custom temporary folder if cleanFolder is set to true', async () => {
    fs.readdir.mockResolvedValueOnce(files);
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            default: {
              enabled: true,
              folderName: 'test-folder',
              cleanFolder: true,
            },
          },
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } },
      },
    });
    const plugin = new WarmUp(serverless, {});

    await plugin.hooks['after:package:createDeploymentArtifacts']();

    expect(fs.unlink).toHaveBeenCalledTimes(files.length);
    files.forEach((file, i) => expect(fs.unlink).toHaveBeenNthCalledWith(i + 1, path.join('testPath', 'test-folder', file)));
    expect(fs.rmdir).toHaveBeenCalledTimes(1);
    expect(fs.rmdir).toHaveBeenCalledWith(path.join('testPath', 'test-folder'));
  });

  it('Should ignore cleaning the custom temporary folder if there was nothing to clean', async () => {
    const err = new Error('Folder doesn\'t exist');
    err.code = 'ENOENT';
    fs.readdir.mockRejectedValueOnce(err);
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            default: {
              enabled: true,
              folderName: 'test-folder',
              cleanFolder: true,
            },
          },
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } },
      },
    });
    const plugin = new WarmUp(serverless, {});

    await plugin.hooks['after:package:createDeploymentArtifacts']();

    expect(fs.rmdir).not.toHaveBeenCalled();
  });


  it('Should not error if couldn\'t clean up the custom temporary folder', async () => {
    fs.readdir.mockResolvedValueOnce(files);
    fs.rmdir.mockRejectedValueOnce(new Error('Folder couldn\'t be cleaned'));
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            default: {
              enabled: true,
            },
          },
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } },
      },
    });
    const plugin = new WarmUp(serverless, {});

    await plugin.hooks['after:package:createDeploymentArtifacts']();

    expect(fs.rmdir).toHaveBeenCalledTimes(1);
    expect(fs.rmdir).toHaveBeenCalledWith(path.join('testPath', '_warmup', 'default'));
  });

  it('Should not clean the temporary folder if cleanFolder is set to false', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            default: {
              enabled: true,
              cleanFolder: false,
            },
          },
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } },
      },
    });
    const plugin = new WarmUp(serverless, {});

    await plugin.hooks['after:package:createDeploymentArtifacts']();

    expect(fs.rmdir).not.toHaveBeenCalled();
  });
});
