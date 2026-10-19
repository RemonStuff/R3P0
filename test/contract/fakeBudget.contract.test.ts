import { FakeBudget } from "../fakes/fakeBudget";
import { FixedClock } from "../fakes/fixedClock";
import { budgetPortContract } from "./budgetPortContract";

budgetPortContract("FakeBudget", () => {
  const clock = new FixedClock("2026-10-14T09:00:00.000Z", "Europe/Amsterdam");
  const port = new FakeBudget({ clock });
  return {
    port,
    clock,
    scriptReply: (chunks, cost) => port.scriptReply({ chunks, cost }),
    scriptBudgetStop: (chunks, cost) => port.scriptReply({ chunks, cost, stop: "budget" }),
    scriptRefusal: (code) => {
      const refusal = { kind: "refused", code, message: `Refused: ${code}` } as const;
      port.scriptCheck(refusal);
      port.scriptReply({ reject: refusal });
    },
    requireReserveApproval: (subject, weekEndsAt) => {
      port.setWeekEnd(weekEndsAt);
      port.requireReserveApproval(subject);
    },
  };
});
