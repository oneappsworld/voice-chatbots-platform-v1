import { describe, it, expect } from "vitest";
import { applyLeadAnswer, initialLeadState, scoreLead } from "./lead-qualification";

describe("applyLeadAnswer — budget bucket matching", () => {
  it("buckets a $5,000/mo budget into the $2k-$10k tier, not under-$500", () => {
    // Regression: raw substring matching let "500" match inside "5000",
    // silently bucketing a $5k/mo prospect as under-$500 (0 points) instead
    // of $2k-$10k (2 points) — see [[reference finding in globals.css history]].
    let state = initialLeadState();
    state = applyLeadAnswer(state, "Jamie Rivera", "en-US").state; // name
    state = applyLeadAnswer(state, "Acme Robotics", "en-US").state; // company
    state = applyLeadAnswer(state, "11-50 people", "en-US").state; // team_size
    state = applyLeadAnswer(state, "automating support calls", "en-US").state; // use_case
    state = applyLeadAnswer(state, "around 5000 per month", "en-US").state; // budget

    expect(state.answers.budget).toBe("2k_10k");
  });

  it("buckets an explicit under-$500 answer correctly", () => {
    let state = initialLeadState();
    state = applyLeadAnswer(state, "Jamie", "en-US").state;
    state = applyLeadAnswer(state, "Acme", "en-US").state;
    state = applyLeadAnswer(state, "solo", "en-US").state;
    state = applyLeadAnswer(state, "testing", "en-US").state;
    state = applyLeadAnswer(state, "not much, under 500", "en-US").state;

    expect(state.answers.budget).toBe("under_500");
  });
});

describe("applyLeadAnswer — email extraction", () => {
  it("extracts an email address out of a full sentence for the final step", () => {
    let state = initialLeadState();
    for (const answer of ["Jamie", "Acme", "solo", "testing", "under 500", "just exploring"]) {
      state = applyLeadAnswer(state, answer, "en-US").state;
    }
    const result = applyLeadAnswer(state, "you can reach me at jamie@acmerobotics.com", "en-US");
    expect(result.state.answers.email).toBe("jamie@acmerobotics.com");
    expect(result.done).toBe(true);
  });
});

describe("scoreLead", () => {
  it("scores a fully-answered, high-intent lead as qualified", () => {
    const { score, qualification } = scoreLead({
      name: "Jamie",
      company: "Acme",
      use_case: "support automation",
      team_size: "medium",
      budget: "2k_10k",
      timeline: "immediate",
    });
    expect(qualification).toBe("qualified");
    expect(score).toBeGreaterThanOrEqual(7);
  });

  it("scores a low-budget, no-rush lead as disqualified or nurture, not qualified", () => {
    const { qualification } = scoreLead({
      name: "Jamie",
      budget: "under_500",
      timeline: "exploring",
    });
    expect(qualification).not.toBe("qualified");
  });

  it("gives partial credit for a freeform answer that didn't match a known bucket", () => {
    const { score } = scoreLead({ name: "Jamie", budget: "some vague answer" });
    // name (1) + unmatched budget freeform credit (1) = 2
    expect(score).toBe(2);
  });
});
