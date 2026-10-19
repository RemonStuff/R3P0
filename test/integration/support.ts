import * as vscode from "vscode";

export const R3P0_ID = "RemonStuff.r3p0";
/** In the test instance this is always the fake fixture, never the real Q0T4. */
export const Q0T4_ID = "RemonStuff.q0t4";
export const FAKE_PROVIDER_ID = "r3p0-test.fake-lm-provider";
/** The only model vendor integration tests may use; never real Copilot. */
export const FAKE_VENDOR = "r3p0-test";

/** What the fake Q0T4 recorded (see test/fakes/fakeQ0T4Api.ts). */
export interface FakeQ0T4Calls {
  extensionIds: string[];
  sendRequest: { subject: string; model: { vendor: string; id: string }; messages: string[] }[];
  canSpend: unknown[];
  allowReserve: string[];
}

export function fakeQ0T4Calls(): Thenable<FakeQ0T4Calls> {
  return vscode.commands.executeCommand<FakeQ0T4Calls>("fake-q0t4.calls");
}

export async function fakeModel(): Promise<vscode.LanguageModelChat> {
  await vscode.extensions.getExtension(FAKE_PROVIDER_ID)?.activate();
  const [model] = await vscode.lm.selectChatModels({ vendor: FAKE_VENDOR });
  if (!model) throw new Error(`no ${FAKE_VENDOR} model available`);
  return model;
}
