import { createJestPreset } from './create-jest-preset'

it('should return correct defaults when allowJs is false or not set', () => {
  const withoutJs = {
    moduleFileExtensions: ['js', 'json', 'jsx', 'node', 'ts', 'tsx'],
    testMatch: [
      '**/__tests__/**/*.js?(x)',
      '**/?(*.)+(spec|test).js?(x)',
      '**/__tests__/**/*.ts?(x)',
      '**/?(*.)+(spec|test).ts?(x)',
    ],
    transform: {
      '^.+\\.tsx?$': 'ts-jest',
    },
  }
  expect(createJestPreset()).toEqual(withoutJs)
  expect(createJestPreset({ allowJs: false })).toEqual(withoutJs)
})

it('should return correct defaults when allowJs is true', () => {
  expect(createJestPreset({ allowJs: true })).toEqual({
    moduleFileExtensions: ['js', 'json', 'jsx', 'node', 'ts', 'tsx'],
    testMatch: [
      '**/__tests__/**/*.js?(x)',
      '**/?(*.)+(spec|test).js?(x)',
      '**/__tests__/**/*.ts?(x)',
      '**/?(*.)+(spec|test).ts?(x)',
    ],
    transform: {
      '^.+\\.[tj]sx?$': 'ts-jest',
    },
  })
})
