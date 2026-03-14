const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const workflowsFile = path.join(dataDir, 'workflows.json');

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(workflowsFile)) {
    fs.writeFileSync(workflowsFile, '[]', 'utf8');
  }
}

function readWorkflows() {
  ensureStorage();
  const raw = fs.readFileSync(workflowsFile, 'utf8');
  return JSON.parse(raw);
}

function writeWorkflows(workflows) {
  ensureStorage();
  fs.writeFileSync(workflowsFile, JSON.stringify(workflows, null, 2), 'utf8');
}

function saveWorkflow(workflow) {
  const workflows = readWorkflows();
  workflows.push(workflow);
  writeWorkflows(workflows);
  return workflow;
}

function updateWorkflow(workflowId, updater) {
  const workflows = readWorkflows();
  const index = workflows.findIndex((workflow) => workflow.id === workflowId);

  if (index === -1) {
    return null;
  }

  const current = workflows[index];
  const updated = updater(current);
  workflows[index] = updated;
  writeWorkflows(workflows);
  return updated;
}

function getWorkflow(workflowId) {
  return readWorkflows().find((workflow) => workflow.id === workflowId) || null;
}

function listWorkflowsByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return readWorkflows().filter((workflow) => workflow.profile.email.toLowerCase() === normalized);
}

function listDueFollowUps(nowIso) {
  const now = new Date(nowIso);

  return readWorkflows().flatMap((workflow) => {
    const dueItems = workflow.followUps.filter((item) => item.status === 'scheduled' && new Date(item.dueAt) <= now);
    return dueItems.map((item) => ({
      workflowId: workflow.id,
      followUpId: item.id,
      item
    }));
  });
}

module.exports = {
  saveWorkflow,
  updateWorkflow,
  getWorkflow,
  listWorkflowsByEmail,
  listDueFollowUps
};
