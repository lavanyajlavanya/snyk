import { readFileSync, unlinkSync } from 'fs';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { startMockServer } from './helpers';
jest.setTimeout(50000);

async function* walk(dir) {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

describe('GitHub action', () => {
  let run: (
    cmd: string,
  ) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
  let teardown: () => void;

  beforeAll(async () => {
    ({ run, teardown } = await startMockServer());
  });

  afterAll(async () => teardown());

  it('contains valid files when provided a folder', async () => {
    const sarifOutputFilename = path.join(__dirname, `${uuidv4()}.sarif`);
    await run(`snyk iac test ./iac --sarif-file-output=${sarifOutputFilename}`);

    const actualPaths = new Set();
    for await (const p of walk('./test/fixtures/iac')) {
        actualPaths.add(`file://${process.cwd()}/${p}`);
    }
    const outputFileContents = readFileSync(sarifOutputFilename, 'utf-8');
    unlinkSync(sarifOutputFilename);
    const jsonObj = JSON.parse(outputFileContents);

    const expectedPaths = new Set();
    for (const run of jsonObj.runs) {
      const projectRoot = run.originalUriBaseIds.PROJECTROOT.uri;

      for (const result of run.results) {
        for (const loc of result.locations) {
            expectedPaths.add(projectRoot + loc.physicalLocation.artifactLocation.uri);
        }
      }
    }

    for (const p of expectedPaths) {
      expect(actualPaths.has(p)).toBeTruthy();
    }
  });

  it.only('contains valid files when given .', async () => {
    const sarifOutputFilename = path.join(__dirname, `${uuidv4()}.sarif`);
    await run(`cd iac; snyk iac test . --sarif-file-output=${sarifOutputFilename}`);

    const actualPaths = new Set();
    for await (const p of walk('./test/fixtures/iac')) {
      actualPaths.add(`file://${process.cwd()}/${p}`);
    }
    console.log("🚀 ~ file: actions.spec.ts ~ line 73 ~ forawait ~ actualPaths", actualPaths)

    const outputFileContents = readFileSync(sarifOutputFilename, 'utf-8');
    unlinkSync(sarifOutputFilename);
    const jsonObj = JSON.parse(outputFileContents);

    const expectedPaths = new Set();
    for (const run of jsonObj.runs) {
      const projectRoot = run.originalUriBaseIds.PROJECTROOT.uri;

      for (const result of run.results) {
        for (const loc of result.locations) {
            expectedPaths.add(projectRoot + loc.physicalLocation.artifactLocation.uri);
        }
      }
    }
    console.log("🚀 ~ file: actions.spec.ts ~ line 77 ~ it.only ~ expectedPaths", expectedPaths)


    for (const p of expectedPaths) {
      expect(actualPaths.has(p)).toBeTruthy();
    }
  });

  it('contains valid files when given nothing', async () => {
    const sarifOutputFilename = path.join(__dirname, `${uuidv4()}.sarif`);
    await run(`cd iac; snyk iac test --sarif-file-output=${sarifOutputFilename}`);

    const actualPaths = new Set();
    for await (const p of walk('./test/fixtures/iac')) {
      actualPaths.add(`file://${process.cwd()}/${p}`);
    }

    const outputFileContents = readFileSync(sarifOutputFilename, 'utf-8');
    unlinkSync(sarifOutputFilename);
    const jsonObj = JSON.parse(outputFileContents);

    const expectedPaths = new Set();
    for (const run of jsonObj.runs) {
      const projectRoot = run.originalUriBaseIds.PROJECTROOT.uri;

      for (const result of run.results) {
        for (const loc of result.locations) {
            expectedPaths.add(projectRoot + loc.physicalLocation.artifactLocation.uri);
        }
      }
    }

    for (const p of expectedPaths) {
      expect(actualPaths.has(p)).toBeTruthy();
    }
  });
});
