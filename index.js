const github = require("@actions/github");
const core = require("@actions/core");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForWorkflow(octokit, owner, repo, run_id) {
  for (let tries = 0; tries < 100; tries++) {
    const runResponse = await octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id,
    });

    if (tries == 0) {
      console.log(`Run url: ${runResponse.data.url}`);
    }

    if (runResponse.data.status !== "completed") {
      await sleep(5000);
    } else {
      return runResponse.data;
    }
  }

  console.error("Maximum wait time reached.");
}

async function main() {
  const token = core.getInput("token", { required: true });
  const repo_info = core.getInput("repo", { required: true });
  const event_type = core.getInput("event_type", { required: true });
  const payload = JSON.parse(core.getInput("payload", { required: true }));
  const [owner, repo] = repo_info.split("/");

  const octokit = github.getOctokit(token);
  const context = github.context;

  const response = await octokit.rest.repos.createDispatchEvent({
    owner,
    repo,
    event_type: event_type,
    client_payload: payload,
  });

  if (response.status !== 204) {
    console.error("Failed to dispatch workflow: ", response.data);
    console.setFailed(response.data);
  }

  console.log("Foreign workflow dispatched. Waiting for it to start...");

  await sleep(5000);
  const runId = (
    await octokit.rest.actions.listWorkflowRunsForRepo({
      owner,
      repo,
      per_page: 1,
      page: 1,
    })
  ).data.workflow_runs[0].id;

  console.log(
    `Waiting for workflow run ${runId} on ${repo_info} to complete...`,
  );

  const { status, conclusion } = await waitForWorkflow(
    octokit,
    owner,
    repo,
    runId,
  );

  if (conclusion == "success" && status == "completed") {
    console.log("Foreign workflow completed successfully.");
  } else {
    console.error("Foreign workflow didn't complete successfully.");
  }
}

try {
  main();
} catch (err) {
  console.error("Failed to trigger downstream pipeline: ", err);
  core.setFailed(err.message);
}
