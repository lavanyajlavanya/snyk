import { readFileSync, unlinkSync } from 'fs';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { startMockServer } from './helpers';
jest.setTimeout(50000);
// const {Octokit} = require('@octokit/rest')
// const zlib = require('zlib');

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

  it.each([
    ['', './iac'],
    ['cd iac;', '.'],
    ['cd iac;', ''],
  ])(
    'contains valid files when provided with %p as a path',
  async (preSteps, inputPath) => {
    const sarifOutputFilename = path.join(__dirname, `${uuidv4()}.sarif`);
    await run(`${preSteps} snyk iac test ${inputPath} --sarif-file-output=${sarifOutputFilename}`);

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
  })


  // it('contains valid files when provided with %p as a path',
  // async () => {
  //   // TODO: get the directory to contain the cloned repo

  //   const sarifOutputFilename = path.join(__dirname, `${uuidv4()}.sarif`);
  //   await run(`snyk iac test ./cloned/test --sarif-file-output=${sarifOutputFilename}`);

  //   const outputFileContents = readFileSync(sarifOutputFilename, 'utf-8');
  //   unlinkSync(sarifOutputFilename);
  //   const sarif = zlib.gzipSync(outputFileContents).toString('base64');
  //   unlinkSync(sarifOutputFilename.replace('sarif', 'gz'));

  //   const octokit = new Octokit({
  //     auth: process.env.GH_AUTH_TOKEN, // TODO
  //     previews: ['dorian-preview']
  //   })

  //   await octokit.rest.codeScanning.uploadSarif({
  //     owner: "teodora-sandu",
  //     repo: "test",
  //     commit_sha: process.env.GH_COMMIT_SHA, // TODO
  //     ref: "refs/heads/main",
  //     sarif,
  //   });
    
  //   octokit
  //     .paginate("GET /repos/:owner/:repo/code-scanning/alerts?per_page=100", {
  //       owner: "teodora-sandu",
  //       repo: "test"
  //     })
  //     .then(alerts => {
  //       if (alerts.length > 0) {
    
  //         return Promise.all(alerts.map((alert) => {
  //           const path = alert.most_recent_instance.location.path;
  //           setTimeout(() => {
  //             return octokit
  //               .paginate("GET /repos/:owner/:repo/contents/:path", {
  //                 owner: "teodora-sandu",
  //                 repo: "test",
  //                 path: path.replace('github/workspace/', '')
  //               })
  //               .catch(error => {
  //                 console.error(`Getting file at path ${path} failed.
  //                 ${error.message} (${error.status})
  //                 ${error.documentation_url}`)
  //               })
  //           }, 300)
  //         }))
  //       }
  //     })
  //     .catch(error => {
  //       console.error(`Getting repositories for organization teodora-sandu failed.
  //       ${error.message} (${error.status})
  //       ${error.documentation_url}`)
  //     })
  // })
});
