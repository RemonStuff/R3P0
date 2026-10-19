// Test-only extension: model metadata for vendor "r3p0-test", so R3P0's model
// picker has models and R3P0 has real LanguageModelChat objects to hand to the
// fake Q0T4. Every request and token count throws: in R3P0, only Q0T4 may use a
// model, and the fake Q0T4 never does.
const vscode = require("vscode");

const MODELS = [
  { id: "fake-mini", name: "Fake Mini", family: "fake-mini" },
  { id: "fake-large", name: "Fake Large", family: "fake-large" },
].map((model) => ({
  ...model,
  version: "1.0.0",
  maxInputTokens: 128000,
  maxOutputTokens: 16000,
  capabilities: {},
}));

const refuse = () => {
  throw new Error("R3P0 tests must never send to a model: requests go through the fake Q0T4.");
};

exports.activate = (context) => {
  context.subscriptions.push(
    vscode.lm.registerLanguageModelChatProvider("r3p0-test", {
      provideLanguageModelChatInformation: () => MODELS,
      provideLanguageModelChatResponse: refuse,
      provideTokenCount: refuse,
    }),
  );
};

exports.deactivate = () => {};
