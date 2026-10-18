// The Q0T4 contract (src/ports/q0t4Api.ts) instantiated with the real vscode
// types, as Q0T4 PLAN §9.8 declares them. Types only.
import type * as vscode from "vscode";
import type { Q0T4Api, Q0T4Client } from "../ports/q0t4Api";

export interface VscodeQ0T4Types {
  Model: vscode.LanguageModelChat;
  Message: vscode.LanguageModelChatMessage;
  Options: vscode.LanguageModelChatRequestOptions;
  Token: vscode.CancellationToken;
}

export type VscodeQ0T4Api = Q0T4Api<VscodeQ0T4Types>;
export type VscodeQ0T4Client = Q0T4Client<VscodeQ0T4Types>;
