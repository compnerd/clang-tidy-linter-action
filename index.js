// Copyright (c) 2021 Saleem Abdulrasool <compnerd@compnerd.org>.
// All Rights Reserved.
// SPDX-License-Identifier: MIT

const core = require('@actions/core');
const github = require('@actions/github');
const lineColumn = require('line-column');

async function check(build, file) {
  const { spawnSync } = require('child_process');
  const fs = require('fs');
  const yaml = require('js-yaml');

  return new Promise(function (resolve, reject) {
    const replacements = `${file}.replacements.yml`
    // core.debug(`clang-tidy -p ${build} --export-fixes ${replacements} ${file}`);
    spawnSync("clang-tidy", ["-p", build, "--export-files", replacements, file]);

    try {
      if (!fs.existsSync(replacements)) {
        resolve();
        return;
      }

      // TODO(compnerd) use async read
      const data = fs.readFileSync(replacements, {encoding: 'utf-8'});
      if (data === null)
        throw "unable to load replacements file, no diagnostics emitted";

      const serialized = yaml.load(data);
      if (serialized === null)
        throw "unable to deserialize diagnostics, no diagnostics emitted";

      if (serialized.Diagnostics.length === 0)
        return resolve();

      // TODO(compnerd) use async read
      const position = lineColumn(fs.readFileSync(file, {encoding: 'utf-8'}));
      if (position === null)
        throw "unable to load source file, no diagnostics emitted";

      // core.debug(`Main Source File: ${serialized.MainSourceFile}`);
      serialized.Diagnostics.forEach(entry => {
        // core.debug(`Processing: ${JSON.stringify(entry)}`);
        const location = position.fromIndex(entry.DiagnosticMessage.FileOffset);
        if (location === null)
          return;
        console.log(`::warning file=${entry.DiagnosticMessage.FilePath},line=${location.line},col=${location.col}::${entry.DiagnosticMessage.Message}`);
      });

      reject(`${serialized.Diagnostics.length} issues detected in ${serialized.MainSourceFile}`);
    } catch (err) {
      core.info(err);
      resolve();
    }
  });
}

async function changed() {
  const token = core.getInput('github-token') || process.env.GITHUB_TOKEN;
  const octokit = github.getOctokit(token);

  const { data } = await octokit.rest.pulls.listFiles({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: github.context.payload.pull_request.number,
  });

  // We cannot lint any files which have been deleted in this PR.
  let files =
      data.filter(item => item.status !== "deleted")
          .map((v) => v.filename);

  // TODO(compnerd) support core.getInput('extensions') for filter
  return files.filter(file => file.endsWith('.cpp') || file.endsWith('.cc'))
}

async function tidy(build) {
  const files = await changed();
  if (files.length == 0)
    return [Promise.resolve()];
  return files.map(file => check(build, file));
}

async function main() {
  const build = core.getInput('build');
  Promise.all(await tidy(build)).then(() => {
    console.log('done');
  }).catch((err) => {
    console.log(err);
    core.setFailed('clang-tidy failed check');
  });
}

main()
