/* global jest beforeEach describe it expect */

const WarmUP = require('../src/index')
const { getServerlessConfig, getOptions } = require('./utils/configUtils')
const { GeneratedFunctionTester } = require('./utils/generatedFunctionTester')

jest.mock('fs-extra')
const fs = require('fs-extra')
fs.outputFile.mockReturnValue(Promise.resolve())

describe('Serverless warmup plugin constructor', () => {
  beforeEach(() => fs.outputFile.mockClear())

  it('Should work with only defaults and do nothing', async () => {
    const serverless = getServerlessConfig({
      service: {
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin).toBeUndefined()
    expect(fs.outputFile).not.toHaveBeenCalled()
  })

  it('Should do nothing if globally disabled using shorthand', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: false
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin).toBeUndefined()
    expect(fs.outputFile).not.toHaveBeenCalled()
  })

  it('Should warmup all functions if globally enabled using shorthand', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: true
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(2)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(2, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should warmup all functions if globally enabled for a stage using shorthand and stage match', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: 'dev'
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(2)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(2, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should do nothing if globally enabled for stage using shorthand but stage does not match', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: 'staging'
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin).toBeUndefined()
    expect(fs.outputFile).not.toHaveBeenCalled()
  })

  it('Should warmup all functions if globally enabled for a stage list using shorthand and a stage match', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: ['dev', 'staging']
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(2)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(2, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should do nothing if globally enabled for stage list using shorthand but no stage match', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: ['staging', 'prod']
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin).toBeUndefined()
    expect(fs.outputFile).not.toHaveBeenCalled()
  })

  it('Should do nothing if globally disabled', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: false
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin).toBeUndefined()
    expect(fs.outputFile).not.toHaveBeenCalled()
  })

  it('Should warmup all functions if globally enabled', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(2)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(2, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should warmup all functions if globally enabled for a stage and stage match', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: 'dev'
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(2)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(2, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should do nothing if globally enabled for stage but stage does not match', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: 'staging'
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin).toBeUndefined()
    expect(fs.outputFile).not.toHaveBeenCalled()
  })

  it('Should warmup all functions if globally enabled for a stage list and a stage match', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: ['dev', 'staging']
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(2)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(2, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should do nothing if globally enabled for stage list but no stage match', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: ['staging', 'prod']
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin).toBeUndefined()
    expect(fs.outputFile).not.toHaveBeenCalled()
  })

  it('Should override globally enabled option with local enablement', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: false } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally enabled option with local enablement for stage', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: 'staging' } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally enabled option with local enablement for stage', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: ['staging', 'prod'] } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally not enabled option with local enablement', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: false
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: true } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally not enabled option with local enablement for stage', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: false
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: 'dev' } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally not enabled option with local enablement for stage', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: false
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: ['dev', 'staging'] } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally enabled for stage with local enablement', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: 'dev'
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: false } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally enabled for stage with local enablement for stage', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: 'dev'
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: 'staging' } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally enabled for stage with local enablement for stage', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: 'dev'
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: ['staging', 'prod'] } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally not enabled for stage with local enablement', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: 'staging'
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: true } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally not enabled for stage with local enablement for stage', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: 'stage'
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: 'dev' } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally not enabled for stage with local enablement for stage', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: 'staging'
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: ['dev', 'staging'] } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally enabled for stage list with local enablement', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: ['dev', 'staging']
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: false } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally enabled for stage list with local enablement for stage', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: ['dev', 'staging']
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: 'staging' } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally enabled for stage list with local enablement for stage', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: ['dev', 'staging']
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: ['staging', 'prod'] } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally not enabled for stage list with local enablement', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: ['staging', 'prod']
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: true } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally not enabled for stage list with local enablement for stage', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: ['staging', 'prod']
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: 'dev' } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should override globally not enabled for stage list with local enablement for stage', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: ['staging', 'prod']
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { enabled: ['dev', 'staging'] } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
    expect(fs.outputFile).toHaveBeenCalledTimes(1)
    expect(fs.outputFile.mock.calls[0][0]).toBe('testPath/_warmup/index.js')

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(1)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should use the stage and region from defaults if present', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: 'staging'
          }
        },
        defaults: { stage: 'staging', region: 'eu-west-1' },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-staging-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('eu-west-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(2)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(2, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should use the stage and region from provider if present', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: 'prod'
          }
        },
        provider: { stage: 'prod', region: 'eu-west-2' },
        defaults: { stage: 'staging', region: 'eu-west-1' },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-prod-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('eu-west-2')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(2)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(2, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should use the stage and region from options if present', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: ['test']
          }
        },
        provider: { stage: 'prod', region: 'eu-west-2' },
        defaults: { stage: 'staging', region: 'eu-west-1' },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions({ stage: 'test', region: 'us-west-2' })
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-test-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-west-2')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(2)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(2, {
      ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"source":"serverless-plugin-warmup"}'
    })
  })

  it('Should use the folder name from custom config', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            folderName: 'test-folder'
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: 'test-folder/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['test-folder/**']
        },
        timeout: 10
      })
  })

  it('Should use the service name from options if present', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            name: 'test-name'
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions({ stage: 'test', region: 'us-west-2' })
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'test-name',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
  })

  it('Should use the service roles from options if present', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            role: 'test-role'
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10,
        role: 'test-role'
      })
  })

  it('Should use the service tag from options if present', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            tags: {
              tag1: 'test-tag-1',
              tag2: 'test-tag-2'
            }
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10,
        tags: {
          tag1: 'test-tag-1',
          tag2: 'test-tag-2'
        }
      })
  })

  it('Should set the VPC to empty if set to false in options', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            vpc: false
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10,
        vpc: { securityGroupIds: [], subnetIds: [] }
      })
  })

  it('Should set the VPC to empty from options if present', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            vpc: { securityGroupIds: ['sg-test1', 'sg-test2'], subnetIds: ['sn-test1', 'sn-test2'] }
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10,
        vpc: { securityGroupIds: ['sg-test1', 'sg-test2'], subnetIds: ['sn-test1', 'sn-test2'] }
      })
  })

  it('Should use the service schedule from options if present', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            events: [{ schedule: 'rate(10 minutes)' }]
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(10 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
  })

  it('Should use the memory size from options if present', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            memorySize: 256
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 256,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })
  })

  it('Should use the timeout from options if present', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            timeout: 30
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 30
      })
  })

  it('Should use the source from options if present', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            source: { test: 20 }
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(2)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"test":20}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"test":20}'
    })
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(2, {
      ClientContext: Buffer.from('{"custom":{"test":20}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"test":20}'
    })
  })

  it('Should override source from options if present at the function', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            source: { test: 20 }
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { source: { othersource: 'test' } } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(2)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"othersource":"test"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"othersource":"test"}'
    })
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(2, {
      ClientContext: Buffer.from('{"custom":{"test":20}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"test":20}'
    })
  })

  it('Should not stringify the source if the sourceRaw option is present', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            source: '{test:20}',
            sourceRaw: true
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(2)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{test:20}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{test:20}'
    })
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(2, {
      ClientContext: Buffer.from('{"custom":{test:20}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{test:20}'
    })
  })

  it('Should override sourceRaw option from options if present at the function', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            source: '{test:20}',
            sourceRaw: true
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { source: { test: 'value' }, sourceRaw: false } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(2)
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(1, {
      ClientContext: Buffer.from('{"custom":{"test":"value"}}').toString('base64'),
      FunctionName: 'someFunc1',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{"test":"value"}'
    })
    expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(2, {
      ClientContext: Buffer.from('{"custom":{test:20}}').toString('base64'),
      FunctionName: 'someFunc2',
      InvocationType: 'RequestResponse',
      LogType: 'None',
      Qualifier: '$LATEST',
      Payload: '{test:20}'
    })
  })

  it('Should warmup the function using the concurrency from options if present', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            concurrency: 3
          }
        },
        functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(6)
    for (let i = 1; i <= 3; i += 1) {
      expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(i, {
        ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
        FunctionName: 'someFunc1',
        InvocationType: 'RequestResponse',
        LogType: 'None',
        Qualifier: '$LATEST',
        Payload: '{"source":"serverless-plugin-warmup"}'
      })
    }
    for (let i = 4; i <= 6; i += 1) {
      expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(i, {
        ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
        FunctionName: 'someFunc2',
        InvocationType: 'RequestResponse',
        LogType: 'None',
        Qualifier: '$LATEST',
        Payload: '{"source":"serverless-plugin-warmup"}'
      })
    }
  })

  it('Should override source from options if present at the function', async () => {
    const serverless = getServerlessConfig({
      service: {
        custom: {
          warmup: {
            enabled: true,
            concurrency: 3
          }
        },
        functions: {
          someFunc1: { name: 'someFunc1', warmup: { concurrency: 6 } },
          someFunc2: { name: 'someFunc2' } }
      }
    })
    const options = getOptions()
    const plugin = new WarmUP(serverless, options)

    await plugin.hooks['after:package:initialize']()

    expect(plugin.serverless.service.functions.warmUpPlugin)
      .toMatchObject({
        description: 'Serverless WarmUP Plugin',
        events: [{ schedule: 'rate(5 minutes)' }],
        handler: '_warmup/index.warmUp',
        memorySize: 128,
        name: 'warmup-test-dev-warmup-plugin',
        runtime: 'nodejs8.10',
        package: {
          individually: true,
          exclude: ['**'],
          include: ['_warmup/**']
        },
        timeout: 10
      })

    const functionTester = new GeneratedFunctionTester(fs.outputFile.mock.calls[0][1])
    functionTester.executeWarmupFunction()

    expect(functionTester.aws.config.region).toBe('us-east-1')
    expect(functionTester.lambdaInstances[0]).toHaveBeenCalledTimes(9)
    for (let i = 1; i <= 6; i += 1) {
      expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(i, {
        ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
        FunctionName: 'someFunc1',
        InvocationType: 'RequestResponse',
        LogType: 'None',
        Qualifier: '$LATEST',
        Payload: '{"source":"serverless-plugin-warmup"}'
      })
    }
    for (let i = 7; i <= 9; i += 1) {
      expect(functionTester.lambdaInstances[0]).toHaveBeenNthCalledWith(i, {
        ClientContext: Buffer.from('{"custom":{"source":"serverless-plugin-warmup"}}').toString('base64'),
        FunctionName: 'someFunc2',
        InvocationType: 'RequestResponse',
        LogType: 'None',
        Qualifier: '$LATEST',
        Payload: '{"source":"serverless-plugin-warmup"}'
      })
    }
  })

  describe('Backwards compatibility', () => {
    it('Should accept backwards compatible "default" as boolean property in place of "enabled"', async () => {
      const serverless = getServerlessConfig({
        service: {
          custom: {
            warmup: {
              default: true
            }
          },
          functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
        }
      })
      const options = getOptions()
      const plugin = new WarmUP(serverless, options)

      await plugin.hooks['after:package:initialize']()

      expect(plugin.serverless.service.functions.warmUpPlugin)
        .toMatchObject({
          description: 'Serverless WarmUP Plugin',
          events: [{ schedule: 'rate(5 minutes)' }],
          handler: '_warmup/index.warmUp',
          memorySize: 128,
          name: 'warmup-test-dev-warmup-plugin',
          runtime: 'nodejs8.10',
          package: {
            individually: true,
            exclude: ['**'],
            include: ['_warmup/**']
          },
          timeout: 10
        })
    })

    it('Should accept backwards compatible "default" as boolean property in place of "enabled"', async () => {
      const serverless = getServerlessConfig({
        service: {
          custom: {
            warmup: {
              default: 'dev'
            }
          },
          functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
        }
      })
      const options = getOptions()
      const plugin = new WarmUP(serverless, options)

      await plugin.hooks['after:package:initialize']()

      expect(plugin.serverless.service.functions.warmUpPlugin)
        .toMatchObject({
          description: 'Serverless WarmUP Plugin',
          events: [{ schedule: 'rate(5 minutes)' }],
          handler: '_warmup/index.warmUp',
          memorySize: 128,
          name: 'warmup-test-dev-warmup-plugin',
          runtime: 'nodejs8.10',
          package: {
            individually: true,
            exclude: ['**'],
            include: ['_warmup/**']
          },
          timeout: 10
        })
    })

    it('Should accept backwards compatible "default" as boolean property in place of "enabled"', async () => {
      const serverless = getServerlessConfig({
        service: {
          custom: {
            warmup: {
              default: ['dev', 'staging']
            }
          },
          functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
        }
      })
      const options = getOptions()
      const plugin = new WarmUP(serverless, options)

      await plugin.hooks['after:package:initialize']()

      expect(plugin.serverless.service.functions.warmUpPlugin)
        .toMatchObject({
          description: 'Serverless WarmUP Plugin',
          events: [{ schedule: 'rate(5 minutes)' }],
          handler: '_warmup/index.warmUp',
          memorySize: 128,
          name: 'warmup-test-dev-warmup-plugin',
          runtime: 'nodejs8.10',
          package: {
            individually: true,
            exclude: ['**'],
            include: ['_warmup/**']
          },
          timeout: 10
        })
    })

    it('Should accept backwards compatible "schedule" property as string in place of "events"', async () => {
      const serverless = getServerlessConfig({
        service: {
          custom: {
            warmup: {
              enabled: true,
              schedule: 'rate(10 minutes)'
            }
          },
          functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
        }
      })
      const options = getOptions()
      const plugin = new WarmUP(serverless, options)

      await plugin.hooks['after:package:initialize']()

      expect(plugin.serverless.service.functions.warmUpPlugin)
        .toMatchObject({
          description: 'Serverless WarmUP Plugin',
          events: [{ schedule: 'rate(10 minutes)' }],
          handler: '_warmup/index.warmUp',
          memorySize: 128,
          name: 'warmup-test-dev-warmup-plugin',
          runtime: 'nodejs8.10',
          package: {
            individually: true,
            exclude: ['**'],
            include: ['_warmup/**']
          },
          timeout: 10
        })
    })

    it('Should accept backwards compatible "schedule" property as array in place of "events"', async () => {
      const serverless = getServerlessConfig({
        service: {
          custom: {
            warmup: {
              enabled: true,
              schedule: ['rate(10 minutes)', 'rate(30 minutes)']
            }
          },
          functions: { someFunc1: { name: 'someFunc1' }, someFunc2: { name: 'someFunc2' } }
        }
      })
      const options = getOptions()
      const plugin = new WarmUP(serverless, options)

      await plugin.hooks['after:package:initialize']()

      expect(plugin.serverless.service.functions.warmUpPlugin)
        .toMatchObject({
          description: 'Serverless WarmUP Plugin',
          events: [{ schedule: 'rate(10 minutes)' }, { schedule: 'rate(30 minutes)' }],
          handler: '_warmup/index.warmUp',
          memorySize: 128,
          name: 'warmup-test-dev-warmup-plugin',
          runtime: 'nodejs8.10',
          package: {
            individually: true,
            exclude: ['**'],
            include: ['_warmup/**']
          },
          timeout: 10
        })
    })
  })
})
