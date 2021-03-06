// tslint:disable:max-line-length
import { LogLevels } from 'bs-logger'

import * as fakers from './__helpers__/fakers'
import { logTargetMock } from './__helpers__/mocks'
import { tempDir } from './__helpers__/path'
import ProcessedSource from './__helpers__/processed-source'
import { createCompiler } from './compiler'
import { ConfigSet } from './config/config-set'
import { TsJestGlobalOptions } from './types'

const logTarget = logTargetMock()

// not really unit-testing here, but it's hard to mock all those values :-D
function makeCompiler({
  jestConfig,
  tsJestConfig,
  parentConfig,
}: {
  jestConfig?: Partial<jest.ProjectConfig>
  tsJestConfig?: TsJestGlobalOptions
  parentConfig?: TsJestGlobalOptions
} = {}) {
  tsJestConfig = { ...tsJestConfig }
  tsJestConfig.diagnostics = {
    ...(tsJestConfig.diagnostics as any),
    pretty: false,
  }
  const cs = new ConfigSet(fakers.jestConfig(jestConfig, tsJestConfig), parentConfig)
  return createCompiler(cs)
}

beforeEach(() => {
  logTarget.clear()
})

describe('isolatedModules', () => {
  const compiler = makeCompiler()
  it('should report diagnostics related to typings', () => {
    expect(() =>
      compiler.compile(
        `
const f = (v: number) => v
const t: string = f(5)
const v: boolean = t
`,
        'foo.ts',
      ),
    ).toThrowErrorMatchingInlineSnapshot(`
"TypeScript diagnostics (customize using \`[jest-config].globals.ts-jest.diagnostics\` option):
foo.ts(3,7): error TS2322: Type 'number' is not assignable to type 'string'.
foo.ts(4,7): error TS2322: Type 'string' is not assignable to type 'boolean'."
`)
  })
})

describe('source-maps', () => {
  const compiler = makeCompiler()
  it('should have correct source maps', () => {
    const source = 'const f = (v: number) => v\nconst t: number = f(5)'
    const compiled = compiler.compile(source, __filename)
    const processed = new ProcessedSource(compiled, __filename)
    // const expectedFileName = relativeToRoot(__filename)
    const expectedFileName = __filename
    expect(processed.outputSourceMaps).toMatchObject({
      file: expectedFileName,
      sources: [expectedFileName],
      sourcesContent: [source],
    })
  })
})

describe('cache', () => {
  const tmp = tempDir('compiler')
  const compiler = makeCompiler({
    jestConfig: { cache: true, cacheDirectory: tmp },
  })
  const source = 'console.log("hello")'

  it('should use the cache', () => {
    const compiled1 = compiler.compile(source, __filename)
    expect(logTarget.filteredLines(LogLevels.debug, Infinity)).toMatchInlineSnapshot(`
Array [
  "[level:20] readThrough(): cache miss
",
  "[level:20] getOutput(): compiling using language service
",
  "[level:20] updateMemoryCache()
",
  "[level:20] visitSourceFileNode(): hoisting
",
  "[level:20] getOutput(): computing diagnostics
",
  "[level:20] readThrough(): writing caches
",
]
`)

    logTarget.clear()
    const compiled2 = compiler.compile(source, __filename)
    expect(logTarget.lines).toMatchInlineSnapshot(`
Array [
  "[level:20] readThrough(): cache hit
",
]
`)

    expect(new ProcessedSource(compiled1, __filename)).toMatchInlineSnapshot(`
  ===[ FILE: src/compiler.spec.ts ]===============================================
  "use strict";
  console.log("hello");
  //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJmaWxlIjoiPGN3ZD4vc3JjL2NvbXBpbGVyLnNwZWMudHMiLCJtYXBwaW5ncyI6IjtBQUFBLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUEiLCJuYW1lcyI6W10sInNvdXJjZXMiOlsiPGN3ZD4vc3JjL2NvbXBpbGVyLnNwZWMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc29sZS5sb2coXCJoZWxsb1wiKSJdLCJ2ZXJzaW9uIjozfQ==
  ===[ INLINE SOURCE MAPS ]=======================================================
  file: <cwd>/src/compiler.spec.ts
  mappings: ';AAAA,OAAO,CAAC,GAAG,CAAC,OAAO,CAAC,CAAA'
  names: []
  sources:
    - <cwd>/src/compiler.spec.ts
  sourcesContent:
    - console.log("hello")
  version: 3
  ================================================================================
`)
    expect(compiled2).toBe(compiled1)
  })
})

describe('isolatedModules', () => {
  const compiler = makeCompiler({ tsJestConfig: { isolatedModules: true, tsConfig: false } })
  const spy: jest.SpyInstance = jest.spyOn(require('typescript'), 'transpileModule')
  afterAll(() => {
    spy.mockRestore()
  })
  it('should compile using transpileModule', () => {
    const compiled = compiler.compile('export default 42', __filename)
    expect(new ProcessedSource(compiled, __filename)).toMatchInlineSnapshot(`
  ===[ FILE: src/compiler.spec.ts ]===============================================
  "use strict";
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.default = 42;
  //# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJmaWxlIjoiPGN3ZD4vc3JjL2NvbXBpbGVyLnNwZWMudHMiLCJtYXBwaW5ncyI6Ijs7QUFBQSxrQkFBZSxFQUFFLENBQUEiLCJuYW1lcyI6W10sInNvdXJjZXMiOlsiPGN3ZD4vc3JjL2NvbXBpbGVyLnNwZWMudHMiXSwic291cmNlc0NvbnRlbnQiOlsiZXhwb3J0IGRlZmF1bHQgNDIiXSwidmVyc2lvbiI6M30=
  ===[ INLINE SOURCE MAPS ]=======================================================
  file: <cwd>/src/compiler.spec.ts
  mappings: ';;AAAA,kBAAe,EAAE,CAAA'
  names: []
  sources:
    - <cwd>/src/compiler.spec.ts
  sourcesContent:
    - export default 42
  version: 3
  ================================================================================
`)
    expect(spy).toHaveBeenCalled()
  })
})

describe('getTypeInfo', () => {
  const compiler = makeCompiler()
  const source = `
type MyType {
  /** the prop 1! */
  p1: boolean
}
const val: MyType = {} as any
console.log(val.p1/* <== that */)
`
  it('should get correct type info', () => {
    expect(compiler.getTypeInfo(source, __filename, source.indexOf('/* <== that */') - 1)).toEqual({
      comment: 'the prop 1! ',
      name: '(property) p1: boolean',
    })
  })
})
